/* ============================
   MYCELIUM — Main app logic
   ============================ */

let currentUser = null;
let currentView = "feed";
let previousView = null;

/* ---- Init ---- */
function init() {
  // Load saved theme
  const savedTheme = localStorage.getItem("mycelium_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcons(savedTheme);

  const saved = localStorage.getItem("mycelium_token");
  const savedUser = localStorage.getItem("mycelium_user");
  if (saved && savedUser) {
    currentUser = JSON.parse(savedUser);
    Api.setToken(saved);
    showApp();
  } else {
    showAuth();
  }
  bindEvents();
}

function updateThemeIcons(theme) {
  const sunIcon = document.querySelector(".theme-icon-sun");
  const moonIcon = document.querySelector(".theme-icon-moon");
  if (sunIcon && moonIcon) {
    sunIcon.classList.toggle("hidden", theme === "light");
    moonIcon.classList.toggle("hidden", theme === "dark");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("mycelium_theme", next);
  updateThemeIcons(next);
}

/* ---- Auth ---- */
function showAuth() {
  document.getElementById("screen-auth").classList.replace("hidden", "active");
  document.getElementById("screen-app").classList.add("hidden");
}

function showApp() {
  document.getElementById("screen-auth").classList.replace("active", "hidden");
  document.getElementById("screen-app").classList.remove("hidden");
  navigateTo("feed");
}

function saveSession(token, user) {
  localStorage.setItem("mycelium_token", token);
  localStorage.setItem("mycelium_user", JSON.stringify(user));
  Api.setToken(token);
  currentUser = user;
}

function logout() {
  localStorage.removeItem("mycelium_token");
  localStorage.removeItem("mycelium_user");
  Api.setToken(null);
  currentUser = null;
  showAuth();
}

/* ---- Navigation ---- */
function navigateTo(view, param) {
  const views = document.querySelectorAll(".view");
  views.forEach(v => { v.classList.remove("active"); v.classList.add("hidden"); });

  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(b => b.classList.remove("active"));

  previousView = currentView;
  currentView = view;

  if (view === "feed") {
    const el = document.getElementById("view-feed");
    el.classList.replace("hidden", "active");
    document.querySelector('[data-view="feed"]').classList.add("active");
    loadFeed();
  } else if (view === "search") {
    const el = document.getElementById("view-search");
    el.classList.replace("hidden", "active");
    document.querySelector('[data-view="search"]').classList.add("active");
  } else if (view === "profile" || view === "profile-me") {
    const username = view === "profile-me" ? currentUser.username : param;
    const el = document.getElementById("view-profile");
    el.classList.replace("hidden", "active");
    loadProfile(username);
  }
}

/* ---- Feed ---- */
async function loadFeed() {
  const list = document.getElementById("feed-list");
  list.innerHTML = '<div class="loading">Chargement…</div>';
  try {
    const posts = await Api.getFeed();
    renderPosts(list, posts);
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

/* ---- Posts rendering ---- */
function renderPosts(container, posts) {
  if (!posts.length) {
    container.innerHTML = '<div class="empty-state">Aucun post pour l\'instant.<br>Suivez des personnes pour voir leur actu !</div>';
    return;
  }
  container.innerHTML = posts.map(p => postHTML(p)).join("");
  container.querySelectorAll(".like-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      toggleLike(btn);
    });
  });
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      deletePost(btn);
    });
  });
  container.querySelectorAll(".post-item").forEach(item => {
    item.addEventListener("click", () => {
      navigateTo("profile", item.dataset.username);
    });
  });
}

function postHTML(p) {
  const initials = (p.display_name || p.username).substring(0, 2).toUpperCase();
  const isOwn = currentUser && p.user_id === currentUser.id;
  const likedClass = p.liked ? "liked" : "";
  const date = relativeTime(p.created_at);

  return `
  <article class="post-item" data-username="${escHtml(p.username)}">
    <div class="post-meta">
      <div class="post-avatar">${initials}</div>
      <div class="post-author">
        <span class="post-display-name">${escHtml(p.display_name)}</span>
        <span class="post-username">@${escHtml(p.username)}</span>
      </div>
      <span class="post-time">${date}</span>
    </div>
    <p class="post-content">${escHtml(p.content)}</p>
    <div class="post-actions">
      <button class="action-btn like-btn ${likedClass}"
              data-post-id="${p.id}"
              data-liked="${p.liked}"
              aria-label="${p.liked ? "Retirer le like" : "Liker"}">
        <svg viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
        <span>${p.likes_count}</span>
      </button>
      ${isOwn ? `<button class="action-btn delete-btn" data-post-id="${p.id}" aria-label="Supprimer">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Supprimer
      </button>` : ""}
    </div>
  </article>`;
}

async function toggleLike(btn) {
  const postId = btn.dataset.postId;
  const liked = btn.dataset.liked === "true";
  try {
    const res = liked ? await Api.unlikePost(postId) : await Api.likePost(postId);
    btn.dataset.liked = res.liked;
    btn.classList.toggle("liked", res.liked);
    btn.querySelector("span").textContent = res.likes_count;
    btn.setAttribute("aria-label", res.liked ? "Retirer le like" : "Liker");
  } catch (e) {
    console.error(e);
  }
}

async function deletePost(btn) {
  if (!confirm("Supprimer ce post ?")) return;
  const postId = btn.dataset.postId;
  try {
    await Api.deletePost(postId);
    btn.closest(".post-item").remove();
  } catch (e) {
    alert(e.message);
  }
}

/* ---- Profile ---- */
async function loadProfile(username) {
  const card = document.getElementById("profile-card");
  const postsList = document.getElementById("profile-posts");
  document.getElementById("profile-title").textContent = "@" + username;
  card.innerHTML = '<div class="loading">Chargement…</div>';
  postsList.innerHTML = "";

  try {
    const [user, posts] = await Promise.all([
      Api.getUser(username),
      Api.getUserPosts(username),
    ]);
    renderProfileCard(card, user);
    renderPosts(postsList, posts);
  } catch (e) {
    card.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

function renderProfileCard(container, user) {
  const initials = (user.display_name || user.username).substring(0, 2).toUpperCase();
  const isMe = currentUser && user.id === currentUser.id;
  const followBtn = isMe
    ? `<button class="btn-secondary" id="edit-profile-btn">Modifier</button>`
    : `<button class="btn-primary" id="follow-btn" data-username="${escHtml(user.username)}" data-following="${user.is_followed}">
         ${user.is_followed ? "Ne plus suivre" : "Suivre"}
       </button>`;

  container.innerHTML = `
    <div class="profile-top">
      <div class="profile-avatar">${initials}</div>
      ${followBtn}
    </div>
    <div class="profile-name">${escHtml(user.display_name)}</div>
    <div class="profile-handle">@${escHtml(user.username)}</div>
    ${user.bio ? `<div class="profile-bio">${escHtml(user.bio)}</div>` : ""}
    <div class="profile-stats">
      <div class="stat"><span class="stat-val">${user.followers_count}</span><span class="stat-label">abonnés</span></div>
      <div class="stat"><span class="stat-val">${user.following_count}</span><span class="stat-label">abonnements</span></div>
    </div>`;

  const followBtnEl = document.getElementById("follow-btn");
  if (followBtnEl) {
    followBtnEl.addEventListener("click", async () => {
      const un = followBtnEl.dataset.username;
      const following = followBtnEl.dataset.following === "true";
      try {
        if (following) {
          await Api.unfollowUser(un);
          followBtnEl.textContent = "Suivre";
          followBtnEl.dataset.following = "false";
        } else {
          await Api.followUser(un);
          followBtnEl.textContent = "Ne plus suivre";
          followBtnEl.dataset.following = "true";
        }
      } catch (e) { alert(e.message); }
    });
  }

  const editBtn = document.getElementById("edit-profile-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => showEditProfile(user));
  }
}

function showEditProfile(user) {
  const display = prompt("Nom affiché :", user.display_name);
  if (display === null) return;
  const bio = prompt("Bio (max 160 car.) :", user.bio || "");
  if (bio === null) return;
  Api.updateProfile(display.trim(), bio.trim())
    .then(updated => {
      currentUser.display_name = updated.display_name;
      localStorage.setItem("mycelium_user", JSON.stringify(currentUser));
      loadProfile(updated.username);
    })
    .catch(e => alert(e.message));
}

/* ---- Search ---- */
async function doSearch(query) {
  if (!query.trim()) return;
  const container = document.getElementById("search-results");
  container.innerHTML = '<div class="loading">Recherche…</div>';
  try {
    // Simple client-side search via profile fetch (extend with dedicated endpoint later)
    const user = await Api.getUser(query.trim().replace("@", ""));
    container.innerHTML = `
      <div class="user-item" data-username="${escHtml(user.username)}">
        <div class="user-avatar">${(user.display_name || user.username).substring(0, 2).toUpperCase()}</div>
        <div class="user-info">
          <span class="user-display">${escHtml(user.display_name)}</span>
          <span class="user-handle">@${escHtml(user.username)}</span>
        </div>
      </div>`;
    container.querySelector(".user-item").addEventListener("click", () => {
      navigateTo("profile", user.username);
    });
  } catch {
    container.innerHTML = '<div class="empty-state">Aucun utilisateur trouvé.</div>';
  }
}

/* ---- Compose ---- */
function openCompose() {
  document.getElementById("modal-compose").classList.remove("hidden");
  document.getElementById("compose-text").focus();
}

function closeCompose() {
  document.getElementById("modal-compose").classList.add("hidden");
  document.getElementById("compose-text").value = "";
  document.getElementById("compose-count").textContent = "280";
  document.getElementById("compose-count").className = "";
  document.getElementById("compose-error").classList.add("hidden");
}

/* ---- Bind all events ---- */
function bindEvents() {
  // Auth tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      document.getElementById("form-login").classList.toggle("hidden", which !== "login");
      document.getElementById("form-register").classList.toggle("hidden", which !== "register");
    });
  });

  // Login form
  document.getElementById("form-login").addEventListener("submit", async e => {
    e.preventDefault();
    const err = document.getElementById("login-error");
    err.classList.add("hidden");
    const login = document.getElementById("login-id").value;
    const password = document.getElementById("login-pw").value;
    try {
      const { token, user } = await Api.login(login, password);
      saveSession(token, user);
      showApp();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove("hidden");
    }
  });

  // Register form
  document.getElementById("form-register").addEventListener("submit", async e => {
    e.preventDefault();
    const err = document.getElementById("register-error");
    err.classList.add("hidden");
    const username = document.getElementById("reg-username").value;
    const display_name = document.getElementById("reg-display").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-pw").value;
    try {
      const { token, user } = await Api.register(username, display_name, email, password);
      saveSession(token, user);
      showApp();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove("hidden");
    }
  });

  // Nav buttons
  document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.view));
  });

  // Compose button
  document.getElementById("nav-compose").addEventListener("click", openCompose);
  document.getElementById("close-compose").addEventListener("click", closeCompose);
  document.querySelector(".modal-backdrop").addEventListener("click", closeCompose);

  // Character counter
  document.getElementById("compose-text").addEventListener("input", e => {
    const remaining = 280 - e.target.value.length;
    const counter = document.getElementById("compose-count");
    counter.textContent = remaining;
    counter.className = remaining < 20 ? "danger" : remaining < 60 ? "warn" : "";
  });

  // Submit post
  document.getElementById("compose-submit").addEventListener("click", async () => {
    const content = document.getElementById("compose-text").value.trim();
    const err = document.getElementById("compose-error");
    err.classList.add("hidden");
    if (!content) return;
    try {
      document.getElementById("compose-submit").disabled = true;
      await Api.createPost(content);
      closeCompose();
      if (currentView === "feed") loadFeed();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove("hidden");
    } finally {
      document.getElementById("compose-submit").disabled = false;
    }
  });

  // Search
  document.getElementById("search-btn").addEventListener("click", () => {
    doSearch(document.getElementById("search-input").value);
  });
  document.getElementById("search-input").addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch(e.target.value);
  });

  // Back button
  document.getElementById("back-btn").addEventListener("click", () => {
    navigateTo(previousView || "feed");
  });

  // Logout button
  document.getElementById("nav-logout").addEventListener("click", () => {
    if (confirm("Se déconnecter ?")) logout();
  });

  // Theme toggle
  document.getElementById("nav-theme").addEventListener("click", toggleTheme);

  // Keyboard: close modal on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeCompose();
  });
}

/* ---- Helpers ---- */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* ---- Start ---- */
document.addEventListener("DOMContentLoaded", init);
