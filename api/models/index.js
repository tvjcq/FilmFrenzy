const Movie = require("./Movie");
const Actor = require("./Actor");
const Genre = require("./Genre");
const sequelize = require("../config");

// Define the many-to-many relationship between Movies and Actors
Movie.belongsToMany(Actor, {
  through: "MoviesActors", // Using your existing join table
  foreignKey: "id_movie", // Column in MoviesActors that references Movie
  otherKey: "id_actor", // Column in MoviesActors that references Actor
  as: "actors",
});

Actor.belongsToMany(Movie, {
  through: "MoviesActors",
  foreignKey: "id_actor",
  otherKey: "id_movie",
  as: "movies",
});

// Define the many-to-many relationship between Movies and Genres
Movie.belongsToMany(Genre, {
  through: "MoviesGenres", // Using your existing join table
  foreignKey: "id_movie", // Column in MoviesGenres that references Movie
  otherKey: "id_genre", // Column in MoviesGenres that references Genre
  as: "genres",
});

Genre.belongsToMany(Movie, {
  through: "MoviesGenres",
  foreignKey: "id_genre",
  otherKey: "id_movie",
  as: "movies",
});

module.exports = {
  Movie,
  Actor,
  Genre,
  sequelize,
};
