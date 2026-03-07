const Peminjaman = require('../models/peminjam');
const Eksemplar = require('../models/eksemplar');
const Biblio = require('../models/biblio');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment'); 
const axios = require('axios');
const KehadiranPerpus = require('../models/kehadiran');

exports.getKunjunganReport = async (req, res) => {
  try {
    const { schoolId, year, month, date, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    // 1. Membangun Query Filter
    let whereConditions = { schoolId: Number(schoolId) };
    
    if (date) {
      whereConditions.waktuMasuk = literal(`DATE(waktuMasuk) = '${date}'`);
    } else if (month && year) {
      const startDate = `${year}-${month}-01`;
      const endDate = moment(startDate).endOf('month').format("YYYY-MM-DD");
      whereConditions.waktuMasuk = {
        [Op.between]: [startDate + ' 00:00:00', endDate + ' 23:59:59']
      };
    } else {
      const today = moment().format("YYYY-MM-DD");
      whereConditions.waktuMasuk = literal(`DATE(waktuMasuk) = '${today}'`);
    }

    // 2. Query Detail (Table) dengan Pagination
    const { count, rows: history } = await KehadiranPerpus.findAndCountAll({
      where: whereConditions,
      order: [['waktuMasuk', 'DESC']],
      limit: Number(limit),
      offset: offset
    });

    // 3. Query Agregasi (Chart) - Ambil data penuh untuk tren
    const stats = await KehadiranPerpus.findAll({
      where: whereConditions,
      attributes: [
        [literal("DATE(waktuMasuk)"), 'label'],
        [fn('COUNT', col('id')), 'totalMasuk']
      ],
      group: [literal("DATE(waktuMasuk)")],
      order: [[literal("label"), 'ASC']]
    });

    // 4. Hitung Summary (Global untuk filter tersebut)
    const summaryData = await KehadiranPerpus.findAll({
      where: whereConditions,
      attributes: [
        [fn('COUNT', col('id')), 'totalKunjungan'],
        [literal("COUNT(CASE WHEN userRole = 'student' THEN 1 END)"), 'totalSiswa'],
        [literal("COUNT(CASE WHEN userRole IN ('teacher', 'guru', 'staf') THEN 1 END)"), 'totalGuru'],
        [literal("COUNT(CASE WHEN waktuPulang IS NULL THEN 1 END)"), 'masihDiDalam']
      ],
      raw: true
    });

    const summary = summaryData[0] || { totalKunjungan: 0, totalSiswa: 0, totalGuru: 0, masihDiDalam: 0 };

    return res.json({
      success: true,
      summary: {
        totalKunjungan: Number(summary.totalKunjungan || 0),
        totalSiswa: Number(summary.totalSiswa || 0),
        totalGuru: Number(summary.totalGuru || 0),
        masihDiDalam: Number(summary.masihDiDalam || 0)
      },
      chartData: stats,
      tableData: history,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
        limit: Number(limit)
      }
    });

  } catch (err) {
    console.error("REPORT_ERROR_LOG:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllPeminjaman = async (req, res) => {
  try {
    const { schoolId, q, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Gunakan nama properti Model (camelCase)
    const whereClause = { schoolId: schoolId };

    if (q) {
      whereClause[Op.or] = [
        { peminjamName: { [Op.like]: `%${q}%` } },
        { peminjamId: { [Op.like]: `%${q}%` } }
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    // Gunakan findAndCountAll untuk mendapatkan total data untuk pagination
    const { count, rows } = await Peminjaman.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Eksemplar,
          attributes: ['registerNumber', 'callNumber'], // Sesuai nama properti model
          include: [{ model: Biblio, attributes: ['title', 'image'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Kirim response dengan struktur yang diharapkan Frontend
    res.json({ 
      success: true, 
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET PEMINJAMAN BY ID
exports.getPinjamById = async (req, res) => {
  try {
    const data = await Peminjaman.findByPk(req.params.id, {
      include: [{ model: Eksemplar, include: [Biblio] }]
    });
    if (!data) return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. DELETE PEMINJAMAN
exports.deletePinjam = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cari data peminjaman dulu untuk tahu eksemplar mana yang harus di-update
    const pinjam = await Peminjaman.findByPk(id);
    if (!pinjam) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    }

    // Jika statusnya masih 'Dipinjam', kembalikan status buku ke 'Tersedia'
    if (pinjam.status !== 'Kembali') {
      await Eksemplar.update(
        { status: 'Tersedia' }, 
        { where: { id: pinjam.eksemplarId } }
      );
    }

    await Peminjaman.destroy({ where: { id } });

    res.json({ success: true, message: "Data peminjaman berhasil dihapus dan status buku diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPinjam = async (req, res) => {
  try {
    const { eksemplarId, schoolId } = req.body;
    
    // 1. Cek apakah buku tersedia
    const buku = await Eksemplar.findByPk(eksemplarId);
    if (!buku || buku.status !== 'Tersedia') {
      return res.status(400).json({ success: false, message: "Buku tidak tersedia atau sedang dipinjam" });
    }

    // 2. Buat transaksi pinjam
    const pinjam = await Peminjaman.create(req.body);

    // 3. Update status eksemplar jadi 'Dipinjam'
    await Eksemplar.update({ status: 'Dipinjam' }, { where: { id: eksemplarId } });

    res.json({ success: true, data: pinjam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.pengembalianBuku = async (req, res) => {
  try {
    const { id } = req.params;
    const pinjam = await Peminjaman.findByPk(id);
    const tglSekarang = new Date();
    const tglHarusKembali = new Date(pinjam.tglKembali);
    
    let denda = 0;
    if (tglSekarang > tglHarusKembali) {
      const selisihHari = Math.ceil((tglSekarang - tglHarusKembali) / (1000 * 60 * 60 * 24));
      denda = selisihHari * 1000; // Contoh: denda 1000 per hari
    }

    await Peminjaman.update({
      tglRealisasiKembali: tglSekarang,
      denda: denda,
      status: 'Kembali'
    }, { where: { id } });

    // Set buku jadi tersedia lagi
    await Eksemplar.update({ status: 'Tersedia' }, { where: { id: pinjam.eksemplarId } });

    res.json({ success: true, message: "Buku dikembalikan", denda });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- 1. SCAN MASUK/PULANG PERPUS ---
// exports.scanKehadiranPerpus = async (req, res) => {
//   const { qrCodeData, mode, schoolId } = req.body; // mode: 'MASUK' | 'PULANG'
//   const todayStart = moment().startOf('day').toDate();

//   try {
//     // Cari User (Cek Student dulu, jika tidak ada cek Guru)
//     let user = await Student.findOne({ where: { qrCodeData, schoolId, isActive: true } });
//     let role = 'student';
//     let idKey = 'studentId';

//     if (!user) {
//       user = await GuruTendik.findOne({ where: { qrCodeData, schoolId, isActive: true } });
//       role = 'teacher';
//       idKey = 'guruId';
//     }

//     if (!user) return res.status(404).json({ success: false, message: 'Kartu tidak terdaftar' });

//     if (mode === 'MASUK') {
//       const data = await KehadiranPerpus.create({
//         [idKey]: user.id,
//         userRole: role,
//         schoolId: schoolId,
//         waktuMasuk: new Date()
//       });
//       return res.json({ success: true, message: `Selamat Datang, ${user.name || user.nama}`, data });
//     } else {
//       // Logic Pulang: Cari data masuk hari ini yang belum pulang
//       const absen = await KehadiranPerpus.findOne({
//         where: { [idKey]: user.id, waktuPulang: null, waktuMasuk: { [Op.gte]: todayStart } },
//         order: [['createdAt', 'DESC']]
//       });

//       if (!absen) return res.status(400).json({ success: false, message: 'Data masuk tidak ditemukan' });
      
//       await absen.update({ waktuPulang: new Date() });
//       return res.json({ success: true, message: `Sampai Jumpa, ${user.name || user.nama}` });
//     }
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

exports.scanKehadiranPerpus = async (req, res) => {
  const { qrCodeData, mode, schoolId } = req.body;
  const todayStart = moment().startOf('day').toDate();

  try {
    // 1. Panggil API Server User
    const userResponse = await axios.get(`https://be-school.kiraproject.id/siswa/validate-qr`, {
      params: { qrCodeData, schoolId }
    });

    const userData = userResponse.data;

    if (!userData.success || !userData.user) {
      return res.status(404).json({ success: false, message: 'Kartu tidak terdaftar di sistem pusat' });
    }

    const { user, role } = userData; 
    const idKey = role === 'student' ? 'studentId' : 'guruId';

    if (mode === 'MASUK') {
      // --- VALIDASI: CEK APAKAH SUDAH MASUK TAPI BELUM PULANG ---
      const activeSession = await KehadiranPerpus.findOne({
        where: { 
          [idKey]: user.id, 
          waktuPulang: null, 
          waktuMasuk: { [Op.gte]: todayStart },
          schoolId: schoolId
        }
      });

      if (activeSession) {
        return res.status(400).json({ 
          success: false, 
          message: `Status Anda berada di perpustakaan. Scan 'PULANG' terlebih dahulu!` 
        });
      }

      // --- LOGIKA PEMETAAN IDENTITAS ---
      let identitasPayload = {
        [idKey]: user.id,
        userRole: role,
        schoolId: schoolId,
        userName: user.name || user.nama,
        waktuMasuk: new Date(),
      };

      if (role === 'student') {
        identitasPayload.nis = user.nis;
      } else {
        identitasPayload.nip = user.nip;
        identitasPayload.email = user.email;
      }

      const data = await KehadiranPerpus.create(identitasPayload);
      
      return res.json({ 
        success: true, 
        message: `Selamat Datang, ${user.name || user.nama}`, 
        data 
      });

    } else {
      // Logic Pulang
      const absen = await KehadiranPerpus.findOne({
        where: { [idKey]: user.id, waktuPulang: null, waktuMasuk: { [Op.gte]: todayStart } },
        order: [['createdAt', 'DESC']]
      });

      if (!absen) return res.status(400).json({ success: false, message: 'Data masuk tidak ditemukan atau Anda sudah tercatat pulang' });
      
      await absen.update({ waktuPulang: new Date() });
      return res.json({ success: true, message: `Sampai Jumpa, ${user.name || user.nama}` });
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Gagal verifikasi kartu ke server pusat";
    res.status(500).json({ success: false, message: errorMsg });
  }
};

// --- 2. SCAN PINJAM BUKU ---
exports.scanPinjamKiosk = async (req, res) => {
  const { qrCodeData, registerNumber, schoolId } = req.body;

  try {
    // 1. Validasi User ke API Pusat (Axios)
    const userResponse = await axios.get(`https://be-school.kiraproject.id/siswa/validate-qr`, {
      params: { qrCodeData, schoolId }
    });

    const userData = userResponse.data;

    // Jika user tidak ditemukan di server pusat
    if (!userData.success || !userData.user) {
      return res.status(404).json({ success: false, message: 'Kartu Anggota tidak terdaftar di sistem pusat' });
    }

    const { user, role } = userData;

    // 2. Cari Data Buku di DB Lokal
    const buku = await Eksemplar.findOne({ 
      where: { registerNumber, schoolId },
      include: ['Biblio'] // Opsional: Sertakan judul buku untuk pesan response
    });
    
    if (!buku) {
      return res.status(404).json({ success: false, message: 'Data buku tidak ditemukan' });
    }
    
    if (buku.status !== 'Tersedia') {
      return res.status(400).json({ success: false, message: `Buku sedang ${buku.status}` });
    }

    const activeLoans = await Peminjaman.count({ 
      where: { peminjamId: user.id, status: 'Dipinjam', schoolId } 
    });
    if (activeLoans >= 3) { // Angka 3 bisa diambil dari tabel setting
      return res.status(400).json({ success: false, message: 'Kuota pinjam maksimal (3 buku) telah tercapai.' });
    }

    // 3. Proses Peminjaman
    const tglKembali = moment().add(7, 'days').toDate();

    const pinjam = await Peminjaman.create({
      // Mapping field sesuai data dari API Pusat
      peminjamId: user.id, 
      peminjamName: user.name || user.nama,
      peminjamRole: role,
      eksemplarId: buku.id,
      schoolId,
      tglPinjam: new Date(),
      tglKembali,
      status: 'Dipinjam'
    });

    // 4. Update Status Buku
    await buku.update({ status: 'Dipinjam' });

    res.json({ 
      success: true, 
      message: `Berhasil! ${user.name || user.nama} meminjam buku ${buku.Biblio?.title || registerNumber}`, 
      data: pinjam 
    });

  } catch (err) {
    console.error("Error Scan Pinjam:", err);
    const errorMsg = err.response?.data?.message || err.message || "Gagal memproses peminjaman";
    res.status(500).json({ success: false, message: errorMsg });
  }
};

// --- 3. SCAN KEMBALI BUKU ---
exports.scanKembaliKiosk = async (req, res) => {
  const { registerNumber, schoolId } = req.body;

  try {
    const buku = await Eksemplar.findOne({ where: { registerNumber, schoolId } });
    if (!buku) return res.status(404).json({ success: false, message: 'Data buku tidak ditemukan' });

    const pinjam = await Peminjaman.findOne({
      where: { eksemplarId: buku.id, status: 'Dipinjam', schoolId }
    });

    if (!pinjam) return res.status(400).json({ success: false, message: 'Buku ini tidak dalam status dipinjam' });

    // Hitung Denda
    const tglHarusKembali = moment(pinjam.tglKembali);
    const tglSekarang = moment();
    let denda = 0;
    if (tglSekarang.isAfter(tglHarusKembali)) {
      const hariTerlambat = tglSekarang.diff(tglHarusKembali, 'days');
      denda = hariTerlambat * 1000;
    }

    await pinjam.update({ tglRealisasiKembali: new Date(), denda, status: 'Kembali' });
    await buku.update({ status: 'Tersedia' });

    res.json({ success: true, message: 'Buku berhasil dikembalikan', denda });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.extendLoan = async (req, res) => {
  try {
    const loan = await Peminjaman.findByPk(req.params.id);
    if (!loan || loan.status !== 'Dipinjam') {
      return res.status(400).json({ success: false, message: "Hanya buku yang sedang dipinjam yang bisa diperpanjang" });
    }

    // Tambah 7 hari dari tglKembali sebelumnya
    const newDeadline = moment(loan.tglKembali).add(7, 'days').format('YYYY-MM-DD');
    await loan.update({ tglKembali: newDeadline });

    res.json({ success: true, message: "Masa pinjam berhasil diperpanjang 7 hari", newDeadline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};