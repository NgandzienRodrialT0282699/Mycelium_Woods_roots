---
applyTo: "frontend/**"
description: Conventions et règles pour le développement frontend du projet Mycelium (HTML, CSS mobile-first, Vanilla JS SPA).
---

# Frontend — Conventions Mycelium

## Purpose

Définir les règles de développement du frontend Mycelium : une SPA clone de Twitter/X en HTML5 / CSS3 / Vanilla JS, sans framework, optimisée mobile-first et responsive sur tous les écrans.

## Architecture

```
frontend/
├── index.html      # SPA unique — toutes les vues
├── css/
│   └── style.css   # Mobile-first, variables CSS, dark/light mode
└── js/
    ├── api.js      # Couche API — tous les appels HTTP
    └── app.js      # Logique UI — navigation, rendu, événements
```

## Rules

### Général
- **Pas de framework JS** : utiliser uniquement Vanilla JS (ES2022+). Interdit : React, Vue, Angular, jQuery.
- **Un seul fichier HTML** : SPA avec navigation JS via show/hide des vues. Pas de pages multiples.
- **Pas de dépendances externes** : pas de CDN, pas de Bootstrap/Tailwind. Tout le CSS dans `style.css`.
- **Séparation stricte** : `api.js` = appels réseau uniquement, `app.js` = UI et logique métier.

### Responsive & Mobile-first
- **Mobile-first obligatoire** : CSS de base pour mobile (≤639px), puis breakpoints desktop avec `@media (min-width: …)`.
- **Breakpoints standards** : `640px` (tablette), `960px` (desktop), `1280px` (large).
- **Touch-friendly** : zones cliquables minimum 44×44px, espacement suffisant entre éléments interactifs.
- **Viewport adaptatif** : tester sur 320px (petit mobile) jusqu'à 1920px (desktop large).

### Sécurité
- **XSS prevention** : TOUJOURS utiliser `escHtml()` avant injection dans le DOM. JAMAIS de `innerHTML` avec données brutes.
- **Tokens** : stocker dans `localStorage` uniquement. Ne jamais exposer le token dans l'URL.

### Accessibilité (a11y)
- **Labels obligatoires** : tout bouton sans texte doit avoir `aria-label`.
- **Modales** : `role="dialog"`, `aria-modal="true"`, focus trap.
- **Contraste** : respecter WCAG 2.1 AA (ratio 4.5:1 pour texte normal).
- **Navigation clavier** : tous les éléments interactifs doivent être focusables et activables au clavier.

### Gestion d'état
- **État local** : `currentUser`, `currentView`, préférences dans `localStorage` préfixées `mycelium_`.
- **Feedback utilisateur** : toujours afficher loading states, erreurs lisibles, confirmations d'action.
- **Optimistic UI** : pour les actions rapides (like), mettre à jour l'UI immédiatement puis sync avec le serveur.

### Performance
- **Lazy loading** : charger les vues/données uniquement quand nécessaire.
- **Debounce** : pour la recherche, attendre 300ms après la dernière frappe avant d'appeler l'API.
- **Pagination** : implémenter infinite scroll ou bouton "Charger plus" plutôt que tout charger.

## Best Practices

- Utiliser les variables CSS (`--accent`, `--bg`, `--text`, etc.) — jamais de couleurs hardcodées.
- Préférer Flexbox/Grid aux floats ou positions absolues.
- SVG inline pour les icônes (pas de requêtes HTTP supplémentaires).
- Validation HTML5 native (`required`, `minlength`, `maxlength`, `type="email"`) avant validation JS.
- Scripts en bas de `<body>` : `api.js` puis `app.js`.
- `Promise.all()` pour les chargements parallèles.

## Examples

```js
// XSS — Échappement obligatoire
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ❌ INTERDIT
container.innerHTML = `<p>${userData.bio}</p>`;

// ✅ CORRECT
container.innerHTML = `<p>${escHtml(userData.bio)}</p>`;
```

```js
// Debounce pour recherche
let searchTimeout;
searchInput.addEventListener("input", e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => doSearch(e.target.value), 300);
});
```

```css
/* Mobile-first responsive */
.feed-container {
  padding: 0 12px;
}

@media (min-width: 640px) {
  .feed-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 20px;
  }
}

@media (min-width: 960px) {
  .feed-container {
    max-width: 680px;
  }
}
```

## Composants UI à implémenter

| Composant | Description |
|-----------|-------------|
| Post card | Affiche post avec auteur, contenu, actions (like, comment, repost, bookmark) |
| Comment thread | Liste de réponses imbriquées sous un post |
| User card | Avatar, nom, @handle, bouton follow |
| Notification item | Icône type, message, timestamp, lien vers la source |
| Search bar | Input avec debounce, onglets Users/Posts |
| Infinite scroll | Chargement automatique à l'approche du bas |

## References

- [MDN — Vanilla JS](https://developer.mozilla.org/fr/docs/Web/JavaScript)
- [OWASP — XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
