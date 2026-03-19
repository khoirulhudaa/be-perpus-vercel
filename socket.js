const { Server } = require('socket.io');

let ioInstance = null;

module.exports = {
  init: (httpServer) => {
    if (!ioInstance) {
      ioInstance = new Server(httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000
      });

      // Event handler global
      ioInstance.on('connection', (socket) => {
        console.log(`[SOCKET] Client connected: ${socket.id}`);

        socket.on('join', (schoolId) => {
          if (!schoolId) return;
          const room = `school:${schoolId}`;
          socket.join(room);
          console.log(`[SOCKET] ${socket.id} joined ${room}`);
          socket.emit('joined', { room });
        });

        socket.on('disconnect', (reason) => {
          console.log(`[SOCKET] Disconnected: ${reason}`);
        });
      });
    }
    return ioInstance;
  },
  getIO: () => {
    if (!ioInstance) {
      throw new Error('Socket.IO belum diinisialisasi. Panggil init() terlebih dahulu.');
    }
    return ioInstance;
  }
};