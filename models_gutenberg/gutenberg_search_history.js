const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gutenberg_search_history', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    search_query: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    search_type: {
      type: DataTypes.ENUM('query','browse','category'),
      allowNull: true,
      defaultValue: "query"
    },
    results_found: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    books_downloaded: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    search_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'gutenberg_search_history',
    timestamps: false,
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
        name: "idx_query",
        using: "BTREE",
        fields: [
          { name: "search_query", length: 100 },
        ]
      },
      {
        name: "idx_type",
        using: "BTREE",
        fields: [
          { name: "search_type" },
        ]
      },
      {
        name: "idx_date",
        using: "BTREE",
        fields: [
          { name: "search_date" },
        ]
      },
    ]
  });
};
