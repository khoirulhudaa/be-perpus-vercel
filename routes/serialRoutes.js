const express = require('express');
const router = express.Router();
const serCtrl = require('../controllers/serialController');

router.post('/subscriptions', serCtrl.createSubscription);
router.get('/subscriptions', serCtrl.getAllSubscriptions);
router.post('/generate-issues', serCtrl.generateIssues);
router.put('/receive-issue/:id', serCtrl.receiveIssue);
router.get('/issues', serCtrl.getIssuesBySubscription);
router.put('/issues/:id', serCtrl.updateIssue);

router.delete('/issues/:id', serCtrl.deleteIssue);
    
module.exports = router;