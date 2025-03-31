const { DataTypes } = require("sequelize");
const sequelize = require("../config");

const Genre = sequelize.define(
  "Genre",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    tableName: "genres",
    timestamps: false,
  }
);

module.exports = Genre;
