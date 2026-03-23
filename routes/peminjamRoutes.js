const express = require("express");
const router = express.Router();
const pinjamCtrl = require("../controllers/peminjamController");
const cache = require("../middlewares/cache");

router.get("/", cache(120), pinjamCtrl.getAllPeminjaman);
router.get("/report", cache(300), pinjamCtrl.getKunjunganReport);
router.get("/:id", pinjamCtrl.getPinjamById);
router.post("/", pinjamCtrl.createPinjam);
router.put("/kembali/:id", pinjamCtrl.pengembalianBuku); 
router.delete("/:id", pinjamCtrl.deletePinjam);

router.post("/kehadiran", pinjamCtrl.scanKehadiranPerpus);
router.get('/recent-kehadiran', pinjamCtrl.getRecentKehadiranPerpus);
router.post("/pinjam", pinjamCtrl.scanPinjamKiosk);
router.post("/kembali", pinjamCtrl.scanKembaliKiosk);
router.put('/perpanjang/:id', pinjamCtrl.extendLoan);

module.exports = router;