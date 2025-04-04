const request = require("supertest");
const express = require("express");
const app = require("../app");
const { Movie, Actor, Genre, sequelize } = require("../models");

// Mock des modèles pour les tests
jest.mock("../models", () => {
  const SequelizeMock = require("sequelize-mock");
  const dbMock = new SequelizeMock();

  // Mock du modèle Movie
  const MovieMock = dbMock.define("Movie", {
    id: 1,
    title: "Test Movie",
    year: 2023,
  });

  // Mock du modèle Actor
  const ActorMock = dbMock.define("Actor", {
    id: 1,
    name: "Test Actor",
  });

  // Mock du modèle Genre
  const GenreMock = dbMock.define("Genre", {
    id: 1,
    genre: "Action",
  });

  // Configuration des relations entre modèles
  MovieMock.belongsToMany(ActorMock, {
    through: "MoviesActors",
    foreignKey: "id_movie",
    otherKey: "id_actor",
    as: "actors",
  });

  ActorMock.belongsToMany(MovieMock, {
    through: "MoviesActors",
    foreignKey: "id_actor",
    otherKey: "id_movie",
    as: "movies",
  });

  MovieMock.belongsToMany(GenreMock, {
    through: "MoviesGenres",
    foreignKey: "id_movie",
    otherKey: "id_genre",
    as: "genres",
  });

  GenreMock.belongsToMany(MovieMock, {
    through: "MoviesGenres",
    foreignKey: "id_genre",
    otherKey: "id_movie",
    as: "movies",
  });

  // Méthodes mockées pour les tests
  MovieMock.findAll = jest.fn().mockResolvedValue([
    { id: 1, title: "Test Movie 1", year: 2021 },
    { id: 2, title: "Test Movie 2", year: 2022 },
  ]);

  MovieMock.findByPk = jest.fn().mockImplementation((id) => {
    if (id === "1") {
      return Promise.resolve({
        id: 1,
        title: "Test Movie 1",
        year: 2021,
        actors: [
          { id: 1, name: "Test Actor 1" },
          { id: 2, name: "Test Actor 2" },
        ],
        genres: [
          { id: 1, genre: "Action" },
          { id: 2, genre: "Comedy" },
        ],
      });
    }
    return Promise.resolve(null);
  });

  ActorMock.findAll = jest.fn().mockResolvedValue([
    { id: 1, name: "Test Actor 1" },
    { id: 2, name: "Test Actor 2" },
  ]);

  ActorMock.findByPk = jest.fn().mockImplementation((id) => {
    if (id === "1") {
      return Promise.resolve({
        id: 1,
        name: "Test Actor 1",
        movies: [
          { id: 1, title: "Test Movie 1", year: 2021 },
          { id: 2, title: "Test Movie 2", year: 2022 },
        ],
      });
    }
    return Promise.resolve(null);
  });

  GenreMock.findAll = jest.fn().mockResolvedValue([
    { id: 1, genre: "Action" },
    { id: 2, genre: "Comedy" },
  ]);

  GenreMock.findByPk = jest.fn().mockImplementation((id) => {
    if (id === "1") {
      return Promise.resolve({ id: 1, genre: "Action" });
    }
    return Promise.resolve(null);
  });

  // Mock pour les requêtes SQL brutes
  const sequelizeMock = {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    query: jest.fn().mockImplementation((query, options) => {
      // Simuler différentes requêtes SQL
      if (query.includes("RAND()")) {
        if (query.includes("movies m")) {
          return Promise.resolve([
            { id: 1, title: "Random Movie", year: 2023 },
          ]);
        } else if (query.includes("actors a")) {
          return Promise.resolve([{ id: 1, name: "Random Actor" }]);
        }
      }

      if (query.includes("COUNT(ma.id_actor)")) {
        return Promise.resolve([{ averageActorsPerMovie: 3.5 }]);
      }

      if (query.includes("COUNT(mg.id_genre)")) {
        return Promise.resolve([{ averageGenresPerMovie: 2.0 }]);
      }

      if (query.includes("FLOOR(year/10)*10")) {
        return Promise.resolve([
          { decade: 1990, count: 10 },
          { decade: 2000, count: 20 },
          { decade: 2010, count: 30 },
        ]);
      }

      return Promise.resolve([]);
    }),
  };

  return {
    Movie: MovieMock,
    Actor: ActorMock,
    Genre: GenreMock,
    sequelize: sequelizeMock,
  };
});

// Mock pour le module wikipedia
jest.mock("wikipedia", () => {
  return {
    setLang: jest.fn(),
    page: jest.fn().mockImplementation((title) => {
      return Promise.resolve({
        summary: jest.fn().mockResolvedValue({
          title: title,
          extract: `This is a summary about ${title}`,
          thumbnail: {
            source: "https://example.com/image.jpg",
            width: 200,
            height: 200,
          },
          type: "standard",
        }),
      });
    }),
  };
});

describe("FilmFrenzy API Tests", () => {
  // Test des routes Movie
  describe("Movie Routes", () => {
    test("GET /api/movies should return all movies", async () => {
      const response = await request(app).get("/api/movies");
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    test("GET /api/movies/:id should return a movie with its actors and genres", async () => {
      const response = await request(app).get("/api/movies/1");
      expect(response.statusCode).toBe(200);
      expect(response.body.title).toBe("Test Movie 1");
      expect(Array.isArray(response.body.actors)).toBe(true);
      expect(Array.isArray(response.body.genres)).toBe(true);
    });

    test("GET /api/movies/:id with invalid ID should return 404", async () => {
      const response = await request(app).get("/api/movies/999");
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Movie not found");
    });
  });

  // Test des routes Actor
  describe("Actor Routes", () => {
    test("GET /api/actors should return all actors", async () => {
      const response = await request(app).get("/api/actors");
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    test("GET /api/actors/:id should return an actor with their movies", async () => {
      const response = await request(app).get("/api/actors/1");
      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe("Test Actor 1");
      expect(Array.isArray(response.body.movies)).toBe(true);
    });

    test("GET /api/actors/:id with invalid ID should return 404", async () => {
      const response = await request(app).get("/api/actors/999");
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Actor not found");
    });
  });

  // Test des routes Genre
  describe("Genre Routes", () => {
    test("GET /api/genres should return all genres", async () => {
      const response = await request(app).get("/api/genres");
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    test("GET /api/genres/:id should return a genre", async () => {
      const response = await request(app).get("/api/genres/1");
      expect(response.statusCode).toBe(200);
      expect(response.body.genre).toBe("Action");
    });

    test("GET /api/genres/:id with invalid ID should return 404", async () => {
      const response = await request(app).get("/api/genres/999");
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Genre not found");
    });
  });

  // Test des routes Random
  describe("Random Routes", () => {
    test("GET /api/random should return either a movie or an actor", async () => {
      const response = await request(app).get("/api/random");
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeDefined();
    });

    test("GET /api/random/movie should return a random movie", async () => {
      const response = await request(app).get("/api/random/movie");
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeDefined();
    });

    test("GET /api/random/actor should return a random actor", async () => {
      const response = await request(app).get("/api/random/actor");
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeDefined();
    });
  });

  // Test des routes Stats
  describe("Stats Routes", () => {
    test("GET /api/stats should return database statistics", async () => {
      const response = await request(app).get("/api/stats");
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalMovies).toBeDefined();
      expect(response.body.data.totalActors).toBeDefined();
      expect(response.body.data.totalGenres).toBeDefined();
    });
  });

  // Test des routes Wikipedia
  describe("Wikipedia Routes", () => {
    test("GET /api/wikipedia/movie/summary/:id should return movie summary", async () => {
      const response = await request(app).get("/api/wikipedia/movie/summary/1");
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.extract).toBeDefined();
    });

    test("GET /api/wikipedia/actor/summary/:id should return actor summary", async () => {
      const response = await request(app).get("/api/wikipedia/actor/summary/1");
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.extract).toBeDefined();
    });

    test("GET /api/wikipedia/movie/summary/:id with invalid ID should return 404", async () => {
      const response = await request(app).get(
        "/api/wikipedia/movie/summary/999"
      );
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Movie not found");
    });

    test("GET /api/wikipedia/actor/summary/:id with invalid ID should return 404", async () => {
      const response = await request(app).get(
        "/api/wikipedia/actor/summary/999"
      );
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Actor not found");
    });
  });
});
