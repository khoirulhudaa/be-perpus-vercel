const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const Eksemplar = require("./eksemplar");

const Peminjaman = sequelize.define("Peminjaman", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  peminjamName: { type: DataTypes.STRING, allowNull: false, field: 'peminjam_name' },
  peminjamId: { type: DataTypes.STRING, field: 'peminjam_id' }, // NIS atau NIK
  eksemplarId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    field: 'eksemplar_id', 
    references: { 
      model: 'eksemplar',
      key: 'id' 
    } 
  },
  tglPinjam: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'tgl_pinjam' },
  tglKembali: { type: DataTypes.DATEONLY, allowNull: false, field: 'tgl_kembali' }, 
  tglRealisasiKembali: { type: DataTypes.DATEONLY, field: 'tgl_realisasi_kembali' }, 
  denda: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { 
    type: DataTypes.ENUM("Dipinjam", "Kembali", "Terlambat"), 
    defaultValue: "Dipinjam" 
  },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' }
}, {
  tableName: 'peminjaman',
  timestamps: true,
  indexes: [
    // 1. Index untuk Sirkulasi (Scan Kembali)
    // Mempercepat pencarian data peminjaman aktif saat buku di-scan untuk dikembalikan
    {
      name: 'idx_peminjaman_active_scan',
      fields: ['school_id', 'eksemplar_id', 'status']
    },
    // 2. Index untuk Riwayat Member
    // Mempercepat pencarian "Buku apa saja yang sedang/pernah dipinjam siswa A?"
    {
      name: 'idx_peminjaman_member',
      fields: ['school_id', 'peminjam_id', 'status']
    },
    // 3. Index untuk Monitoring Keterlambatan
    // Digunakan oleh sistem untuk mengecek buku yang melewati tgl_kembali
    {
      name: 'idx_peminjaman_overdue_check',
      fields: ['school_id', 'status', 'tgl_kembali']
    },
    // 4. Index Laporan Bulanan
    // Mempercepat penarikan laporan transaksi berdasarkan rentang waktu
    {
      name: 'idx_peminjaman_date_range',
      fields: ['school_id', 'tgl_pinjam']
    }
  ]
});

// Relasi
Peminjaman.belongsTo(Eksemplar, { foreignKey: 'eksemplarId' });
Eksemplar.hasMany(Peminjaman, { foreignKey: 'eksemplarId' });

module.exports = Peminjaman;