const EResource = require('../models/eresource');

exports.getEResources = async (req, res) => {
  try {
    const data = await EResource.findAll({ where: { schoolId: req.query.schoolId, isActive: true } });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getContactInfo = async (req, res) => {
  // Bisa ditaruh di tabel settings, ini contoh hardcode
  res.json({
    success: true,
    data: {
      libraryName: "Perpustakaan SMAN 25 Jakarta",
      whatsapp: "0812-xxxx-xxxx",
      instagram: "@perpus25jkt",
      address: "Jl. Senayan No. 25"
    }
  });
};