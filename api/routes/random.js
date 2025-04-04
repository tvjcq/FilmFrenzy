const express = require("express");
const router = express.Router();
const { Movie, Actor, Genre, sequelize } = require("../models");
const { QueryTypes } = require("sequelize");

/**
 * Route pour obtenir un film aléatoire qui a au moins un acteur ou un genre
 */
router.get("/movie", async (req, res) => {
  try {
    // Récupérer un film qui a au moins une relation (acteur ou genre)
    const randomMovie = await sequelize.query(
      `SELECT DISTINCT m.id, m.title, m.year
       FROM movies m
       LEFT JOIN MoviesActors ma ON m.id = ma.id_movie
       LEFT JOIN MoviesGenres mg ON m.id = mg.id_movie
       WHERE ma.id_actor IS NOT NULL OR mg.id_genre IS NOT NULL
       ORDER BY RAND()
       LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (!randomMovie || randomMovie.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No movies with relationships found",
      });
    }

    // Récupérer les détails complets du film
    const movieWithDetails = await Movie.findByPk(randomMovie[0].id, {
      include: [
        {
          model: Actor,
          as: "actors",
          through: { attributes: [] }, // Exclure les attributs de la table de jointure
          attributes: { exclude: ["createdAt", "updatedAt"] }, // Exclure createdAt et updatedAt des acteurs
        },
        {
          model: Genre,
          as: "genres",
          through: { attributes: [] }, // Exclure les attributs de la table de jointure
          attributes: { exclude: ["createdAt", "updatedAt"] }, // Exclure createdAt et updatedAt des genres
        },
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] }, // Exclure createdAt et updatedAt du film
    });

    res.json({
      status: "success",
      data: movieWithDetails,
    });
  } catch (error) {
    console.error("Error fetching random movie:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch random movie",
      error: error.message,
    });
  }
});

/**
 * Route pour obtenir un acteur aléatoire qui joue dans au moins un film
 */
router.get("/actor", async (req, res) => {
  try {
    // Récupérer un acteur qui joue dans au moins un film
    const randomActor = await sequelize.query(
      `SELECT DISTINCT a.id, a.name
       FROM actors a
       JOIN MoviesActors ma ON a.id = ma.id_actor
       ORDER BY RAND()
       LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (!randomActor || randomActor.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No actors with relationships found",
      });
    }

    // Récupérer les détails complets de l'acteur avec ses films
    const actorWithMovies = await Actor.findByPk(randomActor[0].id, {
      include: [
        {
          model: Movie,
          as: "movies",
          through: { attributes: [] }, // Exclure les attributs de la table de jointure
          attributes: { exclude: ["createdAt", "updatedAt"] }, // Exclure createdAt et updatedAt des films
          include: [
            {
              model: Genre,
              as: "genres",
              through: { attributes: [] }, // Exclure les attributs de la table de jointure
              attributes: { exclude: ["createdAt", "updatedAt"] }, // Exclure createdAt et updatedAt des genres
            },
          ],
        },
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] }, // Exclure createdAt et updatedAt de l'acteur
    });

    res.json({
      status: "success",
      data: actorWithMovies,
    });
  } catch (error) {
    console.error("Error fetching random actor:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch random actor",
      error: error.message,
    });
  }
});

/**
 * Route générique pour obtenir un élément aléatoire (film, acteur ou genre)
 */
router.get("/", async (req, res) => {
  try {
    // Choisir aléatoirement entre film, acteur et genre
    const randomChoice = Math.floor(Math.random() * 2);

    switch (randomChoice) {
      case 0:
        // Rediriger vers la route de film aléatoire
        return router.handle({ ...req, url: "/movie", method: "GET" }, res);
      case 1:
        // Rediriger vers la route d'acteur aléatoire
        return router.handle({ ...req, url: "/actor", method: "GET" }, res);
    }
  } catch (error) {
    console.error("Error processing random request:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch random item",
      error: error.message,
    });
  }
});

module.exports = router;
