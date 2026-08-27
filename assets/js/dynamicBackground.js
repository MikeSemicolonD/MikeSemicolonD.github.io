
// Background mode for the home page: 'auto' (time-of-day), 'light', or 'dark'.
// Default is 'auto' — only persists a manual override via localStorage.

const BG_KEY = 'bg-mode';
const BG_DAY = 'url(assets/images/lighthouse.jpeg)';
const BG_NIGHT = 'url(assets/images/lake.jpeg)';

function isDaytime() {
  const hour = new Date().getHours();
  return hour > 5 && hour < 18;
}

function getThemeMode() {
  let stored = null;
  try { stored = localStorage.getItem(BG_KEY); } catch (e) {}
  return (stored === 'light' || stored === 'dark') ? stored : 'auto';
}

function applyTheme(mode) {
  let bg;
  if (mode === 'light')      bg = BG_DAY;
  else if (mode === 'dark')  bg = BG_NIGHT;
  else                       bg = isDaytime() ? BG_DAY : BG_NIGHT;

  let bgEl = document.getElementById('background');
  if (bgEl) {
    let current = bgEl.style.backgroundImage;
    if (!current) {
      // Initial paint — no transition
      bgEl.style.backgroundImage = bg;
    } else if (current !== bg) {
      requestFade(bgEl, bg);
    }
  }

  let btn = document.querySelector('.theme-button');
  if (btn) {
    btn.textContent = mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🕐';
    btn.dataset.mode = mode;
  }
}

// Crossfade duration — keep in sync with .bg-fade-overlay's transition in style.css
const FADE_MS = 750;

// A running fade always finishes (never interrupted, so no snap-back flicker).
// While one runs, the latest requested target is parked in a single pending slot;
// rapid clicks just overwrite it, so the queue collapses to at most one follow-up.
let activeFade = null;   // { target, overlay, timer } or null
let pendingBg = null;    // latest desired background while a fade is in flight

function requestFade(bgEl, target) {
  if (activeFade) {
    // A fade is already running — coalesce: remember only the latest target.
    pendingBg = target;
    return;
  }
  startFade(bgEl, target);
}

function startFade(bgEl, target) {
  let overlay = document.createElement('div');
  overlay.className = 'bg-fade-overlay';
  overlay.style.backgroundImage = target;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('bg-fade-show'));

  let timer = setTimeout(() => finishFade(bgEl), FADE_MS);
  activeFade = { target, overlay, timer };
}

function finishFade(bgEl) {
  if (!activeFade) return;

  bgEl.style.backgroundImage = activeFade.target;
  activeFade.overlay.remove();
  activeFade = null;

  // Chain to the latest pending target, unless it's already what we're showing.
  if (pendingBg !== null) {
    let next = pendingBg;
    pendingBg = null;
    if (next !== bgEl.style.backgroundImage) {
      startFade(bgEl, next);
    }
  }
}

function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const current = getThemeMode();
  const next = order[(order.indexOf(current) + 1) % order.length];
  try {
    if (next === 'auto') localStorage.removeItem(BG_KEY);
    else                 localStorage.setItem(BG_KEY, next);
  } catch (e) {}
  applyTheme(next);
}

applyTheme(getThemeMode());
