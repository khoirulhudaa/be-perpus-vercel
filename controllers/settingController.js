const LibrarySetting = require('../models/librarySetting');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Konfigurasi Cloudinary (Sesuai pola Biblio)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.getSettings = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const settings = await LibrarySetting.findOne({ 
      where: { schoolId } 
    });
    
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { schoolId } = req.body;

    // 1. Cari data lama terlebih dahulu
    const existingSettings = await LibrarySetting.findOne({ where: { schoolId } });

    // 2. Inisialisasi URL dengan data lama (jika ada) agar tidak terhapus
    let kopSuratUrl = existingSettings ? existingSettings.kopSurat : null;
    let signatureUrl = existingSettings ? existingSettings.signatureImg : null;
    let badgeUrl = existingSettings ? existingSettings.memberBadgeLogo : null;

    const uploadToCloudinary = (buffer, resourceType = 'auto') => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            resource_type: resourceType,
            folder: 'library_settings' 
          }, 
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    // 3. Proses Upload File HANYA JIKA ada file baru
    if (req.files) {
      if (req.files.kopSurat) {
        kopSuratUrl = await uploadToCloudinary(req.files.kopSurat[0].buffer, 'image');
      }
      if (req.files.signatureImg) {
        signatureUrl = await uploadToCloudinary(req.files.signatureImg[0].buffer, 'image');
      }
      if (req.files.memberBadgeLogo) {
        badgeUrl = await uploadToCloudinary(req.files.memberBadgeLogo[0].buffer, 'image');
      }
    }

    // 4. Gabungkan Data
    const settingsData = { 
      ...req.body, 
      schoolId: parseInt(schoolId), // Pastikan schoolId ikut masuk
      kopSurat: kopSuratUrl, 
      signatureImg: signatureUrl,
      memberBadgeLogo: badgeUrl 
    };

    // 5. Gunakan Upsert
    const [record, created] = await LibrarySetting.upsert(settingsData, {
      returning: true
    });

    res.status(created ? 201 : 200).json({ 
      success: true, 
      message: "Pengaturan berhasil disimpan",
      data: record 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};