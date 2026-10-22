const express = require("express");
const path = require("path");
const dotenv = (() => { try { return require("dotenv"); } catch { return null; } })();
if (dotenv) dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production environment variables.");
}
const api = require("./routes/api");

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use("/api", api);
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, () => {
  console.log(`SoundCart is running at http://localhost:${PORT}`);
});