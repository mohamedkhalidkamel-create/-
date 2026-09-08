/* =========================================================
   Lumé — Cosmetics Store — main.js
   No backend, no database:
     - Product data comes from products.json
       (generated from image filenames by scripts/generate-products.js)
     - Cart state lives in localStorage
     - Checkout hands the order to WhatsApp as a pre-filled message
   ========================================================= */

// ---- CONFIG: change this to the store's real WhatsApp number ----
// Format: country code + number, no plus sign, no spaces/dashes.
const WHATSAPP_NUMBER = "201556954308"; // <-- REPLACE with the real number

const STORAGE_KEY = "lume_cart_v1";

let PRODUCTS = [];
let CART = loadCart();
let activeCategory = "all";
let searchQuery = "";
let sortMode = "default";

// ---------- DOM refs ----------
const productGrid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");
const categoryNav = document.getElementById("categoryNav");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const resultsMeta = document.getElementById("resultsMeta");

const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const cancelCheckout = document.getElementById("cancelCheckout");

const toastEl = document.getElementById("toast");
const floatWhatsapp = document.getElementById("floatWhatsapp");
const heroWhatsapp = document.getElementById("heroWhatsapp");

// ---------- Init ----------
init();

async function init() {
  wireGeneralWhatsappLinks();
  wireEvents();
  renderCart();

  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("products.json not found");
    PRODUCTS = await res.json();
  } catch (err) {
    console.error(err);
    PRODUCTS = [];
  }

  buildCategoryNav();
  renderProducts();
}

function wireGeneralWhatsappLinks() {
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أريد الاستفسار عن منتجاتكم 😊"
  )}`;
  floatWhatsapp.href = link;
  heroWhatsapp.href = link;
}

// ---------- Category nav ----------
function buildCategoryNav() {
  const seen = new Map();
  for (const p of PRODUCTS) {
    if (!seen.has(p.category)) seen.set(p.category, p.categoryLabel);
  }

  for (const [key, label] of seen) {
    const btn = document.createElement("button");
    btn.className = "cat-pill";
    btn.dataset.category = key;
    btn.textContent = label;
    categoryNav.appendChild(btn);
  }

  categoryNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-pill");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    [...categoryNav.children].forEach((c) =>
      c.classList.toggle("active", c === btn)
    );
    renderProducts();
  });
}

// ---------- Filtering / sorting ----------
function getVisibleProducts() {
  let list = PRODUCTS.slice();

  if (activeCategory !== "all") {
    list = list.filter((p) => p.category === activeCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }

  switch (sortMode) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return list;
}

// ---------- Rendering products ----------
function renderProducts() {
  const list = getVisibleProducts();
  productGrid.innerHTML = "";

  emptyState.hidden = list.length !== 0;
  resultsMeta.textContent = `${list.length} منتج`;

  const frag = document.createDocumentFragment();
  for (const p of list) {
    frag.appendChild(productCard(p));
  }
  productGrid.appendChild(frag);
}

function productCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <div class="product-media">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
    </div>
    <div class="product-body">
      <span class="product-sub">${escapeHtml(p.subcategoryLabel)}</span>
      <h3 class="product-name">${escapeHtml(p.name)}</h3>
      <div class="product-footer">
        <span class="product-price">${formatPrice(p.price)}</span>
        <button class="add-btn" aria-label="أضيفي إلى السلة">+</button>
      </div>
    </div>
  `;
  card.querySelector(".add-btn").addEventListener("click", () => {
    addToCart(p);
    showToast(`تمت إضافة "${p.name}" إلى السلة`);
  });
  return card;
}

// ---------- Cart ----------
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(CART));
}

function addToCart(product) {
  const existing = CART.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    CART.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      categoryLabel: product.categoryLabel,
      subcategoryLabel: product.subcategoryLabel,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
}

function changeQty(id, delta) {
  const item = CART.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    CART = CART.filter((i) => i.id !== id);
  }
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  CART = CART.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function cartTotal() {
  return CART.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function renderCart() {
  cartItemsEl.innerHTML = "";

  if (CART.length === 0) {
    cartItemsEl.innerHTML = `<p style="color:var(--ink-soft); text-align:center; padding-top:30px;">سلتك فارغة حالياً</p>`;
  } else {
    const frag = document.createDocumentFragment();
    for (const item of CART) {
      frag.appendChild(cartItemRow(item));
    }
    cartItemsEl.appendChild(frag);
  }

  const totalQty = CART.reduce((sum, i) => sum + i.qty, 0);
  cartCountEl.textContent = totalQty;
  cartTotalEl.textContent = formatPrice(cartTotal());
  checkoutBtn.disabled = CART.length === 0;
}

function cartItemRow(item) {
  const row = document.createElement("div");
  row.className = "cart-item";
  row.innerHTML = `
    <img src="${item.image}" alt="${escapeHtml(item.name)}" />
    <div class="cart-item-info">
      <span class="cart-item-name">${escapeHtml(item.name)}</span>
      <span class="cart-item-meta">${escapeHtml(item.categoryLabel)} · ${formatPrice(item.price)}</span>
      <div class="qty-control">
        <button data-action="dec" aria-label="إنقاص الكمية">−</button>
        <span>${item.qty}</span>
        <button data-action="inc" aria-label="زيادة الكمية">+</button>
      </div>
      <button class="remove-link" data-action="remove">إزالة</button>
    </div>
  `;
  row.querySelector('[data-action="inc"]').addEventListener("click", () => changeQty(item.id, 1));
  row.querySelector('[data-action="dec"]').addEventListener("click", () => changeQty(item.id, -1));
  row.querySelector('[data-action="remove"]').addEventListener("click", () => removeFromCart(item.id));
  return row;
}

// ---------- WhatsApp checkout ----------
function buildWhatsappMessage(customer) {
  const lines = [];
  lines.push("طلب جديد من المتجر 🛍️");
  lines.push("");
  lines.push("المنتجات:");
  lines.push("");

  for (const item of CART) {
    lines.push(item.name);
    lines.push(`القسم: ${item.categoryLabel} (${item.subcategoryLabel})`);
    lines.push(`الكمية: ${item.qty}`);
    lines.push(`السعر: ${formatPrice(item.price * item.qty)}`);
    lines.push("");
  }

  lines.push(`الإجمالي الكلي: ${formatPrice(cartTotal())}`);
  lines.push("");
  lines.push("بيانات التوصيل:");
  lines.push(`الاسم: ${customer.name}`);
  lines.push(`الهاتف: ${customer.phone}`);
  lines.push(`العنوان: ${customer.address}`);

  return lines.join("\n");
}

function sendOrderToWhatsapp(customer) {
  const message = buildWhatsappMessage(customer);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ---------- UI wiring ----------
function wireEvents() {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });

  sortSelect.addEventListener("change", (e) => {
    sortMode = e.target.value;
    renderProducts();
  });

  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);
  overlay.addEventListener("click", () => {
    closeCart();
    closeCheckoutModal();
  });

  checkoutBtn.addEventListener("click", () => {
    if (CART.length === 0) return;
    openCheckoutModal();
  });

  cancelCheckout.addEventListener("click", closeCheckoutModal);

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const customer = {
      name: document.getElementById("custName").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      address: document.getElementById("custAddress").value.trim(),
    };
    if (!customer.name || !customer.phone || !customer.address) return;

    sendOrderToWhatsapp(customer);
    closeCheckoutModal();
    closeCart();
    checkoutForm.reset();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      closeCheckoutModal();
    }
  });
}

function openCart() {
  cartDrawer.classList.add("open");
  overlay.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  if (!checkoutModal.classList.contains("open")) {
    overlay.classList.remove("open");
  }
}

function openCheckoutModal() {
  checkoutModal.classList.add("open");
  overlay.classList.add("open");
}

function closeCheckoutModal() {
  checkoutModal.classList.remove("open");
  if (!cartDrawer.classList.contains("open")) {
    overlay.classList.remove("open");
  }
}

// ---------- Helpers ----------
function formatPrice(n) {
  return `${Math.round(n)} EGP`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}
