// /public/customer/products.js
// Renders the Browse Products page: grid, filters, detail dialog, calculators, and quote panel.

import {
  PRODUCTS,
  PRODUCT_INDEX as INDEX_IN_DATA,
  CATEGORIES,
  DEFAULTS,
  CAN_SIZES_L,
  WHATSAPP_NUMBERS,
} from "./products-data.js";

/* ------------------------------- Setup ------------------------------- */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const els = {
  results:   $("#results"),
  empty:     $("#empty"),
  toolbar:   $("#toolbar"),
  q:         $("#q"),
  category:  $("#category"),
  finish:    $("#finish"),
  surface:   $("#surface"),
  sort:      $("#sort"),

  // Quote
  fabCart:       $("#fabCart"),
  quotePanel:    $("#quotePanel"),
  quoteItems:    $("#quoteItems"),
  quoteTotal:    $("#quoteTotal"),
  btnCloseQuote: $("#btnCloseQuote"),
  btnRequest:    $("#btnRequestQuote"),
  btnPrint:      $("#btnPrintQuote"),
  btnClear:      $("#btnClearQuote"),

  // Dialog
  dialog:     $("#productDialog"),
  pdTitle:    $("#pdTitle"),
  pdTagline:  $("#pdTagline"),
  pdChips:    $("#pdChips"),
  pdOverview: $("#pdOverview"),
  pdPairWith: $("#pdPairWith"),
  pdSpecs:    $("#tab-specs .specs"),
  pdCare:     $("#pdCare"),
  pdPrice:    $("#pdPrice"),
  pdUnit:     $("#pdUnit"),
  btnAdd:     $("#btnAddToQuote"),
  calcForm:   $("#calcForm"),
  calcArea:   $("#calcArea"),
  calcCoats:  $("#calcCoats"),
  rowCoats:   $("#rowCoats"),
  calcHint:   $("#calcHint"),
  calcOut:    $("#calcOut"),
  btnAddCalc: $("#btnAddCalculated"),
  tabs:       $$(".tabs .tab"),
  panels:     $$(".tab-panel"),

  tplCard:    $("#tplCard"),
};

const QUOTE_KEY = "mpw.quote";
const PRODUCT_INDEX = INDEX_IN_DATA ?? Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

/* ---------------------------- Utilities ----------------------------- */

const money = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(n)
    : "—";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const parseNum = (v) => {
  if (typeof v === "number") return v;
  if (!v) return NaN;
  return Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
};

const norm = (s) => (s || "")
  .toString()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

const byNameAsc   = (a, b) => a.name.localeCompare(b.name);
const byPriceAsc  = (a, b) => (a.unitPriceZAR ?? 1e15) - (b.unitPriceZAR ?? 1e15);
const byPriceDesc = (a, b) => (b.unitPriceZAR ?? -1e15) - (a.unitPriceZAR ?? -1e15);
// Higher nominal coverage (avg m²/L) first
const byCoverageDesc = (a, b) => avgCov(b) - avgCov(a);

const avgCov = (p) => Array.isArray(p.coverageSqmPerL) ? (p.coverageSqmPerL[0] + p.coverageSqmPerL[1]) / 2 : -1;

/* ---------------------------- State store --------------------------- */

let state = {
  q: "",
  category: "",
  finish: "",
  surface: "",
  sort: "name-asc",
};

let quote = readQuote();

/* ----------------------------- Init -------------------------------- */

init();

function init() {
  // Wire toolbar
  els.q?.addEventListener("input", onFilterChange);
  els.category?.addEventListener("change", onFilterChange);
  els.finish?.addEventListener("change", onFilterChange);
  els.surface?.addEventListener("change", onFilterChange);
  els.sort?.addEventListener("change", onFilterChange);

  // Quote panel events
  els.fabCart?.addEventListener("click", openQuote);
  els.btnCloseQuote?.addEventListener("click", closeQuote);
  els.btnPrint?.addEventListener("click", () => window.print());
  els.btnClear?.addEventListener("click", () => { quote = []; persistQuote(); renderQuote(); });

  els.btnRequest?.addEventListener("click", () => {
    const numbers = (els.btnRequest.dataset.whatsapp || WHATSAPP_NUMBERS.join(",")).split(",").map(s => s.trim()).filter(Boolean);
    const text = buildWhatsAppMessage();
    const target = numbers[0] || "";
    const url = `https://wa.me/${target.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  });

  // Results click handlers (event delegation)
  els.results.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    if (e.target.matches(".details")) {
      openProduct(id);
    } else if (e.target.matches(".add")) {
      const p = PRODUCT_INDEX[id];
      if (!p) return;
      // If price unknown or needs calculator, open details instead
      if (!isFinite(p.unitPriceZAR) || p.type === "service") {
        openProduct(id, { jumpTab: "calculator" });
      } else {
        // Default for paints without calculator input: 1 can
        addPaintCansToQuote(p, 1);
      }
    }
  });

  // Dialog tabs
  els.tabs.forEach(btn =>
    btn.addEventListener("click", () => activateTab(btn.dataset.tab))
  );

  // Calculator
  els.calcArea?.addEventListener("input", updateCalculatorOut);
  els.calcCoats?.addEventListener("input", updateCalculatorOut);
  els.btnAddCalc?.addEventListener("click", (e) => {
    e.preventDefault();
    addFromCalculator();
  });

  // Dialog close resets hash
  els.dialog.addEventListener("close", () => {
    // remove id=… from hash if present
    if (location.hash.startsWith("#id=")) history.replaceState(null, "", location.pathname);
  });

  // Render initial grid and quote panel
  renderGrid();
  renderQuote();

  // Deep-link: products.html#id=my-product
  const idParam = getIdFromHash();
  if (idParam && PRODUCT_INDEX[idParam]) openProduct(idParam);
}

function getIdFromHash() {
  if (!location.hash) return "";
  const m = location.hash.match(/#id=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/* --------------------------- Filtering UI --------------------------- */

function onFilterChange() {
  state = {
    q: norm(els.q?.value),
    category: els.category?.value || "",
    finish: els.finish?.value || "",
    surface: els.surface?.value || "",
    sort: els.sort?.value || "name-asc",
  };
  renderGrid();
}

function applyFilters(data) {
  const q = state.q;
  let out = data.slice();

  if (state.category) out = out.filter(p => p.category === state.category);
  if (state.finish)   out = out.filter(p => (p.finish || "").toLowerCase() === state.finish);
  if (state.surface)  out = out.filter(p => (p.surfaces || []).some(s => norm(s) === state.surface));

  if (q) {
    out = out.filter(p => {
      const hay = [
        p.name,
        ...(p.tags || []),
        ...(p.surfaces || []),
        p.overview || ""
      ].map(norm).join(" ");
      return hay.includes(q);
    });
  }

  switch (state.sort) {
    case "name-asc":      out.sort(byNameAsc); break;
    case "price-asc":     out.sort(byPriceAsc); break;
    case "price-desc":    out.sort(byPriceDesc); break;
    case "coverage-desc": out.sort(byCoverageDesc); break;
  }

  return out;
}

/* ----------------------------- Render ------------------------------ */

function renderGrid() {
  const data = applyFilters(PRODUCTS);
  els.results.setAttribute("aria-busy", "true");
  els.results.innerHTML = "";

  if (!data.length) {
    els.empty.hidden = false;
    els.results.setAttribute("aria-busy", "false");
    return;
  }
  els.empty.hidden = true;

  const frag = document.createDocumentFragment();
  data.forEach(p => frag.appendChild(makeCard(p)));
  els.results.appendChild(frag);
  els.results.setAttribute("aria-busy", "false");
}

function makeCard(p) {
  const node = els.tplCard.content.firstElementChild.cloneNode(true);
  node.dataset.id = p.id;

  $(".card-title", node).textContent = p.name;
  $(".card-sub", node).textContent = summarize(p);

  // badges
  const badges = $(".badges", node);
  const chips = [
    p.finish && cap(p.finish),
    p.interiorExterior && cap(p.interiorExterior),
    p.base && `${cap(p.base)}-based`,
    ...(p.surfaces?.slice(0, 1) || []) // show first surface as a hint
  ].filter(Boolean);
  chips.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    badges.appendChild(li);
  });

  // price block
  const priceEl = $(".card-price .value", node);
  const unitEl  = $(".card-price .unit", node);

  if (isFinite(p.unitPriceZAR)) {
    priceEl.textContent = money(p.unitPriceZAR);
    unitEl.textContent = p.category === CATEGORIES.PAINT_20L ? "per 20 L" : "per m²";
  } else {
    priceEl.textContent = p.priceNote || "Contact for price";
    unitEl.textContent = "";
  }

  // buttons
  const btnAdd = $(".add", node);
  if (!isFinite(p.unitPriceZAR)) {
    btnAdd.textContent = "Details";
    btnAdd.classList.remove("primary");
    btnAdd.classList.add("ghost");
    btnAdd.classList.add("details");
    btnAdd.classList.remove("add");
  }

  return node;
}

function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

function summarize(p) {
  if (p.type === "service") return "Professional application service";
  const bits = [];
  if (p.overview) bits.push(p.overview);
  if (p.coverageSqmPerL) bits.push(`Coverage ~${avgCov(p)} m²/L per coat`);
  return bits[0] || "";
}

/* ----------------------- Product detail dialog ---------------------- */

let currentProduct = null;

function openProduct(id, opts = {}) {
  const p = PRODUCT_INDEX[id];
  if (!p) return;
  currentProduct = p;

  // Set URL hash so page can be shared
  try { history.replaceState(null, "", `#id=${encodeURIComponent(id)}`); } catch {}

  // Header/price
  els.pdTitle.textContent = p.name;
  els.pdTagline.textContent = summarize(p);
  els.pdPrice.textContent = isFinite(p.unitPriceZAR) ? money(p.unitPriceZAR) : (p.priceNote || "Contact for price");
  els.pdUnit.textContent = p.category === CATEGORIES.PAINT_20L ? "per 20 L" : "per m²";

  // Chips
  els.pdChips.innerHTML = "";
  [
    p.finish && cap(p.finish),
    p.interiorExterior && cap(p.interiorExterior),
    p.base && `${cap(p.base)}-based`,
    ...(p.features || []).slice(0, 3)
  ].filter(Boolean).forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    els.pdChips.appendChild(li);
  });

  // Overview
  els.pdOverview.textContent = p.overview || "";

  // Pair with
  els.pdPairWith.innerHTML = "";
  (p.pairWith || []).forEach(pid => {
    const link = document.createElement("a");
    const item = PRODUCT_INDEX[pid];
    link.href = `#id=${encodeURIComponent(pid)}`;
    link.textContent = item?.name || pid;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openProduct(pid);
    });
    const li = document.createElement("li");
    li.appendChild(link);
    els.pdPairWith.appendChild(li);
  });

  // Specs
  els.pdSpecs.innerHTML = "";
  specRow("Finish", p.finish && cap(p.finish));
  specRow("Base", p.base && cap(p.base));
  specRow("Interior/Exterior", p.interiorExterior && cap(p.interiorExterior));
  if (Array.isArray(p.coverageSqmPerL)) {
    specRow("Coverage (per coat)", `${p.coverageSqmPerL[0]}–${p.coverageSqmPerL[1]} m²/L`);
  }
  if (p.surfaces?.length) specRow("Surfaces", p.surfaces.join(", "));

  // Care
  els.pdCare.innerHTML = "";
  (p.care || []).forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    els.pdCare.appendChild(li);
  });

  // Add button behavior
  if (!isFinite(p.unitPriceZAR)) {
    els.btnAdd.textContent = "Contact us";
    els.btnAdd.onclick = () => {
      // Open WhatsApp with just the product ask
      const numbers = (els.btnRequest.dataset.whatsapp || WHATSAPP_NUMBERS.join(",")).split(",")[0] || "";
      const text = `Hi MPW, I’d like more info and a price for: ${p.name}.`;
      const url = `https://wa.me/${numbers.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    };
  } else if (p.type === "service") {
    els.btnAdd.textContent = "Open calculator";
    els.btnAdd.onclick = () => activateTab("calculator");
  } else {
    els.btnAdd.textContent = "Add 1 can to quote";
    els.btnAdd.onclick = () => addPaintCansToQuote(p, 1);
  }

  // Calculator setup
  if (p.type === "service") {
    els.rowCoats.hidden = true;
    els.calcCoats.value = DEFAULTS.coats;
    els.calcHint.textContent = "Enter the area in m² to estimate the service cost.";
  } else {
    els.rowCoats.hidden = false;
    els.calcCoats.value = p.coatsDefault ?? DEFAULTS.coats;
    if (Array.isArray(p.coverageSqmPerL)) {
      els.calcHint.textContent =
        `Typical coverage ${p.coverageSqmPerL[0]}–${p.coverageSqmPerL[1]} m²/L per coat.`;
    } else {
      els.calcHint.textContent = "Enter your area and coats to estimate litres and cans.";
    }
  }
  els.calcArea.value = "";
  els.calcOut.innerHTML = "";

  // Activate requested tab or Overview
  activateTab(opts.jumpTab || "overview");

  // Show
  if (typeof els.dialog.showModal === "function") {
    els.dialog.showModal();
  } else {
    // Fallback for older browsers
    els.dialog.removeAttribute("hidden");
  }
}

function specRow(term, val) {
  if (!val) return;
  const dt = document.createElement("dt"); dt.textContent = term;
  const dd = document.createElement("dd"); dd.textContent = val;
  els.pdSpecs.append(dt, dd);
}

function activateTab(name) {
  els.tabs.forEach(t => t.classList.toggle("is-active", t.dataset.tab === name));
  els.panels.forEach(p => p.classList.toggle("is-active", p.id === `tab-${name}`));
}

/* ----------------------------- Calculator -------------------------- */

function updateCalculatorOut() {
  const p = currentProduct;
  if (!p) return;

  const area = parseNum(els.calcArea.value);
  const coats = clamp(parseInt(els.calcCoats.value || (p.coatsDefault ?? DEFAULTS.coats), 10), 1, 3);
  const out = els.calcOut;
  out.innerHTML = "";

  if (!isFinite(area) || area <= 0) return;

  if (p.type === "service") {
    const unit = p.unitPriceZAR;
    const subtotal = isFinite(unit) ? unit * area : NaN;
    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>Estimated service cost:</strong> ${isFinite(subtotal) ? money(subtotal) : "Contact for price"}</p>
      <p class="hint">This estimate excludes special prep or repairs. Final quote after site inspection.</p>
    `;
    out.appendChild(div);
  } else {
    // Paint coverage: litres and can rounding
    const avg = avgCov(p) > 0 ? avgCov(p) : DEFAULTS.paintCoverageSqmPerL.reduce((a,b)=>a+b,0)/2;
    const litres = (area * coats) / avg;
    const canSize = (CAN_SIZES_L && CAN_SIZES_L[0]) || 20;
    const cans = Math.max(1, Math.ceil(litres / canSize));
    const subtotal = isFinite(p.unitPriceZAR) ? cans * p.unitPriceZAR : NaN;

    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>Estimated litres:</strong> ${litres.toFixed(1)} L</p>
      <p><strong>Rounded to cans:</strong> ${cans} × ${canSize} L</p>
      <p><strong>Estimated paint total:</strong> ${isFinite(subtotal) ? money(subtotal) : "Contact for price"}</p>
      <p class="hint">Coverage is an estimate and varies with surface and application.</p>
    `;
    out.appendChild(div);
  }
}

function addFromCalculator() {
  const p = currentProduct;
  if (!p) return;

  const area = parseNum(els.calcArea.value);
  if (!isFinite(area) || area <= 0) return;

  if (p.type === "service") {
    const unit = p.unitPriceZAR;
    const subtotal = isFinite(unit) ? unit * area : 0;
    addToQuote({
      id: `${p.id}@${area}`,
      productId: p.id,
      type: "service",
      name: p.name,
      unit: "m²",
      area,
      unitPriceZAR: unit,
      subtotal,
    });
  } else {
    const coats = clamp(parseInt(els.calcCoats.value || (p.coatsDefault ?? DEFAULTS.coats), 10), 1, 3);
    const avg = avgCov(p) > 0 ? avgCov(p) : DEFAULTS.paintCoverageSqmPerL.reduce((a,b)=>a+b,0)/2;
    const litres = (area * coats) / avg;
    const canSize = (CAN_SIZES_L && CAN_SIZES_L[0]) || 20;
    const cans = Math.max(1, Math.ceil(litres / canSize));
    const subtotal = isFinite(p.unitPriceZAR) ? cans * p.unitPriceZAR : 0;

    addToQuote({
      id: `${p.id}@${cans}c`,
      productId: p.id,
      type: "paint",
      name: p.name,
      unit: `${canSize}L`,
      cans,
      litres: Number(litres.toFixed(1)),
      coats,
      unitPriceZAR: p.unitPriceZAR,
      subtotal,
    });
  }

  renderQuote();
  openQuote();
}

/* ----------------------------- Quote -------------------------------- */

function readQuote() {
  try {
    const raw = localStorage.getItem(QUOTE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistQuote() {
  localStorage.setItem(QUOTE_KEY, JSON.stringify(quote));
}

function addToQuote(item) {
  // If same id exists, merge by increasing quantity/area when meaningful
  const idx = quote.findIndex(q => q.id === item.id);
  if (idx >= 0) {
    const existing = quote[idx];
    if (existing.type === "paint" && item.cans) {
      existing.cans += item.cans;
      existing.litres = (existing.litres || 0) + (item.litres || 0);
      existing.subtotal += item.subtotal || 0;
    } else if (existing.type === "service" && item.area) {
      existing.area += item.area;
      existing.subtotal += item.subtotal || 0;
    }
  } else {
    quote.push(item);
  }
  persistQuote();
}

function addPaintCansToQuote(p, cans = 1) {
  const canSize = (CAN_SIZES_L && CAN_SIZES_L[0]) || 20;
  const subtotal = isFinite(p.unitPriceZAR) ? cans * p.unitPriceZAR : 0;
  addToQuote({
    id: `${p.id}@${cans}c`,
    productId: p.id,
    type: "paint",
    name: p.name,
    unit: `${canSize}L`,
    cans,
    unitPriceZAR: p.unitPriceZAR,
    subtotal,
  });
  renderQuote();
  openQuote();
}

function renderQuote() {
  els.quoteItems.innerHTML = "";
  let total = 0;

  if (!quote.length) {
    els.quoteItems.innerHTML = `<li class="quote-item"><div class="row"><span>Your quote is empty.</span></div></li>`;
    els.quoteTotal.textContent = money(0);
    closeQuote();
    els.fabCart.hidden = true;
    return;
  }

  quote.forEach((it, i) => {
    total += it.subtotal || 0;

    const li = document.createElement("li");
    li.className = "quote-item";
    const meta = it.type === "paint"
      ? `${it.cans} × ${it.unit}`
      : `${(it.area ?? 0).toFixed(1)} m²`;

    li.innerHTML = `
      <div class="row">
        <strong>${it.name}</strong>
        <button class="icon-btn" data-act="del" data-idx="${i}" aria-label="Remove">✕</button>
      </div>
      <div class="row">
        <span>${meta}</span>
        <span>${isFinite(it.unitPriceZAR) ? money(it.subtotal || 0) : "Contact"}</span>
      </div>
    `;

    li.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act='del']");
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      quote.splice(idx, 1);
      persistQuote();
      renderQuote();
    });

    els.quoteItems.appendChild(li);
  });

  els.quoteTotal.textContent = money(total);
  els.fabCart.hidden = false;
}

function openQuote()  { els.quotePanel.hidden = false; }
function closeQuote() { els.quotePanel.hidden = true; }

function buildWhatsAppMessage() {
  if (!quote.length) return "Hi MPW, I’d like a paint quote.";

  const lines = quote.map(it => {
    if (it.type === "paint") {
      const unit = isFinite(it.unitPriceZAR) ? ` @ ${money(it.unitPriceZAR)}/can` : "";
      return `• ${it.name} — ${it.cans} × ${it.unit}${unit}`;
    } else {
      const unit = isFinite(it.unitPriceZAR) ? ` @ ${money(it.unitPriceZAR)}/m²` : "";
      return `• ${it.name} — ${it.area?.toFixed(1)} m²${unit}`;
    }
  });

  const total = quote.reduce((s, it) => s + (it.subtotal || 0), 0);
  const tail = total > 0 ? `\n\nEstimated subtotal: ${money(total)}` : "";

  return `Hi Maduwa Paint World, please send a quote for:\n${lines.join("\n")}${tail}\n\nMy suburb: ______\nPreferred contact: ______`;
}

/* ------------------------- Keyboard helpers ------------------------- */

// Close dialog with Escape (for browsers that don’t wire <dialog> by default)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.dialog.open) closeQuote();
});

/* --------------------------- Done rendering ------------------------- */
