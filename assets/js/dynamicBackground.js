
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

const FADE_MS = 750; // keep in sync with .bg-fade-overlay transition in style.css

// Running fades always finish (no snap); every transition is queued and plays in full.
let activeFade = null;   // { target, overlay, timer } or null
let fadeQueue = [];      // upcoming target backgrounds, in order

const MAX_QUEUE = 2; // cap pending fades so mashing can't build a long tail

function requestFade(bgEl, target) {
  // skip a request for the image we're already heading to
  let last = fadeQueue.length ? fadeQueue[fadeQueue.length - 1]
           : activeFade ? activeFade.target
           : null;
  if (target === last) return;

  fadeQueue.push(target);
  while (fadeQueue.length > MAX_QUEUE) fadeQueue.shift();  // drop oldest pending

  if (!activeFade) startNextFade(bgEl);
}

function startNextFade(bgEl) {
  let target = fadeQueue.shift();

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

  if (fadeQueue.length) startNextFade(bgEl);
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
