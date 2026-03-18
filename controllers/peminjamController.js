const Peminjaman = require('../models/peminjam');
const Eksemplar = require('../models/eksemplar');
const Biblio = require('../models/biblio');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment'); 
const axios = require('axios');
const KehadiranPerpus = require('../models/kehadiran');
const { EventEmitter } = require('events');
const visitorEmitter = new EventEmitter(); // global event bus sederhana


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
m
    res.json({ success: true, message: "Buku dikembalikan", denda });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// exports.scanKehadiranPerpus = async (req, res) => {
//   const { qrCodeData, mode, schoolId } = req.body;
//   const todayStart = moment().startOf('day').toDate();

//   try {
//     // 1. Panggil API Server User
//     const userResponse = await axios.get(`https://be-school.kiraproject.id/siswa/validate-qr`, {
//       params: { qrCodeData, schoolId }
//     });

//     const userData = userResponse.data;

//     if (!userData.success || !userData.user) {
//       return res.status(404).json({ success: false, message: 'Kartu tidak terdaftar di sistem pusat' });
//     }

//     const { user, role } = userData; 
//     const idKey = role === 'student' ? 'studentId' : 'guruId';

//     if (mode === 'MASUK') {
//       // --- VALIDASI: CEK APAKAH SUDAH MASUK TAPI BELUM PULANG ---
//       const activeSession = await KehadiranPerpus.findOne({
//         where: { 
//           [idKey]: user.id, 
//           waktuPulang: null, 
//           waktuMasuk: { [Op.gte]: todayStart },
//           schoolId: schoolId
//         }
//       });

//       if (activeSession) {
//         return res.status(400).json({ 
//           success: false, 
//           message: `Status Anda berada di perpustakaan. Scan 'PULANG' terlebih dahulu!` 
//         });
//       }

//       // --- LOGIKA PEMETAAN IDENTITAS ---
//       let identitasPayload = {
//         [idKey]: user.id,
//         userRole: role,
//         schoolId: schoolId,
//         userName: user.name || user.nama,
//         waktuMasuk: new Date(),
//       };

//       if (role === 'student') {
//         identitasPayload.nis = user.nis;
//       } else {
//         identitasPayload.nip = user.nip;
//         identitasPayload.email = user.email;
//       }

//       const data = await KehadiranPerpus.create(identitasPayload);
      
//       return res.json({ 
//         success: true, 
//         message: `Selamat Datang, ${user.name || user.nama}`, 
//         data 
//       });

//     } else {
//       // Logic Pulang
//       const absen = await KehadiranPerpus.findOne({
//         where: { [idKey]: user.id, waktuPulang: null, waktuMasuk: { [Op.gte]: todayStart } },
//         order: [['createdAt', 'DESC']]
//       });

//       if (!absen) return res.status(400).json({ success: false, message: 'Data masuk tidak ditemukan atau Anda sudah tercatat pulang' });
      
//       await absen.update({ waktuPulang: new Date() });
//       return res.json({ success: true, message: `Sampai Jumpa, ${user.name || user.nama}` });
//     }
//   } catch (err) {
//     const errorMsg = err.response?.data?.message || "Gagal verifikasi kartu ke server pusat";
//     res.status(500).json({ success: false, message: errorMsg });
//   }
// };

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

// Fungsi ini dipanggil setiap ada kehadiran baru (dari scanKehadiranPerpus)
exports.notifyNewVisitor = (visitorData) => {
  visitorEmitter.emit('new-visitor', visitorData);
};

// SSE endpoint
exports.sseRecentKehadiran = (req, res) => {
  const { schoolId } = req.query;

  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'schoolId required' });
  }

  // Header penting untuk SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Penting untuk flush header awal

  // Kirim comment setiap 15 detik agar koneksi tetap hidup
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  // Listener khusus schoolId ini
  const sendVisitor = (visitor) => {
    // Optional: filter hanya visitor dari schoolId yang sama
    if (visitor.schoolId !== Number(schoolId)) return;

    const data = {
      name: visitor.userName || 'Pengunjung',
      role: visitor.userRole,
      identifier: visitor.userRole === 'student' ? visitor.nis : visitor.nip,
      kelas: visitor.studentId ? 'Kelas ?' : null,
      photoUrl: null, // ← isi kalau ada
      mode: visitor.waktuPulang ? 'pulang' : 'masuk',
      time: moment(visitor.waktuMasuk).format('HH:mm'),
      schoolId: visitor.schoolId,
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  visitorEmitter.on('new-visitor', sendVisitor);

  // Cleanup saat client disconnect
  req.on('close', () => {
    visitorEmitter.off('new-visitor', sendVisitor);
    clearInterval(keepAlive);
    res.end();
  });
};

/**
 * POST /peminjam/kehadiran
 * Scan masuk atau pulang perpustakaan
 */
exports.scanKehadiranPerpus = async (req, res) => {
  const { qrCodeData, mode, schoolId } = req.body;

  // Validasi input
  if (!qrCodeData || !mode || !schoolId) {
    return res.status(400).json({
      success: false,
      message: 'qrCodeData, mode, dan schoolId wajib diisi',
    });
  }

  const normalizedMode = (mode || '').toUpperCase();
  if (!['MASUK', 'PULANG'].includes(normalizedMode)) {
    return res.status(400).json({
      success: false,
      message: "Mode harus 'MASUK' atau 'PULANG'",
    });
  }

  const todayStart = moment().startOf('day').toDate();

  try {
    // 1. Validasi QR ke server pusat (be-school)
    const userResponse = await axios.get(`https://be-school.kiraproject.id/siswa/validate-qr`, {
      params: { qrCodeData, schoolId },
    });

    const userData = userResponse.data;
    if (!userData.success || !userData.user) {
      return res.status(404).json({
        success: false,
        message: 'Kartu tidak terdaftar di sistem pusat',
      });
    }

    const { user, role } = userData;
    const idKey = role === 'student' ? 'studentId' : 'guruId';

    if (normalizedMode === 'MASUK') {
      // Cek apakah sudah ada sesi aktif (belum pulang)
      const activeSession = await KehadiranPerpus.findOne({
        where: {
          [idKey]: user.id,
          waktuPulang: null,
          waktuMasuk: { [Op.gte]: todayStart },
          schoolId: Number(schoolId),
        },
      });

      if (activeSession) {
        return res.status(400).json({
          success: false,
          message: 'Anda masih berada di perpustakaan. Scan PULANG terlebih dahulu!',
        });
      }

      // Buat record masuk
      const newRecord = await KehadiranPerpus.create({
        [idKey]: user.id,
        userRole: role,
        schoolId: Number(schoolId),
        userName: user.name || user.nama || 'Pengguna',
        waktuMasuk: new Date(),
        nis: role === 'student' ? user.nis : null,
        nip: role !== 'student' ? user.nip : null,
        email: role !== 'student' ? user.email : null,
        kelas: role === 'student' ? user.kelas || user.class || null : null,   // ← tambah ini
        photoUrl: user.photoUrl || null,                                      // ← tambah ini
      });

      notifyNewVisitor(newRecord);

      return res.json({
        success: true,
        message: `Selamat Datang, ${user.name || user.nama || 'Pengguna'}`,
        visitor: {
          name: user.name || user.nama || 'Pengguna',
          role,
          identifier: role === 'student' ? user.nis : user.nip,
          kelas: role === 'student' ? user.class || user.kelas : null,
          photoUrl: user.photoUrl || null,
          mode: 'masuk',
          time: moment().format('HH:mm'),
        },
      });
    }

    // Mode PULANG
    const lastEntry = await KehadiranPerpus.findOne({
      where: {
        [idKey]: user.id,
        waktuPulang: null,
        waktuMasuk: { [Op.gte]: todayStart },
        schoolId: Number(schoolId),
      },
      order: [['waktuMasuk', 'DESC']],
    });

    if (!lastEntry) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ditemukan data masuk hari ini atau sudah tercatat pulang',
      });
    }

    await lastEntry.update({ waktuPulang: new Date() });

    // ← Tambahkan ini
    notifyNewVisitor({
      ...lastEntry.get({ plain: true }),
      waktuPulang: new Date(),
      kelas: lastEntry.kelas || null,           // kalau sudah disimpan
      photoUrl: lastEntry.photoUrl || null,
    });

    return res.json({
      success: true,
      message: `Sampai Jumpa, ${user.name || user.nama || 'Pengguna'}`,
      visitor: {
        name: user.name || user.nama || 'Pengguna',
        role,
        identifier: role === 'student' ? user.nis : user.nip,
        kelas: role === 'student' ? user.class || user.kelas : null,
        photoUrl: user.photoUrl || null,
        mode: 'pulang',
        time: moment().format('HH:mm'),
      },
    });
  } catch (err) {
    console.error('SCAN_KEHADIRAN_ERROR:', err);
    const errorMsg = err.response?.data?.message || err.message || 'Gagal memproses kehadiran';
    return res.status(500).json({ success: false, message: errorMsg });
  }
};

/**
 * GET /peminjam/recent-kehadiran
 * Digunakan oleh TVLayer untuk polling pengunjung terbaru
 */
exports.getRecentKehadiranPerpus = async (req, res) => {
  const { schoolId } = req.query;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'schoolId wajib disertakan',
    });
  }

  try {
    // Ambil record terbaru dalam 45 detik terakhir
    const recent = await KehadiranPerpus.findOne({
      where: {
        schoolId: Number(schoolId),
        waktuMasuk: {
          [Op.gte]: moment().subtract(45, 'seconds').toDate(),
        },
      },
      order: [['waktuMasuk', 'DESC']],
      raw: true,
    });

    if (!recent) {
      return res.json({
        success: true,
        visitor: null,
      });
    }

    // Tentukan mode berdasarkan apakah sudah pulang atau belum
    const mode = recent.waktuPulang ? 'pulang' : 'masuk';

    return res.json({
      success: true,
      visitor: {
        name: recent.userName || 'Pengunjung',
        role: recent.userRole,
        identifier: recent.studentId ? recent.nis : recent.nip,
        kelas: recent.studentId ? 'Kelas ?' : null, // ← sesuaikan jika ada field kelas
        photoUrl: null, // ← jika ingin pakai photoUrl, tambahkan field di model atau ambil dari user
        mode,
        time: moment(recent.waktuMasuk).format('HH:mm'),
      },
    });
  } catch (err) {
    console.error('RECENT_KEHADIRAN_ERROR:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pengunjung terbaru',
    });
  }
};
