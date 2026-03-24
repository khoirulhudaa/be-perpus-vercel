const express = require('express');
const multer = require('multer');
const biblioController = require('../controllers/biblioController');
const cache = require('../middlewares/cache');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Mendukung upload gambar sampul dan file lampiran (E-book)
const cpUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'fileAtt', maxCount: 1 }
]);

router.get('/', cache(120), biblioController.getAllBiblio);
router.get('/all', biblioController.getBiblioSelection);
router.post('/', cpUpload, biblioController.createBiblio);
router.delete('/:id', biblioController.deleteBiblio);
router.put('/:id', cpUpload, biblioController.updateBiblio);
router.post('/bulk-json', biblioController.bulkCreateFromJson);

module.exports = router;