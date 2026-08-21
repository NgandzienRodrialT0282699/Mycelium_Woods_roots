---
applyTo: "backend/src/db/**"
description: Conventions et règles pour la base de données PostgreSQL du projet Mycelium (schéma, migrations, requêtes).
---

# Base de données — Conventions Mycelium

## Purpose

Définir les règles de conception et d'utilisation de la base de données PostgreSQL de Mycelium : un clone de Twitter/X avec schéma optimisé pour les fonctionnalités sociales.

## Schéma des tables

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│   posts     │────<│  comments   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │ │                 │
      │                   │ │                 │
      ▼                   ▼ ▼                 ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   follows   │     │    likes    │     │notifications│
└─────────────┘     ├─────────────┤     └─────────────┘
                    │   reposts   │
                    ├─────────────┤
                    │  bookmarks  │
                    └─────────────┘
```

### Tables principales

| Table | Description |
|-------|-------------|
| `users` | Comptes utilisateurs |
| `posts` | Publications (max 280 chars) |
| `comments` | Réponses aux posts |
| `follows` | Relations follower/following |
| `likes` | Likes sur posts/comments |
| `reposts` | Retweets/reposts |
| `bookmarks` | Favoris personnels |
| `notifications` | Notifications utilisateur |
| `hashtags` | Table des hashtags uniques |
| `post_hashtags` | Liaison posts ↔ hashtags |

## Rules

### Général
- **PostgreSQL uniquement** : pas de MySQL, SQLite, MongoDB.
- **Nommage `snake_case`** : tables, colonnes, index, contraintes.
- **Clés primaires `SERIAL`** : `id SERIAL PRIMARY KEY` pour auto-incrément.
- **Horodatage obligatoire** : `created_at TIMESTAMPTZ DEFAULT NOW()` sur toute table.

### Intégrité
- **Clés étrangères avec CASCADE** : `ON DELETE CASCADE` systématique pour éviter les orphelins.
- **Contraintes d'unicité en DB** : `UNIQUE` dans le schéma, pas uniquement côté applicatif.
- **Tables liaison sans surrogat** : clé primaire composite `PRIMARY KEY (col_a, col_b)`.

### Performance
- **Index obligatoires** : sur toute colonne filtrée (`user_id`, `post_id`) ou triée (`created_at DESC`).
- **Index texte full-text** : `GIN` sur les colonnes recherchées (`content`, `username`).
- **LIMIT systématique** : jamais de SELECT sans LIMIT sur les listes.

### Migrations
- **`IF NOT EXISTS`** : sur tous les `CREATE TABLE` et `CREATE INDEX`.
- **Migrations numérotées** : pour la production, ne pas modifier `schema.sql` directement.

## Best Practices

- `TIMESTAMPTZ` plutôt que `TIMESTAMP` (gestion timezone).
- `VARCHAR(n)` avec limites métier : `content(280)`, `username(30)`, `bio(160)`.
- `COUNT(DISTINCT col)` pour éviter les doublons sur jointures.
- `EXISTS(SELECT 1 ...)` pour les booléens (`liked`, `is_followed`).
- `RETURNING` après `INSERT` pour éviter double requête.
- `ON CONFLICT DO NOTHING` pour opérations idempotentes.

## Schema complet

```sql
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(30) UNIQUE NOT NULL,
  display_name  VARCHAR(60) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio           VARCHAR(160) DEFAULT '',
  avatar_url    TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops);

-- POSTS
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    VARCHAR(280) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON posts USING gin(content gin_trgm_ops);

-- COMMENTS (réponses aux posts)
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    VARCHAR(280) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS follows (
  follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- LIKES
CREATE TABLE IF NOT EXISTS likes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);

-- REPOSTS
CREATE TABLE IF NOT EXISTS reposts (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON reposts(user_id);

-- BOOKMARKS
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL, -- 'like', 'comment', 'follow', 'repost'
  actor_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- HASHTAGS
CREATE TABLE IF NOT EXISTS hashtags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);

-- POST_HASHTAGS
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);
```

## Requêtes types

```sql
-- Feed personnalisé (posts des following + self)
SELECT p.*, u.username, u.display_name,
       COUNT(DISTINCT l.user_id) AS likes_count,
       COUNT(DISTINCT c.id) AS comments_count,
       COUNT(DISTINCT r.user_id) AS reposts_count,
       EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id) AS liked,
       EXISTS(SELECT 1 FROM reposts WHERE user_id = $1 AND post_id = p.id) AS reposted,
       EXISTS(SELECT 1 FROM bookmarks WHERE user_id = $1 AND post_id = p.id) AS bookmarked
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN likes l ON l.post_id = p.id
LEFT JOIN comments c ON c.post_id = p.id
LEFT JOIN reposts r ON r.post_id = p.id
WHERE p.user_id = $1 OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
GROUP BY p.id, u.id
ORDER BY p.created_at DESC
LIMIT 20 OFFSET $2;

-- Recherche utilisateurs (ILIKE ou trigram)
SELECT id, username, display_name, bio,
       COUNT(DISTINCT f.follower_id) AS followers_count
FROM users u
LEFT JOIN follows f ON f.following_id = u.id
WHERE u.username ILIKE $1 OR u.display_name ILIKE $1
GROUP BY u.id
ORDER BY followers_count DESC
LIMIT 20;

-- Créer notification
INSERT INTO notifications (user_id, type, actor_id, post_id)
VALUES ($1, 'like', $2, $3);
```

## References

- [PostgreSQL — Documentation officielle](https://www.postgresql.org/docs/)
- [PostgreSQL — pg_trgm (recherche fuzzy)](https://www.postgresql.org/docs/current/pgtrgm.html)
