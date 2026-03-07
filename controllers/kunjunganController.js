const Kunjungan = require('../models/kunjungan');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

exports.scanKunjungan = async (req, res) => {
  try {
    const { peminjamId, peminjamName, schoolId } = req.body;
    
    // Cek apakah user ini punya kunjungan yang belum "pulang" hari ini
    const activeVisit = await Kunjungan.findOne({
      where: {
        peminjamId,
        schoolId,
        waktuPulang: null,
        waktuMasuk: { [Op.gte]: new Date().setHours(0,0,0,0) }
      }
    });

    if (activeVisit) {
      // Jika ada, maka scan ini dianggap "Pulang"
      activeVisit.waktuPulang = new Date();
      await activeVisit.save();
      return res.json({ success: true, type: 'PULANG', message: `Sampai jumpa, ${peminjamName}!` });
    }

    // Jika tidak ada, catat sebagai "Masuk"
    const visit = await Kunjungan.create({ peminjamId, peminjamName, schoolId });
    res.json({ success: true, type: 'MASUK', message: `Selamat datang, ${peminjamName}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getKunjunganStats = async (req, res) => {
  try {
    const { schoolId } = req.query;
    // Query untuk summary (Sederhana)
    
    const stats = await Kunjungan.findAll({
      where: { schoolId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('DATE', sequelize.col('waktu_masuk')), 'tanggal']
      ],
      group: [sequelize.fn('DATE', sequelize.col('waktu_masuk'))],
      order: [[sequelize.fn('DATE', sequelize.col('waktu_masuk')), 'DESC']],
      limit: 30
    });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};