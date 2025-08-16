// /public/settings/settings.js
// Handles Appearance controls: theme grid + accent hue.
// Navigation, tabs, and save/back orchestration belong in /public/settings/index.js.

import { THEMES, getTheme, setTheme } from '../css/theme.js';

/* ---------- Storage Keys ---------- */
export const ACCENT_KEY = 'app.accentHue';

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
}

export function getAppearanceState() {
  return { theme: selectedTheme, accentHue: currentHue };
}

export function applyAppearance(state) {
  if (state?.theme) {
    // Apply only (no persist)
    document.documentElement.setAttribute('data-theme', state.theme);
    selectedTheme = state.theme;
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
      for (const child of grid.children) {
        child.setAttribute('aria-pressed', 'false');
        const check = child.querySelector('.check');
        if (check) check.style.opacity = 0;
      }
      btn.setAttribute('aria-pressed', 'true');
      const check = btn.querySelector('.check');
      if (check) check.style.opacity = 1;

      // Apply immediately (non-persistent until Save)
      document.documentElement.setAttribute('data-theme', selectedTheme);

      if (typeof onChange === 'function') {
        onChange(getAppearanceState());
      }
    });

    grid.appendChild(btn);
  });
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
  const raw = localStorage.getItem(ACCENT_KEY);
  const val = Number(raw);
  return Number.isFinite(val) ? clampHue(val) : 210; // default matches themes.css
}

function writeAccentHue(hue) {
  localStorage.setItem(ACCENT_KEY, String(clampHue(hue)));
}
