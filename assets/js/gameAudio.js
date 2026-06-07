// Synthesized game SFX for the spinning-logo mini-game.
// No audio assets: every sound is generated live via the Web Audio API, so it
// loads instantly and never blocks. The AudioContext is created lazily on the
// first play() — which always happens inside a click handler — so the browser
// autoplay policy is satisfied without any permission prompt.
//
// The mute button is hidden until reveal() is called (on the first logo spin),
// and the muted state persists across visits via localStorage.

(function () {
  const MUTE_KEY = 'game-muted';

  let ctx = null;       // AudioContext, created on first sound
  let master = null;    // master gain → compressor → destination
  let muted = false;
  let revealed = false;
  let btn = null;

  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    // Compressor tames clipping when many short sounds overlap on rapid clicks
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  // A single enveloped oscillator tone. freqEnd lets the pitch glide.
  function tone(opts) {
    if (!master) return;
    const t = ctx.currentTime;
    const {
      freq, freqEnd = freq, type = 'square',
      dur = 0.12, gain = 0.3, delay = 0,
    } = opts;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t + delay);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + delay + dur);
    }

    // Quick attack, exponential decay — punchy and arcade-ish
    g.gain.setValueAtTime(0.0001, t + delay);
    g.gain.exponentialRampToValueAtTime(gain, t + delay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t + delay);
    osc.stop(t + delay + dur + 0.02);
  }

  // Short burst of white noise — used for impacts/zaps.
  function noise(opts) {
    if (!master) return;
    const t = ctx.currentTime;
    const { dur = 0.12, gain = 0.2, delay = 0, hp = 0, lp = 20000 } = opts;

    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = (hp + lp) / 2;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);

    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t + delay);
    src.stop(t + delay + dur);
  }

  // Sound definitions, keyed by event name.
  const SOUNDS = {
    // Normal build-up click on the resting logo
    click: () => tone({ freq: 440, freqEnd: 660, type: 'square', dur: 0.07, gain: 0.18 }),
    // Logo launches into flight
    spin: () => {
      tone({ freq: 300, freqEnd: 900, type: 'sawtooth', dur: 0.22, gain: 0.25 });
      noise({ dur: 0.18, gain: 0.08, hp: 800, lp: 6000 });
    },
    // Mid-flight click that kicks the logo onward
    kick: () => tone({ freq: 660, freqEnd: 1100, type: 'square', dur: 0.08, gain: 0.2 }),
    // Wall bounce
    bounce: () => tone({ freq: 180, freqEnd: 90, type: 'triangle', dur: 0.12, gain: 0.28 }),
    // Confetti milestone sparkle
    confetti: () => {
      tone({ freq: 880, type: 'sine', dur: 0.08, gain: 0.12 });
      tone({ freq: 1320, type: 'sine', dur: 0.1, gain: 0.1, delay: 0.06 });
    },
    // Boss appears
    bossSpawn: () => {
      tone({ freq: 220, freqEnd: 70, type: 'sawtooth', dur: 0.6, gain: 0.3 });
      tone({ freq: 110, freqEnd: 55, type: 'square', dur: 0.6, gain: 0.18 });
      noise({ dur: 0.5, gain: 0.12, hp: 100, lp: 1200 });
    },
    // Logo intercepts a red orb
    intercept: () => {
      tone({ freq: 1200, freqEnd: 300, type: 'sawtooth', dur: 0.1, gain: 0.22 });
      noise({ dur: 0.09, gain: 0.15, hp: 1500, lp: 8000 });
    },
    // A red orb damages the boss
    bossHit: () => {
      tone({ freq: 140, freqEnd: 50, type: 'sine', dur: 0.18, gain: 0.32 });
      noise({ dur: 0.12, gain: 0.18, hp: 80, lp: 900 });
    },
    // Boss defeated — victory arpeggio
    bossDeath: () => {
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((f, i) => tone({
        freq: f, type: 'square', dur: 0.18, gain: 0.22, delay: i * 0.11,
      }));
      noise({ dur: 0.5, gain: 0.1, hp: 500, lp: 9000, delay: 0.1 });
    },
  };

  function play(name) {
    if (muted) return;
    const def = SOUNDS[name];
    if (!def) return;
    if (!ensureContext()) return;
    try { def(); } catch (e) {}
  }

  function updateButton() {
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    updateButton();
    // Toggling is a user gesture — warm up the context so the first post-unmute
    // sound has no startup latency
    if (!muted) ensureContext();
  }

  // Shows the mute button. Called once, when the game first starts.
  function reveal() {
    if (revealed) return;
    revealed = true;
    if (!btn) btn = document.querySelector('.mute-button');
    if (btn) {
      updateButton();
      btn.classList.remove('mute-hidden');
    }
  }

  // Resolve the button on load so its initial glyph matches stored state
  document.addEventListener('DOMContentLoaded', () => {
    btn = document.querySelector('.mute-button');
    updateButton();
  });

  window.gameSound = { play, toggleMute, reveal, isMuted: () => muted };
})();

// Global handler for the button's inline onclick
function toggleGameSound() {
  if (window.gameSound) window.gameSound.toggleMute();
}
