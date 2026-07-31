---
applyTo: "backend/**"
description: Conventions et règles pour le développement backend du projet Toto (Node.js, Express, JWT, PostgreSQL).
---

# Backend — Conventions Toto

## Purpose

Définir les règles de développement du backend Toto : une API REST Node.js/Express authentifiée par JWT, communiquant avec PostgreSQL via `pg`.

## Rules

- **Pas d'ORM** : utiliser le client `pg` directement avec des requêtes SQL paramétrées. Ne pas introduire Sequelize, Prisma ou TypeORM.
- **Requêtes paramétrées obligatoires** : toutes les requêtes SQL doivent utiliser des paramètres positionnels (`$1`, `$2`…). Ne jamais concaténer des valeurs utilisateur dans une requête SQL.
- **Authentification JWT** : toute route protégée doit passer par le middleware `src/middleware/auth.js`. Ne pas dupliquer la logique de vérification du token.
- **Mots de passe** : utiliser `bcryptjs` avec un coût minimum de 12. Ne jamais stocker ni logger un mot de passe en clair.
- **Ne jamais exposer `password_hash`** : destructurer l'objet utilisateur avant de répondre au client (`const { password_hash, ...safeUser } = user`).
- **Validation à l'entrée** : valider les champs requis et les contraintes métier (longueur, format) en début de route, avant toute requête DB.
- **Codes HTTP sémantiques** : `201` pour création, `400` pour entrée invalide, `401` pour non authentifié, `403` pour interdit, `404` pour introuvable, `409` pour conflit d'unicité, `500` pour erreur serveur.
- **Gestion des erreurs DB** : intercepter le code `23505` (unique_violation) de PostgreSQL pour retourner un `409` clair.
- **Structure des routes** : un fichier par domaine dans `src/routes/`. Ne pas mettre de logique métier dans `src/index.js`.

## Best Practices

- Préfixer toutes les routes de `/api/` (ex : `/api/auth`, `/api/posts`, `/api/users`).
- Logger les erreurs inattendues avec `console.error(err)` côté serveur avant de répondre `500`.
- Utiliser `ON CONFLICT DO NOTHING` pour les opérations idempotentes (like, follow) plutôt que de vérifier l'existence au préalable.
- Limiter les résultats paginables avec `LIMIT` (défaut 50) pour éviter les réponses trop lourdes.
- Utiliser `RETURNING` dans les `INSERT` pour éviter une deuxième requête de lecture.

## Examples

```js
// Requête paramétrée — correct
const result = await db.query(
  `SELECT * FROM users WHERE username = $1 OR email = $1`,
  [login.toLowerCase()]
);

// Mauvais — NE PAS FAIRE (injection SQL)
const result = await db.query(
  `SELECT * FROM users WHERE username = '${login}'`
);
```

```js
// Ne jamais exposer le hash
const { password_hash, ...safeUser } = user;
res.json({ token, user: safeUser });
```

```js
// Validation en entrée de route
if (!content || content.trim().length === 0) {
  return res.status(400).json({ error: "Le contenu est requis" });
}
if (content.length > 280) {
  return res.status(400).json({ error: "Maximum 280 caractères" });
}
```

## References

- [OWASP — SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
