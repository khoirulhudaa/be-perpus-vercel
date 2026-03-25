const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/database");

const EResource = sequelize.define('EResource', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  schoolId: { type: DataTypes.INTEGER, field: 'school_id' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, { tableName: 'e_resources', timestamps: true });

module.exports = EResource;