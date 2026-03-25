const { sequelizeGutenberg } = require('../config/database');
const initModels = require('./init-models'); // Ini file init-models hasil generate tadi

// Inisialisasi semua model Gutenberg dengan koneksi database kedua
const gutenbergModels = initModels(sequelizeGutenberg);

// Ekspor model yang sudah "hidup"
module.exports = gutenbergModels;