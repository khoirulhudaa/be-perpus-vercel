const express = require("express");
const router = express.Router();
const eksemplarController = require("../controllers/ekslemparController");

// Path: /eksemplar
router.get("/", eksemplarController.getAllEksemplar);
router.post("/", eksemplarController.createEksemplar);
router.put("/:id", eksemplarController.updateEksemplar);
router.delete("/:id", eksemplarController.deleteEksemplar);

module.exports = router;