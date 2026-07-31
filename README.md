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
