const express = require("express");
const router = express.Router();
const { Movie, Actor, Genre, sequelize } = require("../models");
const { QueryTypes } = require("sequelize");

/**
 * Route pour obtenir diverses statistiques sur la base de données FilmFrenzy
 */
router.get("/", async (req, res) => {
  try {
    // Statistiques à récupérer
    const stats = {};

    // 1. Nombre total de films
    stats.totalMovies = await Movie.count();

    // 2. Nombre total d'acteurs
    stats.totalActors = await Actor.count();

    // 3. Nombre total de genres
    stats.totalGenres = await Genre.count();

    // 4. Nombre de films par année
    const moviesByYear = await Movie.findAll({
      attributes: [
        "year",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["year"],
      order: [["year", "DESC"]],
      raw: true,
    });
    stats.moviesByYear = moviesByYear;

    // 5. Nombre moyen d'acteurs par film
    const avgActorsPerMovie = await sequelize.query(
      `SELECT AVG(actor_count) as averageActorsPerMovie
       FROM (
         SELECT ma.id_movie, COUNT(ma.id_actor) as actor_count
         FROM MoviesActors ma
         GROUP BY ma.id_movie
       ) as counts`,
      { type: QueryTypes.SELECT }
    );
    stats.averageActorsPerMovie =
      avgActorsPerMovie.length > 0
        ? parseFloat(avgActorsPerMovie[0].averageActorsPerMovie).toFixed(2)
        : 0;

    // 6. Nombre moyen de genres par film
    const avgGenresPerMovie = await sequelize.query(
      `SELECT AVG(genre_count) as averageGenresPerMovie
       FROM (
         SELECT mg.id_movie, COUNT(mg.id_genre) as genre_count
         FROM MoviesGenres mg
         GROUP BY mg.id_movie
       ) as counts`,
      { type: QueryTypes.SELECT }
    );
    stats.averageGenresPerMovie =
      avgGenresPerMovie.length > 0
        ? parseFloat(avgGenresPerMovie[0].averageGenresPerMovie).toFixed(2)
        : 0;

    // 8. Acteurs les plus présents (apparaissant dans le plus de films)
    const popularActors = await sequelize.query(
      `SELECT a.id, a.name, COUNT(ma.id_movie) as movie_count
       FROM actors a
       JOIN MoviesActors ma ON a.id = ma.id_actor
       GROUP BY a.id, a.name
       ORDER BY movie_count DESC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    );
    stats.popularActors = popularActors;

    // 9. Genres les plus représentés
    const popularGenres = await sequelize.query(
      `SELECT g.id, g.genre, COUNT(mg.id_movie) as movie_count
       FROM genres g
       JOIN MoviesGenres mg ON g.id = mg.id_genre
       GROUP BY g.id, g.genre
       ORDER BY movie_count DESC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    );
    stats.popularGenres = popularGenres;

    // 10. Distribution des films par décennie
    const moviesByDecade = await sequelize.query(
      `SELECT 
        FLOOR(year/10)*10 as decade,
        COUNT(*) as count
       FROM movies
       GROUP BY FLOOR(year/10)*10
       ORDER BY decade ASC`,
      { type: QueryTypes.SELECT }
    );
    stats.moviesByDecade = moviesByDecade;

    res.json({
      status: "success",
      data: stats,
    });
  } catch (error) {
    console.error("Error generating statistics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate statistics",
      error: error.message,
    });
  }
});

module.exports = router;
