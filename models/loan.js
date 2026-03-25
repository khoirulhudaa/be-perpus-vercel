const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/database");

const Loan = sequelize.define('Loan', {
  loanId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'loan_id' },
  biblioId: { type: DataTypes.INTEGER, allowNull: false, field: 'biblio_id' },
  memberId: { type: DataTypes.INTEGER, allowNull: false, field: 'member_id' }, // ID Siswa
  loanDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'loan_date' },
  dueDate: { type: DataTypes.DATE, allowNull: false, field: 'due_date' },
  returnDate: { type: DataTypes.DATE, field: 'return_date' },
  fineAmount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'fine_amount' },
  isExtended: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_extended' },
  status: { type: DataTypes.ENUM('Pinjam', 'Kembali'), defaultValue: 'Pinjam' },
  schoolId: { type: DataTypes.INTEGER, allowNull: false, field: 'school_id' }
}, { tableName: 'loans', timestamps: true });

module.exports = Loan;