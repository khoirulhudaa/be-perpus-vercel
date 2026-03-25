const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Member = sequelize.define("Member", {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  nomorInduk: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true, 
    field: 'nomor_induk' 
  },
  nama: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  role: { 
    type: DataTypes.ENUM("Siswa", "Guru", "Staf"), 
    defaultValue: "Siswa" 
  },
  gender: {
    type: DataTypes.ENUM("L", "P"),
    allowNull: true
  },
  kelas: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  kontak: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true, 
    field: 'is_active' 
  },
  schoolId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    field: 'school_id' 
  }
}, {
  tableName: 'members',
  timestamps: true,
  indexes: [
    // 1. Index untuk pencarian cepat berdasarkan schoolId (Multitenancy)
    {
      name: 'idx_member_school_id',
      fields: ['school_id']
    },
    // 2. Composite Index untuk pencarian & filter anggota di satu sekolah
    // Mempercepat query seperti: SELECT * FROM members WHERE school_id = 1 AND nomor_induk = '123'
    {
      name: 'idx_member_school_nomor_induk',
      unique: true,
      fields: ['school_id', 'nomor_induk']
    },
    // 3. Index untuk filter role dan status aktif dalam satu sekolah
    // Mempercepat filter di Dashboard atau Tabel Anggota (e.g., filter Siswa Aktif)
    {
      name: 'idx_member_school_role_active',
      fields: ['school_id', 'role', 'is_active']
    },
    // 4. Index untuk pencarian nama (Full-text search manual biasanya menggunakan LIKE 'John%')
    {
      name: 'idx_member_nama',
      fields: ['nama']
    }
  ]
});

module.exports = Member;