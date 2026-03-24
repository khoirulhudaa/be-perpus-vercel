const Member = require('../models/member');
const { Op } = require('sequelize');

// GET ALL MEMBERS (with Search & Pagination)
exports.getAllMembers = async (req, res) => {
  try {
    const { schoolId, search, role, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let where = { schoolId };

    if (search) {
      where[Op.or] = [
        { nama: { [Op.like]: `%${search}%` } },
        { nomorInduk: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    const { count, rows } = await Member.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nama', 'ASC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE MEMBER
exports.createMember = async (req, res) => {
  try {
    const { nomorInduk, schoolId } = req.body;

    // Cek duplikasi nomor induk
    const existing = await Member.findOne({ where: { nomorInduk, schoolId } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Nomor Induk sudah terdaftar di sekolah ini' });
    }

    const member = await Member.create(req.body);
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkCreateMembers = async (req, res) => {
  try {
    const { schoolId, members } = req.body;

    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ success: false, message: "Data tidak valid" });
    }

    // 1. Ambil semua nomorInduk yang sudah ada di sekolah ini
    const existingInDb = await Member.findAll({
      where: { schoolId },
      attributes: ['nomorInduk'],
      raw: true
    });

    // 2. Masukkan ke Set untuk lookup O(1)
    const dbNiSet = new Set(existingInDb.map(m => m.nomorInduk.toString().trim().toLowerCase()));

    const finalPayload = [];
    const seenInExcel = new Set();

    for (const m of members) {
      const cleanNI = m.nomorInduk?.toString().trim().toLowerCase();

      // Validasi: Harus ada nomor induk, belum ada di DB, dan bukan duplikat di file yang sama
      if (cleanNI) {
        if (dbNiSet.has(cleanNI) || seenInExcel.has(cleanNI)) {
          continue; 
        }
        seenInExcel.add(cleanNI);
      } else {
        continue; // Lewati jika nomor induk kosong
      }

      finalPayload.push({
        nomorInduk: m.nomorInduk.toString(),
        nama: m.nama,
        role: m.role || "Siswa",
        gender: m.gender || "L",
        kelas: m.kelas || null,
        kontak: m.kontak || null,
        schoolId: parseInt(schoolId),
        isActive: true
      });
    }

    if (finalPayload.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Tidak ada data baru. Semua Nomor Induk sudah terdaftar." 
      });
    }

    await Member.bulkCreate(finalPayload);

    res.json({ 
      success: true, 
      message: `${finalPayload.length} anggota berhasil diimpor.`,
      skipped: members.length - finalPayload.length 
    });

  } catch (err) {
    console.error("[BULK MEMBER ERROR]:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE MEMBER
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);
    
    if (!member) return res.status(404).json({ success: false, message: 'Anggota tidak ditemukan' });

    await member.update(req.body);
    res.json({ success: true, message: 'Data anggota diperbarui', data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE MEMBER
exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Member.destroy({ where: { id } });
    
    if (!deleted) return res.status(404).json({ success: false, message: 'Anggota tidak ditemukan' });
    
    res.json({ success: true, message: 'Anggota berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};