const Loan = require('../models/loan');
const Biblio = require('../models/biblio');
const { Op } = require('sequelize');

exports.processQRAction = async (req, res) => {
  try {
    const { biblioId, memberId, schoolId, action } = req.body; // action: 'pinjam' | 'kembali'

    if (action === 'pinjam') {
      // Cek apakah buku tersedia
      const book = await Biblio.findByPk(biblioId);
      if (!book || book.isActive === false) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Pinjam 7 hari

      const loan = await Loan.create({ biblioId, memberId, schoolId, dueDate, status: 'Pinjam' });
      return res.json({ success: true, message: 'Peminjaman Berhasil', data: loan });
    }

    if (action === 'kembali') {
      const loan = await Loan.findOne({ 
        where: { biblioId, memberId, status: 'Pinjam', schoolId },
        order: [['createdAt', 'DESC']]
      });

      if (!loan) return res.status(404).json({ success: false, message: 'Data pinjam tidak ditemukan' });

      const today = new Date();
      let fine = 0;
      if (today > loan.dueDate) {
        const diffDays = Math.ceil(Math.abs(today - loan.dueDate) / (1000 * 60 * 60 * 24));
        fine = diffDays * 500; // Misal denda 500/hari
      }

      await loan.update({ returnDate: today, fineAmount: fine, status: 'Kembali' });
      return res.json({ success: true, message: 'Pengembalian Berhasil', fine });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMemberHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    const history = await Loan.findAll({ 
      where: { memberId },
      include: [{ model: Biblio, attributes: ['title', 'image'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.extendLoan = async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id);
    if (!loan || loan.isExtended) return res.status(400).json({ success: false, message: 'Sudah pernah diperpanjang' });

    const newDue = new Date(loan.dueDate);
    newDue.setDate(newDue.getDate() + 7);
    await loan.update({ dueDate: newDue, isExtended: true });

    res.json({ success: true, message: 'Berhasil diperpanjang 7 hari' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};