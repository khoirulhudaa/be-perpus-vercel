var DataTypes = require("sequelize").DataTypes;
var _gutenberg_books = require("./gutenberg_books");
var _gutenberg_download_stats = require("./gutenberg_download_stats");
var _gutenberg_files = require("./gutenberg_files");
var _gutenberg_search_history = require("./gutenberg_search_history");
var _migrations = require("./migrations");

function initModels(sequelize) {
  var gutenberg_books = _gutenberg_books(sequelize, DataTypes);
  var gutenberg_download_stats = _gutenberg_download_stats(sequelize, DataTypes);
  var gutenberg_files = _gutenberg_files(sequelize, DataTypes);
  var gutenberg_search_history = _gutenberg_search_history(sequelize, DataTypes);
  var migrations = _migrations(sequelize, DataTypes);

  gutenberg_files.belongsTo(gutenberg_books, { as: "book", foreignKey: "book_id"});
  gutenberg_books.hasMany(gutenberg_files, { as: "gutenberg_files", foreignKey: "book_id"});

  return {
    gutenberg_books,
    gutenberg_download_stats,
    gutenberg_files,
    gutenberg_search_history,
    migrations,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
