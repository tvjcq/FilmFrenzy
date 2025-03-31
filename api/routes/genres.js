const express = require("express");
const router = express.Router();
const { Genre } = require("../models");

router.get("/", async (req, res) => {
  try {
    const genres = await Genre.findAll();
    res.json(genres);
  } catch (error) {
    console.error("Error fetching genres:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const genre = await Genre.findByPk(id);

    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }

    res.json(genre);
  } catch (error) {
    console.error("Error fetching genre:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
