import React, { useState, useEffect } from "react";
import axios from "axios";
import { saveToCache, getFromCache } from "../utils/cache";

// Actor Wikipedia data cache - 24 hours (Wikipedia data doesn't change often)
const ACTOR_WIKI_CACHE_DURATION = 24 * 60 * 60 * 1000;

const ActorCard = ({ actor }) => {
  const [loading, setLoading] = useState(true);
  const [wikiData, setWikiData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActorWikipediaData = async () => {
      try {
        setLoading(true);

        if (!actor || !actor.id) {
          setError("Invalid actor data");
          setLoading(false);
          return;
        }

        // Generate a cache key for this specific actor
        const cacheKey = `actor_wiki_${actor.id}`;

        // Check if we have cached data
        const cachedData = getFromCache(cacheKey);

        if (cachedData) {
          console.log(`Using cached Wikipedia data for actor ${actor.id}`);
          setWikiData(cachedData);
          setLoading(false);
          return;
        }

        // If not in cache, fetch from API
        console.log(`Fetching fresh Wikipedia data for actor ${actor.id}`);
        const response = await axios.get(
          `http://localhost:3001/api/wikipedia/actor/summary/${actor.id}`
        );

        const actorWikiData = response.data.data;

        // Save to cache
        saveToCache(cacheKey, actorWikiData, ACTOR_WIKI_CACHE_DURATION);

        setWikiData(actorWikiData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching actor Wikipedia data:", err);
        setError("Failed to load actor details");
        setLoading(false);
      }
    };

    if (actor && actor.id) {
      fetchActorWikipediaData();
    }
  }, [actor]);

  if (loading) {
    return (
      <div style={styles.card}>
        <p>Loading actor information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <h3>{actor.name}</h3>
        <p>
          {actor.movies
            ? `${actor.movies.length} films`
            : "Unknown number of films"}
        </p>
        <p style={styles.error}>{error}</p>
      </div>
    );
  }

  // Extract the first paragraph of the summary (usually more concise)
  const shortSummary =
    wikiData?.extract?.split("\n")[0] || "No summary available";

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        {wikiData?.thumbnail && (
          <img
            src={wikiData.thumbnail.source}
            alt={actor.name}
            style={styles.image}
          />
        )}
        <div style={styles.headerText}>
          <h3 style={styles.title}>{actor.name}</h3>
          <p style={styles.movieCount}>
            {actor.movies ? `${actor.movies.length} films` : "No films listed"}
          </p>
        </div>
      </div>
      <div style={styles.summary}>
        <p>{shortSummary}</p>
      </div>
    </div>
  );
};

const styles = {
  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    margin: "16px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: "500px",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
  },
  image: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "4px",
    marginRight: "16px",
  },
  headerText: {
    flex: 1,
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "1.2rem",
    fontWeight: "bold",
  },
  movieCount: {
    margin: 0,
    color: "#666",
    fontSize: "0.9rem",
  },
  summary: {
    lineHeight: "1.4",
    color: "#333",
    fontSize: "0.95rem",
  },
  error: {
    color: "#d32f2f",
  },
};

export default ActorCard;
