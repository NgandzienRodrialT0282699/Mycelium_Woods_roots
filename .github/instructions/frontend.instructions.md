---
applyTo: "frontend/**"
description: Conventions et règles pour le développement frontend du projet Toto (HTML, CSS mobile-first, Vanilla JS SPA).
---

# Frontend — Conventions Toto

## Purpose

Définir les règles de développement du frontend Toto : une SPA légère en HTML5 / CSS3 / Vanilla JS, sans framework, optimisée mobile-first et prévue pour une transition vers le mobile natif en v2.

## Rules

- **Pas de framework JS** : utiliser uniquement du Vanilla JS (ES2022+). Ne pas introduire React, Vue, Angular ou tout autre framework.
- **Mobile-first** : toutes les règles CSS doivent cibler les petits écrans en premier, les breakpoints desktop se faisant avec `@media (min-width: …)`.
- **Un seul fichier HTML** : l'application est une SPA. Ne pas créer plusieurs fichiers HTML — la navigation est gérée par JavaScript en cachant/affichant les vues.
- **Pas de dépendances externes** : pas de CDN, pas de bibliothèques CSS (Bootstrap, Tailwind, etc.). Le style est entièrement dans `css/style.css`.
- **Sécurité XSS** : toute donnée venant de l'API ou de l'utilisateur doit être échappée via `escHtml()` avant d'être insérée dans le DOM. Ne jamais utiliser `innerHTML` avec une valeur non échappée.
- **Séparation des responsabilités** : `api.js` gère uniquement les appels HTTP, `app.js` gère l'UI et la logique applicative.
- **Gestion des erreurs** : toujours afficher un message lisible à l'utilisateur en cas d'erreur réseau ou API. Ne pas `console.error` silencieusement sans retour visuel.
- **Accessibilité minimale** : chaque bouton d'icône doit avoir un `aria-label`. Les modales doivent avoir `role="dialog"` et `aria-modal="true"`.

## Best Practices

- Utiliser les variables CSS (`--accent`, `--bg`, etc.) définies dans `:root` plutôt que des valeurs hardcodées.
- Préférer les `flex` layouts aux `float` ou `position` absolue.
- Les SVG d'icônes sont inline dans le HTML pour éviter des requêtes supplémentaires.
- Les formulaires utilisent la validation HTML5 native (`required`, `minlength`, `maxlength`, `type`) avant toute validation JS.
- Charger les scripts JS en bas de `<body>` dans l'ordre : `api.js` puis `app.js`.
- Utiliser `Promise.all()` pour les chargements parallèles (ex : profil + posts d'un utilisateur).

## Examples

```js
// Echappement correct avant injection dans le DOM
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Mauvais — NE PAS FAIRE
container.innerHTML = `<p>${userData.bio}</p>`;

// Correct
container.innerHTML = `<p>${escHtml(userData.bio)}</p>`;
```

```css
/* Mobile-first : base pour mobile, overrides pour desktop */
.bottom-nav {
  position: fixed;
  bottom: 0;
  /* ... */
}

@media (min-width: 640px) {
  .bottom-nav {
    position: fixed;
    top: 0;
    left: 0;
    width: 72px;
    height: 100vh;
    /* ... */
  }
}
```

## References

- [MDN — Vanilla JS](https://developer.mozilla.org/fr/docs/Web/JavaScript)
- [OWASP — XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
