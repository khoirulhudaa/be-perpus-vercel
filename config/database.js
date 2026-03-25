// require('dotenv').config();
// const { Sequelize, Transaction } = require('sequelize');
// const mysql2 = require('mysql2'); // Tambahkan baris ini

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     dialect: 'mysql',
//     dialectModule: mysql2,
//     isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
//     logging: false, 
//      pool: {
//       max: 30,          
//       min: 5,
//       acquire: 120000,  
//       idle: 30000,      
//       evict: 1000,      
//     },
//     dialectOptions: {
//       connectTimeout: 60000 
//     },
//   }
// );

// module.exports = sequelize;


require('dotenv').config();
const { Sequelize, Transaction } = require('sequelize');
const mysql2 = require('mysql2');

// Konfigurasi Common (agar tidak menulis ulang pool & dialect)
const commonConfig = {
  dialect: 'mysql',
  dialectModule: mysql2,
  isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  logging: false, 
  pool: {
    max: 30,          
    min: 5,
    acquire: 120000,  
    idle: 30000,      
    evict: 1000,      
  },
  dialectOptions: {
    connectTimeout: 60000 
  },
};

// 1. Instance Database Utama (Lama)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    ...commonConfig
  }
);

// 2. Instance Database Gutenberg (Baru)
// Kamu bisa masukkan variabel ini ke .env agar lebih aman
const sequelizeGutenberg = new Sequelize(
  process.env.DB_GUTENBERG_NAME,
  process.env.DB_GUTENBERG_USER,
  process.env.DB_GUTENBERG_PASS,
  {
    host: process.env.DB_GUTENBERG_HOST,
    ...commonConfig
  }
);

// Ekspor sebagai Object
module.exports = {
  sequelize,           // Instance lama
  sequelizeGutenberg   // Instance baru
};