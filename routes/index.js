  const express = require('express');
  const router = express.Router();

  // Import semua route handlers
  const biblioRoutes = require('./biblioRoutes');
  const authRoutes = require('./authRoutes');
  const loanRoutes = require('./loanRoutes');
  const infoRoutes = require('./infoRoutes');
  const eksemplarRoutes = require('./eksemplarRoutes');
  const memberRoutes = require('./memberRoutes');
  const inventoryRoutes = require('./inventoryRoutes');
  const serialRoutes = require('./serialRoutes');
  const settingRoutes = require('./settingRoutes');
  const genreRoutes = require('./genreRoutes');
  const peminjamRoutes = require('./peminjamRoutes');

  router.use('/peminjam', peminjamRoutes);     
  router.use('/inventory', inventoryRoutes);
  router.use('/serial', serialRoutes);
  router.use('/biblio', biblioRoutes);
  router.use('/auth', authRoutes);
  router.use('/loan', loanRoutes);     
  router.use('/info', infoRoutes);     
  router.use('/member', memberRoutes);     
  router.use('/setting', settingRoutes);     
  router.use('/eksemplar', eksemplarRoutes); 
  router.use('/genre', genreRoutes); 

  // Route testing (hanya ikut global limiter dari app.js)
  router.get('/testing', (req, res) => {
    res.json({
      success: true,
      message: `API PERPUSTAKAAN ONLINE 2026 ${new Date().getSeconds()}`,
      timestamp: new Date().toISOString()
    });
  });

  module.exports = router;