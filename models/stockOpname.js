const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockOpname = sequelize.define('StockOpname', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  startDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'start_date' },
  endDate: { type: DataTypes.DATE, field: 'end_date' },
  status: { type: DataTypes.ENUM('Aktif', 'Selesai'), defaultValue: 'Aktif' },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' }
}, {
  tableName: 'stock_opname',
  timestamps: true,
  indexes: [
    // 1. Index untuk Multitenancy & Status Aktif
    // Sangat penting untuk mengecek apakah ada Stock Opname yang sedang berjalan di satu sekolah
    {
      name: 'idx_stock_opname_school_status',
      fields: ['school_id', 'status']
    },
    // 2. Index untuk Laporan Historis
    // Mempercepat pencarian stock opname berdasarkan rentang waktu tertentu
    {
      name: 'idx_stock_opname_start_date',
      fields: ['school_id', 'start_date']
    },
    // 3. Index untuk Sortir Terakhir
    // Berguna saat menampilkan daftar Stock Opname dari yang terbaru
    {
      name: 'idx_stock_opname_created_at',
      fields: ['createdAt']
    }
  ]
});

module.exports = StockOpname;