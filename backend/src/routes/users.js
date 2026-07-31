const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

// GET /api/users/:username
router.get("/:username", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.created_at,
              COUNT(DISTINCT f1.follower_id) AS followers_count,
              COUNT(DISTINCT f2.following_id) AS following_count,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_followed
       FROM users u
       LEFT JOIN follows f1 ON f1.following_id = u.id
       LEFT JOIN follows f2 ON f2.follower_id = u.id
       WHERE u.username = $1
       GROUP BY u.id`,
      [req.params.username, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/users/:username/posts
router.get("/:username/posts", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.content, p.created_at,
              u.id AS user_id, u.username, u.display_name,
              COUNT(DISTINCT l.user_id) AS likes_count,
              EXISTS(SELECT 1 FROM likes WHERE user_id = $2 AND post_id = p.id) AS liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes l ON l.post_id = p.id
       WHERE u.username = $1
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.params.username, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/users/:username/follow
router.post("/:username/follow", auth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id FROM users WHERE username = $1`, [req.params.username]);
    if (!rows[0]) return res.status(404).json({ error: "Utilisateur introuvable" });
    const targetId = rows[0].id;
    if (targetId === req.user.id) return res.status(400).json({ error: "Vous ne pouvez pas vous suivre vous-même" });
    await db.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, targetId]
    );
    res.json({ following: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/users/:username/follow
router.delete("/:username/follow", auth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id FROM users WHERE username = $1`, [req.params.username]);
    if (!rows[0]) return res.status(404).json({ error: "Utilisateur introuvable" });
    await db.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [req.user.id, rows[0].id]
    );
    res.json({ following: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH /api/users/me/profile
router.patch("/me/profile", auth, async (req, res) => {
  const { display_name, bio } = req.body;
  if (!display_name) return res.status(400).json({ error: "display_name requis" });
  try {
    const { rows } = await db.query(
      `UPDATE users SET display_name = $1, bio = $2 WHERE id = $3
       RETURNING id, username, display_name, bio`,
      [display_name, bio || "", req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
