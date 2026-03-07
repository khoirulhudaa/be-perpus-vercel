const express = require('express');
const multer = require('multer');
const biblioController = require('../controllers/biblioController');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Mendukung upload gambar sampul dan file lampiran (E-book)
const cpUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'fileAtt', maxCount: 1 }
]);

router.get('/', biblioController.getAllBiblio);
router.get('/all', biblioController.getBiblioSelection);
router.post('/', cpUpload, biblioController.createBiblio);
router.delete('/:id', biblioController.deleteBiblio);

module.exports = router;