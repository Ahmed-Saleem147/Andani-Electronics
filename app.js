// ── Helpers ──────────────────────────────────────────────
function stars(n) {
  let s = '';
  for(let i=1;i<=5;i++) s += `<span class="${i<=n?'star':'star-empty'}">★</span>`;
  return s;
}
function makeCard(p) {
  const discountPct = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const noImg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22><rect fill=%22%23f3f5fb%22 width=%22200%22 height=%22150%22/><text fill=%22%236b7280%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2214%22>No Image</text></svg>`;
  return `
  <div class="product-card" data-category="${p.category}">
    <div class="product-image-wrap">
      ${p.badge === 'sale' ? '<span class="sale-label">Sale!</span>' : ''}
      <img src="${p.image}" alt="${p.name}" onerror="this.src='${noImg}'">
      ${discountPct ? `<span class="discount-badge">-${discountPct}%</span>` : ''}
    </div>
    <div class="product-info">
      <p class="product-brand">${p.brand}</p>
      <h3 class="product-name">${p.name}</h3>
      <div class="price-block">
        ${p.oldPrice ? `<span class="price-old">GH₵ ${p.oldPrice.toLocaleString()}</span>` : ''}
        <span class="price-current">GH₵ ${p.price.toLocaleString()}</span>
      </div>
      <div class="product-specs">${p.specs.map(s=>`<span class="spec-tag">${s}</span>`).join('')}</div>
      <p class="in-stock-label">✓ In stock</p>
      <button class="add-to-cart-btn" onclick="addToCart(${p.id})">Add to Cart</button>
    </div>
  </div>`;
}

// ── All Products ─────────────────────────────────────────
// ── SUPABASE CONFIG ─────────────────────────────────────────
const SUPABASE_URL  = 'https://oscubssythksaaqqwezu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zY3Vic3N5dGhrc2FhcXF3ZXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDA2NTYsImV4cCI6MjA4ODM3NjY1Nn0.itbbmkKCfSzy4ZGqyHFWw_TgxxN9lqV-_5HghUC-8Mo';
const SB_SERVICE    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zY3Vic3N5dGhrc2FhcXF3ZXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwMDY1NiwiZXhwIjoyMDg4Mzc2NjU2fQ.PDZ00UQWdsGlzEx9sKvo1typQzMOk7bj_LwG87_moh0';

async function sbFetch(table, params='') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Supabase error: ' + res.status);
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_SERVICE,
      'Authorization': 'Bearer ' + SB_SERVICE,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sbPost failed: ${res.status} ${err}`);
  }
  return res.json();
}

// Fallback static products (used if Supabase is unreachable)
const staticProducts = [];

// ── SUPABASE LOADER ──────────────────────────────────────────
let allProducts = [];

async function loadProducts() {
  const grid = document.getElementById('productGrid');
  if (grid) grid.innerHTML = '<div style="padding:60px;text-align:center;color:#888;"><svg width="40" height="40" fill="none" stroke="#ccc" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><p style="margin-top:12px;">Loading products…</p></div>';

  // Detect local file — Supabase won't work without HTTPS
  const isLocal = location.protocol === 'file:';
  if (isLocal) {
    showLocalBanner();
    allProducts = [...staticProducts];
    renderGrid('all');
    renderFeatured();
    return;
  }

  try {
    const rows = await sbFetch('products', 'select=*&order=id.asc');
    if (!rows || !rows.length) throw new Error('Empty response');
    allProducts = rows.map(p => ({
      id:       p.id,
      category: p.category,
      brand:    p.brand,
      name:     p.name,
      price:    Number(p.price),
      oldPrice: p.old_price ? Number(p.old_price) : null,
      image:    p.image || 'https://placehold.co/300x300?text=No+Image',
      badge:    p.badge,
      specs:    p.specs || [],
      rating:   p.rating,
      reviews:  p.reviews,
      featured: p.featured
    }));
  } catch(e) {
    console.warn('Supabase unavailable, using static fallback:', e);
    allProducts = [...staticProducts];
  }
  renderGrid('all');
  renderFeatured();
  buildSidebar();
}

function renderFeatured() {
  // Render featured products if a featured section exists
  const featuredGrid = document.getElementById('featuredGrid');
  if (!featuredGrid || !allProducts.length) return;
  const featured = allProducts.filter(p => p.featured).slice(0, 4);
  featuredGrid.innerHTML = featured.map(p => makeCard(p)).join('');
}

function showLocalBanner() {
  const banner = document.createElement('div');
  banner.id = 'localBanner';
  banner.innerHTML = `
    <div style="background:#fef3c7;border-bottom:2px solid #f59e0b;padding:10px 20px;display:flex;align-items:center;gap:12px;font-family:'DM Sans',sans-serif;font-size:0.83rem;color:#92400e;position:sticky;top:58px;z-index:99;">
      <svg width="18" height="18" fill="none" stroke="#d97706" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span><strong>Preview mode</strong> — You're opening this file locally. Push to GitHub so the live site loads products from the database. Products shown below are the offline backup.</span>
      <button onclick="document.getElementById('localBanner').remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:1.1rem;color:#92400e;">✕</button>
    </div>`;
  document.body.insertBefore(banner, document.body.children[1]);
}

// ── Render ────────────────────────────────────────────────
const grid = document.getElementById('productGrid');

let currentFilter = 'all';
let currentPreFiltered = null;

function sortProducts(arr) {
  const sort = document.getElementById('sortSelect')?.value || 'featured';
  const copy = [...arr];
  switch(sort) {
    case 'price-asc':    return copy.sort((a,b) => a.price - b.price);
    case 'price-desc':   return copy.sort((a,b) => b.price - a.price);
    case 'newest':       return copy.sort((a,b) => (b.id||0) - (a.id||0));
    case 'best-sellers': return copy.sort((a,b) => (b.reviews||0) - (a.reviews||0));
    case 'top-rated':    return copy.sort((a,b) => (b.rating||0) - (a.rating||0));
    default:             return copy; // featured — keep original order
  }
}

function applySort() {
  renderGrid(currentFilter, currentPreFiltered);
}

function setView(mode) {
  const grid = document.getElementById('productGrid');
  grid.classList.toggle('list-view', mode === 'list');
  document.getElementById('viewGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('viewList').classList.toggle('active', mode === 'list');
}

function renderGrid(filter, preFiltered) {
  currentFilter = filter || 'all';
  currentPreFiltered = preFiltered || null;

  let filtered;
  if (preFiltered) {
    filtered = preFiltered;
  } else if (!filter || filter === 'all') {
    filtered = allProducts;
  } else if (filter === 'deals') {
    filtered = allProducts.filter(p => p.badge === 'sale' || p.badge === 'hot');
  } else {
    filtered = allProducts.filter(p => p.category === filter);
  }

  filtered = sortProducts(filtered);

  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 16px;display:block;opacity:0.4"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <p style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;color:var(--text);margin-bottom:6px;">No products found</p>
        <p style="font-size:0.9rem;">Try a different filter or check back soon.</p>
      </div>`;
  } else {
    filtered.forEach(p => { grid.innerHTML += makeCard(p); });
  }

  // Update result count
  const rc = document.querySelector('.result-count');
  if (rc) rc.innerHTML = `Showing <strong>${filtered.length}</strong> products`;
}

// Initial render — load from Supabase
loadProducts();

// ── Search (desktop + mobile) ─────────────────────────────
function doSearch(q) {
  if (!q) { renderGrid('all'); return; }
  const results = allProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.specs.some(s => s.toLowerCase().includes(q))
  );
  grid.innerHTML = '';
  const appSection = document.querySelector('.appliances-section');
  if (appSection) appSection.style.display = 'none';
  if (results.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);font-family:'Syne',sans-serif;">No products found for "<strong>${q}</strong>"</div>`;
  } else {
    results.forEach(p => { grid.innerHTML += makeCard(p); });
  }
}

document.querySelector('.search-bar input').addEventListener('input', function() {
  doSearch(this.value.toLowerCase().trim());
  // sync mobile search
  const mob = document.getElementById('mobileSearchInput');
  if (mob) mob.value = this.value;
});

const mobileSearchInput = document.getElementById('mobileSearchInput');
if (mobileSearchInput) {
  mobileSearchInput.addEventListener('input', function() {
    doSearch(this.value.toLowerCase().trim());
  });
}

// ── Mobile Drawer ─────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const drawerOverlay = document.getElementById('drawerOverlay');
const mobileDrawer = document.getElementById('mobileDrawer');
const drawerClose = document.getElementById('drawerClose');

function openDrawer() {
  drawerOverlay.style.display = 'block';
  setTimeout(() => {
    drawerOverlay.classList.add('open');
    mobileDrawer.classList.add('open');
  }, 10);
}

function closeDrawer() {
  drawerOverlay.classList.remove('open');
  mobileDrawer.classList.remove('open');
  setTimeout(() => { drawerOverlay.style.display = 'none'; }, 300);
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

// Drawer nav links
document.querySelectorAll('.drawer-nav a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const filter = this.dataset.filter;
    closeDrawer();
    setTimeout(() => applyFilter(filter), 320);
    document.querySelectorAll('.drawer-nav a').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Unified filter function ───────────────────────────────

  function slideCats(dir) {
    const track = document.getElementById("catTrack");
    if (track) track.scrollBy({ left: dir * 340, behavior: "smooth" });
  }

  function applyFilter(filter) {
  // Sync all nav active states
  document.querySelectorAll('.nav-links a, .drawer-nav a, .mobile-bottom-nav a[data-filter]').forEach(l => {
    l.classList.toggle('active', l.dataset.filter === filter);
  });

  const appSection = document.querySelector('.appliances-section');
  if (appSection) appSection.style.display = (filter === 'all' || filter === 'appliances') ? 'block' : 'none';

  renderGrid(filter);

  const heroH1 = document.querySelector('.collection-hero h1');
  const heroP = document.querySelector('.collection-hero p');
  const heroMap = {
    all:        { h1: 'TVs, Microwaves & <span>Home Appliances</span>', p: "Northern Ghana's go-to store for quality electronics and home appliances at great prices." },
    tvs:        { h1: 'Televisions',                                    p: 'Smart TVs, 4K displays and more — from top brands like LG, Samsung & TCL.' },
    appliances: { h1: 'Home <span>Appliances</span>',                   p: 'Fridges, washing machines, ACs, microwaves and more for your home.' },
    laptops:    { h1: 'Laptops & <span>Computers</span>',               p: 'Coming soon — premium laptops for work, school and beyond.' },
    phones:     { h1: 'Smartphones & <span>Phones</span>',              p: 'Coming soon — the latest smartphones at great prices.' },
    accessories:{ h1: 'Accessories',                                    p: 'Coming soon — cables, chargers, cases and more.' },
    printers:   { h1: 'Printers & <span>Scanners</span>',               p: 'Coming soon — office and home printing solutions.' },
    sound:      { h1: 'Sound <span>Systems</span>',                    p: 'Speakers, soundbars, home theatres and more.' },
    fans:       { h1: 'Fans — Ceiling & <span>Standing</span>',          p: 'Ceiling fans, standing fans and table fans for your home.' },
    satellite:  { h1: 'Satellite <span>Decoders & Dishes</span>',         p: 'HD decoders, satellite dishes and accessories.' },
    heaters:    { h1: 'Heater <span>Cups</span>',                         p: 'Portable electric heater cups for hot drinks anywhere.' },
    blenders:   { h1: '<span>Blenders</span>',                              p: 'Powerful blenders and mills for your kitchen.' },
    burners:    { h1: 'Gas <span>Burners</span> &amp; Cookers',                p: 'Reliable 2 and 3-burner gas cookers for your kitchen.' },
    kitchen:    { h1: 'Rice <span>Cookers</span>',                             p: 'Non-stick rice cookers with keep-warm function.' },
    tech:       { h1: 'Tech <span>Accessories</span>',                     p: 'USB flash drives, pen drives and tech accessories.' },
    lighting:   { h1: 'Bulbs & <span>Street Lights</span>',                p: 'LED bulbs, energy-saving lights and solar street lights.' },
    deals:      { h1: '🔥 Hot <span>Deals</span>',                      p: "Our best sale prices — grab them before they're gone!" },
  };
  if (heroH1 && heroMap[filter]) {
    heroH1.innerHTML = heroMap[filter].h1;
    heroP.textContent = heroMap[filter].p;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Desktop nav links
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    applyFilter(this.dataset.filter);
  });
});

// Bottom nav links
document.querySelectorAll('.mobile-bottom-nav a[data-filter]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    applyFilter(this.dataset.filter);
  });
});

// ══════════════════════════════════════════════════════
//  CART SYSTEM
// ══════════════════════════════════════════════════════
let cartItems = []; // [{id, name, price, image, qty}]

function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const existing = cartItems.find(x => x.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cartItems.push({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
  }
  updateCartBadge();
  renderCartItems();
  // Quick visual feedback
  apToast(`✅ ${p.name.substring(0,30)}… added to cart`);
}

function removeFromCart(id) {
  cartItems = cartItems.filter(x => x.id !== id);
  updateCartBadge();
  renderCartItems();
}

function changeQty(id, delta) {
  const item = cartItems.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else { updateCartBadge(); renderCartItems(); }
}

function clearCart() {
  cartItems = [];
  updateCartBadge();
  renderCartItems();
}

function cartTotal() {
  return cartItems.reduce((s, i) => s + i.price * i.qty, 0);
}

function updateCartBadge() {
  const total = cartItems.reduce((s, i) => s + i.qty, 0);
  const badge = document.querySelector('.cart-badge');
  const mobileBadge = document.getElementById('mobileCartBadge');
  const drawerCount = document.getElementById('cartItemCount');
  [badge, mobileBadge, drawerCount].forEach(el => {
    if (!el) return;
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
  if (badge) { badge.style.transform='scale(1.4)'; setTimeout(()=>badge.style.transform='scale(1)',200); }
}

function renderCartItems() {
  const list = document.getElementById('cartItemsList');
  const footer = document.getElementById('cartFooter');
  const subtotal = document.getElementById('cartSubtotal');
  if (!list) return;

  if (!cartItems.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
        <svg width="48" height="48" fill="none" stroke="#e2e8f0" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:14px;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p style="font-family:'Syne',sans-serif;font-weight:700;margin:0 0 6px;color:#475569;">Your cart is empty</p>
        <p style="font-size:0.8rem;margin:0;">Add products to get started</p>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  list.innerHTML = cartItems.map(item => `
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;align-items:center;">
      <img src="${item.image || 'https://placehold.co/60x60?text=?'}" onerror="this.src='https://placehold.co/60x60?text=?'" style="width:58px;height:58px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;flex-shrink:0;">
      <div style="flex:1;min-width:0;">
        <p style="margin:0 0 4px;font-family:'Syne',sans-serif;font-weight:700;font-size:0.82rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${item.name}</p>
        <p style="margin:0;font-family:'Syne',sans-serif;font-weight:800;font-size:0.88rem;color:#1a56db;">GH₵${(item.price * item.qty).toLocaleString()}</p>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <button onclick="removeFromCart(${item.id})" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:0.9rem;padding:0;line-height:1;">✕</button>
        <div style="display:flex;align-items:center;gap:0;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <button onclick="changeQty(${item.id},-1)" style="width:28px;height:28px;border:none;background:#f8fafc;cursor:pointer;font-size:1rem;font-weight:700;color:#475569;">−</button>
          <span style="width:28px;text-align:center;font-family:'Syne',sans-serif;font-weight:700;font-size:0.85rem;">${item.qty}</span>
          <button onclick="changeQty(${item.id},1)" style="width:28px;height:28px;border:none;background:#f8fafc;cursor:pointer;font-size:1rem;font-weight:700;color:#475569;">+</button>
        </div>
      </div>
    </div>`).join('');

  if (footer) footer.style.display = 'block';
  if (subtotal) subtotal.textContent = 'GH₵' + cartTotal().toLocaleString();
}

function openCart() {
  renderCartItems();
  const drawer = document.getElementById('cartDrawer');
  if (window.innerWidth <= 480) {
    drawer.classList.add('open');
  } else {
    drawer.style.right = '0';
  }
  document.getElementById('cartBackdrop').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  if (window.innerWidth <= 480) {
    drawer.classList.remove('open');
  } else {
    drawer.style.right = '-420px';
  }
  document.getElementById('cartBackdrop').style.display = 'none';
  document.body.style.overflow = '';
}

// ══════════════════════════════════════════════════════
//  CHECKOUT FLOW
// ══════════════════════════════════════════════════════
let selectedPayment = '';
function showOrderReceipt(order) {
  const date = new Date().toLocaleDateString('en-GH', {day:'numeric', month:'long', year:'numeric'});
  const itemRows = order.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem;color:#111;">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem;color:#64748b;text-align:center;">×${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem;color:#111;text-align:right;">GH₵${(i.price*i.qty).toLocaleString()}</td>
    </tr>`).join('');

  const receiptHtml = `
    <div id="receiptContent" style="font-family:'DM Sans',sans-serif;max-width:420px;width:100%;">
      <div style="text-align:center;padding-bottom:16px;border-bottom:2px dashed #e2e8f0;margin-bottom:16px;">
        <div style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:#0f172a;margin-bottom:2px;">Andani Electronics</div>
        <div style="font-size:0.75rem;color:#94a3b8;">Official Purchase Receipt</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:0.8rem;">
        <div><span style="color:#64748b;">Order Ref</span><br><strong style="color:#111;">${order.ref}</strong></div>
        <div style="text-align:right;"><span style="color:#64748b;">Date</span><br><strong style="color:#111;">${date}</strong></div>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:0.8rem;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.75rem;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Customer</div>
        <div style="color:#111;margin-bottom:3px;"><strong>${order.name}</strong></div>
        <div style="color:#64748b;">${order.phone}</div>
        <div style="color:#64748b;">📍 ${order.location}</div>
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.75rem;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Items Ordered</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="font-size:0.72rem;color:#94a3b8;text-align:left;padding-bottom:6px;font-weight:600;">Item</th>
            <th style="font-size:0.72rem;color:#94a3b8;text-align:center;padding-bottom:6px;font-weight:600;">Qty</th>
            <th style="font-size:0.72rem;color:#94a3b8;text-align:right;padding-bottom:6px;font-weight:600;">Amount</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
        <span style="font-family:'Syne',sans-serif;font-weight:700;color:#94a3b8;font-size:0.82rem;">Total Paid</span>
        <span style="font-family:'Syne',sans-serif;font-weight:800;color:#fff;font-size:1.1rem;">GH₵${order.total.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:16px;">
        <span style="color:#64748b;">Payment</span>
        <span style="color:#059669;font-weight:700;">${order.payMethod}</span>
      </div>
      <div style="text-align:center;font-size:0.72rem;color:#94a3b8;padding-top:12px;border-top:2px dashed #e2e8f0;">
        Thank you for shopping with Andani Electronics!
      </div>
    </div>`;

  const overlay = document.createElement('div');
  overlay.id = 'receiptOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);overflow-y:auto;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:18px;max-width:460px;width:100%;padding:28px 24px;box-shadow:0 24px 80px rgba(0,0,0,0.22);animation:slideUp 0.25s ease;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">✅</div>
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;color:#0f172a;">Order Confirmed!</div>
            <div style="font-size:0.72rem;color:#64748b;">Your receipt is ready</div>
          </div>
        </div>
        <button onclick="document.getElementById('receiptOverlay').remove()" style="background:#f1f5f9;border:none;width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:1rem;color:#475569;">✕</button>
      </div>
      ${receiptHtml}
      <div class="receipt-no-print" style="display:flex;gap:10px;margin-top:20px;">
        <button onclick="printReceipt()" style="flex:1;padding:12px;background:#1a56db;color:#fff;border:none;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.85rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg width="16" height="16" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Receipt
        </button>
        <button onclick="document.getElementById('receiptOverlay').remove()" style="flex:1;padding:12px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;">Close</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function printReceipt() {
  const content = document.getElementById('receiptContent').innerHTML;
  const win = window.open('', '_blank', 'width=500,height=700');
  win.document.write(`<!DOCTYPE html><html><head><title>Receipt — Andani Electronics</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
    <style>
      body { font-family:'DM Sans',sans-serif; margin:0; padding:24px; background:#fff; }
      @media print { body { padding:0; } }
    </style></head><body>${content}
    <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>
    </body></html>`);
  win.document.close();
}

function openCheckout() {
  if (!cartItems.length) { apToast('Your cart is empty!','error'); return; }
  closeCart();
  document.getElementById('checkoutOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  coGoStep1();
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function checkoutOverlayClick(e) {
  if (e.target === document.getElementById('checkoutOverlay') && !paystackOpen) closeCheckout();
}

function setCoStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById('coStep'+i).style.display = i===n ? 'block' : 'none';
    const tab = document.querySelector(`.co-step[data-step="${i}"]`);
    if (tab) {
      tab.style.color    = i===n ? '#1a56db' : '#94a3b8';
      tab.style.borderBottomColor = i===n ? '#1a56db' : 'transparent';
    }
  });
}

function coGoStep1() { setCoStep(1); }

function coGoStep2() {
  const name = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const loc  = document.getElementById('coLocation').value.trim();
  if (!name || !phone || !loc) { apToast('Please fill in all required fields.','error'); return; }
  setCoStep(2);
}

function coGoStep3() {
  if (!selectedPayment) { apToast('Please choose a payment method.','error'); return; }
  // Build summary
  const summaryItems = document.getElementById('coSummaryItems');
  const summaryDets  = document.getElementById('coSummaryDetails');
  const finalTotal   = document.getElementById('coFinalTotal');
  summaryItems.innerHTML = cartItems.map(i => `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-family:'DM Sans',sans-serif;font-size:0.82rem;">
      <span>${i.name.substring(0,36)}${i.name.length>36?'…':''} ×${i.qty}</span>
      <span style="font-weight:700;white-space:nowrap;margin-left:8px;">GH₵${(i.price*i.qty).toLocaleString()}</span>
    </div>`).join('');
  const payLabels = { paystack:'Card / Mobile Money / Bank', cash:'Cash on Delivery' };
  summaryDets.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;gap:8px;"><span style="color:#64748b;min-width:80px;">Name:</span><strong>${document.getElementById('coName').value}</strong></div>
      <div style="display:flex;gap:8px;"><span style="color:#64748b;min-width:80px;">Phone:</span><strong>${document.getElementById('coPhone').value}</strong></div>
      <div style="display:flex;gap:8px;"><span style="color:#64748b;min-width:80px;">Location:</span><strong>${document.getElementById('coLocation').value}</strong></div>
      <div style="display:flex;gap:8px;"><span style="color:#64748b;min-width:80px;">Payment:</span><strong>${payLabels[selectedPayment]||selectedPayment}</strong></div>
    </div>`;
  finalTotal.innerHTML = '<span style="font-family:Arial,sans-serif;">GH₵</span>' + cartTotal().toLocaleString();
  setCoStep(3);
}

// ── PAYSTACK PUBLIC KEY ───────────────────────────────────
// 🔑 Replace with your real Paystack public key from dashboard.paystack.com
const PAYSTACK_KEY = 'pk_live_56322497dd57490011c5c4c03e4f38d87da72f3c';

function selectPayment(method) {
  selectedPayment = method;

  // Update visual selection
  ['paystack','cash'].forEach(m => {
    const cap = m.charAt(0).toUpperCase() + m.slice(1);
    const el    = document.getElementById('pm' + cap);
    const check = document.getElementById('pm' + cap + 'Check');
    if (el)    el.style.borderColor  = m===method ? '#1a56db' : '#e2e8f0';
    if (check) {
      check.style.background  = m===method ? '#1a56db' : '';
      check.style.borderColor = m===method ? '#1a56db' : '#cbd5e1';
    }
  });

  // Show relevant info panel
  document.getElementById('paystackInfo').style.display = method==='paystack' ? 'block' : 'none';
  document.getElementById('cashInfo').style.display     = method==='cash'     ? 'block' : 'none';

  // Show customer phone in cash info
  if (method==='cash') {
    const el = document.getElementById('cashPhoneShow');
    if (el) el.textContent = document.getElementById('coPhone').value || 'your number';
  }

  // Update step 3 button label
  const btn = document.getElementById('placeOrderBtn');
  if (btn) {
    if (method === 'paystack') {
      btn.textContent = '🔒 Pay Now with Paystack';
      btn.style.background = '#0ba4db';
    } else {
      btn.textContent = '✓ Place Order (Cash on Delivery)';
      btn.style.background = '#059669';
    }
  }
}

let paystackOpen = false;

function loadPaystackScript(callback) {
  if (typeof PaystackPop !== 'undefined') { callback(); return; }
  const s = document.createElement('script');
  s.src = 'https://js.paystack.co/v1/inline.js';
  s.onload = callback;
  s.onerror = () => apToast('Could not load payment system. Check your internet.', 'error');
  document.head.appendChild(s);
}

async function placeOrder() {
  const btn      = document.getElementById('placeOrderBtn');
  const name     = document.getElementById('coName').value.trim();
  const phone    = document.getElementById('coPhone').value.trim();
  const location = document.getElementById('coLocation').value.trim();
  const notes    = document.getElementById('coNotes').value.trim();
  const total    = cartTotal();
  const items    = cartItems.map(i => ({id:i.id, name:i.name, price:i.price, qty:i.qty}));

  if (selectedPayment === 'paystack') {
    btn.textContent = 'Loading…';
    btn.disabled = true;

    const email = `${phone.replace(/\s/g,'')}@andanielectronics.com`;
    const ref = 'AE-' + Date.now();

    loadPaystackScript(function() {
      btn.textContent = '🔒 Pay Now with Paystack';
      btn.disabled = false;

      if (typeof PaystackPop === 'undefined') {
        apToast('Payment system unavailable. Please try again.', 'error');
        return;
      }

      const handler = PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: email,
        amount: total * 100,
        currency: 'GHS',
        ref: ref,
        label: name,
        metadata: {
          custom_fields: [
            { display_name:'Customer Name',     variable_name:'customer_name', value: name     },
            { display_name:'Phone',             variable_name:'phone',         value: phone    },
            { display_name:'Delivery Location', variable_name:'location',      value: location },
            { display_name:'Order Items',       variable_name:'items',         value: items.map(i=>`${i.name} x${i.qty}`).join(', ') }
          ]
        },
        onClose: function() {
          paystackOpen = false;
          apToast('Payment cancelled. Your cart is still saved.', 'error');
          btn.textContent = '🔒 Pay Now with Paystack';
          btn.disabled = false;
        },
        callback: function(response) {
          paystackOpen = false;
          btn.textContent = 'Saving order…';

          // Save order and notify async but don't make callback async
          sbPost('orders', {
            customer_name: name, customer_phone: phone,
            customer_location: location, items, total, status: 'confirmed',
            notes: `Paystack ref: ${response.reference}${notes ? ' | '+notes : ''}`
          }).catch(e => console.warn('Order save failed:', e));

          const itemLines = items.map(i=>`• ${i.name} ×${i.qty} = GH₵${(i.price*i.qty).toLocaleString()}`).join('\n');
          const msg = `🎉 *NEW PAID ORDER — Andani Electronics*\n\n✅ *Payment Confirmed via Paystack*\n📌 Ref: ${response.reference}\n\n👤 *Customer Details*\nName: ${name}\nPhone: ${phone}\nLocation: ${location}\n\n🛒 *Items Ordered*\n${itemLines}\n\n💰 *Total Paid: GH₵${total.toLocaleString()}*\n\n📅 Money will be in your account by next business day.\n\n_Please prepare order for delivery._`;
          const storeWaUrl = `https://wa.me/233546459999?text=${encodeURIComponent(msg)}`;
          finishOrder(btn, storeWaUrl, { name, phone, location, items, total, ref: response.reference, payMethod: '✅ Paid via Paystack' });
        }
      });
      paystackOpen = true;
      handler.openIframe();
    });

  } else {
    // ── CASH ON DELIVERY ─────────────────────────────────
    btn.textContent = 'Placing order…';
    btn.disabled = true;

    try {
      await sbPost('orders', {
        customer_name: name, customer_phone: phone,
        customer_location: location, items, total, status: 'pending',
        notes: `Cash on Delivery${notes ? ' | '+notes : ''}`
      });
    } catch(e) { console.warn('Order save failed:', e); }

    const itemLines = items.map(i=>`• ${i.name} ×${i.qty} = GH₵${(i.price*i.qty).toLocaleString()}`).join('\n');
    const msg = `🛒 *NEW ORDER — Andani Electronics*\n\n💵 *Payment: Cash on Delivery*\n\n👤 *Customer Details*\nName: ${name}\nPhone: ${phone}\nLocation: ${location}\n\n🛒 *Items Ordered*\n${itemLines}\n\n💰 *Total: GH₵${total.toLocaleString()}*\n\n⚠️ _Payment to be collected on delivery. Please confirm with customer before dispatching._`;
    const storeWaUrl = `https://wa.me/233546459999?text=${encodeURIComponent(msg)}`;
    finishOrder(btn, storeWaUrl, { name, phone, location, items, total, ref: 'COD-' + Date.now(), payMethod: '💵 Cash on Delivery' });
  }
}

function finishOrder(btn, storeWaUrl, orderData) {
  clearCart();
  closeCheckout();
  selectedPayment = '';
  ['coName','coPhone','coLocation','coNotes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  if (btn) { btn.textContent = '✓ Place Order'; btn.disabled = false; btn.style.background='#059669'; }
  if (storeWaUrl) window.open(storeWaUrl, '_blank');
  if (orderData) showOrderReceipt(orderData);
}


// ══════════════════════════════════════════════════════
//  DYNAMIC SIDEBAR BUILDER
// ══════════════════════════════════════════════════════
const CAT_LABELS = {
  all:'All Products', tvs:'Televisions', appliances:'Home Appliances',
  sound:'Sound Systems', ceiling_fans:'Ceiling Fans', standing_fans:'Standing Fans',
  satellite:'Satellite & Decoders', heaters:'Heater Cups', blenders:'Blenders',
  burners:'Gas Burners', kitchen:'Rice Cookers', lighting:'Bulbs & Lighting',
  tech:'Pen Drives & Tech', sewing:'Sewing Machines', others:'Others'
};
let activeSidebarCat = 'all';
let activeSidebarBrands = new Set();
let sidebarPriceMin = null, sidebarPriceMax = null;

function buildSidebar() {
  // Count per category
  const catCounts = {};
  const brandCounts = {};
  allProducts.forEach(p => {
    catCounts[p.category] = (catCounts[p.category]||0) + 1;
    brandCounts[p.brand]  = (brandCounts[p.brand]||0) + 1;
  });
  catCounts['all'] = allProducts.length;

  // Categories
  const catEl = document.getElementById('sidebarCategories');
  if (catEl) {
    catEl.innerHTML = Object.entries(catCounts)
      .sort((a,b) => b[1]-a[1])
      .map(([cat, count]) => `
        <label class="filter-option" style="cursor:pointer;">
          <input type="radio" name="sidecat" value="${cat}" ${cat===activeSidebarCat?'checked':''} onchange="sidebarSetCat('${cat}')">
          ${CAT_LABELS[cat]||cat}
          <span class="filter-count">${count}</span>
        </label>`).join('');
  }

  // Brands
  const brandEl = document.getElementById('sidebarBrands');
  if (brandEl) {
    brandEl.innerHTML = Object.entries(brandCounts)
      .sort((a,b) => b[1]-a[1])
      .map(([brand, count]) => `
        <label class="filter-option" style="cursor:pointer;">
          <input type="checkbox" ${activeSidebarBrands.has(brand)?'checked':''} onchange="sidebarToggleBrand('${brand}',this.checked)">
          ${brand}
          <span class="filter-count">${count}</span>
        </label>`).join('');
  }
}

function sidebarSetCat(cat) {
  activeSidebarCat = cat;
  activeSidebarBrands.clear();
  applySidebarFilters();
  buildSidebar();
}

function sidebarToggleBrand(brand, checked) {
  if (checked) activeSidebarBrands.add(brand);
  else activeSidebarBrands.delete(brand);
  applySidebarFilters();
}

function applyPriceFilter() {
  sidebarPriceMin = parseFloat(document.getElementById('priceMin').value) || null;
  sidebarPriceMax = parseFloat(document.getElementById('priceMax').value) || null;
  applySidebarFilters();
}

function applySidebarFilters() {
  let filtered = allProducts;
  if (activeSidebarCat !== 'all') filtered = filtered.filter(p => p.category === activeSidebarCat);
  if (activeSidebarBrands.size > 0) filtered = filtered.filter(p => activeSidebarBrands.has(p.brand));
  if (sidebarPriceMin) filtered = filtered.filter(p => p.price >= sidebarPriceMin);
  if (sidebarPriceMax) filtered = filtered.filter(p => p.price <= sidebarPriceMax);
  renderGrid(null, filtered);
}



// ── Pagination ───────────────────────────────────────────
document.querySelectorAll('.page-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
    if(this.textContent !== '‹' && this.textContent !== '›') this.classList.add('active');
  });
});

// ── ADMIN AUTH ──────────────────────────────────────────────────────
const ADMIN_CREDS = {
  admin: { username: 'andani_admin', password: localStorage.getItem('adminPassword') || 'Admin@Store1' }
};

let currentAdminRole = null;
let selectedRole = 'admin';

function openAdminModal() {
  document.getElementById('adminOverlay').classList.add('open');
  document.getElementById('adminUser').focus();
  document.getElementById('adminError').style.display = 'none';
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
}

function closeAdminModal(e) {
  if (e.target === document.getElementById('adminOverlay')) closeAdminModalDirect();
}
function closeAdminModalDirect() {
  document.getElementById('adminOverlay').classList.remove('open');
}

function selectRole(role) {
  selectedRole = role;
  document.getElementById('tabAdmin').classList.toggle('active', role === 'admin');
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
  document.getElementById('adminError').style.display = 'none';
}

function doAdminLogin() {
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;
  const creds = ADMIN_CREDS[selectedRole];
  if (user === creds.username && pass === creds.password) {
    currentAdminRole = selectedRole;
    closeAdminModalDirect();
    showAdminBar();
    // Change admin icon to filled/colored to show logged-in state
    document.getElementById('adminLoginBtn').style.background = '#eff6ff';
    document.getElementById('adminLoginBtn').style.borderColor = '#1a56db';
    document.getElementById('adminLoginBtn').style.color = '#1a56db';
  } else {
    document.getElementById('adminError').style.display = 'block';
    document.getElementById('adminPass').value = '';
    document.getElementById('adminPass').focus();
  }
}

function showAdminBar() {
  const bar = document.getElementById('adminBar');
  const label = document.getElementById('adminBarLabel');
  const role = document.getElementById('adminBarRole');
  label.textContent = 'Welcome, Admin';
  role.textContent = 'ADMIN';
  bar.classList.add('visible');
  // Push content up so bar doesn't overlap
  document.body.style.paddingBottom = '60px';
}

function doAdminLogout() {
  currentAdminRole = null;
  document.getElementById('adminBar').classList.remove('visible');
  document.body.style.paddingBottom = '';
  const btn = document.getElementById('adminLoginBtn');
  btn.style.background = '';
  btn.style.borderColor = '';
  btn.style.color = '';
}

function apChangePassword() {
  const curr = document.getElementById('apCurrPass').value;
  const newP = document.getElementById('apNewPass').value;
  const conf = document.getElementById('apConfirmPass').value;
  const msg  = document.getElementById('apPassMsg');

  function showMsg(text, ok) {
    msg.textContent = text;
    msg.style.display = 'block';
    msg.style.background = ok ? '#dcfce7' : '#fee2e2';
    msg.style.color       = ok ? '#166534' : '#991b1b';
    msg.style.border      = '1px solid ' + (ok ? '#bbf7d0' : '#fecaca');
  }

  if (curr !== ADMIN_CREDS.admin.password) { showMsg('Current password is incorrect.', false); return; }
  if (newP.length < 6)                      { showMsg('New password must be at least 6 characters.', false); return; }
  if (newP !== conf)                        { showMsg('New passwords do not match.', false); return; }

  ADMIN_CREDS.admin.password = newP;
  localStorage.setItem('adminPassword', newP);
  document.getElementById('apCurrPass').value = '';
  document.getElementById('apNewPass').value  = '';
  document.getElementById('apConfirmPass').value = '';
  showMsg('Password updated successfully!', true);
}


// ══════════════════════════════════════════════════════
//  ADMIN PANEL — Full Dashboard with Supabase
// ══════════════════════════════════════════════════════

async function sbAdmin(method, table, body=null, params='') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?'+params : ''}`;
  const opts = {
    method,
    headers: {
      'apikey': SB_SERVICE,
      'Authorization': 'Bearer ' + SB_SERVICE,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : [];
}

// ── IMAGE UPLOAD HELPERS ─────────────────────────────────
function apHandleImageFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    apSetImagePreview(e.target.result);
    document.getElementById('apFImage').value = e.target.result; // base64
    document.getElementById('apFImageUrl').value = '';
  };
  reader.readAsDataURL(file);
}

function apHandleImageUrl(url) {
  if (url.startsWith('http')) {
    apSetImagePreview(url);
    document.getElementById('apFImage').value = url;
  }
}

function apSetImagePreview(src) {
  const box = document.getElementById('apImgUploadBox');
  const preview = document.getElementById('apImgPreview');
  const previewWrap = document.getElementById('apImgPreviewWrap');
  const placeholder = document.getElementById('apImgPlaceholder');
  preview.src = src;
  previewWrap.style.display = 'block';
  placeholder.style.display = 'none';
  box.classList.add('has-image');
}

function apClearImage() {
  document.getElementById('apFImage').value = '';
  document.getElementById('apFImageUrl').value = '';
  document.getElementById('apFImageFile').value = '';
  document.getElementById('apImgPreview').src = '';
  document.getElementById('apImgPreviewWrap').style.display = 'none';
  document.getElementById('apImgPlaceholder').style.display = 'block';
  document.getElementById('apImgUploadBox').classList.remove('has-image');
}


let apLoaded = { products:false, orders:false, promotions:false };

function openAdminPanel() {
  document.getElementById('apOverlay').classList.add('open');
  apLoadOverview();
}
function closeAdminPanel() {
  document.getElementById('apOverlay').classList.remove('open');
}
function apOverlayClick(e) {
  if (e.target === document.getElementById('apOverlay')) closeAdminPanel();
}

// ── TABS ─────────────────────────────────────────────
const apTabTitles = { overview:'Overview', products:'Products', orders:'Orders', promotions:'Promotions', settings:'Settings' };

function apSwitchTab(tab, btn) {
  document.querySelectorAll('.ap-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ap-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('apTab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
  const titleEl = document.getElementById('apPanelTitle');
  if (titleEl) titleEl.textContent = apTabTitles[tab] || tab;
  if (tab === 'products'   && !apLoaded.products)   apLoadProducts();
  if (tab === 'orders'     && !apLoaded.orders)     apLoadOrders();
  if (tab === 'promotions' && !apLoaded.promotions) apLoadPromos();
}

// ── OVERVIEW ─────────────────────────────────────────
let apRevenueChartInstance = null;

async function apLoadOverview() {
  // Set topbar date
  document.getElementById('apTopbarDate').textContent =
    new Date().toLocaleDateString('en-GH',{weekday:'short',day:'numeric',month:'long',year:'numeric'});

  try {
    const [prods, orders, promos, allOrds, chartOrds] = await Promise.all([
      sbAdmin('GET','products','','select=id'),
      sbAdmin('GET','orders','','select=id,total,status,created_at&order=created_at.desc&limit=5'),
      sbAdmin('GET','promotions','','select=id&active=eq.true'),
      sbAdmin('GET','orders','','select=total'),
      sbAdmin('GET','orders','','select=total,created_at&order=created_at.asc')
    ]);

    document.getElementById('statProducts').textContent = prods.length;
    document.getElementById('statOrders').textContent   = allOrds.length;
    document.getElementById('statRevenue').textContent  = 'GH₵' + allOrds.reduce((s,o)=>s+Number(o.total),0).toLocaleString();
    document.getElementById('statPromos').textContent   = promos.length;

    // ── Revenue chart (last 14 days) ──────────────────
    const days = 14;
    const labels = [], data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-GH',{day:'numeric',month:'short'}));
      const dayStr = d.toISOString().slice(0,10);
      const total = chartOrds
        .filter(o => o.created_at && o.created_at.slice(0,10) === dayStr)
        .reduce((s,o) => s + Number(o.total), 0);
      data.push(total);
    }
    const ctx = document.getElementById('apRevenueChart').getContext('2d');
    if (apRevenueChartInstance) apRevenueChartInstance.destroy();
    apRevenueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (GH₵)',
          data,
          borderColor: '#1a56db',
          backgroundColor: 'rgba(26,86,219,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#1a56db',
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 11 }, color: '#94a3b8',
              callback: v => 'GH₵' + v.toLocaleString() },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });

    // ── Recent orders ──────────────────────────────────
    const cont = document.getElementById('apRecentOrders');
    if (orders.length) {
      cont.innerHTML = `<p style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.85rem;margin:0 0 10px;color:#111;">Recent Orders</p>` +
        orders.map(o => `
          <div class="ap-order-card">
            <div>
              <div class="ap-order-id">Order #${o.id}</div>
              <div class="ap-order-meta">${new Date(o.created_at).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}</div>
            </div>
            <span class="ap-status-badge ${o.status}">${o.status}</span>
            <div class="ap-order-total">GH₵${Number(o.total).toLocaleString()}</div>
          </div>`).join('');
    } else {
      cont.innerHTML = `<div class="ap-empty"><p>No orders yet.</p></div>`;
    }
  } catch(e) { console.error('Overview load error:', e); }
}

// ── PRODUCTS ─────────────────────────────────────────
let apAllProducts = [];

async function apLoadProducts() {
  const tbody = document.getElementById('apProductsBody');
  tbody.innerHTML = '<tr><td colspan="8" class="ap-loading">Loading…</td></tr>';
  try {
    apAllProducts = await sbAdmin('GET','products','','select=*&order=id.asc');
    apLoaded.products = true;
    apRenderProducts(apAllProducts);
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="8" class="ap-empty">Failed to load products.</td></tr>';
  }
}

function apRenderProducts(prods) {
  const tbody = document.getElementById('apProductsBody');
  if (!prods.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="ap-empty">No products found.</td></tr>';
    return;
  }
  tbody.innerHTML = prods.map(p => `
    <tr>
      <td>${p.image ? `<img class="ap-img-thumb" src="${p.image}" onerror="this.style.display='none'">` : `<div class="ap-img-none">📷</div>`}</td>
      <td style="max-width:180px;font-size:0.8rem;font-weight:600;">${p.name}</td>
      <td>${p.brand}</td>
      <td><span style="font-size:0.72rem;background:#f1f5f9;padding:2px 7px;border-radius:20px;">${p.category}</span></td>
      <td style="font-weight:700;">GH₵${Number(p.price).toLocaleString()}</td>
      <td>${p.badge ? `<span class="ap-badge sale">${p.badge}</span>` : '–'}</td>
      <td><span class="ap-badge ${p.in_stock ? 'in' : 'out'}">${p.in_stock ? '✓ In Stock' : '✗ Out'}</span></td>
      <td>
        <div class="ap-row-actions">
          <button class="ap-icon-btn edit" title="Edit" onclick="apEditProduct(${p.id})">✏️</button>
          <button class="ap-icon-btn del"  title="Delete" onclick="apDeleteProduct(${p.id})" data-pid="${p.id}">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function apFilterProducts(q, cat='') {
  cat = cat || document.getElementById('apCatFilter').value;
  q   = (q || document.getElementById('apProdSearch').value).toLowerCase();
  const filtered = apAllProducts.filter(p =>
    (!cat || p.category === cat) &&
    (!q   || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
  );
  apRenderProducts(filtered);
}

function apShowAddForm() {
  document.getElementById('apFormTitle').textContent = 'Add New Product';
  document.getElementById('apFormId').value = '';
  ['apFName','apFBrand','apFSpecs'].forEach(id => document.getElementById(id).value = '');
  ['apFPrice','apFOldPrice'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('apFRating').value = 4;
  document.getElementById('apFReviews').value = 0;
  document.getElementById('apFBadge').value = '';
  document.getElementById('apFCat').value = 'tvs';
  apClearImage();
  document.getElementById('apProductForm').style.display = 'block';
  document.getElementById('apProductForm').scrollIntoView({behavior:'smooth'});
}

function apHideForm() {
  document.getElementById('apProductForm').style.display = 'none';
}

function apEditProduct(id) {
  const p = apAllProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('apFormTitle').textContent = 'Edit Product';
  document.getElementById('apFormId').value    = p.id;
  document.getElementById('apFName').value     = p.name;
  document.getElementById('apFBrand').value    = p.brand;
  document.getElementById('apFCat').value      = p.category;
  document.getElementById('apFPrice').value    = p.price;
  document.getElementById('apFOldPrice').value = p.old_price || '';
  document.getElementById('apFBadge').value    = p.badge || '';
  document.getElementById('apFImage').value    = p.image || '';
  document.getElementById('apFImageUrl').value = p.image && p.image.startsWith('http') ? p.image : '';
  if (p.image) apSetImagePreview(p.image); else apClearImage();
  document.getElementById('apFSpecs').value    = (p.specs||[]).join(', ');
  document.getElementById('apFRating').value   = p.rating;
  document.getElementById('apFReviews').value  = p.reviews;
  document.getElementById('apProductForm').style.display = 'block';
  document.getElementById('apProductForm').scrollIntoView({behavior:'smooth'});
}

async function apSaveProduct() {
  const id       = document.getElementById('apFormId').value;
  const name     = document.getElementById('apFName').value.trim();
  const brand    = document.getElementById('apFBrand').value.trim();
  const category = document.getElementById('apFCat').value;
  const price    = parseFloat(document.getElementById('apFPrice').value);
  const oldPrice = parseFloat(document.getElementById('apFOldPrice').value) || null;
  const badge    = document.getElementById('apFBadge').value || null;
  const image    = document.getElementById('apFImage').value.trim() || null;
  const specsRaw = document.getElementById('apFSpecs').value;
  const specs    = specsRaw ? specsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const rating   = parseFloat(document.getElementById('apFRating').value) || 4;
  const reviews  = parseInt(document.getElementById('apFReviews').value) || 0;

  if (!name || !brand || !price) { alert('Name, Brand and Price are required.'); return; }

  const payload = { name, brand, category, price, old_price: oldPrice, badge, image, specs, rating, reviews };
  try {
    if (id) {
      await sbAdmin('PATCH', 'products', payload, `id=eq.${id}`);
    } else {
      await sbAdmin('POST', 'products', payload);
    }
    apHideForm();
    apLoaded.products = false;
    await apLoadProducts();
    await loadProducts(); // refresh storefront
    apToast(id ? '✅ Product updated successfully!' : '✅ Product added and live on the site!');
  } catch(e) { apToast('❌ Error saving product: ' + e.message, 'error'); }
}

async function apDeleteProduct(id) {
  const p = apAllProducts.find(x => x.id === id);
  const name = p ? p.name : 'this product';
  apShowConfirm(
    `Delete "${name}"?`,
    'This product will be permanently removed from your store and database. This cannot be undone.',
    'Delete Product',
    async () => {
      try {
        await sbAdmin('DELETE', 'products', null, `id=eq.${id}`);
        apLoaded.products = false;
        await apLoadProducts();
        await loadProducts();
        buildSidebar();
        apToast('🗑️ Product deleted successfully.');
      } catch(e) {
        apToast('❌ Error deleting product: ' + e.message, 'error');
      }
    }
  );
}


// ── ORDERS ───────────────────────────────────────────
let apAllOrders = [];

async function apLoadOrders(statusFilter='') {
  const cont = document.getElementById('apOrdersList');
  cont.innerHTML = '<div class="ap-loading">Loading orders…</div>';
  try {
    let params = 'select=*&order=created_at.desc';
    if (statusFilter) params += `&status=eq.${statusFilter}`;
    apAllOrders = await sbAdmin('GET','orders','',params);
    apLoaded.orders = true;
    apRenderOrders(apAllOrders);
  } catch(e) {
    cont.innerHTML = '<div class="ap-empty">Failed to load orders.</div>';
  }
}

function apFilterOrders(q) {
  q = q.toLowerCase();
  const filtered = apAllOrders.filter(o =>
    !q || String(o.id).includes(q) ||
    (o.customer_name||'').toLowerCase().includes(q) ||
    (o.customer_phone||'').includes(q)
  );
  apRenderOrders(filtered);
}

function apRenderOrders(orders) {
  const cont = document.getElementById('apOrdersList');
  if (!orders.length) {
    cont.innerHTML = `<div class="ap-empty">
      <svg width="40" height="40" fill="none" stroke="#cbd5e1" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      <p>No orders found.</p></div>`;
    return;
  }
  const statusConfig = {
    pending:   { bg:'#fffbeb', border:'#fcd34d', dot:'#f59e0b', label:'Pending',   icon:'⏳' },
    confirmed: { bg:'#eff6ff', border:'#93c5fd', dot:'#3b82f6', label:'Confirmed', icon:'✅' },
    delivered: { bg:'#f0fdf4', border:'#86efac', dot:'#22c55e', label:'Delivered', icon:'🎉' },
  };
  cont.innerHTML = orders.map(o => {
    const cfg = statusConfig[o.status] || statusConfig.pending;
    const itemList = Array.isArray(o.items) ? o.items.map(i => `${i.name} ×${i.qty||1}`).join(', ') : JSON.stringify(o.items);
    const isDelivered = o.status === 'delivered';
    const date = new Date(o.created_at).toLocaleDateString('en-GH',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return `
    <div style="background:${cfg.bg};border:1.5px solid ${cfg.border};border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px;transition:all 0.2s;${isDelivered?'opacity:0.75':''}">
      <div onclick="apCycleStatus(${o.id},'${o.status}')" title="Click to update status"
        style="width:28px;height:28px;border-radius:8px;border:2px solid ${cfg.dot};background:${isDelivered?cfg.dot:'#fff'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-top:2px;transition:all 0.18s;">
        ${isDelivered ? '<svg width=\"14\" height=\"14\" fill=\"none\" stroke=\"white\" stroke-width=\"3\" viewBox=\"0 0 24 24\"><polyline points=\"20 6 9 17 4 12\"/></svg>' : ''}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
          <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.85rem;color:#0f172a;">Order #${o.id}</span>
          <span style="background:${cfg.dot};color:#fff;font-family:'Syne',sans-serif;font-size:0.68rem;font-weight:700;padding:2px 9px;border-radius:20px;">${cfg.icon} ${cfg.label}</span>
        </div>
        <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;">${date}</div>
        <div style="font-size:0.78rem;color:#475569;margin-bottom:2px;${isDelivered?'text-decoration:line-through;color:#94a3b8':''}">${itemList}</div>
        ${o.notes ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">📝 ${o.notes}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.95rem;color:#0f172a;">GH₵${Number(o.total).toLocaleString()}</div>
        <select onchange="apUpdateOrderStatus(${o.id},this.value)" style="font-size:0.72rem;padding:5px 8px;border:1.5px solid ${cfg.border};border-radius:8px;background:#fff;font-family:'Syne',sans-serif;font-weight:700;color:#475569;cursor:pointer;">
          <option ${o.status==='pending'   ?'selected':''} value="pending">⏳ Pending</option>
          <option ${o.status==='confirmed' ?'selected':''} value="confirmed">✅ Confirmed</option>
          <option ${o.status==='delivered' ?'selected':''} value="delivered">🎉 Delivered</option>
        </select>
      </div>
    </div>`;
  }).join('');
}

async function apCycleStatus(id, current) {
  const next = current === 'pending' ? 'confirmed' : current === 'confirmed' ? 'delivered' : 'pending';
  await apUpdateOrderStatus(id, next);
}

async function apUpdateOrderStatus(id, status) {
  try {
    await sbAdmin('PATCH','orders',{status},`id=eq.${id}`);
    apToast(`Order #${id} marked as ${status} ✓`);
    apLoaded.orders = false;
    const filter = document.getElementById('apOrderStatusFilter');
    await apLoadOrders(filter ? filter.value : '');
  } catch(e) { apToast('Failed to update order status.', 'error'); }
}


// ── PROMOTIONS ────────────────────────────────────────
async function apLoadPromos() {
  const cont = document.getElementById('apPromosList');
  cont.innerHTML = '<div class="ap-loading">Loading promotions…</div>';
  try {
    const promos = await sbAdmin('GET','promotions','','select=*&order=created_at.desc');
    apLoaded.promotions = true;
    if (!promos.length) { cont.innerHTML = '<div class="ap-empty"><p>No promotions yet. Add one above!</p></div>'; return; }
    cont.innerHTML = promos.map(p => `
      <div class="ap-order-card">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="ap-order-id">${p.title}</span>
            <span class="ap-status-badge ${p.active?'confirmed':'pending'}">${p.active?'Active':'Inactive'}</span>
          </div>
          <div class="ap-order-meta">${p.description||''} ${p.discount_pct?'| '+p.discount_pct+'% off':''} ${p.category?'| '+p.category:''}</div>
        </div>
        <div class="ap-row-actions">
          <button class="ap-icon-btn edit" onclick="apTogglePromo(${p.id},${!p.active})" title="${p.active?'Deactivate':'Activate'}">${p.active?'⏸️':'▶️'}</button>
          <button class="ap-icon-btn del" onclick="apDeletePromo(${p.id},'${p.title.replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </div>`).join('');
  } catch(e) { cont.innerHTML = '<div class="ap-empty">Failed to load promotions.</div>'; }
}

function apShowAddPromo() { document.getElementById('apPromoForm').style.display='block'; }

async function apSavePromo() {
  const title    = document.getElementById('apPTitle').value.trim();
  const desc     = document.getElementById('apPDesc').value.trim();
  const discount = parseInt(document.getElementById('apPDiscount').value)||null;
  const category = document.getElementById('apPCat').value||null;
  const active   = document.getElementById('apPActive').value === 'true';
  if (!title) { alert('Title is required.'); return; }
  try {
    await sbAdmin('POST','promotions',{title,description:desc,discount_pct:discount,category,active});
    document.getElementById('apPromoForm').style.display='none';
    apLoaded.promotions = false;
    apLoadPromos();
    apToast('✅ Promotion saved!');
  } catch(e) { apToast('❌ Error: ' + e.message, 'error'); }
}

async function apTogglePromo(id, active) {
  await sbAdmin('PATCH','promotions',{active},`id=eq.${id}`);
  apLoaded.promotions = false; apLoadPromos();
}

async function apDeletePromo(id, title) {
  apShowConfirm(
    `Delete "${title}"?`,
    'This promotion will be permanently removed.',
    'Delete Promotion',
    async () => {
      await sbAdmin('DELETE','promotions',null,`id=eq.${id}`);
      apLoaded.promotions = false;
      apLoadPromos();
      apToast('🗑️ Promotion deleted.');
    }
  );
}

// ── TOAST NOTIFICATIONS ──────────────────────────────────
function apToast(msg, type='success') {
  const container = document.getElementById('apToastContainer');
  const toast = document.createElement('div');
  const bg = type === 'error' ? '#fef2f2' : '#f0fdf4';
  const border = type === 'error' ? '#fca5a5' : '#86efac';
  const color = type === 'error' ? '#991b1b' : '#166534';
  toast.style.cssText = `background:${bg};border:1.5px solid ${border};color:${color};padding:11px 20px;border-radius:10px;font-family:'Syne',sans-serif;font-size:0.83rem;font-weight:700;box-shadow:0 4px 20px rgba(0,0,0,0.12);pointer-events:auto;animation:slideUp 0.2s ease;white-space:nowrap;max-width:90vw;`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.4s'; setTimeout(()=>toast.remove(), 400); }, 3000);
}

// ── CONFIRM MODAL ─────────────────────────────────────────
let apConfirmCallback = null;

function apShowConfirm(title, msg, btnLabel, onConfirm) {
  document.getElementById('apConfirmTitle').textContent = title;
  document.getElementById('apConfirmMsg').textContent   = msg;
  document.getElementById('apConfirmOkBtn').textContent = btnLabel;
  apConfirmCallback = onConfirm;
  const overlay = document.getElementById('apConfirmOverlay');
  overlay.style.display = 'flex';
  document.getElementById('apConfirmOkBtn').onclick = async () => {
    const cb = apConfirmCallback;
    apCloseConfirm();
    if (cb) await cb();
  };
}

function apCloseConfirm() {
  document.getElementById('apConfirmOverlay').style.display = 'none';
  apConfirmCallback = null;
}

// Close confirm on overlay click
document.addEventListener('DOMContentLoaded', function() {
  const confirmOverlay = document.getElementById('apConfirmOverlay');
  if (confirmOverlay) confirmOverlay.addEventListener('click', function(e) {
    if (e.target === this) apCloseConfirm();
  });
});
