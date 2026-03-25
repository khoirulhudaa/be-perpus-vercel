const { DataTypes } = require("sequelize");
const Biblio = require("./biblio");
const { sequelize } = require("../config/database");

const Eksemplar = sequelize.define("Eksemplar", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  biblioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'biblio_id', 
    references: {
      model: 'biblio', 
      // PERBAIKAN: Gunakan nama kolom fisik di database
      key: 'biblio_id', 
    },
  },
  registerNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Nomor Barcode / No Induk Fisik Buku",
  },
  callNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Nomor Panggil Rak (misal: 800.12 AND l)",
  },
  status: {
    type: DataTypes.ENUM("Tersedia", "Dipinjam", "Rusak", "Hilang"),
    defaultValue: "Tersedia",
  },
  condition: {
    type: DataTypes.STRING,
    defaultValue: "Baik",
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'eksemplar',
  timestamps: true,
});

// --- DEFINISI RELASI ---

// Di Biblio (Parent)
Biblio.hasMany(Eksemplar, { 
  foreignKey: "biblioId", // Properti di model Eksemplar
  sourceKey: "biblioId",  // Properti di model Biblio
  onDelete: "CASCADE" 
});

// Di Eksemplar (Child)
Eksemplar.belongsTo(Biblio, { 
  foreignKey: "biblioId", // Properti di model Eksemplar
  targetKey: "biblioId"   // Properti di model Biblio
});

module.exports = Eksemplar;