const express = require("express");
const router = express.Router();
const wiki = require("wikipedia");
const { Movie, Actor } = require("../models");

// Wikipedia API configuration
wiki.setLang("fr");

// Route pour obtenir le résumé d'un film
// Contient : Résumé, image et titre

// TODO: Séparer la logique de récupération de résumé et de l'image pour par exemple récupérer l'image sur un wiki anglais non disponible sur le wiki français
router.get("/movie/summary/:id", async (req, res) => {
  const { id } = req.params;
  const movie = await Movie.findByPk(id);
  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  // On essaie d'abord avec le titre simple
  let title = movie.title.replace(/ /g, "_");

  try {
    let page;
    let summary;
    let found = false;

    // Liste des tentatives à essayer dans l'ordre
    const attempts = [
      { lang: "fr", title: title }, // 1. Titre simple en français
      { lang: "fr", title: `${title}_(film)` }, // 2. Titre avec "(film)" en français
      { lang: "en", title: movie.title }, // 3. Titre simple en anglais
      { lang: "en", title: `${movie.title.replace(/ /g, "_")}_(film)` }, // 4. Titre avec "(movie)" en anglais
    ];

    // Essayer chaque méthode jusqu'à ce qu'une fonctionne
    for (const attempt of attempts) {
      try {
        // Correction: La méthode getLanguage() ne semble pas exister dans l'API wikipedia
        // Remplaçons cela par une variable qui garde trace de la langue actuelle
        let currentLang = "fr"; // Langue par défaut

        if (attempt.lang !== currentLang) {
          wiki.setLang(attempt.lang);
          currentLang = attempt.lang;
        }

        page = await wiki.page(attempt.title);
        summary = await page.summary();

        // Vérifier si c'est une page de désambiguïsation
        if (summary.type !== "disambiguation") {
          found = true;
          break; // Sortir de la boucle si on a trouvé une page valide
        }
      } catch (error) {
        console.error(
          `Error with attempt: ${attempt.lang}/${attempt.title}:`,
          error.message
        );
        // Continuer avec la prochaine tentative
      }
    }

    // Toujours remettre la langue par défaut à la fin
    wiki.setLang("fr");

    // Si aucune tentative n'a réussi
    if (!found && !summary) {
      return res
        .status(500)
        .json({ error: "Failed to find movie on Wikipedia" });
    }

    res.json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching movie summary:", error);
    // Assurez-vous que la langue est remise à fr en cas d'erreur
    wiki.setLang("fr");
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
