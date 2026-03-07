const express = require("express");
const router = express.Router();
const pinjamCtrl = require("../controllers/peminjamController");

router.get("/", pinjamCtrl.getAllPeminjaman);
router.get("/report", pinjamCtrl.getKunjunganReport);
router.get("/:id", pinjamCtrl.getPinjamById);
router.post("/", pinjamCtrl.createPinjam);
router.put("/kembali/:id", pinjamCtrl.pengembalianBuku); 
router.delete("/:id", pinjamCtrl.deletePinjam);

router.post("/kehadiran", pinjamCtrl.scanKehadiranPerpus);
router.post("/pinjam", pinjamCtrl.scanPinjamKiosk);
router.post("/kembali", pinjamCtrl.scanKembaliKiosk);
router.put('/perpanjang/:id', pinjamCtrl.extendLoan);

module.exports = router;