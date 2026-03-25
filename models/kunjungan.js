const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Kunjungan = sequelize.define("Kunjungan", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  peminjamId: { type: DataTypes.STRING, allowNull: false, field: 'peminjam_id' },
  peminjamName: { type: DataTypes.STRING, field: 'peminjam_name' },
  waktuMasuk: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'waktu_masuk' },
  waktuPulang: { type: DataTypes.DATE, field: 'waktu_pulang' },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' }
}, {
  tableName: 'kunjungan',
  timestamps: true
});

module.exports = Kunjungan;