const { gutenberg_books, gutenberg_files } = require('../models_gutenberg/indexGutenberg');
const { Op } = require('sequelize');

// GET All Books with Pagination & Search
exports.getGutenbergBooks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await gutenberg_books.findAndCountAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { author: { [Op.like]: `%${search}%` } },
          { language: { [Op.like]: `%${search}%` } }
        ]
      },
      include: [{ 
        model: gutenberg_files, 
        as: 'gutenberg_files',
        attributes: ['file_format', 'file_size', 'download_url'] // Ambil info penting saja
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['downloads', 'DESC']] // Urutkan dari yang paling populer
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

// GET Single Book Detail
exports.getBookById = async (req, res) => {
  try {
    const data = await gutenberg_books.findByPk(req.params.id, {
      include: [{ model: gutenberg_files, as: 'gutenberg_files' }]
    });

    if (!data) {
      return res.status(404).json({ success: false, message: "Buku tidak ditemukan" });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Contoh Create (Jika database mengizinkan tulis)
exports.createBookManual = async (req, res) => {
  try {
    const data = await gutenberg_books.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE History / Book (Hati-hati, ini database eksternal)
exports.deleteBook = async (req, res) => {
  try {
    await gutenberg_books.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Book record deleted from local view" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};