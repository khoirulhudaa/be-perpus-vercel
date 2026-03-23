const Genre = require('../models/genre');

exports.getGenres = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const data = await Genre.findAll({ where: { schoolId } });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createGenre = async (req, res) => {
  try {
    const data = await Genre.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateGenre = async (req, res) => {
  try {
    await Genre.update(req.body, { where: { genreId: req.params.id } });
    res.json({ success: true, message: "Genre updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteGenre = async (req, res) => {
  try {
    await Genre.destroy({ where: { genreId: req.params.id } });
    res.json({ success: true, message: "Genre deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};