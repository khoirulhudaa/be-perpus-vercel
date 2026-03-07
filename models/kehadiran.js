const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const KehadiranPerpus = sequelize.define("KehadiranPerpus", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userRole: { type: DataTypes.ENUM('student', 'teacher'), defaultValue: 'student' },
  studentId: { type: DataTypes.INTEGER, allowNull: true },
  guruId: { type: DataTypes.INTEGER, allowNull: true },
  userName: { type: DataTypes.STRING, allowNull: true }, // Tambahkan ini sebagai cache nama
  waktuMasuk: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  waktuPulang: { type: DataTypes.DATE, allowNull: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  nis: { type: DataTypes.STRING, allowNull: true },   // Untuk Siswa
  nip: { type: DataTypes.STRING, allowNull: true },   // Untuk Guru
  email: { type: DataTypes.STRING, allowNull: true }, // Untuk Guru
}, {
  tableName: 'kehadiran_perpus',
  timestamps: true,
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['waktuMasuk'] },
    { fields: ['studentId', 'waktuPulang', 'schoolId'] },
    { fields: ['guruId', 'waktuPulang', 'schoolId'] }
  ]
});

module.exports = KehadiranPerpus;