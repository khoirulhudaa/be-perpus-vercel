const express = require('express');
const router = express.Router();
const infoController = require('../controllers/infoController');

router.get('/eresources', infoController.getEResources);
router.get('/contact', infoController.getContactInfo);

module.exports = router;