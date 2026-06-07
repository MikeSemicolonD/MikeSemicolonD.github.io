
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
      crossfadeBg(bgEl, bg);
    }
  }

  let btn = document.querySelector('.theme-button');
  if (btn) {
    btn.textContent = mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🕐';
    btn.dataset.mode = mode;
  }
}

function crossfadeBg(bgEl, newBg) {
  // Drop any in-progress overlay so we don't stack fades on rapid clicks
  document.querySelectorAll('.bg-fade-overlay').forEach(o => o.remove());

  let overlay = document.createElement('div');
  overlay.className = 'bg-fade-overlay';
  overlay.style.backgroundImage = newBg;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('bg-fade-show'));

  setTimeout(() => {
    bgEl.style.backgroundImage = newBg;
    overlay.remove();
  }, 750);
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
