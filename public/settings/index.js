// /public/settings/index.js
// Page wiring: tabs, load/apply settings, Save/Back behavior.

import {
  initAppearanceUI,
  getAppearanceState,
  applyAppearance,
  saveAppearance,
} from "./settings.js";

/* ----------------------------- Keys ----------------------------- */
const KEYS = {
  highContrast: "app.highContrast",
  fontScale: "app.fontScale",
  startPage: "app.defaultStartPage", // 'auto' | 'customer' | 'employee'
  returnBehavior: "app.returnBehavior", // 'toReferrer' | 'customer' | 'employee' | 'stay'
  prevTheme: "app.prevTheme", // for temporary high-contrast override
};

/* ------------------------- DOM References ------------------------ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const backBtn = $("#backBtn");
const footerBackBtn = $("#footerBackBtn");
const saveBtn = $("#saveBtn");
const footerSaveBtn = $("#footerSaveBtn");

const tabsNav = $(".settings-tabs");
const tabButtons = $$(".settings-tab");
const sections = $$(".settings-section");

const highContrastToggle = $("#highContrastToggle");
const fontScaleSelect = $("#fontScale");
const startPageSelect = $("#defaultStartPage");
const returnBehaviorSelect = $("#returnBehavior");

/* --------------------------- Utilities --------------------------- */
function getSearchParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function isFromCustomer(ref = document.referrer) {
  return /\/customer\//i.test(ref) || getSearchParam("from") === "customer";
}

function isFromEmployee(ref = document.referrer) {
  return /\/employee\//i.test(ref) || getSearchParam("from") === "employee";
}

function targetFor(section) {
  // Normalize to app routes (adjust if your folder structure differs)
  if (section === "customer") return "../customer/home.html";
  if (section === "employee") return "../employee/employee-portal.html";
  return null;
}

function navigateBack({ onSave = false } = {}) {
  // Decide where to go after Save/Back.
  const rb = (returnBehaviorSelect?.value || read(KEYS.returnBehavior) || "toReferrer");

  // 1) If URL explicitly says ?from=..., respect that first
  if (getSearchParam("from") === "customer") {
    window.location.href = targetFor("customer");
    return;
  }
  if (getSearchParam("from") === "employee") {
    window.location.href = targetFor("employee");
    return;
  }

  // 2) Respect user's configured return behavior
  if (rb === "customer") {
    window.location.href = targetFor("customer");
    return;
  }
  if (rb === "employee") {
    window.location.href = targetFor("employee");
    return;
  }
  if (rb === "stay" && onSave) {
    // stay on Settings only if we just saved (Back should still try to go back)
    return;
  }

  // 3) Fall back to referrer heuristics
  if (isFromCustomer()) {
    window.location.href = targetFor("customer");
    return;
  }
  if (isFromEmployee()) {
    window.location.href = targetFor("employee");
    return;
  }

  // 4) Last resort: use start page pref
  const sp = (startPageSelect?.value || read(KEYS.startPage) || "auto");
  if (sp === "customer") {
    window.location.href = targetFor("customer");
  } else if (sp === "employee") {
    window.location.href = targetFor("employee");
  } else {
    // 'auto' -> guess employee if referrer missing
    window.location.href = targetFor("customer");
  }
}

/* ------------------------ Local Persistence ---------------------- */
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}
function readBool(key, fallback = "false") {
  const v = read(key);
  return (v ?? fallback) === "true";
}
function readNum(key, fallback = 1) {
  const v = Number(read(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/* ------------------------- Apply Settings ------------------------ */
function applyFontScale(scale) {
  // Apply by scaling root font-size
  const pct = Math.round(100 * scale);
  document.documentElement.style.fontSize = `${pct}%`;
}

function applyHighContrast(enabled) {
  const root = document.documentElement;
  const currentTheme = root.getAttribute("data-theme") || "light";

  if (enabled) {
    // Remember current theme, then switch to contrast
    if (currentTheme !== "contrast") {
      write(KEYS.prevTheme, currentTheme);
    }
    root.setAttribute("data-theme", "contrast");
  } else {
    // Restore prior theme (if any), else keep current selection from Appearance
    const prev = read(KEYS.prevTheme);
    if (prev && prev !== "contrast") {
      root.setAttribute("data-theme", prev);
    }
  }
}

/* --------------------------- Load UI ----------------------------- */
function loadUIFromStorage() {
  // Accessibility
  const hc = readBool(KEYS.highContrast, "false");
  const fs = readNum(KEYS.fontScale, 1);

  if (highContrastToggle) {
    highContrastToggle.checked = hc;
    applyHighContrast(hc);
  }
  if (fontScaleSelect) {
    fontScaleSelect.value = String(fs);
    applyFontScale(fs);
  }

  // Preferences
  if (startPageSelect) {
    startPageSelect.value = read(KEYS.startPage) || "auto";
  }
  if (returnBehaviorSelect) {
    returnBehaviorSelect.value = read(KEYS.returnBehavior) || "toReferrer";
  }

  // Appearance (live-apply current saved selection without persist)
  applyAppearance({
    ...getAppearanceState(),
  });
}

/* ----------------------- Wire Event Handlers --------------------- */
function wireAccessibility() {
  if (highContrastToggle) {
    highContrastToggle.addEventListener("change", () => {
      const enabled = !!highContrastToggle.checked;
      applyHighContrast(enabled);
      write(KEYS.highContrast, String(enabled));
    });
  }

  if (fontScaleSelect) {
    fontScaleSelect.addEventListener("change", () => {
      const scale = Number(fontScaleSelect.value);
      applyFontScale(scale);
      write(KEYS.fontScale, String(scale));
    });
  }
}

function wirePreferences() {
  if (startPageSelect) {
    startPageSelect.addEventListener("change", () => {
      write(KEYS.startPage, startPageSelect.value);
    });
  }
  if (returnBehaviorSelect) {
    returnBehaviorSelect.addEventListener("change", () => {
      write(KEYS.returnBehavior, returnBehaviorSelect.value);
    });
  }
}

function wireTabs() {
  if (!tabsNav) return;

  function activate(name) {
    // Buttons
    tabButtons.forEach((btn) => {
      const active = btn.dataset.section === name;
      btn.setAttribute("aria-selected", String(active));
    });
    // Sections
    sections.forEach((sec) => {
      const isActive = sec.id === `section-${name}`;
      sec.classList.toggle("is-hidden", !isActive);
    });
  }

  tabsNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".settings-tab");
    if (!btn) return;
    const name = btn.dataset.section;
    activate(name);
  });

  // Default to the first button's section
  const first = tabButtons[0]?.dataset.section || "appearance";
  activate(first);
}

function wireSaveAndBack() {
  const doSave = () => {
    // Persist Appearance
    saveAppearance();

    // Accessibility prefs already persisted on change; ensure current values saved
    if (highContrastToggle) write(KEYS.highContrast, String(!!highContrastToggle.checked));
    if (fontScaleSelect) write(KEYS.fontScale, String(Number(fontScaleSelect.value) || 1));

    // Preferences already persisted on change; ensure current values saved
    if (startPageSelect) write(KEYS.startPage, startPageSelect.value);
    if (returnBehaviorSelect) write(KEYS.returnBehavior, returnBehaviorSelect.value);

    // Navigate per rules
    navigateBack({ onSave: true });
  };

  saveBtn?.addEventListener("click", doSave);
  footerSaveBtn?.addEventListener("click", doSave);

  const doBack = () => navigateBack({ onSave: false });
  backBtn?.addEventListener("click", doBack);
  footerBackBtn?.addEventListener("click", doBack);
}

/* ---------------------------- Init ------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Build appearance controls (theme grid + accent slider)
  initAppearanceUI({
    onChange: () => {
      // You could enable a "Save" highlight here if desired
    },
  });

  // Load saved values and apply to UI
  loadUIFromStorage();

  // Wire the rest
  wireAccessibility();
  wirePreferences();
  wireTabs();
  wireSaveAndBack();

  // Focus main content for accessibility
  $("#settingsMain")?.focus();
});
