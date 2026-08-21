const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

app.get("/api", (_req, res) => {
  res.json({
    message: "Mycelium API v1",
    endpoints: {
      auth: "/api/auth",
      posts: "/api/posts",
      users: "/api/users",
      health: "/api/health"
    }
  });
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
