const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const StockOpname = require('./stockOpname');
const Eksemplar = require('./eksemplar');

const StockOpnameDetail = sequelize.define('StockOpnameDetail', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  stockOpnameId: { 
    type: DataTypes.INTEGER, 
    field: 'stock_opname_id',
    allowNull: false 
  },
  eksemplarId: { 
    type: DataTypes.INTEGER, 
    field: 'eksemplar_id',
    allowNull: false 
  },
  isFound: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false, 
    field: 'is_found' 
  },
  lastCondition: { 
    type: DataTypes.STRING, 
    defaultValue: 'Baik', 
    field: 'last_condition' 
  },
  scannedAt: { 
    type: DataTypes.DATE, 
    field: 'scanned_at' 
  }
}, {
  tableName: 'stock_opname_detail',
  timestamps: false,
  indexes: [
    // 1. Unique Composite Index
    // Mencegah satu eksemplar buku di-scan dua kali dalam sesi Stock Opname yang sama
    {
      name: 'idx_unique_scan_per_session',
      unique: true,
      fields: ['stock_opname_id', 'eksemplar_id']
    },
    // 2. Index untuk Laporan Rekonsiliasi
    // Mempercepat filter untuk mencari buku yang "Belum Ditemukan" atau "Sudah Ditemukan"
    {
      name: 'idx_opname_status',
      fields: ['stock_opname_id', 'is_found']
    },
    // 3. Index untuk Filter Kondisi
    // Berguna untuk laporan buku rusak yang ditemukan saat opname
    {
      name: 'idx_opname_condition',
      fields: ['stock_opname_id', 'last_condition']
    },
    // 4. Index untuk Histori Pemindaian
    // Mempercepat sortir berdasarkan waktu scan terbaru
    {
      name: 'idx_scanned_at',
      fields: ['scanned_at']
    }
  ]
});

// Definisi Relasi
StockOpname.hasMany(StockOpnameDetail, { foreignKey: 'stockOpnameId' });
StockOpnameDetail.belongsTo(StockOpname, { foreignKey: 'stockOpnameId' });

StockOpnameDetail.belongsTo(Eksemplar, { foreignKey: 'eksemplarId' });
Eksemplar.hasMany(StockOpnameDetail, { foreignKey: 'eksemplarId' });

module.exports = StockOpnameDetail;