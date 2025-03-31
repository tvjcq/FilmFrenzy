const { DataTypes } = require("sequelize");
const sequelize = require("../config");
const Movie = sequelize.define(
  "Movie",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1888, // The year the first movie was made
        max: new Date().getFullYear(),
      },
    },
  },
  {
    tableName: "movies",
    timestamps: false,
  }
);

module.exports = Movie;
