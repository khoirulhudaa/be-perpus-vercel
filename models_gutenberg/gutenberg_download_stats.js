const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gutenberg_download_stats', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: "unique_date"
    },
    books_scraped: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    files_found: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    files_downloaded: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    download_errors: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    total_size_downloaded: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    scraping_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    download_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'gutenberg_download_stats',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "unique_date",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "date" },
        ]
      },
    ]
  });
};
