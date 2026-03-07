const StockOpname = require('../models/stockOpname');
const StockOpnameDetail = require('../models/stockOpnameDetail');
const Eksemplar = require('../models/eksemplar');
const { Sequelize } = require('sequelize');
const Biblio = require('../models/biblio');

// Ambil semua sesi SO
exports.getAllSessions = async (req, res) => {
  try {
    const { schoolId } = req.query;
    
    const data = await StockOpname.findAll({ 
      where: { schoolId }, 
      attributes: {
        include: [
          [
            // Menggunakan nama tabel asli: stock_opname_detail
            // Menggunakan nama kolom asli: stock_opname_id
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM stock_opname_detail AS details
              WHERE details.stock_opname_id = StockOpname.id
            )`),
            'total_scanned'
          ]
        ]
      },
      order: [['createdAt', 'DESC']] 
    });

    res.json({ success: true, data });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// Buat sesi baru
exports.createSession = async (req, res) => {
  try {
    const session = await StockOpname.create(req.body);
    res.status(201).json({ success: true, data: session });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Scan Barcode
exports.scanItem = async (req, res) => {
  try {
    const { stockOpnameId, registerNumber, schoolId } = req.body;
    const eks = await Eksemplar.findOne({ where: { registerNumber, schoolId } });
    
    if (!eks) return res.status(404).json({ success: false, message: "Barcode tidak ditemukan" });

    const [detail, created] = await StockOpnameDetail.findOrCreate({
      where: { stockOpnameId, eksemplarId: eks.id },
      defaults: { isFound: true, scannedAt: new Date() }
    });

    if (!created) await detail.update({ isFound: true, scannedAt: new Date() });

    res.json({ success: true, message: "Berhasil discan", data: eks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Selesaikan Sesi (Finalize)
exports.finalizeSession = async (req, res) => {
  try {
    const { id } = req.params;
    await StockOpname.update({ status: 'Selesai', endDate: new Date() }, { where: { id } });
    res.json({ success: true, message: "Sesi stok opname telah ditutup" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// Di Controller Backend (getSessionDetails)
exports.getSessionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const details = await StockOpnameDetail.findAll({
      where: { stockOpnameId: id },
      include: [
        {
          model: Eksemplar,
          include: [{ model: Biblio }]
        }
      ],
      // GANTI 'createdAt' MENJADI 'scannedAt'
      order: [['scannedAt', 'DESC']] 
    });

    res.json({ success: true, data: details });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};