const fs = require("fs/promises");
const path = require("path");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const files = { products: "products.json", users: "users.json", orders: "orders.json" };
const defaults = { users: [], orders: [] };

async function ensureFile(key) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, files[key]);
  try { await fs.access(filePath); }
  catch {
    const value = key === "products" ? require("../data/products.json") : (defaults[key] || []);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
  }
  return filePath;
}

async function read(key) {
  if (!files[key]) throw new Error("Unknown data collection");
  const filePath = await ensureFile(key);
  const content = await fs.readFile(filePath, "utf8");
  try { return JSON.parse(content); }
  catch { throw new Error(`Invalid JSON in ${files[key]}. Restore valid JSON before restarting.`); }
}

async function write(key, value) {
  if (!files[key]) throw new Error("Unknown data collection");
  const filePath = await ensureFile(key);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

module.exports = { read, write };