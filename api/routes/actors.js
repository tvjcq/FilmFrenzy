const express = require("express");
const router = express.Router();
const { Actor, Movie } = require("../models");

router.get("/", async (req, res) => {
  try {
    const actors = await Actor.findAll();
    res.json(actors);
  } catch (error) {
    console.error("Error fetching actors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const actor = await Actor.findByPk(id, {
      include: [
        {
          model: Movie,
          as: "movies",
          through: {
            // Exclure complètement l'objet MoviesActors de la réponse
            attributes: [],
          },
        },
      ],
    });

    if (!actor) {
      return res.status(404).json({ error: "Actor not found" });
    }

    res.json(actor);
  } catch (error) {
    console.error("Error fetching actor:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
