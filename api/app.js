const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");
const app = express();

app.use(cors());
app.use(express.json());

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection to database has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// Sync models with database
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database & tables synchronized");
  })
  .catch((err) => {
    console.error("Error synchronizing database:", err);
  });

// Import routes
const moviesRoutes = require("./routes/movies");
const actorsRoutes = require("./routes/actors");
const genresRoutes = require("./routes/genres");
const statsRoutes = require("./routes/stats");
const randomRoutes = require("./routes/random");
const wikipediaRoutes = require("./routes/wikipedia");

// Use routes
app.use("/api/movies", moviesRoutes);
app.use("/api/actors", actorsRoutes);
app.use("/api/genres", genresRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/random", randomRoutes);
app.use("/api/wikipedia", wikipediaRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
