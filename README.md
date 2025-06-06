# FilmFrenzy

FilmFrenzy est une application web interactive de jeu de devinettes sur les films et acteurs. L'application permet aux utilisateurs de tester leurs connaissances cinématographiques en devinant des films et acteurs à travers un graphe de relations.

## Table des matières

- [FilmFrenzy](#filmfrenzy)
  - [Table des matières](#table-des-matières)
  - [Aperçu du projet](#aperçu-du-projet)
  - [Prérequis](#prérequis)
  - [Installation](#installation)
    - [Clonage du dépôt](#clonage-du-dépôt)
    - [Configuration de la base de données](#configuration-de-la-base-de-données)
    - [Configuration de l'API](#configuration-de-lapi)
    - [Configuration du client](#configuration-du-client)
  - [Démarrage de l'application](#démarrage-de-lapplication)
    - [Démarrer l'API (backend)](#démarrer-lapi-backend)
    - [Démarrer le client (frontend)](#démarrer-le-client-frontend)
  - [Architecture du projet](#architecture-du-projet)
  - [API Endpoints](#api-endpoints)
  - [Fonctionnalités principales](#fonctionnalités-principales)
  - [Technologies utilisées](#technologies-utilisées)
    - [Backend](#backend)
    - [Frontend](#frontend)

## Aperçu du projet

FilmFrenzy est une application de jeu qui permet aux utilisateurs de découvrir des films et acteurs en naviguant dans un graphe interactif. L'application comprend:

- Une page d'accueil avec des statistiques sur la base de données de films
- Un jeu interactif où les utilisateurs devinent des films et des acteurs
- Une intégration avec Wikipedia pour obtenir des informations supplémentaires

## Prérequis

- Node.js (v14.0.0 ou supérieur)
- MySQL (v8.0 ou supérieur)
- Git

## Installation

### Clonage du dépôt

```bash
git clone https://github.com/votre-nom/FilmFrenzy.git
cd FilmFrenzy
```

### Configuration de la base de données

1. Installez et démarrez XAMPP:

   - Téléchargez XAMPP depuis [le site officiel](https://www.apachefriends.org/fr/index.html)
   - Installez et lancez le panneau de contrôle XAMPP
   - Démarrez les services Apache et MySQL

2. Créez une base de données:

   - Ouvrez votre navigateur et accédez à `http://localhost/phpmyadmin`
   - Cliquez sur "Nouvelle base de données" dans le menu latéral
   - Entrez le nom que vous voulez comme nom de la base de données et cliquez sur "Créer"

3. Créez les tables nécessaires:

   - Dans phpMyAdmin, sélectionnez la base de données que vous venez de créer
   - Soit vous importez si vous avez déjà les données
   - Sinon collez le code suivant dans la page SQL:

     ```sql
     CREATE TABLE movies (
         id INT AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         year INT NOT NULL
     );

     CREATE TABLE actors (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(255) NOT NULL
     );

     CREATE TABLE genres (
         id INT AUTO_INCREMENT PRIMARY KEY,
         genre VARCHAR(255) NOT NULL
     );

     CREATE TABLE MoviesActors (
         id_movie INT,
         id_actor INT,
         PRIMARY KEY (id_movie, id_actor),
         FOREIGN KEY (id_movie) REFERENCES movies(id) ON DELETE CASCADE,
         FOREIGN KEY (id_actor) REFERENCES actors(id) ON DELETE CASCADE
     );

     CREATE TABLE MoviesGenres (
         id_movie INT,
         id_genre INT,
         PRIMARY KEY (id_movie, id_genre),
         FOREIGN KEY (id_movie) REFERENCES movies(id) ON DELETE CASCADE,
         FOREIGN KEY (id_genre) REFERENCES genres(id) ON DELETE CASCADE
     );
     -- Ajout de quelques données de test
     INSERT INTO movies (title, year) VALUES
     ('Inception', 2010),
     ('The Dark Knight', 2008),
     ('Pulp Fiction', 1994);

     INSERT INTO actors (name) VALUES
     ('Leonardo DiCaprio'),
     ('Christian Bale'),
     ('Samuel L. Jackson');

     INSERT INTO genres (genre) VALUES
     ('Action'),
     ('Science-Fiction'),
     ('Drame');

     -- Association films-acteurs
     INSERT INTO MoviesActors (id_movie, id_actor) VALUES
     (1, 1), -- Inception - DiCaprio
     (2, 2), -- Dark Knight - Bale
     (3, 3); -- Pulp Fiction - Jackson

     -- Association films-genres
     INSERT INTO MoviesGenres (id_movie, id_genre) VALUES
     (1, 2), -- Inception - Science-Fiction
     (2, 1), -- Dark Knight - Action
     (3, 3); -- Pulp Fiction - Drame
     ```

### Configuration de l'API

1. Accédez au répertoire de l'API:

   ```bash
     cd api
   ```

2. Installez les dépendances:

   ```bash
     npm install
   ```

3. Créez un fichier `.env.local` dans le répertoire api avec les informations de connexion à votre base de données:

   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=FilmFrenzy
   ```

### Configuration du client

1. Accédez au répertoire client:

   ```bash
     cd ../client
   ```

2. Installez les dépendances:

   ```bash
     npm install
   ```

3. Si nécessaire, configurez l'URL de l'API dans `config.js` ou dans les fichiers qui contiennent les appels API (par exemple, remplacez `http://localhost:3001` par l'URL de votre API déployée si elle est hébergée ailleurs).

## Démarrage de l'application

### Démarrer l'API (backend)

```bash
cd api
npm run dev
```

L'API sera accessible à l'adresse `http://localhost:3001`.

### Démarrer le client (frontend)

```bash
cd client
npm start
```

L'application sera accessible à l'adresse `http://localhost:3000`.

## Architecture du projet

```
FilmFrenzy/
├── api/                  # Backend Express.js
│   ├── controllers/      # Contrôleurs d'API
│   ├── models/           # Modèles Sequelize
│   ├── routes/           # Routes d'API
│   ├── app.js            # Point d'entrée du backend
│   └── config.js         # Configuration de la base de données
│
├── client/               # Frontend React
│   ├── public/           # Fichiers statiques
│   └── src/              # Code source React
│       ├── components/   # Composants réutilisables
│       ├── pages/        # Pages de l'application
│       ├── utils/        # Utilitaires
│       └── blocks/       # Composants importés
│
└── docs/                 # Documentation
  └── docAPI.yaml       # Documentation OpenAPI
```

## API Endpoints

Voici les endpoints disponibles dans l'API FilmFrenzy:

- **Films**:

  - `GET /api/movies` - Récupérer tous les films
  - `GET /api/movies/{id}` - Récupérer un film spécifique avec ses acteurs et genres

- **Acteurs**:

  - `GET /api/actors` - Récupérer tous les acteurs
  - `GET /api/actors/{id}` - Récupérer un acteur spécifique avec ses films

- **Genres**:

  - `GET /api/genres` - Récupérer tous les genres
  - `GET /api/genres/{id}` - Récupérer un genre spécifique

- **Statistiques**:

  - `GET /api/stats` - Récupérer des statistiques sur la base de données

- **Aléatoire**:

  - `GET /api/random` - Récupérer un film ou acteur aléatoire
  - `GET /api/random/movie` - Récupérer un film aléatoire
  - `GET /api/random/actor` - Récupérer un acteur aléatoire

- **Wikipedia**:
  - `GET /api/wikipedia/movie/summary/{id}` - Récupérer un résumé Wikipedia pour un film
  - `GET /api/wikipedia/actor/summary/{id}` - Récupérer un résumé Wikipedia pour un acteur

Pour plus de détails, consultez la documentation OpenAPI dans le fichier `docAPI.yaml`.

## Fonctionnalités principales

- **Page d'accueil**: Affiche des statistiques sur la base de données et les acteurs populaires.
- **Jeu de devinettes**: Interface interactive où les utilisateurs devinent des films et acteurs.
- **Système d'indices**: Débloquez progressivement des indices (année, résumé, photo).
- **Système de score**: Gagnez des points en devinant correctement, perdez des points en utilisant des indices.
- **Sauvegarde locale**: La progression du jeu est sauvegardée automatiquement.
- **Visualisation de graphe**: Navigation à travers un graphe de relations films-acteurs.
- **Intégration Wikipedia**: Récupération de résumés et images depuis Wikipedia.

## Technologies utilisées

### Backend

- **Node.js**: Environnement d'exécution JavaScript côté serveur.
- **Express.js**: Framework web minimaliste pour construire l'API.
- **Sequelize (ORM)**: Gestion des interactions avec la base de données MySQL.
- **MySQL**: Base de données relationnelle utilisée pour stocker les films, acteurs et genres.
- **Wikipedia API**: Intégration pour récupérer des informations supplémentaires sur les films et acteurs.

### Frontend

- **React 19**: Bibliothèque JavaScript pour construire l'interface utilisateur.
- **React Router**: Gestion de la navigation entre les pages de l'application.
- **Axios**: Client HTTP pour effectuer des appels API.
- **React Force Graph**: Visualisation interactive des relations entre films et acteurs.
