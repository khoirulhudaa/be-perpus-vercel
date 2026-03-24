const Biblio = require('../models/biblio');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { Op } = require('sequelize'); // Pastikan import Op

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// === REDIS + INVALIDATE CACHE ===
const redisClient = require('../config/redis');

const invalidateBiblioCache = async (schoolId) => {
  if (!schoolId) return;
  try {
    // Kita gunakan wildcard * agar semua page, search, dan limit untuk schoolId ini terhapus
    // Contoh: cache:/api/biblio*schoolId=1*
    const pattern = `cache:*biblio*schoolId=${schoolId}*`; 
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️ Redis Cleaned: ${keys.length} biblio keys for school ${schoolId}`);
    }
  } catch (err) {
    console.error('❌ Redis Del Error:', err.message);
  }
};

exports.getAllBiblio = async (req, res) => {
  try {
    const { schoolId, q, year, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { schoolId, isActive: true };

    // Filter Search (Judul, ISBN, Penulis)
    if (q) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { isbnIssn: { [Op.like]: `%${q}%` } },
        { sor: { [Op.like]: `%${q}%` } }
      ];
    }

    // Filter Tahun
    if (year && year !== "") {
      whereClause.publishYear = year;
    }

    const { count, rows } = await Biblio.findAndCountAll({
      where: whereClause,
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

exports.getBiblioSelection = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const data = await Biblio.findAll({
      where: { schoolId, isActive: true },
      attributes: ['biblioId', 'title', 'isbnIssn'], // Ambil yang perlu saja
      order: [['title', 'ASC']]
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBiblio = async (req, res) => {
  try {
    const { schoolId, title } = req.body;

    // 1. Validasi Dasar
    if (!schoolId || !title) {
      return res.status(400).json({ success: false, message: "School ID dan Judul wajib diisi" });
    }

    // Fungsi Helper Upload Cloudinary
    const uploadToCloudinary = (buffer, resourceType = 'auto') => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            resource_type: resourceType,
            folder: `school_${schoolId}/library`,
            // Optimasi gambar otomatis oleh Cloudinary
            transformation: resourceType === 'image' ? [{ width: 800, crop: "limit", quality: "auto" }] : []
          }, 
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    // 2. Persiapan Parallel Upload
    const uploadPromises = [];
    const fileKeys = []; // Untuk melacak hasil promise

    if (req.files && req.files.image) {
      uploadPromises.push(uploadToCloudinary(req.files.image[0].buffer, 'image'));
      fileKeys.push('image');
    }

    if (req.files && req.files.fileAtt) {
      uploadPromises.push(uploadToCloudinary(req.files.fileAtt[0].buffer, 'auto')); // 'auto' lebih baik untuk PDF
      fileKeys.push('fileAtt');
    }

    // 3. Eksekusi Parallel (Ini yang bikin CEPAT)
    const uploadedUrls = await Promise.all(uploadPromises);
    
    // Mapping hasil upload kembali ke variabel
    let imageUrl = null;
    let fileUrl = null;

    uploadedUrls.forEach((url, index) => {
      if (fileKeys[index] === 'image') imageUrl = url;
      if (fileKeys[index] === 'fileAtt') fileUrl = url;
    });

    // 4. Simpan ke Database
    const biblioData = { 
      ...req.body, 
      image: imageUrl, 
      fileAtt: fileUrl,
      // Pastikan field numerik terkonversi jika dikirim via FormData (string)
      schoolId: parseInt(schoolId),
      publishYear: req.body.publishYear || null
    };

    const newBiblio = await Biblio.create(biblioData);
    await invalidateBiblioCache(schoolId);
    res.status(201).json({ 
      success: true, 
      message: "Katalog berhasil dibuat", 
      data: newBiblio 
    });

  } catch (err) {
    console.error("[CREATE BIBLIO ERROR]:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkCreateFromJson = async (req, res) => {
  try {
    const { schoolId, books } = req.body;

    if (!books || !Array.isArray(books)) {
      return res.status(400).json({ success: false, message: "Data tidak valid" });
    }

    // 1. Ambil semua ISBN yang sudah ada di database (Model Biblio) untuk sekolah ini
    // Kita hanya mengambil kolom isbnIssn agar query ringan
    const existingInDb = await Biblio.findAll({
      where: { 
        schoolId, 
        isActive: true,
        isbnIssn: { [Op.ne]: null } // Hanya ambil yang ada ISBN-nya
      },
      attributes: ['isbnIssn'],
      raw: true
    });

    // 2. Masukkan ke dalam Set untuk pencarian super cepat (O(1))
    const dbIsbnSet = new Set(existingInDb.map(b => b.isbnIssn.trim().toLowerCase()));

    // 3. Filter data dari Excel
    const finalPayload = [];
    const seenInExcel = new Set(); // Untuk mencegah duplikat di dalam file Excel itu sendiri

    for (const book of books) {
      // Normalisasi ISBN: hapus spasi dan jadikan lowercase untuk perbandingan akurat
      const cleanIsbn = book.isbnIssn?.toString().trim().toLowerCase();

      // LOGIKA FILTER:
      // - Jika ISBN kosong, kita anggap boleh masuk (opsional)
      // - Jika ISBN sudah ada di Database (dbIsbnSet), SKIP.
      // - Jika ISBN duplikat di dalam file Excel (seenInExcel), SKIP.
      if (cleanIsbn) {
        if (dbIsbnSet.has(cleanIsbn) || seenInExcel.has(cleanIsbn)) {
          continue; 
        }
        seenInExcel.add(cleanIsbn);
      }

      // Jika lolos filter, masukkan ke payload
      finalPayload.push({
        ...book,
        schoolId: parseInt(schoolId),
        genreId: null, // Sesuai permintaan: paksa null
        isActive: true
      });
    }

    // 4. Eksekusi jika ada data yang tersisa
    if (finalPayload.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Tidak ada data baru. Semua ISBN sudah terdaftar di sistem." 
      });
    }

    await Biblio.bulkCreate(finalPayload);
    await invalidateBiblioCache(schoolId);

    res.json({ 
      success: true, 
      message: `${finalPayload.length} buku berhasil diimpor.`,
      skipped: books.length - finalPayload.length 
    });

  } catch (err) {
    console.error("[BULK ERROR]:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBiblio = async (req, res) => {
  try {
    const biblio = await Biblio.findByPk(req.params.id);
    if (!biblio) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    
    const sId = biblio.schoolId; 
    biblio.isActive = false; 
    await biblio.save();  
    await invalidateBiblioCache(sId);
    res.json({ success: true, message: 'Berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// exports.updateBiblio = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { schoolId } = req.body;

//     const biblio = await Biblio.findByPk(id);
//     if (!biblio) {
//       return res.status(404).json({ success: false, message: "Katalog tidak ditemukan" });
//     }

//     // Helper Upload Cloudinary (Sama seperti di Create)
//     const uploadToCloudinary = (buffer, resourceType = 'auto') => {
//       return new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { 
//             resource_type: resourceType,
//             folder: `school_${schoolId}/library`,
//             transformation: resourceType === 'image' ? [{ width: 800, crop: "limit", quality: "auto" }] : []
//           }, 
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result.secure_url);
//           }
//         );
//         streamifier.createReadStream(buffer).pipe(stream);
//       });
//     };

//     const uploadPromises = [];
//     const fileKeys = [];

//     // Cek jika ada upload gambar baru
//     if (req.files && req.files.image) {
//       uploadPromises.push(uploadToCloudinary(req.files.image[0].buffer, 'image'));
//       fileKeys.push('image');
//     }

//     // Cek jika ada upload PDF baru
//     if (req.files && req.files.fileAtt) {
//       uploadPromises.push(uploadToCloudinary(req.files.fileAtt[0].buffer, 'auto'));
//       fileKeys.push('fileAtt');
//     }

//     const uploadedUrls = await Promise.all(uploadPromises);
    
//     // Siapkan data update
//     const updateData = { ...req.body };
    
//     // Masukkan URL baru ke updateData jika ada upload
//     uploadedUrls.forEach((url, index) => {
//       if (fileKeys[index] === 'image') updateData.image = url;
//       if (fileKeys[index] === 'fileAtt') updateData.fileAtt = url;
//     });

//     // Jalankan update
//     await biblio.update(updateData);

//     // ✨ Bersihkan Cache agar perubahan langsung terlihat di Frontend
//     await invalidateBiblioCache(schoolId || biblio.schoolId);

//     res.json({ 
//       success: true, 
//       message: "Katalog berhasil diperbarui", 
//       data: biblio 
//     });

//   } catch (err) {
//     console.error("[UPDATE BIBLIO ERROR]:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

exports.updateBiblio = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.body;

    const biblio = await Biblio.findByPk(id);
    if (!biblio) return res.status(404).json({ success: false, message: "Katalog tidak ditemukan" });

    const uploadToCloudinary2 = (buffer, resourceType = 'auto') => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: `school_${schoolId}/library`,
            resource_type: resourceType,
            // Tambahkan timeout agar tidak menggantung selamanya
            // timeout: 60000 
          }, 
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const uploadPromises = [];
    const keys = [];

    if (req.files?.image?.[0]) {
      uploadPromises.push(uploadToCloudinary2(req.files.image[0].buffer, 'image'));
      keys.push('image');
    }

    if (req.files?.fileAtt?.[0]) {
      uploadPromises.push(uploadToCloudinary2(req.files.fileAtt[0].buffer, 'raw')); // 'raw' atau 'auto' untuk PDF
      keys.push('fileAtt');
    }

    // Eksekusi paralel
    const results = await Promise.all(uploadPromises);
    
    const updateData = { ...req.body };
    results.forEach((url, i) => {
      updateData[keys[i]] = url;
    });

    // Update DB
    await biblio.update(updateData);

    // Jangan tunggu pembersihan cache jika tidak kritikal, 
    // tapi karena Anda pakai Redis, ini biasanya cepat.
    invalidateBiblioCache(schoolId || biblio.schoolId);

    res.json({ success: true, message: "Katalog diperbarui", data: biblio });

  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal update: " + err.message });
  }
};