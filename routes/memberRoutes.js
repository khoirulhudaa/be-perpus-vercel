const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// Definisi Route CRUD
router.get('/', memberController.getAllMembers);
router.post('/', memberController.createMember);
router.put('/:id', memberController.updateMember);
router.delete('/:id', memberController.deleteMember);
router.post('/bulk', memberController.bulkCreateMembers);

module.exports = router;