const express = require("express");
const router = express.Router();
const eksemplarController = require("../controllers/ekslemparController");
const cache = require("../middlewares/cache");

// Path: /eksemplar
router.get("/", cache(120), eksemplarController.getAllEksemplar);
router.post("/", eksemplarController.createEksemplar);
router.put("/:id", eksemplarController.updateEksemplar);
router.delete("/:id", eksemplarController.deleteEksemplar);

module.exports = router;