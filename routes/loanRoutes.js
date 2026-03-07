const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

router.post('/scan-qr', loanController.processQRAction);
router.get('/history/:memberId', loanController.getMemberHistory);
router.put('/extend/:id', loanController.extendLoan);

module.exports = router;