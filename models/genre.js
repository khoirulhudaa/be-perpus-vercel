const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/database");

const Genre = sequelize.define('Genre', {
  genreId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'genre_id' },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING(20), field: 'code' }, // Hilangkan unique:true jika multitenant (karena kode yang sama bisa dipakai sekolah berbeda)
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.BOOLEAN, defaultValue: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' }
}, {
  tableName: 'genres',
  timestamps: true,
  indexes: [
    // 1. Index Multitenancy: Mempercepat list genre per sekolah
    {
      name: 'idx_genre_school_status',
      fields: ['school_id', 'status']
    },
    // 2. Index Kode: Untuk pencarian cepat berdasarkan kode (misal: FIC, NVL)
    {
      name: 'idx_genre_code_school',
      fields: ['school_id', 'code']
    }
  ]
});

module.exports = Genre;