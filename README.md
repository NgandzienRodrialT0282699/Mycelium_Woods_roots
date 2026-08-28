# Mycelium Woods roots — Réseau social léger

Un clone Twitter léger, mobile-first, conteneurisé avec Docker.

## Stack

| Couche    | Technologie                            |
|-----------|----------------------------------------|
| Frontend  | HTML5 · CSS3 (mobile-first) · Vanilla JS |
| Backend   | Node.js 20 · Express 4 · JWT           |
| Base de données | PostgreSQL 16                   |
| Infra     | Docker · Docker Compose · Nginx        |

## Lancer le projet

```bash
docker-compose up --build
docker-compose up
docker-compose down -v && docker-compose up --build --warning, supprime la base
docker-compose down && docker-compose up --build
docker-compose down
docker-compose up --build

docker rm -f
```

Puis ouvrir [http://localhost:8080](http://localhost:8080)

> Le backend est accessible directement sur `http://localhost:3000/api`

## Fonctionnalités v1

- Inscription / Connexion (JWT, 7 jours)
- Publier un post (280 caractères max)
- Fil d'actualité (posts propres + personnes suivies)
- Liker / retirer un like
- Supprimer ses propres posts
- Consulter un profil utilisateur
- Suivre / Ne plus suivre
- Recherche d'utilisateur par @username
- Modifier son profil (nom, bio)

## Structure du projet

```
.
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── db/
│       │   ├── index.js
│       │   └── schema.sql
│       ├── middleware/
│       │   └── auth.js
│       └── routes/
│           ├── auth.js
│           ├── posts.js
│           └── users.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        └── app.js
```

## Roadmap

- **v1** ✅ Web (SPA responsive)
- **v2** Mobile natif (React Native / Capacitor)

## Variables d'environnement backend

| Variable       | Valeur par défaut       |
|----------------|-------------------------|
| `DATABASE_URL` | (défini dans compose)   |
| `JWT_SECRET`   | `change_me_in_production` — **à changer !** |
| `PORT`         | `3000`                  |


## BDD Instructions

docker exec -it mycelium-woods-roots-db psql -U mycelium -d mycelium_woods_roots_db
docker exec -it mycelium-woods-roots-db psql -U mycelium -d mycelium_woods_roots_db

Commande	Description
\dt	Lister toutes les tables
\d users	Voir la structure d'une table
\d+	Voir la structure + détails (index, séquences)
\l	Lister toutes les bases
\du	Lister tous les utilisateurs
\q	Quitter psql


-- Tous les utilisateurs
SELECT * FROM users;

-- Tous les posts avec le nom de l'auteur
SELECT p.id, u.username, p.content, p.created_at 
FROM posts p 
JOIN users u ON p.user_id = u.id 
ORDER BY p.created_at DESC;

-- Tous les likes
SELECT * FROM likes;

-- Toutes les relations de suivi
SELECT * FROM follows;

SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM posts;
SELECT COUNT(*) FROM likes;
SELECT COUNT(*) FROM follows;

-- Posts d'un utilisateur spécifique (id=1)
SELECT * FROM posts WHERE user_id = 1;

-- Utilisateur par @username
SELECT * FROM users WHERE username = 'alice';

-- Posts des 7 derniers jours
SELECT * FROM posts 
WHERE created_at > NOW() - INTERVAL '7 days' 
ORDER BY created_at DESC;


-- Posts avec nombre de likes
SELECT p.id, p.content, COUNT(l.user_id) as likes_count
FROM posts p 
LEFT JOIN likes l ON l.post_id = p.id 
GROUP BY p.id 
ORDER BY likes_count DESC;

-- Utilisateurs populaires (plus de followers)
SELECT u.username, COUNT(f.follower_id) as follower_count
FROM users u 
LEFT JOIN follows f ON f.following_id = u.id 
GROUP BY u.id 
ORDER BY follower_count DESC;

-- Vérifier si un utilisateur aime un post
SELECT EXISTS(SELECT 1 FROM likes WHERE user_id = 1 AND post_id = 1);

# Voir tous les users
docker exec -it mycelium-woods-roots-db psql -U mycelium -d mycelium_woods_roots_db -c "SELECT * FROM users;"

# Voir tous les posts
docker exec -it mycelium-woods-roots-db psql -U mycelium -d mycelium_woods_roots_db -c "SELECT * FROM posts;"

# Compter les enregistrements
docker exec -it mycelium-woods-roots-db psql -U mycelium -d mycelium_woods_roots_db -c "SELECT 'users' as table_name, COUNT(*) FROM users UNION ALL SELECT 'posts', COUNT(*) FROM posts UNION ALL SELECT 'likes', COUNT(*) FROM likes UNION ALL SELECT 'follows', COUNT(*) FROM follows;"

docker exec -it mycelium-woods-roots-db psql -U mycelium -d mycelium_woods_roots_db -c "SELECT * FROM users;"


## Lire les logs

En temps réel (tail -f)
docker logs -f mycelium-woods-roots-backend

Les 50 dernières lignes
docker logs mycelium-woods-roots-backend | tail -50

Tout depuis le démarrage
docker logs mycelium-woods-roots-backend

