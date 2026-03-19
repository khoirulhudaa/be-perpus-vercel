require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/database');
const http = require('http');               // ← tambahkan ini
const { Server } = require('socket.io');

const { globalLimiter } = require('./middlewares/rateLimiter');

const apiRoutes = require('./routes'); 

const app = express();
const port = process.env.PORT || 5010;

// Buat HTTP server secara eksplisit supaya bisa dipasang socket.io
const server = http.createServer(app);

// Inisialisasi Socket.IO
const io = new Server(server, {
  cors: {
    // sesuaikan di production nanti (misal: ['https://go.kiraproject.id'])
    origin: '*',                        
    methods: ['GET', 'POST'],
    credentials: true
  },
  // biar koneksi stabil di jaringan sekolah yang kadang lelet
  pingTimeout: 60000,                   
  pingInterval: 25000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000
});

// Attach io ke app supaya bisa diakses di controller/middleware
app.set('io', io);    
// ────────────────────────────────────────────────
// Socket.IO Event Handlers (global)
// ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Client (TV) mengirim event 'join' dengan schoolId
  socket.on('join', (schoolId) => {
    if (!schoolId) return;

    const room = `school:${schoolId}`;
    socket.join(room);
    console.log(`[SOCKET] Client ${socket.id} joined room: ${room}`);
    
    // Optional: kirim konfirmasi ke client
    socket.emit('joined', { room, message: `Joined room ${room}` });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Client ${socket.id} disconnected: ${reason}`);
  });

  // Optional: handle error
  socket.on('error', (err) => {
    console.error('[SOCKET ERROR]', err);
  });
});                 

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
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('DB connection failed:', err);
    process.exit(1);
});

module.exports = { app, io, server };