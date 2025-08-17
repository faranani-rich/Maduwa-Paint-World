// /public/css/theme.js
// Theme + motion utilities (global, tiny, dependency-free)

const KEY = 'app.theme';
const DEFAULT = 'light';

// Extended theme list (tasteful, not loud)
export const THEMES = [
  'light','dark','midnight','forest','ocean','grape','sunflower','contrast',
  'slate','emerald','rose','copper'
];

// Optional global prefs (used by Settings > Accessibility)
const MOTION_KEY = 'app.motion';     // 'auto' | 'reduced' (default 'auto')
const SCALE_KEY  = 'app.fontScale';  // number (e.g., 1, 1.1, 1.25)

// ---------- Theme get/set ----------
export function getTheme() {
  try { return localStorage.getItem(KEY) || DEFAULT; } catch { return DEFAULT; }
}

export function setTheme(name) {
  if (!THEMES.includes(name)) name = DEFAULT;
  try { localStorage.setItem(KEY, name); } catch {}
  applyTheme(name);
  // Announce to other tabs and listeners
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: name }}));
}

// Apply theme to <html> and hint native control palette
function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Hint native UI palette for inputs/scrollbars, etc.
  // Treat dark-like themes accordingly:
  const darkLike = theme === 'dark' || theme === 'midnight' || theme === 'contrast';
  root.style.colorScheme = darkLike ? 'dark' : 'light';
}

// Keep tabs/windows in sync
window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) {
    applyTheme(e.newValue);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: e.newValue }}));
  }
  if (e.key === MOTION_KEY && e.newValue) {
    applyMotion(e.newValue);
    window.dispatchEvent(new CustomEvent('motionchange', { detail: { motion: e.newValue }}));
  }
  if (e.key === SCALE_KEY && e.newValue) {
    const v = Number(e.newValue);
    if (Number.isFinite(v) && v > 0) applyFontScale(v);
  }
});

// ---------- Motion (global) ----------
export function getMotion() {
  try { return localStorage.getItem(MOTION_KEY) || 'auto'; } catch { return 'auto'; }
}
export function setMotion(pref /* 'auto' | 'reduced' */) {
  const v = (pref === 'reduced') ? 'reduced' : 'auto';
  try { localStorage.setItem(MOTION_KEY, v); } catch {}
  applyMotion(v);
  window.dispatchEvent(new CustomEvent('motionchange', { detail: { motion: v }}));
}
function applyMotion(v = getMotion()) {
  document.documentElement.setAttribute('data-motion', v);
  // If reduced, also disable tilt runtime (below) if active
  if (v === 'reduced') disableTilt();
}

// ---------- Font scale (optional helper) ----------
export function applyFontScale(scale = 1) {
  const pct = Math.round(100 * (Number(scale) || 1));
  document.documentElement.style.fontSize = `${pct}%`;
}

// ---------- Tiny 3D tilt manager (opt-in) ----------
let _tiltEnabled = false;
let _tiltSelector = '.tilt';
let _lastRAF = 0;

function prefersReduced() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function handleMove(e) {
  // Debounce via rAF to keep it cheap
  if (_lastRAF) return;
  _lastRAF = requestAnimationFrame(() => {
    _lastRAF = 0;
    const els = document.querySelectorAll(_tiltSelector);
    if (!els.length) return;

    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;

      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;   // -0.5..0.5ish
      const dy = (e.clientY - cy) / r.height;

      // Gentle max tilt
      const max = 6; // degrees
      el.style.setProperty('--tilt-y', `${-dx * max}deg`);
      el.style.setProperty('--tilt-x', `${ dy * max}deg`);
    });
  });
}

export function enableTilt(selector = '.tilt') {
  _tiltSelector = selector || '.tilt';
  if (_tiltEnabled) return;

  // Respect reduced motion (system OR app)
  if (prefersReduced() || getMotion() === 'reduced') return;

  window.addEventListener('mousemove', handleMove, { passive: true });
  window.addEventListener('blur', disableTilt, { once: true });
  _tiltEnabled = true;
}

export function disableTilt() {
  if (!_tiltEnabled) return;
  window.removeEventListener('mousemove', handleMove);
  _tiltEnabled = false;
}

export function setTiltSelector(selector = '.tilt') {
  _tiltSelector = selector || '.tilt';
}

// Auto-disable tilt if user toggles system reduced motion while page is open
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener?.('change', () => {
    if (mq.matches) disableTilt();
  });
}

// ---------- Initial apply (safe even with your early bootstrap) ----------
applyTheme(getTheme());
applyMotion(getMotion());

// Optional: expose for quick testing in console
window.AppTheme = {
  getTheme, setTheme, THEMES,
  getMotion, setMotion,
  applyFontScale,
  enableTilt, disableTilt, setTiltSelector
};
