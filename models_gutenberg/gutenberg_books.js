const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gutenberg_books', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    gutenberg_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: "gutenberg_id"
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    author: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    downloads: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    gutenberg_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    file_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    total_downloads_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    scraped_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'gutenberg_books',
    timestamps: true, 
    createdAt: 'scraped_at', // Map standar Sequelize ke kolom asli kamu
    updatedAt: 'updated_at', // Map standar Sequelize ke kolom asli kamu
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
        name: "gutenberg_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "gutenberg_id" },
        ]
      },
      {
        name: "idx_gutenberg_id",
        using: "BTREE",
        fields: [
          { name: "gutenberg_id" },
        ]
      },
      {
        name: "idx_author",
        using: "BTREE",
        fields: [
          { name: "author", length: 100 },
        ]
      },
      {
        name: "idx_language",
        using: "BTREE",
        fields: [
          { name: "language" },
        ]
      },
      {
        name: "idx_downloads",
        using: "BTREE",
        fields: [
          { name: "downloads" },
        ]
      },
      {
        name: "title",
        type: "FULLTEXT",
        fields: [
          { name: "title" },
          { name: "author" },
          { name: "subject" },
        ]
      },
    ]
  });
};
