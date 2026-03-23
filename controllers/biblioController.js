const Biblio = require('../models/biblio');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { Op } = require('sequelize'); // Pastikan import Op

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// exports.createBiblio = async (req, res) => {
//   try {
//     let imageUrl = null;
//     let fileUrl = null;

//     // 1. Validasi Sisi Server
//     if (req.files) {
//       if (req.files.image && req.files.image[0].size > 2 * 1024 * 1024) {
//         return res.status(400).json({ success: false, message: "Ukuran gambar maksimal 2MB" });
//       }
//       if (req.files.fileAtt && req.files.fileAtt[0].size > 5 * 1024 * 1024) {
//         return res.status(400).json({ success: false, message: "Ukuran PDF maksimal 5MB" });
//       }
//     }

//     const uploadToCloudinary = (buffer, resourceType = 'auto') => {
//       return new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { 
//             resource_type: resourceType,
//             folder: 'library_assets' // Opsional: kelompokkan dalam folder
//           }, 
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result.secure_url);
//           }
//         );
//         streamifier.createReadStream(buffer).pipe(stream);
//       });
//     };

//     // 2. Proses Upload
//     if (req.files && req.files.image) {
//       imageUrl = await uploadToCloudinary(req.files.image[0].buffer, 'image');
//     }
//     if (req.files && req.files.fileAtt) {
//       fileUrl = await uploadToCloudinary(req.files.fileAtt[0].buffer, 'raw');
//     }

//     const biblioData = { ...req.body, image: imageUrl, fileAtt: fileUrl };
//     const newBiblio = await Biblio.create(biblioData);

//     res.status(201).json({ success: true, data: newBiblio });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


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

exports.deleteBiblio = async (req, res) => {
  try {
    const biblio = await Biblio.findByPk(req.params.id);
    if (!biblio) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    
    biblio.isActive = false; 
    await biblio.save();
    res.json({ success: true, message: 'Berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};