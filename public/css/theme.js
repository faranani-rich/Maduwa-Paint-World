// /public/css/theme.js
const KEY = 'app.theme';
const DEFAULT = 'light';
export const THEMES = ['light','dark','midnight','forest','ocean','grape','sunflower','contrast'];

export function getTheme() {
  return localStorage.getItem(KEY) || DEFAULT;
}

export function setTheme(name) {
  if (!THEMES.includes(name)) name = DEFAULT;
  localStorage.setItem(KEY, name);
  document.documentElement.setAttribute('data-theme', name);
  // Announce to other tabs and listeners
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: name }}));
}

// Keep tabs/windows in sync
window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) {
    document.documentElement.setAttribute('data-theme', e.newValue);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: e.newValue }}));
  }
});

// Optional: expose for quick testing in console
window.AppTheme = { getTheme, setTheme, THEMES };
