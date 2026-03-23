const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const cache = require('../middlewares/cache');

// Definisi Route CRUD
router.get('/', cache(120), memberController.getAllMembers);
router.post('/', memberController.createMember);
router.put('/:id', memberController.updateMember);
router.delete('/:id', memberController.deleteMember);

module.exports = router;