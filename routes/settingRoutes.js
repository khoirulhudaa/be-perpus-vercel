const express = require('express');
const multer = require('multer');
const settingController = require('../controllers/settingController');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // Limit 2MB per file
});

// Mendukung upload 3 jenis file sekaligus
const cpUpload = upload.fields([
  { name: 'kopSurat', maxCount: 1 },
  { name: 'signatureImg', maxCount: 1 },
  { name: 'memberBadgeLogo', maxCount: 1 }
]);

router.get('/', settingController.getSettings);
router.post('/', cpUpload, settingController.updateSettings);

module.exports = router;