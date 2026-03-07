const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const SerialSubscription = require('./serialSubscription');

const SerialIssue = sequelize.define('SerialIssue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  subscriptionId: { 
    type: DataTypes.INTEGER, 
    field: 'subscription_id',
    allowNull: false 
  },
  volume: { type: DataTypes.STRING },
  number: { type: DataTypes.STRING },
  expectedDate: { type: DataTypes.DATE, field: 'expected_date' },
  receivedDate: { type: DataTypes.DATE, field: 'received_date' },
  status: { 
    type: DataTypes.ENUM('Expected', 'Arrived', 'Missing'), 
    defaultValue: 'Expected' 
  }
}, {
  tableName: 'serial_issue',
  timestamps: true,
  indexes: [
    // 1. Index untuk Relasi Utama
    // Mempercepat pengambilan semua edisi dari satu langganan tertentu
    {
      name: 'idx_issue_subscription_id',
      fields: ['subscription_id']
    },
    // 2. Index untuk Pemantauan Status & Jadwal
    // Sangat berguna untuk Dashboard "Edisi yang Belum Datang" atau "Klaim Edisi Hilang"
    {
      name: 'idx_issue_status_expected',
      fields: ['status', 'expected_date']
    },
    // 3. Composite Index untuk Identifikasi Unik Edisi
    // Mempercepat pencarian edisi spesifik (Misal: Majalah Tempo Vol 10 No 5)
    {
      name: 'idx_issue_volume_number',
      fields: ['subscription_id', 'volume', 'number']
    },
    // 4. Index untuk Histori Penerimaan
    // Berguna untuk laporan kronologis kedatangan fisik majalah/serial
    {
      name: 'idx_issue_received_date',
      fields: ['received_date']
    }
  ]
});

// Definisi Relasi
SerialSubscription.hasMany(SerialIssue, { foreignKey: 'subscriptionId' });
SerialIssue.belongsTo(SerialSubscription, { foreignKey: 'subscriptionId' });

module.exports = SerialIssue;