const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Genre = sequelize.define('Genre', {
  genreId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'genre_id' },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING(20), unique: true }, // Contoh: FIC (Fiction)
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.BOOLEAN, defaultValue: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' }
}, {
  tableName: 'genres',
  timestamps: true
});

module.exports = Genre;