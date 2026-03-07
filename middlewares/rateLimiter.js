const rateLimit = require('express-rate-limit');

const commonConfig = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip, 
};

const globalLimiter = rateLimit({
  ...commonConfig,
  windowMs: 15 * 60 * 1000,
  limit: 500, 
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti.' },
});

const strictLimiter = rateLimit({
  ...commonConfig,
  windowMs: 60 * 1000,
  limit: 10,
  message: { success: false, message: 'Terlalu banyak percobaan, tunggu 1 menit.' },
});

const uploadLimiter = rateLimit({
  ...commonConfig,
  windowMs: 60 * 60 * 1000,
  limit: 50,
  message: { success: false, message: 'Batas upload per jam tercapai (50/jam).' },
});

// Export supaya bisa dipakai per route atau global
module.exports = {
  globalLimiter,
  strictLimiter,
  uploadLimiter,
};