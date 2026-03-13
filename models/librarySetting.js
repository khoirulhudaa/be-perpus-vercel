const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LibrarySetting = sequelize.define('LibrarySetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  schoolId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    unique: true, 
    field: 'school_id' 
  },
  
  // Branding & Kop
  libraryName: { type: DataTypes.STRING, field: 'library_name' },
  address: { type: DataTypes.TEXT },
  kopSurat: { type: DataTypes.STRING, field: 'kop_surat' }, 
  
  // Pejabat & TTD
  librarianName: { type: DataTypes.STRING, field: 'librarian_name' },
  librarianId: { type: DataTypes.STRING, field: 'librarian_nip' },
  signatureImg: { type: DataTypes.STRING, field: 'signature_img' },
  
  // Aturan Pinjam (Default Values)
  maxLoanQty: { type: DataTypes.INTEGER, defaultValue: 3, field: 'max_loan_qty' },
  maxLoanDays: { type: DataTypes.INTEGER, defaultValue: 7, field: 'max_loan_days' },
  dailyFine: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1000, field: 'daily_fine' },
  
  // Kartu Anggota
  memberBadgeLogo: { type: DataTypes.STRING, field: 'member_badge_logo' },
  cardThemeColor: { type: DataTypes.STRING(7), defaultValue: '#3b82f6', field: 'card_theme_color' },
  urlYoutube1: { type: DataTypes.STRING, field: 'url_youtube_1' },
  urlYoutube2: { type: DataTypes.STRING, field: 'url_youtube_2' },
  urlYoutube3: { type: DataTypes.STRING, field: 'url_youtube_3' },
}, {
  tableName: 'library_settings',
  timestamps: true,
  // --- PENAMBAHAN INDEXING ---
  indexes: [
    {
      name: 'idx_library_settings_school_id',
      unique: true, // Karena satu sekolah hanya boleh punya satu setting
      fields: ['school_id'] // Menggunakan nama kolom di database
    },
    {
      name: 'idx_library_settings_librarian',
      fields: ['librarian_name'] // Berguna jika ada fitur pencarian berdasarkan nama kepala perpus
    }
  ]
});

module.exports = LibrarySetting;