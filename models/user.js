const { DataTypes } = require('sequelize');
const { sequelize } = require("../config/database");

const User = sequelize.define('User', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  username: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    validate: { isEmail: true } 
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  role: { 
    type: DataTypes.ENUM('admin', 'pustakawan', 'superAdmin'), 
    defaultValue: 'admin' 
  },
  schoolId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    field: 'school_id' 
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true, 
    field: 'is_active' 
  },
   verificationPin: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;