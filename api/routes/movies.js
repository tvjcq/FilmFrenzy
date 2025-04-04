const express = require("express");
const router = express.Router();
const { Movie, Actor, Genre } = require("../models");

router.get("/", async (req, res) => {
  try {
    const movies = await Movie.findAll();
    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const movie = await Movie.findByPk(id, {
      include: [
        {
          model: Actor,
          as: "actors",
          through: {
            // Exclure complètement l'objet MoviesActors de la réponse
            attributes: [],
          },
        },
        {
          model: Genre,
          as: "genres",
          through: {
            // Exclure complètement l'objet MoviesGenres de la réponse
            attributes: [],
          },
        },
      ],
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(movie);
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
