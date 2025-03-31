const { Sequelize } = require("sequelize");
const path = require("path"); // Ajout de l'import du module path
require("dotenv").config({ path: path.join(__dirname, ".env.local") });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);

module.exports = sequelize;
