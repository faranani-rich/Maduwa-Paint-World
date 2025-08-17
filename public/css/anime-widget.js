// /public/css/anime-widget.js
// Anime buddy widget using Lottie (if available) with fallback.
//
// LocalStorage keys:
//   app.animeOn     = "1" | "0"        (default "1")
//   app.animeMotion = "0".."100"       (default "60")
//   app.animeName   = "<file>.json"    (optional, force a specific animation)
//   app.animeSize   = number (px)      (default "140")

(function () {
  const ON_KEY     = 'app.animeOn';
  const MOTION_KEY = 'app.animeMotion';
  const NAME_KEY   = 'app.animeName';
  const SIZE_KEY   = 'app.animeSize';

  // All JSON files live in /public/assets/
  // Use a path that works from pages under /public (settings, projects, etc.)
  const ASSETS_BASE = '../assets/';

  // Only include valid Lottie files.
  const DEFAULT_FILES = [
    'character-idle.json',
    'anime-eyes-blink.json',
    'background.json',
    'anime-wave.json',
    'chibi-jump.json',
    'anime-heart.json',
    'timing.json'
  ];

  /* -------------------- Utilities -------------------- */
  const prefersReduced = () =>
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isOn = () => {
    try { return localStorage.getItem(ON_KEY) !== '0'; }
    catch { return true; }
  };

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function getMotion() {
    try {
      const v = parseInt(localStorage.getItem(MOTION_KEY) || '60', 10);
      return Number.isFinite(v) ? clamp(v, 0, 100) : 60;
    } catch {
      return 60;
    }
  }

  function getSize() {
    try {
      const v = parseInt(localStorage.getItem(SIZE_KEY) || '140', 10);
      return Number.isFinite(v) ? clamp(v, 60, 320) : 140;
    } catch {
      return 140;
    }
  }

  function pickAnimationURL() {
    let forced = '';
    try { forced = (localStorage.getItem(NAME_KEY) || '').trim(); } catch {}
    const filename =
      forced && forced.endsWith('.json')
        ? forced
        : DEFAULT_FILES[Math.floor(Math.random() * DEFAULT_FILES.length)];
    return ASSETS_BASE + filename;
  }

  /* -------------------- Safety CSS (once) -------------------- */
  function ensureSafetyStyles() {
    if (document.getElementById('animeSafetyCSS')) return;
    const style = document.createElement('style');
    style.id = 'animeSafetyCSS';
    style.textContent = `
      /* Buddy must never block UI */
      #animeDock, #animeDock * { pointer-events: none !important; }

      /* Keep behind sticky bars/buttons (avoid z-index arms race) */
      #animeDock {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 1; /* intentionally low */
        width: var(--anime-size, 140px);
        height: var(--anime-size, 140px);
      }
    `;
    document.head.appendChild(style);
  }

  /* -------------------- Fallback animation -------------------- */
  function ensureKeyframes() {
    if (document.getElementById('animeFallbackKF')) return;
    const style = document.createElement('style');
    style.id = 'animeFallbackKF';
    style.textContent = `
      @keyframes animeFloatY {
        0% { transform: translateY(0) }
        50% { transform: translateY(-10px) }
        100% { transform: translateY(0) }
      }
    `;
    document.head.appendChild(style);
  }

  function mountFallback(target, speed) {
    ensureKeyframes();
    const el = document.createElement('div');
    el.textContent = '(* ^ ω ^)ノﾞ';
    el.style.fontSize = '28px';
    el.style.userSelect = 'none';
    el.style.willChange = 'transform';
    // pointer-events remain NONE via safety CSS
    const dur = prefersReduced() ? 6 : Math.max(0.8, 4 - speed / 40);
    el.style.animation = `animeFloatY ${dur}s ease-in-out infinite`;
    target.appendChild(el);
    return () => el.remove();
  }

  /* -------------------- Lottie animation -------------------- */
  function mountLottie(target, speed) {
    const size = getSize();
    const box = document.createElement('div');
    box.style.width = `${size}px`;
    box.style.height = `${size}px`;
    // pointer-events remain NONE via safety CSS
    target.appendChild(box);

    const path = pickAnimationURL();
    let anim = null;

    try {
      anim = window.lottie.loadAnimation({
        container: box,
        renderer: 'svg',
        loop: true,
        autoplay: !prefersReduced(),
        path,
      });
    } catch (err) {
      console.warn('[anime-widget] Lottie failed, using fallback:', err);
      box.remove();
      return mountFallback(target, speed);
    }

    const spd = clamp(speed / 30, 0.2, 2.0);
    try { anim.setSpeed(spd); } catch {}

    const vis = () => (document.hidden ? anim.pause() : anim.play());
    document.addEventListener('visibilitychange', vis);

    return () => {
      document.removeEventListener('visibilitychange', vis);
      try { anim.destroy(); } catch {}
      box.remove();
    };
  }

  /* -------------------- Mount / Unmount -------------------- */
  function getOrCreateDock() {
    let dock = document.getElementById('animeDock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'animeDock';
      dock.setAttribute('aria-hidden', 'true'); // decorative only
      document.body.appendChild(dock);
    }
    return dock;
  }

  function setGap(enabled) {
    // Reserve space at the bottom so the buddy doesn't sit over the Save button.
    const px = enabled ? (getSize() + 24) : 0;
    document.documentElement.style.setProperty('--anime-gap', px + 'px');
    // If you want this to affect the layout, add in your CSS:
    // body { padding-bottom: var(--anime-gap, 0px); }
  }

  function mount() {
    ensureSafetyStyles();
    const dock = getOrCreateDock();

    // Ensure sizing CSS var always matches current size
    document.documentElement.style.setProperty('--anime-size', getSize() + 'px');

    if (!isOn()) {
      setGap(false);
      dock.innerHTML = '';
      return () => {};
    }

    setGap(true);

    const speed = getMotion();
    if (window.lottie && typeof window.lottie.loadAnimation === 'function') {
      return mountLottie(dock, speed);
    }
    return mountFallback(dock, speed);
  }

  /* -------------------- Public API -------------------- */
  window.ANIME_WIDGET = {
    mount,
    refresh() {
      if (window.__anime_unmount) window.__anime_unmount();
      window.__anime_unmount = mount();
    },
    setEnabled(on) {
      try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch {}
      this.refresh();
    },
    setMotion(v) {
      try { localStorage.setItem(MOTION_KEY, String(v)); } catch {}
      this.refresh();
    },
    setName(filename) {
      try { localStorage.setItem(NAME_KEY, filename || ''); } catch {}
      this.refresh();
    },
    setSize(px) {
      try { localStorage.setItem(SIZE_KEY, String(px)); } catch {}
      this.refresh();
    },
  };

  /* -------------------- Boot & Live updates -------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    window.__anime_unmount = mount();
  });

  window.addEventListener('storage', (e) => {
    if ([ON_KEY, MOTION_KEY, NAME_KEY, SIZE_KEY].includes(e.key)) {
      window.ANIME_WIDGET.refresh();
    }
  });
})();
