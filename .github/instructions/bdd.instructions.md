---
applyTo: "backend/src/db/**"
description: Conventions et règles pour la base de données PostgreSQL du projet Toto (schéma, migrations, requêtes).
---

# Base de données — Conventions Toto

## Purpose

Définir les règles de conception et d'utilisation de la base de données PostgreSQL de Toto : schéma, nommage, intégrité référentielle, indexation et bonnes pratiques de requêtage.

## Rules

- **PostgreSQL uniquement** : ne pas introduire d'autre SGBD (MySQL, SQLite, MongoDB…).
- **Nommage `snake_case`** : toutes les tables, colonnes et index utilisent le `snake_case` (ex : `display_name`, `created_at`).
- **Clés primaires `SERIAL`** : utiliser `SERIAL PRIMARY KEY` pour les identifiants auto-incrémentés.
- **Horodatage systématique** : toute table doit avoir une colonne `created_at TIMESTAMPTZ DEFAULT NOW()`.
- **Contraintes d'intégrité référentielle** : toute clé étrangère doit inclure `ON DELETE CASCADE` pour éviter les orphelins.
- **Contraintes d'unicité au niveau DB** : les contraintes d'unicité (`UNIQUE`) doivent être déclarées dans le schéma, pas seulement vérifiées applicativement.
- **Tables de liaison sans surrogat** : les tables many-to-many (`follows`, `likes`) utilisent une clé primaire composite (`PRIMARY KEY (col_a, col_b)`).
- **Modifications via migrations** : ne jamais modifier `schema.sql` directement pour une base en production. Créer un fichier de migration numéroté.
- **`IF NOT EXISTS` sur les `CREATE`** : toujours utiliser `CREATE TABLE IF NOT EXISTS` et `CREATE INDEX IF NOT EXISTS` pour que le script soit ré-entrant.

## Best Practices

- Créer des index sur toutes les colonnes fréquemment filtrées ou triées : `user_id`, `created_at DESC`, clés étrangères des tables de liaison.
- Limiter la longueur des champs texte au niveau DB (`VARCHAR(n)`) pour refléter les règles métier (ex : `content VARCHAR(280)`, `username VARCHAR(30)`).
- Utiliser `TIMESTAMPTZ` (avec timezone) plutôt que `TIMESTAMP` pour éviter les problèmes de fuseau horaire.
- Préférer `COUNT(DISTINCT col)` pour les comptages sur jointures afin d'éviter les doublons.
- Utiliser des sous-requêtes corrélées `EXISTS(SELECT 1 FROM … WHERE …)` pour les booléens (`liked`, `is_followed`) plutôt qu'un LEFT JOIN supplémentaire.

## Examples

```sql
-- Table avec toutes les bonnes pratiques
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    VARCHAR(280) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index sur les colonnes fréquemment filtrées
CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Table de liaison many-to-many (clé composite, pas de SERIAL)
CREATE TABLE IF NOT EXISTS likes (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);
```

```sql
-- Requête avec booléen EXISTS et COUNT DISTINCT
SELECT p.id, p.content,
       COUNT(DISTINCT l.user_id) AS likes_count,
       EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id) AS liked
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
WHERE p.user_id = $2
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 50;
```

## References

- [PostgreSQL — Documentation officielle](https://www.postgresql.org/docs/)
- [OWASP — SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
