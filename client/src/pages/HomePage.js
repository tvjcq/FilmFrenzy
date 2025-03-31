import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import CountCard from "../components/CountCard";
import ActorCard from "../components/ActorCard";
import { saveToCache, getFromCache } from "../utils/cache";

// Cache keys
const STATS_CACHE_KEY = "filmfrenzy_stats";
// Stats cache duration - 1 hour
const STATS_CACHE_DURATION = 60 * 60 * 1000;

function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch some basic statistics when the component mounts
    const fetchStats = async () => {
      try {
        // Check cache first
        const cachedStats = getFromCache(STATS_CACHE_KEY);

        if (cachedStats) {
          console.log("Using cached stats data");
          setStats(cachedStats);
          setLoading(false);
          return;
        }

        // If not in cache, fetch from API
        console.log("Fetching fresh stats data");
        const response = await axios.get("http://localhost:3001/api/stats");
        const statsData = response.data.data;

        // Save to cache
        saveToCache(STATS_CACHE_KEY, statsData, STATS_CACHE_DURATION);

        setStats(statsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="homepage">
      <header>
        <h1>FilmFrenzy</h1>
        <p>Test your knowledge of movies and actors!</p>
      </header>

      <main>
        <section className="intro">
          <h2>Welcome to FilmFrenzy</h2>
          <p>
            The ultimate movie guessing game. How well do you know your movies?
          </p>
          <Link to="/game" className="start-button">
            Start Playing
          </Link>
        </section>

        {loading ? (
          <p>Loading stats...</p>
        ) : stats ? (
          <>
            <section className="stats">
              <h2>Movie Database Stats</h2>
              <div
                className="stats-container"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-around",
                }}
              >
                <CountCard name="Films" count={stats.totalMovies} />
                <CountCard name="Acteurs" count={stats.totalActors} />
                <CountCard name="Genres" count={stats.totalGenres} />
              </div>
            </section>
            <section className="top-actors">
              <h2>Top Actors</h2>
              <div
                className="actors-container"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-around",
                }}
              >
                {stats.popularActors.map((actor) => (
                  <ActorCard
                    key={actor.id}
                    actor={{
                      ...actor,
                      movies: { length: actor.movie_count },
                    }}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} FilmFrenzy</p>
      </footer>
    </div>
  );
}

export default HomePage;
