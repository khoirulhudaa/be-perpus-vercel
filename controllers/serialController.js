const SerialSubscription = require('../models/serialSubscription');
const SerialIssue = require('../models/serialIssue');
const Biblio = require('../models/biblio');

// GET ALL SUBSCRIPTIONS
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const data = await SerialSubscription.findAll({ 
      where: { schoolId },
      include: [{ 
        model: Biblio, 
        attributes: ['title', 'isbnIssn'] // Ambil judul untuk ditampilkan di kartu
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// Tambahkan fungsi ini di controller
exports.getIssuesBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.query;
    
    if (!subscriptionId) {
      return res.status(400).json({ success: false, message: "Subscription ID diperlukan" });
    }

    const data = await SerialIssue.findAll({
      where: { subscriptionId },
      order: [['expectedDate', 'ASC']] // Urutkan dari yang paling lama ke terbaru
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE NEW SUBSCRIPTION
exports.createSubscription = async (req, res) => {
  try {
    const { biblioId, periodicity, startPeriod, endPeriod, schoolId } = req.body;

    // Validasi manual sebelum insert (Opsional tapi disarankan)
    const biblio = await Biblio.findByPk(biblioId);
    if (!biblio) {
      return res.status(404).json({ success: false, message: "Data Bibliografi tidak ditemukan" });
    }

    const data = await SerialSubscription.create({
      biblioId: parseInt(biblioId),
      periodicity,
      startPeriod,
      endPeriod,
      schoolId: parseInt(schoolId),
      status: 'Aktif'
    });

    res.status(201).json({ success: true, data });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
};

exports.generateIssues = async (req, res) => {
  try {
    const { subscriptionId, count, startDate } = req.body;
    let issues = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      issues.push({ 
        subscriptionId, 
        expectedDate: date, 
        status: 'Expected',
        number: (i + 1).toString(), // Mengisi nomor urut otomatis
        volume: '1' // Bisa disesuaikan
      });
    }
    await SerialIssue.bulkCreate(issues);
    res.json({ success: true, message: "Jadwal terbit berhasil dibuat" });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
};

exports.receiveIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await SerialIssue.update(
      { status: 'Arrived', receivedDate: new Date() }, 
      { where: { id } }
    );
    res.json({ success: true, message: "Edisi serial telah diterima" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// UPDATE ISSUE (Edit tanggal, volume, nomor, atau status)
exports.updateIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { expectedDate, status } = req.body;
    await SerialIssue.update(
      { expectedDate, status },
      { where: { id } }
    );
    res.json({ success: true, message: "Berhasil diupdate" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE ISSUE
exports.deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    await SerialIssue.destroy({ where: { id } });
    res.json({ success: true, message: "Edisi berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};