const state = {
  products: [], category: "All", query: "", sort: "featured",
  cart: JSON.parse(localStorage.getItem("soundcart-cart") || "[]"),
  token: localStorage.getItem("soundcart-token") || "",
  user: JSON.parse(localStorage.getItem("soundcart-user") || "null"),
  authMode: "login"
};
const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
let toastTimer;
function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && url.includes("/auth/me")) logout(false);
    throw new Error(data.error || "Request failed");
  }
  return data;
}
function persistCart() { localStorage.setItem("soundcart-cart", JSON.stringify(state.cart)); updateCartCount(); }
function updateCartCount() { $("#cart-count").textContent = state.cart.reduce((n, item) => n + item.quantity, 0); }
function currentProducts() {
  let result = [...state.products];
  if (state.category !== "All") result = result.filter(p => p.category === state.category);
  if (state.query) {
    const q = state.query.toLowerCase();
    result = result.filter(p => `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase().includes(q));
  }
  if (state.sort === "price-low") result.sort((a,b) => a.price-b.price);
  if (state.sort === "price-high") result.sort((a,b) => b.price-a.price);
  if (state.sort === "name") result.sort((a,b) => a.name.localeCompare(b.name));
  return result;
}
function renderProducts() {
  const products = currentProducts();
  $("#results-count").textContent = `${products.length} product${products.length === 1 ? "" : "s"} available`;
  $("#empty-state").classList.toggle("hidden", products.length > 0);
  $("#product-grid").innerHTML = products.map(p => `
    <article class="product-card">
      <div class="product-image"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/600x500/f0eee8/292929?text=SoundCart'">
      ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ""}</div>
      <div class="product-info"><p class="product-brand">${escapeHtml(p.brand)} · ${escapeHtml(p.category)}</p><h3>${escapeHtml(p.name)}</h3><div class="rating">★ ${Number(p.rating || 4.5).toFixed(1)} <span style="color:#999">· ${p.stock > 0 ? "In stock" : "Out of stock"}</span></div>
      <div class="price-row"><span class="price">${money(p.price)}</span>${p.mrp > p.price ? `<span class="mrp">${money(p.mrp)}</span>` : ""}</div>
      <button class="add-button" data-add="${escapeHtml(p.id)}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Out of stock" : "＋ Add to cart"}</button></div>
    </article>`).join("");
}
async function loadProducts() {
  try {
    const data = await api("/api/products");
    state.products = data.products;
    renderProducts();
  } catch (error) {
    $("#product-grid").innerHTML = `<div class="loading">Could not load products. Check that the Node.js server is running, then refresh.</div>`;
    toast(error.message);
  }
}
function openModal(id) {
  $("#modal-backdrop").classList.remove("hidden");
  ["auth-modal","cart-modal","checkout-modal"].forEach(x => $(`#${x}`).classList.toggle("hidden", x !== id));
}
function closeModals() { $("#modal-backdrop").classList.add("hidden"); }
function updateAuthButton() {
  $("#auth-open").textContent = state.user ? `Hi, ${state.user.name.split(" ")[0]}` : "Sign in";
}
function setAuthMode(mode) {
  state.authMode = mode;
  $("#auth-title").textContent = mode === "login" ? "Sign in" : "Create account";
  $("#name-field").classList.toggle("hidden", mode !== "register");
  $("#name-field input").required = mode === "register";
  $("#auth-form [name=password]").autocomplete = mode === "login" ? "current-password" : "new-password";
  document.querySelectorAll("[data-auth-mode]").forEach(b => b.classList.toggle("active", b.dataset.authMode === mode));
}
function renderCart() {
  const lines = state.cart.map(item => {
    const p = state.products.find(x => x.id === item.id);
    return p ? { ...p, quantity: item.quantity } : null;
  }).filter(Boolean);
  const total = lines.reduce((sum, p) => sum + p.price*p.quantity, 0);
  $("#cart-total").textContent = money(total);
  $("#cart-items").innerHTML = lines.length ? lines.map(p => `<div class="cart-line"><img src="${escapeHtml(p.image)}" alt=""><div><h4>${escapeHtml(p.name)}</h4><small>${money(p.price)} each</small><div class="qty-controls"><button data-qty="${p.id}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${p.quantity}</span><button data-qty="${p.id}" data-delta="1" aria-label="Increase quantity">+</button><button data-remove="${p.id}" aria-label="Remove item">×</button></div></div><span class="cart-line-price">${money(p.price*p.quantity)}</span></div>`).join("") : `<div class="empty-cart">Your cart is waiting for its first note. Add an instrument to get started.</div>`;
  $("#checkout-open").disabled = lines.length === 0;
}
function addToCart(id) {
  const p = state.products.find(x => x.id === id); if (!p) return;
  const item = state.cart.find(x => x.id === id);
  if (item) item.quantity = Math.min(20, item.quantity + 1); else state.cart.push({ id, quantity: 1 });
  persistCart(); toast(`${p.name} added to your cart.`);
}
function logout(showMessage = true) {
  state.token = ""; state.user = null;
  localStorage.removeItem("soundcart-token"); localStorage.removeItem("soundcart-user");
  updateAuthButton(); if (showMessage) toast("You have signed out.");
}
$("#product-grid").addEventListener("click", e => { const btn = e.target.closest("[data-add]"); if (btn) addToCart(btn.dataset.add); });
$("#categories").addEventListener("click", e => {
  const btn = e.target.closest("[data-category]"); if (!btn) return;
  state.category = btn.dataset.category;
  document.querySelectorAll("[data-category]").forEach(b => b.classList.toggle("active", b === btn));
  renderProducts(); $("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#search-form").addEventListener("submit", e => { e.preventDefault(); state.query = $("#search-input").value.trim(); renderProducts(); $("#shop").scrollIntoView({ behavior: "smooth" }); });
$("#search-input").addEventListener("input", () => { state.query = $("#search-input").value.trim(); renderProducts(); });
$("#sort-select").addEventListener("change", e => { state.sort = e.target.value; renderProducts(); });
$("#cart-open").addEventListener("click", () => { renderCart(); openModal("cart-modal"); });
$("#auth-open").addEventListener("click", () => { if (state.user) { if (confirm(`Signed in as ${state.user.email}. Sign out?`)) logout(); } else { setAuthMode("login"); openModal("auth-modal"); } });
document.querySelectorAll("[data-auth-mode]").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.authMode)));
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModals));
$("#modal-backdrop").addEventListener("click", e => { if (e.target === $("#modal-backdrop")) closeModals(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModals(); });
$("#cart-items").addEventListener("click", e => {
  const qty = e.target.closest("[data-qty]"); const remove = e.target.closest("[data-remove]");
  if (qty) {
    const item = state.cart.find(x => x.id === qty.dataset.qty); if (!item) return;
    item.quantity += Number(qty.dataset.delta);
    if (item.quantity < 1) state.cart = state.cart.filter(x => x.id !== item.id);
    if (item.quantity > 20) item.quantity = 20;
    persistCart(); renderCart();
  }
  if (remove) { state.cart = state.cart.filter(x => x.id !== remove.dataset.remove); persistCart(); renderCart(); }
});
$("#checkout-open").addEventListener("click", () => {
  if (!state.user) { setAuthMode("login"); openModal("auth-modal"); toast("Sign in or create an account before checkout."); return; }
  $("#checkout-form [name=fullName]").value = state.user.name || "";
  $("#checkout-form [name=email]").value = state.user.email || "";
  openModal("checkout-modal");
});
$("#auth-form").addEventListener("submit", async e => {
  e.preventDefault(); const form = new FormData(e.currentTarget);
  const payload = { email: form.get("email"), password: form.get("password") };
  if (state.authMode === "register") payload.name = form.get("name");
  const submit = e.currentTarget.querySelector("button[type=submit]"); submit.disabled = true; submit.textContent = "Please wait…";
  try {
    const data = await api(`/api/auth/${state.authMode === "login" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(payload) });
    state.token = data.token; state.user = data.user;
    localStorage.setItem("soundcart-token", state.token); localStorage.setItem("soundcart-user", JSON.stringify(state.user));
    updateAuthButton(); closeModals(); e.currentTarget.reset(); toast(`Welcome${state.user.name ? `, ${state.user.name.split(" ")[0]}` : ""}!`);
  } catch (error) { toast(error.message); }
  finally { submit.disabled = false; submit.innerHTML = 'Continue <span>→</span>'; }
});
$("#checkout-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!state.cart.length) return toast("Your cart is empty.");
  const form = new FormData(e.currentTarget);
  const customer = Object.fromEntries(["fullName","email","phone","address","city","pincode"].map(k => [k, form.get(k)]));
  const submit = e.currentTarget.querySelector("button[type=submit]"); submit.disabled = true; submit.textContent = "Placing order…";
  try {
    const data = await api("/api/orders", { method: "POST", body: JSON.stringify({ items: state.cart, customer }) });
    state.cart = []; persistCart(); closeModals(); e.currentTarget.reset();
    toast(`${data.message} Order ID: ${data.order.id}`);
  } catch (error) { toast(error.message); }
  finally { submit.disabled = false; submit.innerHTML = 'Place demo order <span>→</span>'; }
});
updateCartCount(); updateAuthButton(); loadProducts();
if (state.token) api("/api/auth/me").then(data => { state.user = data.user; localStorage.setItem("soundcart-user", JSON.stringify(state.user)); updateAuthButton(); }).catch(() => logout(false));