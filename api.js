const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const store = require("../src/store");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "local-development-only-change-me";
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });

router.get("/health", (req, res) => res.json({ status: "ok", app: "SoundCart", storage: "local JSON files" }));

router.get("/products", async (req, res, next) => {
  try {
    const products = await store.read("products");
    const { category, q, sort } = req.query;
    let result = products.filter(p => p.active !== false);
    if (category && category !== "All") result = result.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
    if (q) {
      const query = String(q).toLowerCase().trim();
      result = result.filter(p => `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase().includes(query));
    }
    if (sort === "price-low") result.sort((a, b) => a.price - b.price);
    if (sort === "price-high") result.sort((a, b) => b.price - a.price);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ products: result, count: result.length });
  } catch (e) { next(e); }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const products = await store.read("products");
    const product = products.find(p => p.id === req.params.id && p.active !== false);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (e) { next(e); }
});

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Please sign in first." });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
}

router.post("/auth/register", authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2 || name.length > 70) return res.status(400).json({ error: "Name must be 2–70 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 8 || password.length > 100) return res.status(400).json({ error: "Password must be 8–100 characters." });
    const users = await store.read("users");
    if (users.some(u => u.email === email)) return res.status(409).json({ error: "An account with this email already exists." });
    const user = { id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name, email, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date().toISOString() };
    users.push(user);
    await store.write("users", users);
    const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
});

router.post("/auth/login", authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const users = await store.read("users");
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Email or password is incorrect." });
    const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
});

router.get("/auth/me", requireAuth, (req, res) => res.json({ user: { id: req.user.sub, name: req.user.name, email: req.user.email } }));

router.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const { items, customer } = req.body;
    if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ error: "Your cart is empty or too large." });
    const required = ["fullName", "email", "phone", "address", "city", "pincode"];
    if (!customer || required.some(k => !String(customer[k] || "").trim())) return res.status(400).json({ error: "Please complete all delivery fields." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return res.status(400).json({ error: "Enter a valid delivery email." });
    if (!/^\d{6}$/.test(String(customer.pincode))) return res.status(400).json({ error: "Pincode must be 6 digits." });
    if (!/^[6-9]\d{9}$/.test(String(customer.phone).replace(/\D/g, ""))) return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
    const products = await store.read("products");
    const cleanItems = [];
    for (const item of items) {
      const product = products.find(p => p.id === String(item.id) && p.active !== false);
      const qty = Number(item.quantity);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: "One or more cart items are invalid." });
      cleanItems.push({ id: product.id, name: product.name, price: product.price, quantity: qty, image: product.image });
    }
    const total = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orders = await store.read("orders");
    const order = { id: `SC${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`, userId: req.user.sub, items: cleanItems, total, currency: "INR", customer: Object.fromEntries(required.map(k => [k, String(customer[k]).trim()])), status: "Placed", paymentStatus: "Demo only — no payment collected", createdAt: new Date().toISOString() };
    orders.unshift(order);
    await store.write("orders", orders);
    res.status(201).json({ message: "Order placed successfully (demo checkout). No payment was charged.", order });
  } catch (e) { next(e); }
});

router.get("/orders/mine", requireAuth, async (req, res, next) => {
  try {
    const orders = await store.read("orders");
    res.json({ orders: orders.filter(o => o.userId === req.user.sub) });
  } catch (e) { next(e); }
});

module.exports = router;