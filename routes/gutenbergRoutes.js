const express = require('express');
const router = express.Router();
const gutenbergController = require('../controllers/gutenbergController');

// Endpoint: /api/gutenberg
router.get('/books', gutenbergController.getGutenbergBooks);
router.get('/books/:id', gutenbergController.getBookById);
router.post('/books', gutenbergController.createBookManual);
router.delete('/books/:id', gutenbergController.deleteBook);

module.exports = router;