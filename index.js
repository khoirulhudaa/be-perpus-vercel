require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/database');
const socket = require('./socket'); // file baru tadi
const http = require('http');

const { globalLimiter } = require('./middlewares/rateLimiter');

const apiRoutes = require('./routes'); 

const app = express();
const port = process.env.PORT || 5010;
const server = http.createServer(app);
socket.init(server); // inisialisasi di sini

app.set('trust proxy', 1);

if (process.env.NODE_ENV !== 'production') {
  app.set('json spaces', 2);
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global limiter untuk SEMUA request (tetap di app level)
app.use(globalLimiter);

// Static folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Folder uploads dibuat otomatis');
}
app.use('/uploads', express.static(uploadDir));

// ── Hanya 1 baris ini untuk semua routes + limiter mereka ───────
app.use('/', apiRoutes);          

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]:', err.message, err.stack?.substring(0, 300));
  console.error('[ERROR]');
  
  if (err.status === 429) {
    return res.status(429).json(err);
  }

  res.status(500).json({
    success: false,
    message: 'Server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
  });
});

// Database connection & start server
sequelize.authenticate()
  .then(() => {
    console.log('MySQL connected!');
    return sequelize.sync({ alter: false, force: false });
  })
  .then(() => {
    console.log('Tables synced');
    server.listen(port, '0.0.0.0', () => {  // ← penting: server.listen, bukan app.listen
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });