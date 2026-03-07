require('dotenv').config();
const { Sequelize, Transaction } = require('sequelize');
const mysql2 = require('mysql2'); // Tambahkan baris ini

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    dialectModule: mysql2,
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    logging: false, 
    // pool: {
    //   max: 20,           
    //   min: 5,            
    //   acquire: 60000,    
    //   idle: 10000        
    // },
    
    // setingan vercel saja
    pool: {
      max: 5,           // Kecilkan dari 20 ke 5 agar tidak membanjiri koneksi
      min: 0,           // Biarkan 0 agar koneksi bisa ditutup saat tidak dipakai
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000 
    }
  }
);

module.exports = sequelize;