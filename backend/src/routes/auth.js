const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, display_name, email, password } = req.body;
  if (!username || !display_name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }
  if (username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: "Nom d'utilisateur invalide" });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (username, display_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name, email`,
      [username.toLowerCase(), display_name, email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Nom d'utilisateur ou email déjà pris" });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis" });
  }
  try {
    const result = await db.query(
      `SELECT * FROM users WHERE username = $1 OR email = $1`,
      [login.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Identifiants incorrects" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
