// /public/css/anime-widget.js
// Anime buddy widget using Lottie (if available) with fallback.
// LocalStorage settings:
//   app.animeOn     = "1" | "0"        (default "1")
//   app.animeMotion = "0".."100"       (default "60")
//   app.animeName   = "<file>.json"    (optional, force a specific animation)
//   app.animeSize   = number (px)      (default "140")

(function () {
  const ON_KEY     = 'app.animeOn';
  const MOTION_KEY = 'app.animeMotion';
  const NAME_KEY   = 'app.animeName';
  const SIZE_KEY   = 'app.animeSize';

  // All JSON files live in /asset/
  const DEFAULT_FILES = [
    'character-idle.json',
    'anime-eyes-blink.json',
    'chibi-dance.json',
    'scene-main.json',
    'anime-wave.json',
    'chibi-jump.json',
    'anime-heart.json',
    'background.json',
    'timing.json',
  ];

  const prefersReduced = () =>
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isOn = () => localStorage.getItem(ON_KEY) !== '0';

  function getMotion() {
    const v = parseInt(localStorage.getItem(MOTION_KEY) || '60', 10);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 60;
  }

  function getSize() {
    const v = parseInt(localStorage.getItem(SIZE_KEY) || '140', 10);
    return Number.isFinite(v) ? Math.max(60, Math.min(320, v)) : 140;
  }

  function pickAnimationURL() {
    const forced = (localStorage.getItem(NAME_KEY) || '').trim();
    const filename =
      forced && forced.endsWith('.json')
        ? forced
        : DEFAULT_FILES[Math.floor(Math.random() * DEFAULT_FILES.length)];
    // Always point to ../asset/
    return `../asset/${filename}`;
  }

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
    el.style.pointerEvents = 'auto';
    const dur = prefersReduced() ? 6 : Math.max(0.8, 4 - speed / 40);
    el.style.animation = `animeFloatY ${dur}s ease-in-out infinite`;
    target.appendChild(el);
    return () => el.remove();
  }

  function mountLottie(target, speed) {
    const size = getSize();
    const box = document.createElement('div');
    box.style.width = `${size}px`;
    box.style.height = `${size}px`;
    box.style.pointerEvents = 'auto';
    target.appendChild(box);

    const path = pickAnimationURL();
    const anim = window.lottie.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: true,
      autoplay: !prefersReduced(),
      path,
    });

    const spd = Math.max(0.2, Math.min(2.0, speed / 30));
    anim.setSpeed(spd);

    const vis = () => (document.hidden ? anim.pause() : anim.play());
    document.addEventListener('visibilitychange', vis);

    return () => {
      document.removeEventListener('visibilitychange', vis);
      try { anim.destroy(); } catch {}
      box.remove();
    };
  }

  function mount() {
    const dock = document.getElementById('animeDock');
    if (!dock) return () => {};

    dock.style.position = 'fixed';
    dock.style.right = '16px';
    dock.style.bottom = '16px';
    dock.style.zIndex = '999';
    dock.style.pointerEvents = 'none';

    if (!isOn()) { dock.innerHTML = ''; return () => {}; }

    const speed = getMotion();
    if (window.lottie) return mountLottie(dock, speed);
    return mountFallback(dock, speed);
  }

  window.ANIME_WIDGET = {
    mount,
    refresh() {
      if (window.__anime_unmount) window.__anime_unmount();
      window.__anime_unmount = mount();
    },
    setEnabled(on) {
      localStorage.setItem(ON_KEY, on ? '1' : '0');
      this.refresh();
    },
    setMotion(v) {
      localStorage.setItem(MOTION_KEY, String(v));
      this.refresh();
    },
    setName(filename) {
      localStorage.setItem(NAME_KEY, filename || '');
      this.refresh();
    },
    setSize(px) {
      localStorage.setItem(SIZE_KEY, String(px));
      this.refresh();
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.__anime_unmount = mount();
  });

  window.addEventListener('storage', (e) => {
    if ([ON_KEY, MOTION_KEY, NAME_KEY, SIZE_KEY].includes(e.key)) {
      window.ANIME_WIDGET.refresh();
    }
  });
})();
