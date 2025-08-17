// /public/settings/settings.js
// Handles Appearance controls: theme grid + accent hue.
// Navigation, tabs, and save/back orchestration belong in /public/settings/index.js.

import { THEMES, getTheme, setTheme } from '../css/theme.js';

/* ---------- Storage Keys ---------- */
export const ACCENT_KEY = 'app.accentHue';
const THEME_KEY = 'app.theme';

/* ---------- State ---------- */
let selectedTheme = getTheme();
let currentHue = readAccentHue();

/* ---------- Public API (used by index.js) ----------
 * - initAppearanceUI(): build widgets and wire events
 * - getAppearanceState(): read current selections
 * - applyAppearance(state): apply selections to the document (no save)
 * - saveAppearance(): persist selections (theme + accent hue)
 */
export function initAppearanceUI({
  gridId = 'themeGrid',
  pickerId = 'accentPicker',
  previewId = 'accentPreview',
  onChange = null, // optional callback({ theme, accentHue })
} = {}) {
  // Build the theme grid
  const grid = document.getElementById(gridId);
  if (grid) {
    buildThemeGrid(grid, onChange);
    // reflect initial selection
    syncThemeGridSelection(grid);
  }

  // Wire the accent hue picker
  const picker = document.getElementById(pickerId);
  const preview = document.getElementById(previewId);

  if (picker) {
    // Initialize picker with current hue
    picker.value = String(currentHue);
    updateAccentHue(Number(picker.value), preview, /*announce*/ false);

    picker.addEventListener('input', (e) => {
      const hue = clampHue(Number(e.target.value));
      updateAccentHue(hue, preview, /*announce*/ true);
      if (typeof onChange === 'function') {
        onChange(getAppearanceState());
      }
    });
  }

  // Keep UI in sync with changes coming from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY && e.newValue) {
      if (THEMES.includes(e.newValue)) {
        selectedTheme = e.newValue;
        document.documentElement.setAttribute('data-theme', selectedTheme);
        if (grid) syncThemeGridSelection(grid);
        if (typeof onChange === 'function') onChange(getAppearanceState());
      }
    }
    if (e.key === ACCENT_KEY && e.newValue) {
      const hv = readAccentHue();
      updateAccentHue(hv, preview, /*announce*/ false);
      if (picker) picker.value = String(hv);
      if (typeof onChange === 'function') onChange(getAppearanceState());
    }
  });

  // Also respect in-page custom events dispatched by theme.js
  window.addEventListener('themechange', (ev) => {
    const t = ev?.detail?.theme;
    if (t && THEMES.includes(t)) {
      selectedTheme = t;
      if (grid) syncThemeGridSelection(grid);
      if (typeof onChange === 'function') onChange(getAppearanceState());
    }
  });
}

export function getAppearanceState() {
  return { theme: selectedTheme, accentHue: currentHue };
}

export function applyAppearance(state) {
  if (state?.theme) {
    // Validate theme against known list
    const t = THEMES.includes(state.theme) ? state.theme : getTheme();
    document.documentElement.setAttribute('data-theme', t);
    selectedTheme = t;
  }
  if (Number.isFinite(state?.accentHue)) {
    document.documentElement.style.setProperty('--accent-h', String(clampHue(state.accentHue)));
    currentHue = clampHue(state.accentHue);
  }
}

export function saveAppearance() {
  // Persist theme (uses theme.js so all tabs sync)
  setTheme(selectedTheme);
  // Persist accent hue
  writeAccentHue(currentHue);
}

/* ======================================================
   Internal helpers
   ====================================================== */

function buildThemeGrid(grid, onChange) {
  grid.innerHTML = '';

  // Minimal color chips used for visual swatches (no CSS needed)
  const samplePalette = {
    light:      ['#ffffff','#f7f8fa','#e5e7eb','#2563eb','#1d2433'],
    dark:       ['#0f172a','#111827','#334155','#93c5fd','#e5e7eb'],
    midnight:   ['#0a0a0b','#121214','#1a1b1e','#22d3ee','#e7e7ea'],
    forest:     ['#fcfdf9','#f1f6ee','#dbe7d6','#10b981','#1e2a1f'],
    ocean:      ['#fbfdff','#f1f6ff','#d9e2f2','#2563eb','#112233'],
    grape:      ['#fffaff','#fbf3ff','#ecd8ff','#7c3aed','#2a1039'],
    sunflower:  ['#fffef7','#fff7d6','#fde68a','#b45309','#1e1b04'],
    contrast:   ['#000000','#000000','#ffffff','#00aaff','#ffffff'],
    // New calm themes
    slate:      ['#f7f8fb','#eef1f6','#d7dde8','#3b82f6','#1b2430'],
    emerald:    ['#f6fff9','#ebfff3','#c9ead8','#059669','#0f2e1f'],
    rose:       ['#fff7fa','#ffeff5','#ffd0dd','#e11d48','#321520'],
    copper:     ['#fbf7f3','#f3ebe4','#e1d2c6','#b45309','#2b1f18'],
  };

  THEMES.forEach((theme) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.setAttribute('data-theme-name', theme);
    btn.setAttribute('aria-pressed', String(theme === selectedTheme));
    btn.setAttribute('title', `Choose ${titleCase(theme)} theme`);

    btn.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <strong>${titleCase(theme)}</strong>
        <span class="check" aria-hidden="true" style="opacity:${theme===selectedTheme?1:0}">✓</span>
      </div>
      <div class="row">
        ${(samplePalette[theme] || samplePalette.light)
          .map(c => `<span class="chip" style="background:${c}"></span>`)
          .join('')}
      </div>
    `;

    btn.addEventListener('click', () => {
      if (selectedTheme === theme) return;

      selectedTheme = theme;
      // Update UI state
      syncThemeGridSelection(grid);

      // Apply immediately (non-persistent until Save)
      document.documentElement.setAttribute('data-theme', selectedTheme);

      if (typeof onChange === 'function') {
        onChange(getAppearanceState());
      }
    });

    grid.appendChild(btn);
  });
}

function syncThemeGridSelection(grid) {
  for (const child of grid.children) {
    const isActive = child.getAttribute('data-theme-name') === selectedTheme;
    child.setAttribute('aria-pressed', String(isActive));
    const check = child.querySelector('.check');
    if (check) check.style.opacity = isActive ? 1 : 0;
  }
}

function updateAccentHue(hue, previewEl, announce) {
  hue = clampHue(hue);
  currentHue = hue;
  document.documentElement.style.setProperty('--accent-h', String(hue));
  if (previewEl) {
    // Use current CSS vars to reflect accent; no fixed color here
    previewEl.style.background = 'var(--accent)';
  }
  if (announce) {
    // Optional: fire a custom event for live previews elsewhere
    window.dispatchEvent(new CustomEvent('accentchange', { detail: { hue } }));
  }
}

function clampHue(n) {
  if (!Number.isFinite(n)) return 210;
  // keep within [0, 359]
  n = Math.round(n);
  if (n < 0) n = 0;
  if (n > 359) n = 359;
  return n;
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- Accent Hue Persistence ---------- */
function readAccentHue() {
  try {
    const raw = localStorage.getItem(ACCENT_KEY);
    const val = Number(raw);
    return Number.isFinite(val) ? clampHue(val) : 210; // default matches themes.css
  } catch {
    return 210;
  }
}

function writeAccentHue(hue) {
  try {
    localStorage.setItem(ACCENT_KEY, String(clampHue(hue)));
  } catch {}
}
