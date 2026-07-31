/* API layer — toutes les requêtes vers le backend */

const API_BASE = "/api";

const Api = {
  _token: null,

  setToken(t) { this._token = t; },

  _headers(extra = {}) {
    const h = { "Content-Type": "application/json", ...extra };
    if (this._token) h["Authorization"] = `Bearer ${this._token}`;
    return h;
  },

  async _fetch(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      headers: this._headers(),
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur réseau");
    return data;
  },

  // Auth
  register(username, display_name, email, password) {
    return this._fetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, display_name, email, password }),
    });
  },

  login(login, password) {
    return this._fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
  },

  // Feed
  getFeed() { return this._fetch("/posts/feed"); },

  // Posts
  createPost(content) {
    return this._fetch("/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  deletePost(id) {
    return this._fetch(`/posts/${id}`, { method: "DELETE" });
  },

  likePost(id) {
    return this._fetch(`/posts/${id}/like`, { method: "POST" });
  },

  unlikePost(id) {
    return this._fetch(`/posts/${id}/like`, { method: "DELETE" });
  },

  // Users
  getUser(username) { return this._fetch(`/users/${username}`); },
  getUserPosts(username) { return this._fetch(`/users/${username}/posts`); },

  followUser(username) {
    return this._fetch(`/users/${username}/follow`, { method: "POST" });
  },

  unfollowUser(username) {
    return this._fetch(`/users/${username}/follow`, { method: "DELETE" });
  },

  updateProfile(display_name, bio) {
    return this._fetch("/users/me/profile", {
      method: "PATCH",
      body: JSON.stringify({ display_name, bio }),
    });
  },
};
