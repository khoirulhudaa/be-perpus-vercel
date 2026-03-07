const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Biblio = require('./biblio');

const SerialSubscription = sequelize.define('SerialSubscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  biblioId: { 
    type: DataTypes.INTEGER, 
    field: 'biblio_id',
    allowNull: false
  },
  periodicity: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }, 
  startPeriod: { type: DataTypes.DATE, field: 'start_period' },
  endPeriod: { type: DataTypes.DATE, field: 'end_period' },
  status: { type: DataTypes.ENUM('Aktif', 'Berhenti'), defaultValue: 'Aktif' },
  schoolId: { 
    type: DataTypes.INTEGER, 
    field: 'school_id',
    allowNull: false 
  }
}, {
  tableName: 'serial_subscription',
  timestamps: true,
  indexes: [
    // 1. Index untuk Relasi dan Multitenancy
    // Mempercepat join dengan tabel Biblio dalam konteks sekolah tertentu
    {
      name: 'idx_serial_school_biblio',
      fields: ['school_id', 'biblio_id']
    },
    // 2. Index untuk Pemantauan Masa Berlaku
    // Sangat penting untuk fitur "Pemberitahuan Langganan Segera Berakhir"
    {
      name: 'idx_serial_expiration',
      fields: ['school_id', 'end_period', 'status']
    },
    // 3. Index untuk Filter Status
    // Mempercepat pencarian majalah/serial yang masih aktif saja
    {
      name: 'idx_serial_status',
      fields: ['school_id', 'status']
    }
  ]
});

// Definisi Relasi
Biblio.hasOne(SerialSubscription, { foreignKey: 'biblioId' });
SerialSubscription.belongsTo(Biblio, { foreignKey: 'biblioId' });

module.exports = SerialSubscription;