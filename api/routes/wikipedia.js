const express = require("express");
const router = express.Router();
const wiki = require("wikipedia");
const { Movie, Actor } = require("../models");

// Wikipedia API configuration
wiki.setLang("fr");

// Route pour obtenir le résumé d'un film
// Contient : Résumé, image et titre
router.get("/movie/summary/:id", async (req, res) => {
  const { id } = req.params;
  const movie = await Movie.findByPk(id);
  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }
  const title = movie.title.replace(/ /g, "_");

  try {
    const page = await wiki.page(title);
    const summary = await page.summary();

    res.json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching movie summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route pour obtenir le résumé d'un acteur
// Contient : Résumé, image et titre
router.get("/actor/summary/:id", async (req, res) => {
  const { id } = req.params;
  const actor = await Actor.findByPk(id);
  if (!actor) {
    return res.status(404).json({ error: "Actor not found" });
  }

  // On essaie d'abord avec le nom simple
  const title = actor.name.replace(/ /g, "_");

  try {
    let page = await wiki.page(title);
    let summary = await page.summary();

    // Vérifier si c'est une page de désambiguïsation
    if (summary.type === "disambiguation") {
      // Faire une deuxième tentative avec le suffixe "(acteur)"
      const actorTitle = `${title}_(acteur)`;
      try {
        page = await wiki.page(actorTitle);
        summary = await page.summary();
      } catch (innerError) {
        console.error(
          `Error fetching actor summary with suffix for ${actor.name}:`,
          innerError
        );
        // Si la deuxième tentative échoue, on renvoie quand même le résultat de la première tentative
      }
    }

    res.json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching actor summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
