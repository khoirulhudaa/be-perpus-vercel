const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/database");

const Biblio = sequelize.define('Biblio', {
  biblioId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'biblio_id' },
  gmdId: { type: DataTypes.INTEGER, field: 'gmd_id' },
  title: { type: DataTypes.STRING, allowNull: false },
  genreId: { type: DataTypes.INTEGER, field: 'genre_id' }, // Tambahkan ini
  sor: { type: DataTypes.STRING }, // Statement of Responsibility
  edition: { type: DataTypes.STRING },
  isbnIssn: { type: DataTypes.STRING(50), field: 'isbn_issn' },
  publisherId: { type: DataTypes.INTEGER, field: 'publisher_id' },
  publishYear: { type: DataTypes.STRING(4), field: 'publish_year' },
  collation: { type: DataTypes.STRING },
  seriesTitle: { type: DataTypes.STRING, field: 'series_title' },
  callNumber: { type: DataTypes.STRING(50), field: 'call_number' },
  languageId: { type: DataTypes.STRING(5), field: 'language_id', defaultValue: 'id' },
  source: { type: DataTypes.STRING },
  publishPlaceId: { type: DataTypes.INTEGER, field: 'publish_place_id' },
  classification: { type: DataTypes.STRING(40) },
  notes: { type: DataTypes.TEXT },
  image: { type: DataTypes.STRING }, // Cloudinary URL
  fileAtt: { type: DataTypes.STRING, field: 'file_att' }, // Cloudinary URL untuk E-Resources
  opacHide: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'opac_hide' },
  promoted: { type: DataTypes.BOOLEAN, defaultValue: false },
  labels: { type: DataTypes.TEXT },
  frequencyId: { type: DataTypes.INTEGER, field: 'frequency_id' },
  specDetailInfo: { type: DataTypes.TEXT, field: 'spec_detail_info' },
  contentTypeId: { type: DataTypes.INTEGER, field: 'content_type_id' },
  mediaTypeId: { type: DataTypes.INTEGER, field: 'media_type_id' },
  carrierTypeId: { type: DataTypes.INTEGER, field: 'carrier_type_id' },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' },
  uid: { type: DataTypes.INTEGER }, // User ID Creator
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, {
  tableName: 'biblio',
  timestamps: true,
  indexes: [
    // 1. Index Dasar Multitenancy & Status
    // Digunakan di hampir semua query OPAC dan Admin
    {
      name: 'idx_biblio_school_active_opac',
      fields: ['school_id', 'is_active', 'opac_hide']
    },
    // 2. Index Pencarian Judul
    // Mempercepat pencarian katalog berdasarkan judul buku
    {
      name: 'idx_biblio_title',
      fields: ['title']
    },
    // 3. Index Identitas Unik Buku (ISBN/ISSN)
    // Sangat penting untuk integrasi data atau pencegahan duplikasi buku
    {
      name: 'idx_biblio_isbn_issn',
      fields: ['isbn_issn']
    },
    // 4. Index Klasifikasi & Nomor Panggil (Call Number)
    // Digunakan petugas untuk menata buku di rak dan pencarian subjek
    {
      name: 'idx_biblio_classification_call',
      fields: ['school_id', 'classification', 'call_number']
    },
    // 5. Index Promosi (Featured Books)
    // Mempercepat loading buku "Populer" atau "Terbaru" di halaman depan OPAC
    {
      name: 'idx_biblio_promoted',
      fields: ['school_id', 'promoted', 'createdAt']
    },
    // 6. Index Publisher & Tahun
    // Berguna untuk filter laporan stok buku tahunan atau berdasarkan penerbit
    {
      name: 'idx_biblio_publisher_year',
      fields: ['school_id', 'publisher_id', 'publish_year']
    }
  ]
});

module.exports = Biblio;