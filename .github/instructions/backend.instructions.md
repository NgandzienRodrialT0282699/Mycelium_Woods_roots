---
applyTo: "backend/**"
description: Conventions et règles pour le développement backend du projet Mycelium (Node.js, Express, JWT, PostgreSQL).
---

# Backend — Conventions Mycelium

## Purpose

Définir les règles de développement du backend Mycelium : une API REST Node.js/Express clone de Twitter/X, authentifiée par JWT, avec PostgreSQL.

## Architecture

```
backend/
├── src/
│   ├── index.js           # Point d'entrée, configuration Express
│   ├── db/
│   │   ├── index.js       # Pool de connexion PostgreSQL
│   │   └── schema.sql     # Schéma de la base
│   ├── middleware/
│   │   └── auth.js        # Vérification JWT
│   └── routes/
│       ├── auth.js        # /api/auth — inscription, connexion
│       ├── posts.js       # /api/posts — CRUD posts, likes, reposts, comments
│       ├── users.js       # /api/users — profils, follow, recherche
│       ├── notifications.js # /api/notifications — système de notifs
│       └── search.js      # /api/search — recherche globale
```

## Rules

### Base
- **Pas d'ORM** : utiliser `pg` directement avec requêtes SQL paramétrées. Interdit : Sequelize, Prisma, TypeORM.
- **Requêtes paramétrées** : TOUJOURS `$1`, `$2`… JAMAIS de concaténation de valeurs utilisateur.
- **Structure routes** : un fichier par domaine dans `src/routes/`. Index uniquement pour config Express.

### Authentification & Sécurité
- **JWT obligatoire** : toute route protégée passe par `auth.js`. Token dans header `Authorization: Bearer <token>`.
- **Expiration JWT** : 7 jours par défaut, configurable via env.
- **Mots de passe** : bcryptjs avec coût ≥ 12. JAMAIS de mot de passe en clair dans les logs ou réponses.
- **Ne jamais exposer `password_hash`** : destructurer avant réponse : `const { password_hash, ...safeUser } = user`.
- **Rate limiting** : implémenter sur les routes sensibles (auth, post creation) pour éviter le spam.

### Validation
- **Validation à l'entrée** : valider TOUS les champs en début de route, AVANT toute requête DB.
- **Limites métier** : post 280 chars, username 30 chars, bio 160 chars, display_name 60 chars.
- **Format username** : `^[a-zA-Z0-9_]+$` uniquement.

### Codes HTTP
| Code | Usage |
|------|-------|
| 200 | Succès lecture/mise à jour |
| 201 | Création réussie |
| 400 | Entrée invalide (validation échouée) |
| 401 | Non authentifié (token manquant/invalide) |
| 403 | Interdit (pas les droits) |
| 404 | Ressource introuvable |
| 409 | Conflit (duplicate unique) |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |

### Gestion d'erreurs
- **Code PostgreSQL 23505** (unique_violation) → retourner 409 avec message clair.
- **Logger côté serveur** : `console.error(err)` avant de répondre 500.
- **Messages d'erreur en français** : cohérent avec l'UI.

### Pagination & Performance
- **Pagination obligatoire** : toutes les listes avec `LIMIT` (défaut 20, max 100) et `offset` ou `cursor`.
- **Index DB** : s'assurer que toutes les colonnes filtrées/triées sont indexées.
- **N+1 queries** : éviter absolument. Utiliser des JOINs ou sous-requêtes.

## API Endpoints à implémenter

### Auth (`/api/auth`)
- `POST /register` — inscription
- `POST /login` — connexion

### Posts (`/api/posts`)
- `GET /feed` — fil personnalisé (following + self)
- `GET /explore` — fil global (tous les posts)
- `POST /` — créer un post
- `GET /:id` — détail d'un post
- `DELETE /:id` — supprimer son post
- `POST /:id/like` — liker
- `DELETE /:id/like` — unliker
- `POST /:id/repost` — reposter
- `DELETE /:id/repost` — annuler repost
- `GET /:id/comments` — commentaires d'un post
- `POST /:id/comments` — commenter
- `POST /:id/bookmark` — sauvegarder
- `DELETE /:id/bookmark` — retirer des favoris

### Users (`/api/users`)
- `GET /search?q=` — recherche utilisateurs
- `GET /:username` — profil
- `GET /:username/posts` — posts d'un utilisateur
- `GET /:username/likes` — posts likés
- `GET /:username/followers` — liste followers
- `GET /:username/following` — liste following
- `POST /:username/follow` — suivre
- `DELETE /:username/follow` — ne plus suivre
- `PATCH /me/profile` — modifier son profil
- `GET /me/bookmarks` — mes favoris

### Notifications (`/api/notifications`)
- `GET /` — liste des notifications
- `GET /unread-count` — nombre non lues
- `PATCH /:id/read` — marquer comme lue
- `PATCH /read-all` — tout marquer comme lu

### Search (`/api/search`)
- `GET /users?q=` — recherche utilisateurs
- `GET /posts?q=` — recherche posts (contenu, hashtags)

## Best Practices

- Préfixer toutes les routes `/api/`.
- Utiliser `RETURNING` dans les `INSERT` pour éviter double requête.
- `ON CONFLICT DO NOTHING` pour opérations idempotentes (like, follow).
- Transactions (`BEGIN`/`COMMIT`) pour opérations multi-tables atomiques.

## Examples

```js
// Requête paramétrée — CORRECT
const result = await db.query(
  `SELECT * FROM users WHERE username = $1 OR email = $1`,
  [login.toLowerCase()]
);

// ❌ JAMAIS — injection SQL
const result = await db.query(
  `SELECT * FROM users WHERE username = '${login}'`
);
```

```js
// Pagination avec cursor (plus performant que offset)
router.get("/explore", auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const cursor = req.query.cursor; // timestamp du dernier post vu
  
  const result = await db.query(
    `SELECT ... FROM posts p
     WHERE ($1::timestamptz IS NULL OR p.created_at < $1)
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [cursor || null, limit]
  );
  
  const nextCursor = result.rows.length === limit 
    ? result.rows[result.rows.length - 1].created_at 
    : null;
  
  res.json({ posts: result.rows, nextCursor });
});
```

## References

- [OWASP — SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [node-postgres (pg)](https://node-postgres.com/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
