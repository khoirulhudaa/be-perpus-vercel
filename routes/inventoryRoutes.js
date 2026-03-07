const express = require('express');
const router = express.Router();
const invCtrl = require('../controllers/inventarisController');

router.get('/sessions', invCtrl.getAllSessions);
router.post('/sessions', invCtrl.createSession);
router.post('/scan', invCtrl.scanItem);
router.put('/finalize/:id', invCtrl.finalizeSession);
router.get('/sessions/:id/logs', invCtrl.getSessionDetails);

module.exports = router;