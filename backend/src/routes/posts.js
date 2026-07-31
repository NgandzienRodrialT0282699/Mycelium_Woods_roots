const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

// GET /api/posts/feed  — fil d'actualité de l'utilisateur connecté
router.get("/feed", auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.content, p.created_at,
              u.id AS user_id, u.username, u.display_name,
              COUNT(DISTINCT l.user_id) AS likes_count,
              EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id) AS liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes l ON l.post_id = p.id
       WHERE p.user_id = $1
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/posts
router.post("/", auth, async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Le contenu est requis" });
  }
  if (content.length > 280) {
    return res.status(400).json({ error: "Maximum 280 caractères" });
  }
  try {
    const result = await db.query(
      `INSERT INTO posts (user_id, content) VALUES ($1, $2)
       RETURNING id, content, created_at`,
      [req.user.id, content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/posts/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Post introuvable" });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/posts/:id/like
router.post("/:id/like", auth, async (req, res) => {
  try {
    await db.query(
      `INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );
    const { rows } = await db.query(
      `SELECT COUNT(*) AS count FROM likes WHERE post_id = $1`,
      [req.params.id]
    );
    res.json({ likes_count: parseInt(rows[0].count), liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/posts/:id/like
router.delete("/:id/like", auth, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM likes WHERE user_id = $1 AND post_id = $2`,
      [req.user.id, req.params.id]
    );
    const { rows } = await db.query(
      `SELECT COUNT(*) AS count FROM likes WHERE post_id = $1`,
      [req.params.id]
    );
    res.json({ likes_count: parseInt(rows[0].count), liked: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
