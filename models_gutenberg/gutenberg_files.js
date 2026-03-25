const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gutenberg_files', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'gutenberg_books',
        key: 'id'
      }
    },
    filename: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    file_format: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    file_path: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    download_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_hash: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    download_status: {
      type: DataTypes.ENUM('pending','downloading','completed','failed','skipped'),
      allowNull: true,
      defaultValue: "pending"
    },
    download_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    downloaded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'gutenberg_files',
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
        name: "unique_book_format",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "book_id" },
          { name: "file_format" },
        ]
      },
      {
        name: "idx_book_id",
        using: "BTREE",
        fields: [
          { name: "book_id" },
        ]
      },
      {
        name: "idx_format",
        using: "BTREE",
        fields: [
          { name: "file_format" },
        ]
      },
      {
        name: "idx_status",
        using: "BTREE",
        fields: [
          { name: "download_status" },
        ]
      },
      {
        name: "idx_hash",
        using: "BTREE",
        fields: [
          { name: "file_hash" },
        ]
      },
    ]
  });
};
