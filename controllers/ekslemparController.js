const Eksemplar = require('../models/eksemplar'); 
const Biblio = require('../models/biblio');
const { Op } = require('sequelize');

const redisClient = require('../config/redis');

// Helper untuk hapus cache eksemplar berdasarkan sekolah
const invalidateEksemplarCache = async (schoolId) => {
  if (!schoolId) return;
  try {
    // Format pattern sesuai middleware: cache:/api/eksemplar?schoolId=...
    const pattern = `cache:*eksemplar*schoolId=${schoolId}*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️ Eksemplar Cache Cleared: ${keys.length} keys for school ${schoolId}`);
    }
  } catch (err) {
    console.error('❌ Redis Invalidation Error:', err.message);
  }
};

// 1. GET ALL (Dengan Search & Pagination)
exports.getAllEksemplar = async (req, res) => {
  try {
    const { schoolId, q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { schoolId, isActive: true }; // Mengasumsikan ada soft delete isActive
    
    if (q) {
      whereClause[Op.or] = [
        { registerNumber: { [Op.like]: `%${q}%` } },
        { callNumber: { [Op.like]: `%${q}%` } }
      ];
    }

    const { count, rows } = await Eksemplar.findAndCountAll({
      where: whereClause,
      include: [{ 
        model: Biblio, 
        attributes: ['title', 'sor', 'image', 'isbnIssn', 'publish_year', 'edition'] 
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

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
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. CREATE
exports.createEksemplar = async (req, res) => {
  try {
    const { 
      biblioId, 
      registerNumber, 
      schoolId, 
      callNumber, 
      status, 
      condition 
    } = req.body;

    // --- SANITISASI & VALIDASI ---
    // Pastikan biblioId adalah angka. Error 'Incorrect integer' tadi terjadi di sini.
    const cleanBiblioId = parseInt(biblioId);
    
    if (!cleanBiblioId || isNaN(cleanBiblioId)) {
      return res.status(400).json({ 
        success: false, 
        message: "ID Buku tidak valid. Pastikan Anda memilih buku dari daftar." 
      });
    }

    // Validasi barcode duplikat di sekolah yang sama
    const existing = await Eksemplar.findOne({ where: { registerNumber, schoolId } });
    if (existing) {
      return res.status(400).json({ success: false, message: "No. barcode sudah terdaftar!" });
    }

    // Gunakan data yang sudah dibersihkan
    const data = await Eksemplar.create({
      biblioId: cleanBiblioId, // Pastikan ini integer
      registerNumber,
      schoolId,
      callNumber,
      status: status || "Tersedia",
      condition: condition || "Baik",
      isActive: true
    });
    await invalidateEksemplarCache(schoolId);
    res.json({ success: true, message: "Eksemplar berhasil didaftarkan", data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. UPDATE
exports.updateEksemplar = async (req, res) => {
  try {
    const { id } = req.params;
    const { registerNumber, schoolId } = req.body;
    let updateData = { ...req.body };

    // Jika biblioId ikut diupdate, pastikan jadi Integer
    if (updateData.biblioId) {
      updateData.biblioId = parseInt(updateData.biblioId);
    }

    // Cek apakah barcode baru sudah dipakai oleh data lain
    if (registerNumber) {
      const duplicate = await Eksemplar.findOne({ 
        where: { 
          registerNumber, 
          schoolId,
          id: { [Op.ne]: id } // Kecuali data yang sedang di-edit
        } 
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "Nomor Register sudah digunakan eksemplar lain!" });
      }
    }

    const [updated] = await Eksemplar.update(req.body, { where: { id } });

    if (updated) {
      const updatedData = await Eksemplar.findByPk(id);
      await invalidateEksemplarCache(schoolId);
      res.json({ success: true, message: "Data eksemplar diperbarui", data: updatedData });
    } else {
      res.status(404).json({ success: false, message: "Eksemplar tidak ditemukan" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. DELETE (Soft Delete atau Hard Delete)
exports.deleteEksemplar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const eksemplar = await Eksemplar.findByPk(id);
    if (!eksemplar) return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    
    const sId = eksemplar.schoolId;
    await eksemplar.destroy(); // Hard delete sesuai kode Anda  

    if (deleted) {
      await invalidateEksemplarCache(sId);
      res.json({ success: true, message: "Eksemplar berhasil dihapus" });
    } else {
      res.status(404).json({ success: false, message: "Eksemplar tidak ditemukan" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};