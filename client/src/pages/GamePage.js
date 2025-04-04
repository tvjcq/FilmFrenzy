import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "react-router-dom";
import { saveToCache, getFromCache } from "../utils/cache";

// Ajout des constantes pour la sauvegarde du jeu
const GAME_SAVE_KEY = "filmfrenzy_game_save";

const GamePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [startEntity, setStartEntity] = useState(null);
  const [discoveredNodes, setDiscoveredNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [guessInput, setGuessInput] = useState("");
  const [guessResult, setGuessResult] = useState(null); // "correct", "wrong", or null
  const [showModal, setShowModal] = useState(false);
  const [wikipediaData, setWikipediaData] = useState(null);
  const [loadingWikiData, setLoadingWikiData] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0: aucun, 1: année, 2: résumé, 3: photo
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const HIGH_SCORE_KEY = "filmfrenzy_high_score";

  // Ajoutez ce hook dans votre composant GamePage
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth * 0.85,
    height: window.innerHeight * 0.65,
  });

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth * 0.85,
        height: window.innerHeight * 0.65,
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Récupérer le high score du localStorage
    const savedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // Function to initialize the game with a saved state or a random movie/actor
  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);

      // Check if we have a saved game
      const savedGame = localStorage.getItem(GAME_SAVE_KEY);

      if (savedGame) {
        const gameData = JSON.parse(savedGame);

        // Restaurer correctement les données du graphe
        // Créer d'abord tous les nœuds
        const nodes = gameData.graphData.nodes.map((node) => ({ ...node }));

        // Créer un dictionnaire des nœuds pour résoudre les références
        const nodesById = {};
        nodes.forEach((node) => {
          nodesById[node.id] = node;
        });

        // Créer les liens avec des références d'objets plutôt que des chaînes
        const links = gameData.graphData.links.map((link) => ({
          source: nodesById[link.source] || link.source,
          target: nodesById[link.target] || link.target,
        }));

        // Définir les données du graphe correctement formées
        setGraphData({
          nodes: nodes,
          links: links,
        });

        setStartEntity(gameData.startEntity);
        setDiscoveredNodes(new Set(gameData.discoveredNodes));

        if (gameData.score !== undefined) {
          setScore(gameData.score);
        } else {
          setScore(0);
        }

        console.log("Game loaded from save");
        setLoading(false);
        return;
      }

      // If no saved game, start a new one
      setDiscoveredNodes(new Set());
      setSelectedNode(null);
      setGuessInput("");
      setGuessResult(null);
      setShowModal(false);
      setWikipediaData(null);

      // Get a random entity (movie or actor)
      const response = await axios.get("http://localhost:3001/api/random");
      const randomEntity = response.data.data;

      if (!randomEntity) {
        throw new Error("Failed to fetch a random entity");
      }

      setStartEntity(randomEntity);

      // Initialize graph with this entity
      const initialNodes = [];
      const initialLinks = [];

      // Add the central node (movie or actor)
      const entityType = randomEntity.title ? "movie" : "actor";
      const entityId = `${entityType}-${randomEntity.id}`;

      initialNodes.push({
        id: entityId,
        name: randomEntity.title || randomEntity.name,
        type: entityType,
        discovered: true,
      });

      // Add related nodes
      if (entityType === "movie") {
        // If it's a movie, add its actors (initially undiscovered)
        randomEntity.actors.forEach((actor) => {
          const actorId = `actor-${actor.id}`;
          initialNodes.push({
            id: actorId,
            name: actor.name,
            type: "actor",
            discovered: false,
          });
          initialLinks.push({
            source: entityId,
            target: actorId,
          });
        });
      } else {
        // If it's an actor, add their movies (initially undiscovered)
        randomEntity.movies.forEach((movie) => {
          const movieId = `movie-${movie.id}`;
          initialNodes.push({
            id: movieId,
            name: movie.title,
            type: "movie",
            discovered: false,
          });
          initialLinks.push({
            source: entityId,
            target: movieId,
          });
        });
      }

      // Set the initial discovered node
      const discoveredSet = new Set([entityId]);
      setDiscoveredNodes(discoveredSet);

      // Update graph data
      const graphData = {
        nodes: initialNodes,
        links: initialLinks,
      };

      setGraphData(graphData);

      // Save the new game state
      saveGameState(graphData, randomEntity, [entityId]);

      setScore(0);

      setLoading(false);
    } catch (error) {
      console.error("Error initializing game:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Fetch Wikipedia data for the selected node
  const fetchWikipediaData = useCallback(async (node) => {
    const entityId = node.id.split("-")[1];
    const entityType = node.type;
    const cacheKey = `${entityType}_wiki_${entityId}`;

    // Try to get from cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      setWikipediaData((prevData) => ({
        ...prevData,
        ...cachedData,
      }));
      return cachedData;
    }

    setLoadingWikiData(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/wikipedia/${entityType}/summary/${entityId}`
      );

      const wikiData = response.data.data;

      // Cache the Wikipedia data for 24 hours
      saveToCache(cacheKey, wikiData, 24 * 60 * 60 * 1000);

      setWikipediaData((prevData) => ({
        ...prevData,
        ...wikiData,
      }));
      return wikiData;
    } catch (error) {
      console.error(`Error fetching Wikipedia data for ${entityType}:`, error);
      return null;
    } finally {
      setLoadingWikiData(false);
    }
  }, []);

  // Handle node click to show discovery modal
  const handleNodeClick = useCallback(
    async (node) => {
      // Si le nœud est déjà découvert ou en mode info
      if (discoveredNodes.has(node.id)) {
        setSelectedNode(node);
        setGuessInput("");
        setGuessResult("info");
        setShowModal(true);
        setHintLevel(3);
        setWikipediaData(null);

        // Si c'est un film, récupérer d'abord ses données depuis la BDD
        if (node.type === "movie") {
          const entityId = node.id.split("-")[1];
          try {
            const response = await axios.get(
              `http://localhost:3001/api/movies/${entityId}`
            );
            const movieData = response.data;

            // Stocker l'année et les genres du film
            setWikipediaData({
              year: movieData.year,
              genres: movieData.genres, // Stocker les genres
            });

            // Ensuite récupérer les données Wikipedia
            fetchWikipediaData(node).then((wikiData) => {
              if (wikiData) {
                setWikipediaData((prevData) => ({
                  ...wikiData,
                  year: movieData.year,
                  genres: movieData.genres, // Conserver les genres
                }));
              }
            });
          } catch (error) {
            console.error("Error fetching movie data:", error);
            fetchWikipediaData(node);
          }
        } else {
          fetchWikipediaData(node);
        }
        return;
      }

      // Pour les nœuds non découverts
      setSelectedNode(node);
      setGuessInput("");
      setGuessResult(null);
      setWikipediaData(null);
      setShowModal(true);
      setHintLevel(0);

      // Si c'est un film, récupérer d'abord ses données depuis la BDD
      if (node.type === "movie") {
        const entityId = node.id.split("-")[1];
        try {
          const response = await axios.get(
            `http://localhost:3001/api/movies/${entityId}`
          );
          const movieData = response.data;

          // Stocker l'année et les genres du film
          setWikipediaData({
            year: movieData.year,
            genres: movieData.genres, // Stocker les genres
          });

          // Ensuite récupérer les données Wikipedia
          fetchWikipediaData(node).then((wikiData) => {
            if (wikiData) {
              setWikipediaData((prevData) => ({
                ...wikiData,
                year: movieData.year,
                genres: movieData.genres, // Conserver les genres
              }));
            }
          });
        } catch (error) {
          console.error("Error fetching movie data:", error);
          fetchWikipediaData(node);
        }
      } else {
        fetchWikipediaData(node);
      }
    },
    [discoveredNodes, fetchWikipediaData]
  );

  // Function to handle guess submission
  const handleGuessSubmit = useCallback(async () => {
    if (!selectedNode || !guessInput.trim()) return;

    // Compare the guess with the actual name (case insensitive)
    const isCorrect =
      guessInput.trim().toLowerCase() === selectedNode.name.toLowerCase();

    if (isCorrect) {
      // Update guess result and mark node as discovered
      setGuessResult("correct");

      // Mettre à jour le score
      const pointsEarned = 10;
      const newScore = score + pointsEarned;
      setScore(newScore);

      // Vérifier et mettre à jour le high score si nécessaire
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem(HIGH_SCORE_KEY, String(newScore));
      }

      // Mark this node as discovered
      const updatedDiscoveredNodes = new Set([
        ...discoveredNodes,
        selectedNode.id,
      ]);
      setDiscoveredNodes(updatedDiscoveredNodes);

      // Update node in the graph data
      setGraphData((prevData) => {
        // Créer une nouvelle copie de tous les nœuds avec mise à jour du statut découvert
        const updatedNodes = prevData.nodes.map((n) =>
          n.id === selectedNode.id ? { ...n, discovered: true } : { ...n }
        );

        // Créer une nouvelle copie de tous les liens en maintenant leurs références
        const updatedLinks = prevData.links.map((link) => {
          // Pour chaque lien, assurez-vous que source et target sont des chaînes de caractères (ID)
          // et non des références d'objets
          return {
            source:
              typeof link.source === "object" ? link.source.id : link.source,
            target:
              typeof link.target === "object" ? link.target.id : link.target,
          };
        });

        return {
          nodes: updatedNodes,
          links: updatedLinks,
        };
      });

      // Get the entity ID (remove the prefix)
      const entityId = selectedNode.id.split("-")[1];

      try {
        // Fetch related entities based on node type
        let relatedEntities = [];
        if (selectedNode.type === "movie") {
          const response = await axios.get(
            `http://localhost:3001/api/movies/${entityId}`
          );
          relatedEntities = response.data.actors || [];
        } else {
          const response = await axios.get(
            `http://localhost:3001/api/actors/${entityId}`
          );
          relatedEntities = response.data.movies || [];
        }

        // Add new nodes and links
        const newNodes = [];
        const newLinks = [];

        relatedEntities.forEach((entity) => {
          const relatedType = selectedNode.type === "movie" ? "actor" : "movie";
          const relatedId = `${relatedType}-${entity.id}`;

          // Check if this node already exists in the graph
          const nodeExists = graphData.nodes.some((n) => n.id === relatedId);

          if (!nodeExists) {
            newNodes.push({
              id: relatedId,
              name: entity.title || entity.name,
              type: relatedType,
              discovered: false,
            });

            newLinks.push({
              source: selectedNode.id,
              target: relatedId,
            });
          }
        });

        // Update graph data with new nodes and links
        setGraphData((prevData) => {
          // Créer une nouvelle copie de tous les nœuds avec les nouveaux
          const allNodes = [
            ...prevData.nodes.map((n) => ({ ...n })),
            ...newNodes,
          ];

          // Créer une nouvelle copie de tous les liens avec les nouveaux
          const allLinks = [
            ...prevData.links.map((link) => ({
              source:
                typeof link.source === "object" ? link.source.id : link.source,
              target:
                typeof link.target === "object" ? link.target.id : link.target,
            })),
            ...newLinks,
          ];

          return {
            nodes: allNodes,
            links: allLinks,
          };
        });

        // Save game state whenever graph data or discovered nodes change
        if (graphData.nodes.length > 0 && startEntity) {
          saveGameState(graphData, startEntity, Array.from(discoveredNodes));
        }

        // Close the modal after a delay
        setTimeout(() => {
          saveGameState(
            // Use latest graph data with newly added nodes and links
            {
              nodes: [
                ...graphData.nodes.map((n) =>
                  n.id === selectedNode.id
                    ? { ...n, discovered: true }
                    : { ...n }
                ),
                ...newNodes,
              ],
              links: [
                ...graphData.links.map((link) => ({
                  source:
                    typeof link.source === "object"
                      ? link.source.id
                      : link.source,
                  target:
                    typeof link.target === "object"
                      ? link.target.id
                      : link.target,
                })),
                ...newLinks,
              ],
            },
            startEntity,
            updatedDiscoveredNodes
          );
          setShowModal(false);
          setSelectedNode(null);
          setWikipediaData(null);
        }, 1500);
      } catch (error) {
        console.error("Error discovering node:", error);
      }
    } else {
      // If guess is wrong, show error state
      setGuessResult("wrong");
    }
  }, [
    selectedNode,
    guessInput,
    graphData,
    discoveredNodes,
    startEntity,
    score,
    highScore,
  ]);

  // Function to save game state
  const saveGameState = (graphData, startEntity, discoveredNodes) => {
    try {
      // Convertir les données du graphe en format sérialisable
      const serializableGraph = {
        nodes: graphData.nodes.map((node) => ({ ...node })),
        links: graphData.links.map((link) => ({
          source:
            typeof link.source === "object" ? link.source.id : link.source,
          target:
            typeof link.target === "object" ? link.target.id : link.target,
        })),
      };

      const gameData = {
        graphData: serializableGraph,
        startEntity,
        discoveredNodes: Array.from(discoveredNodes),
        timestamp: new Date().getTime(),
        score: score, // Sauvegarder le score
      };

      localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(gameData));
      console.log("Game state saved");
    } catch (error) {
      console.error("Error saving game state:", error);
    }
  };

  // Close modal function
  const closeModal = () => {
    setShowModal(false);
    setSelectedNode(null);
    setGuessInput("");
    setGuessResult(null);
    setWikipediaData(null);
  };

  // Handle input change
  const handleInputChange = (e) => {
    setGuessInput(e.target.value);
    // Reset result when typing a new guess
    if (guessResult) setGuessResult(null);
  };

  // Handle key press for Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleGuessSubmit();
    }
  };

  // Fonction pour débloquer le prochain indice
  const unlockNextHint = () => {
    // Pour les acteurs, il n'y a que 2 niveaux d'indices (résumé et photo)
    // Pour les films, il y a 3 niveaux (année, résumé et photo)
    const maxHintLevel = selectedNode?.type === "actor" ? 2 : 3;

    if (hintLevel < maxHintLevel) {
      setHintLevel(hintLevel + 1);

      // Pénalité de score pour chaque indice utilisé
      setScore((prevScore) => Math.max(0, prevScore - 2)); // Empêche le score d'être négatif

      // Mettre à jour la sauvegarde avec le nouveau score
      if (graphData.nodes.length > 0 && startEntity) {
        saveGameState(graphData, startEntity, Array.from(discoveredNodes));
      }
    }
  };

  // Add a resetGame function
  const resetGame = useCallback(() => {
    // Clear saved game
    localStorage.removeItem(GAME_SAVE_KEY);
    // Start new game
    initializeGame();
  }, [initializeGame]);

  if (loading) {
    return <div className="loading">Loading game data...</div>;
  }

  // Extract excerpt from Wikipedia data for hints
  const getWikipediaHint = () => {
    if (!wikipediaData || !wikipediaData.extract) return null;

    // Get the first sentence or two for a hint, without revealing the name
    let hint = wikipediaData.extract.split(".")[0] + ".";

    // Replace the actual name with [...] to avoid giving away the answer
    if (selectedNode) {
      const alternatives = [selectedNode.name];
      if (wikipediaData && wikipediaData.title) {
        alternatives.push(wikipediaData.title);
      }
      // Escape special regex characters in each alternative.
      const escapedAlternatives = alternatives.map((str) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );
      const nameRegex = new RegExp(escapedAlternatives.join("|"), "gi");
      hint = hint.replace(nameRegex, "[...]");
    }

    return hint;
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>FilmFrenzy Game</h1>
        <div style={styles.gameStats}>
          <p>Débuté avec: {startEntity?.title || startEntity?.name}</p>
          <p>
            Score: <span style={{ fontWeight: "bold" }}>{score}</span>
          </p>
          <p>
            High Score: <span style={{ fontWeight: "bold" }}>{highScore}</span>
          </p>
          <p>
            Découverts: {discoveredNodes.size} / {graphData.nodes.length}
          </p>
        </div>
        <div style={styles.gameControls}>
          <button onClick={() => navigate("/")} style={styles.backButton}>
            Retour à l'accueil
          </button>
          <button onClick={resetGame} style={styles.restartButton}>
            Nouvelle partie
          </button>
        </div>
      </div>

      <div className="graph-container" style={styles.graphContainer}>
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node) =>
            node.discovered
              ? node.name
              : node.type === "movie"
              ? "Unknown Movie"
              : "Unknown Actor"
          }
          linkWidth={1.5}
          nodeRelSize={6}
          nodeCanvasObject={(node, ctx, globalScale) => {
            // Draw node circle
            const size = node.discovered ? 6 : 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fillStyle = node.discovered
              ? node.type === "movie"
                ? "#f57c00"
                : "#1976d2" // Brighter colors for discovered
              : node.type === "movie"
              ? "#ffcc80"
              : "#bbdefb"; // Lighter colors for undiscovered
            ctx.fill();

            // Draw node label only if discovered
            if (node.discovered) {
              const fontSize = 8 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#000";
              ctx.fillText(node.name, node.x, node.y + size + fontSize);
            } else {
              // For undiscovered nodes, just show a question mark
              const fontSize = 12 / globalScale;
              ctx.font = `bold ${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#666";
              ctx.fillText("?", node.x, node.y);

              // Show type hint below (Movie or Actor)
              const smallerFont = 8 / globalScale;
              ctx.font = `${smallerFont}px Sans-Serif`;
              ctx.fillText(
                node.type === "movie" ? "Film" : "Acteur",
                node.x,
                node.y + size + smallerFont
              );
            }
          }}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>

      {/* Modal pour afficher les informations ou deviner */}
      {showModal && selectedNode && (
        <div className="modal-overlay" style={styles.modalOverlay}>
          <div className="modal-content" style={styles.modalContent}>
            <div className="modal-header" style={styles.modalHeader}>
              <h2>
                {guessResult === "info"
                  ? selectedNode.name // Afficher le nom si c'est un mode info
                  : `Guess this ${
                      selectedNode.type === "movie" ? "Movie" : "Actor"
                    }`}
              </h2>
              <button onClick={closeModal} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div className="modal-body" style={styles.modalBody}>
              {guessResult !== "info" && (
                <p>
                  What's the name of this{" "}
                  {selectedNode.type === "movie" ? "movie" : "actor"}?
                </p>
              )}

              <div className="hint-container" style={styles.hintContainer}>
                {/* Informations sur les indices disponibles - affichées uniquement en mode devinette */}
                {guessResult !== "info" && (
                  <div style={styles.hintProgress}>
                    <p>
                      Indices disponibles:
                      {selectedNode.type === "movie" && (
                        <span
                          style={{
                            color: hintLevel >= 1 ? "#4CAF50" : "#ccc",
                            marginLeft: "10px",
                            fontWeight: hintLevel >= 1 ? "bold" : "normal",
                          }}
                        >
                          Année
                        </span>
                      )}
                      <span
                        style={{
                          color:
                            hintLevel >= (selectedNode.type === "movie" ? 2 : 1)
                              ? "#4CAF50"
                              : "#ccc",
                          marginLeft: "10px",
                          fontWeight:
                            hintLevel >= (selectedNode.type === "movie" ? 2 : 1)
                              ? "bold"
                              : "normal",
                        }}
                      >
                        Résumé
                      </span>
                      <span
                        style={{
                          color:
                            hintLevel >= (selectedNode.type === "movie" ? 3 : 2)
                              ? "#4CAF50"
                              : "#ccc",
                          marginLeft: "10px",
                          fontWeight:
                            hintLevel >= (selectedNode.type === "movie" ? 3 : 2)
                              ? "bold"
                              : "normal",
                        }}
                      >
                        Photo
                      </span>
                    </p>
                  </div>
                )}

                {/* Année de sortie (pour les films) - visible dans tous les modes si disponible */}
                {selectedNode.type === "movie" &&
                  (guessResult === "info" || hintLevel >= 1) &&
                  wikipediaData && (
                    <div style={styles.yearHint}>
                      <p>
                        <strong>Année de sortie:</strong>{" "}
                        {wikipediaData.year || "Inconnue"}
                      </p>
                    </div>
                  )}

                {/* Résumé - visible dans tous les modes si disponible */}
                {(guessResult === "info" ||
                  hintLevel >= (selectedNode.type === "movie" ? 2 : 1)) &&
                  wikipediaData &&
                  wikipediaData.extract && (
                    <div style={styles.extractContainer}>
                      <h3>Résumé:</h3>
                      <p style={styles.extractText}>
                        {guessResult === "info"
                          ? wikipediaData.extract
                          : getWikipediaHint()}
                      </p>
                    </div>
                  )}

                {/* Photo - visible dans tous les modes si disponible */}
                {guessResult === "info" ||
                hintLevel >= (selectedNode.type === "movie" ? 3 : 2) ? (
                  loadingWikiData ? (
                    <div style={styles.loadingContainer}>
                      <p>Loading image...</p>
                    </div>
                  ) : (
                    wikipediaData &&
                    wikipediaData.thumbnail && (
                      <div style={styles.imageContainer}>
                        <img
                          src={wikipediaData.thumbnail.source}
                          alt={
                            guessResult === "info" ? selectedNode.name : "Hint"
                          }
                          style={styles.wikiImage}
                        />
                        {selectedNode.type === "movie" &&
                          guessResult !== "info" && (
                            <div style={styles.yearOverlay}>
                              <span>????</span>
                            </div>
                          )}
                      </div>
                    )
                  )
                ) : (
                  <div style={styles.placeholderImage}>
                    <p>Photo masquée</p>
                  </div>
                )}

                {/* Genres du film - toujours visibles comme indice gratuit */}
                {selectedNode.type === "movie" &&
                  wikipediaData &&
                  wikipediaData.genres && (
                    <div style={styles.genresContainer}>
                      <p>
                        <strong>Genres:</strong>{" "}
                        <span style={styles.genresList}>
                          {wikipediaData.genres.map((genre, index) => (
                            <span key={genre.id} style={styles.genreTag}>
                              {genre.genre}
                            </span>
                          ))}
                        </span>
                      </p>
                    </div>
                  )}

                {/* Message si aucun indice n'est débloqué - uniquement en mode devinette */}
                {hintLevel === 0 && guessResult !== "info" && (
                  <div style={styles.noHintsMessage}>
                    <p>
                      Essayez de deviner sans indice ou débloquez des indices
                      pour vous aider!
                    </p>
                  </div>
                )}
              </div>

              {/* Bouton pour débloquer le prochain indice si on n'est pas en mode info */}
              {guessResult !== "info" &&
                hintLevel < (selectedNode.type === "movie" ? 3 : 2) && (
                  <button onClick={unlockNextHint} style={styles.hintButton}>
                    Débloquer l'indice suivant
                  </button>
                )}

              {/* Champ de saisie pour la réponse (uniquement en mode devinette) */}
              {guessResult !== "info" && (
                <div style={styles.guessInputContainer}>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={`Enter ${
                      selectedNode.type === "movie" ? "movie" : "actor"
                    } name...`}
                    style={{
                      ...styles.guessInput,
                      ...(guessResult === "wrong" ? styles.inputError : {}),
                    }}
                  />
                  <button
                    onClick={handleGuessSubmit}
                    style={styles.guessButton}
                  >
                    Guess
                  </button>
                </div>
              )}

              {/* Messages de résultat */}
              {guessResult === "correct" && (
                <div style={{ ...styles.resultMessage, color: "#4CAF50" }}>
                  <p>
                    Correct! The {selectedNode.type} is "{selectedNode.name}".
                  </p>
                  <p style={{ fontSize: "14px", marginTop: "5px" }}>
                    +10 points!{" "}
                    {hintLevel > 0
                      ? `(-${hintLevel * 2} points d'indices)`
                      : ""}
                  </p>
                </div>
              )}
              {guessResult === "wrong" && (
                <div style={{ ...styles.resultMessage, color: "#F44336" }}>
                  Wrong guess. Try again!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles for the modal and related components
const styles = {
  graphContainer: {
    width: "90%",
    height: "70vh",
    margin: "20px auto",
    border: "2px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#fdfdfd",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    overflow: "hidden", // Pour s'assurer que le graphe ne déborde pas
    position: "relative", // Important pour le positionnement du graphe
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "550px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #eee",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  },
  modalBody: {
    padding: "20px",
  },
  hintContainer: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f5f5f5",
    borderRadius: "6px",
  },
  nodeIcon: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    marginBottom: "10px",
    margin: "0 auto",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "15px",
    maxHeight: "250px", // Hauteur maximale un peu plus grande
    overflow: "hidden", // Masquer tout débordement
  },
  wikiImage: {
    maxWidth: "100%",
    maxHeight: "250px", // Même hauteur maximale que le conteneur
    objectFit: "contain", // Maintient les proportions sans déformation
    borderRadius: "6px",
  },
  yearOverlay: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "4px",
  },
  extractContainer: {
    marginTop: "10px",
  },
  extractText: {
    fontStyle: "italic",
  },
  guessInputContainer: {
    display: "flex",
    marginBottom: "15px",
  },
  guessInput: {
    flex: 1,
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px 0 0 4px",
    outline: "none",
  },
  inputError: {
    borderColor: "#F44336",
  },
  guessButton: {
    padding: "10px 15px",
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "0 4px 4px 0",
    cursor: "pointer",
    fontSize: "16px",
  },
  resultMessage: {
    fontSize: "16px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "10px",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100px",
  },
  hintProgress: {
    marginBottom: "15px",
    textAlign: "center",
    padding: "5px",
    borderRadius: "4px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #eee",
  },
  hintButton: {
    display: "block",
    margin: "0 auto 15px auto",
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.3s ease",
  },
  yearHint: {
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    marginBottom: "15px",
  },
  placeholderImage: {
    width: "100%",
    height: "150px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    border: "1px dashed #ccc",
    borderRadius: "6px",
    marginBottom: "15px",
    color: "#666",
  },
  noHintsMessage: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#f5f5f5",
    color: "#666",
    borderRadius: "4px",
    marginBottom: "15px",
  },
  gameStats: {
    display: "flex",
    justifyContent: "space-between",
    margin: "10px 0",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
    flexWrap: "wrap",
  },
  gameControls: {
    display: "flex",
    margin: "10px",
  },
  backButton: {
    padding: "8px 16px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginRight: "10px",
    fontSize: "14px",
  },
  restartButton: {
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  genresContainer: {
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#e3f2fd",
    borderRadius: "4px",
    marginBottom: "15px",
  },
  genresList: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "5px",
  },
  genreTag: {
    display: "inline-block",
    padding: "3px 8px",
    backgroundColor: "#bbdefb",
    color: "#0d47a1",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
    margin: "2px",
  },
};

export default GamePage;
