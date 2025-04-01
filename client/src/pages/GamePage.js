import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "react-router-dom";
import { saveToCache, getFromCache } from "../utils/cache";

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

  // Function to initialize the game with a random movie or actor
  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
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
      setDiscoveredNodes(new Set([entityId]));

      // Update graph data
      setGraphData({
        nodes: initialNodes,
        links: initialLinks,
      });

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
      setWikipediaData(cachedData);
      return;
    }

    setLoadingWikiData(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/wikipedia/${entityType}/summary/${entityId}`
      );

      const wikiData = response.data.data;

      // Cache the Wikipedia data for 24 hours
      saveToCache(cacheKey, wikiData, 24 * 60 * 60 * 1000);

      setWikipediaData(wikiData);
    } catch (error) {
      console.error(`Error fetching Wikipedia data for ${entityType}:`, error);
    } finally {
      setLoadingWikiData(false);
    }
  }, []);

  // Handle node click to show discovery modal
  const handleNodeClick = useCallback(
    async (node) => {
      // If already discovered, do nothing
      if (discoveredNodes.has(node.id)) {
        return;
      }

      // Set selected node and show modal
      setSelectedNode(node);
      setGuessInput("");
      setGuessResult(null);
      setWikipediaData(null);
      setShowModal(true);

      // Fetch Wikipedia data for this node
      fetchWikipediaData(node);
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

      // Mark this node as discovered
      setDiscoveredNodes((prev) => new Set([...prev, selectedNode.id]));

      // Update node in the graph data
      setGraphData((prevData) => {
        const updatedNodes = prevData.nodes.map((n) =>
          n.id === selectedNode.id ? { ...n, discovered: true } : n
        );
        return { ...prevData, nodes: updatedNodes };
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
        setGraphData((prevData) => ({
          nodes: [...prevData.nodes, ...newNodes],
          links: [...prevData.links, ...newLinks],
        }));

        // Close the modal after a delay
        setTimeout(() => {
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
  }, [selectedNode, guessInput, graphData, discoveredNodes]);

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
      const nameRegex = new RegExp(selectedNode.name, "gi");
      hint = hint.replace(nameRegex, "[...]");
    }

    return hint;
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>FilmFrenzy Exploration</h1>
        <p>Starting with: {startEntity?.title || startEntity?.name}</p>
        <button onClick={() => navigate("/")} className="back-button">
          Back to Home
        </button>
        <button onClick={initializeGame} className="restart-button">
          New Game
        </button>
        <div className="stats">
          <p>
            Discovered: {discoveredNodes.size} / {graphData.nodes.length}
          </p>
        </div>
      </div>

      <div
        className="graph-container"
        style={{ width: "100%", height: "80vh" }}
      >
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
              const fontSize = 14 / globalScale;
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
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
        />
      </div>

      <div className="game-instructions">
        <p>
          Click on undiscovered nodes and guess their name to expand the
          network!
        </p>
      </div>

      {/* Modal for guessing names */}
      {showModal && selectedNode && (
        <div className="modal-overlay" style={styles.modalOverlay}>
          <div className="modal-content" style={styles.modalContent}>
            <div className="modal-header" style={styles.modalHeader}>
              <h2>
                Guess this {selectedNode.type === "movie" ? "Movie" : "Actor"}
              </h2>
              <button onClick={closeModal} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div className="modal-body" style={styles.modalBody}>
              <p>
                What's the name of this{" "}
                {selectedNode.type === "movie" ? "movie" : "actor"}?
              </p>

              <div className="hint-container" style={styles.hintContainer}>
                {/* Wikipedia image if available */}
                {loadingWikiData ? (
                  <div style={styles.loadingContainer}>
                    <p>Loading image...</p>
                  </div>
                ) : (
                  wikipediaData &&
                  wikipediaData.thumbnail && (
                    <div style={styles.imageContainer}>
                      <img
                        src={wikipediaData.thumbnail.source}
                        alt="Hint"
                        style={styles.wikiImage}
                      />
                      {selectedNode.type === "movie" && (
                        <div style={styles.yearOverlay}>
                          <span>????</span>
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Entity type icon (if no image available) */}
                {(!wikipediaData || !wikipediaData.thumbnail) &&
                  !loadingWikiData && (
                    <div
                      style={{
                        ...styles.nodeIcon,
                        backgroundColor:
                          selectedNode.type === "movie" ? "#ffcc80" : "#bbdefb",
                      }}
                    >
                      <span>
                        {selectedNode.type === "movie" ? "Film" : "Acteur"}
                      </span>
                    </div>
                  )}

                {/* Wikipedia extract hint */}
                {wikipediaData && wikipediaData.extract && (
                  <div style={styles.extractContainer}>
                    <p style={styles.extractText}>{getWikipediaHint()}</p>
                  </div>
                )}

                {/* Display connected node names as hints */}
                <div style={styles.connectedNodes}>
                  <p>Connected to:</p>
                  <ul style={styles.nodesList}>
                    {graphData.links
                      .filter(
                        (link) =>
                          ((link.source === selectedNode.id ||
                            link.target === selectedNode.id) &&
                            (typeof link.source === "string"
                              ? discoveredNodes.has(link.source)
                              : discoveredNodes.has(link.source.id))) ||
                          (typeof link.target === "string"
                            ? discoveredNodes.has(link.target)
                            : discoveredNodes.has(link.target.id))
                      )
                      .map((link, index) => {
                        const connectedNodeId =
                          link.source === selectedNode.id ||
                          link.source.id === selectedNode.id
                            ? typeof link.target === "string"
                              ? link.target
                              : link.target.id
                            : typeof link.source === "string"
                            ? link.source
                            : link.source.id;

                        const connectedNode = graphData.nodes.find(
                          (n) => n.id === connectedNodeId
                        );

                        if (connectedNode?.discovered) {
                          return (
                            <li key={index} style={styles.nodeItem}>
                              {connectedNode.name}
                            </li>
                          );
                        }
                        return null;
                      })
                      .filter(Boolean)}
                  </ul>
                </div>
              </div>

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
                <button onClick={handleGuessSubmit} style={styles.guessButton}>
                  Guess
                </button>
              </div>

              {guessResult && (
                <div
                  style={{
                    ...styles.resultMessage,
                    color: guessResult === "correct" ? "#4CAF50" : "#F44336",
                  }}
                >
                  {guessResult === "correct"
                    ? `Correct! The ${selectedNode.type} is "${selectedNode.name}".`
                    : `Wrong guess. Try again!`}
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
    maxHeight: "200px",
    display: "flex",
    justifyContent: "center",
    marginBottom: "15px",
  },
  wikiImage: {
    maxWidth: "100%",
    maxHeight: "100%",
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
  connectedNodes: {
    marginTop: "15px",
  },
  nodesList: {
    margin: 0,
    paddingLeft: "20px",
  },
  nodeItem: {
    margin: "5px 0",
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
};

export default GamePage;
