// deviceShake.js
// Adds a "shake to hit" input for the bouncing logo. A physical shake — of the
// phone (accelerometer) or the desktop browser window (its on-screen position) —
// registers as a hit whose launch DIRECTION and FORCE come from the shake.
//
// Both detectors funnel into onShake() -> window.triggerShakeHit(dirX, dirY, force)
// exposed by spinningLogo.js. If that hook is absent (e.g. on a page without the
// game) every code path no-ops, so this file is safe to include anywhere.
(function () {
  'use strict';

  // ---- Tunables ----------------------------------------------------------
  var SHAKE_DEBOUNCE_MS = 220;     // min gap between emitted hits (one gesture ~= one hit)

  // Desktop window-shake
  var DESKTOP_SPEED_THRESHOLD = 6; // px/frame below this is treated as noise
  var DESKTOP_REVERSALS = 2;       // direction flips within the window to count as a shake
  var DESKTOP_WINDOW_MS = 400;     // reversals must accumulate within this span
  var DESKTOP_FORCE_FULL = 60;     // peak px/frame that maps to full force (1.0)

  // Mobile accelerometer (m/s^2, gravity removed)
  var SHAKE_THRESHOLD = 15;        // magnitude that counts as a shake
  var SHAKE_FORCE_FULL = 40;       // magnitude that maps to full force (1.0)
  var GRAVITY_ALPHA = 0.8;         // low-pass factor for the gravity estimate (fallback path)
  // ------------------------------------------------------------------------

  var DEBUG = /(?:^|[?&])shakedebug(?:&|=|$)/.test(location.search);

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // Shared emit path: debounce, then hand the shake to the game.
  var lastEmit = -Infinity;
  function onShake(dirX, dirY, force01, source, rawMag, now) {
    if (DEBUG) hudFlash(source, rawMag, force01);
    if (now - lastEmit < SHAKE_DEBOUNCE_MS) return;
    if (typeof window.triggerShakeHit !== 'function') return;
    lastEmit = now;
    window.triggerShakeHit(dirX, dirY, force01);
  }

  // ===== Desktop: shake the browser window ================================
  // window.screenX/Y report the OS window position. Grabbing the title bar and
  // shaking makes them oscillate; rapid sign reversals of that velocity = a shake.
  function startDesktopDetector() {
    var prevX = null, prevY = null;
    var lastSigTime = -Infinity;
    var reversals = 0, peakSpeed = 0;
    var lastSignX = 0, lastSignY = 0;
    var dirVx = 0, dirVy = 0;

    function frame(now) {
      var sx = window.screenX, sy = window.screenY;
      if (prevX !== null && (sx !== prevX || sy !== prevY)) {
        var vx = sx - prevX, vy = sy - prevY;
        var sp = Math.hypot(vx, vy);
        if (DEBUG) hudLive('desktop', vx, vy, sp);

        if (sp > DESKTOP_SPEED_THRESHOLD) {
          if (now - lastSigTime > DESKTOP_WINDOW_MS) { reversals = 0; peakSpeed = 0; }
          lastSigTime = now;
          peakSpeed = Math.max(peakSpeed, sp);
          dirVx = vx; dirVy = vy;

          var signX = Math.sign(vx), signY = Math.sign(vy);
          if ((signX !== 0 && lastSignX !== 0 && signX !== lastSignX) ||
              (signY !== 0 && lastSignY !== 0 && signY !== lastSignY)) {
            reversals++;
          }
          lastSignX = signX; lastSignY = signY;

          if (reversals >= DESKTOP_REVERSALS) {
            // +screenY is downward; logo +y is upward -> negate vy so a downward
            // fling sends the logo down.
            onShake(dirVx, -dirVy, clamp01(peakSpeed / DESKTOP_FORCE_FULL),
                    'desktop', peakSpeed, now);
            reversals = 0; peakSpeed = 0;
          }
        }
      }
      prevX = sx; prevY = sy;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ===== Mobile: shake the device ========================================
  var gravX = 0, gravY = 0;

  function remapAxes(ax, ay) {
    // Device axes rotate with screen orientation; rotate them back into screen
    // space so "shake left" is always screen-left. Signs are tunable on-device.
    var angle = 0;
    if (screen.orientation && typeof screen.orientation.angle === 'number') angle = screen.orientation.angle;
    else if (typeof window.orientation === 'number') angle = window.orientation;
    var rad = angle * Math.PI / 180;
    var c = Math.cos(rad), s = Math.sin(rad);
    return [ax * c + ay * s, -ax * s + ay * c];
  }

  function onDeviceMotion(e) {
    var ax, ay;
    var acc = e.acceleration;
    if (acc && acc.x !== null && acc.x !== undefined) {
      ax = acc.x; ay = acc.y;
    } else {
      var g = e.accelerationIncludingGravity;
      if (!g || g.x === null) return;
      // High-pass: track gravity with a low-pass filter, then subtract it out.
      gravX = GRAVITY_ALPHA * gravX + (1 - GRAVITY_ALPHA) * g.x;
      gravY = GRAVITY_ALPHA * gravY + (1 - GRAVITY_ALPHA) * g.y;
      ax = g.x - gravX; ay = g.y - gravY;
    }

    var r = remapAxes(ax, ay);
    var rx = r[0], ry = r[1];
    var mag = Math.hypot(rx, ry);
    var now = performance.now();
    if (DEBUG) hudLive('mobile', rx, ry, mag);

    if (mag > SHAKE_THRESHOLD) {
      // device +y is up, logo +y is up -> pass ry straight through.
      onShake(rx, ry, clamp01((mag - SHAKE_THRESHOLD) / (SHAKE_FORCE_FULL - SHAKE_THRESHOLD)),
              'mobile', mag, now);
    }
  }

  function attachMotion() {
    window.addEventListener('devicemotion', onDeviceMotion, { passive: true });
  }

  function startMobileDetector() {
    if (typeof window.DeviceMotionEvent === 'undefined') return;
    // iOS 13+ gates motion behind a permission that must be requested from a user
    // gesture. Piggyback the first tap so no extra UI is needed.
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      var requestOnce = function () {
        window.removeEventListener('pointerdown', requestOnce);
        window.removeEventListener('touchstart', requestOnce);
        DeviceMotionEvent.requestPermission().then(function (state) {
          if (state === 'granted') attachMotion();
        }).catch(function () { /* denied / dismissed — tap input still works */ });
      };
      window.addEventListener('pointerdown', requestOnce, { once: true });
      window.addEventListener('touchstart', requestOnce, { once: true });
    } else {
      attachMotion();
    }
  }

  // ===== Debug HUD (?shakedebug) =========================================
  var hud = null;
  function ensureHud() {
    if (hud) return hud;
    hud = document.createElement('div');
    hud.style.cssText = [
      'position:fixed', 'top:8px', 'left:8px', 'z-index:99999', 'pointer-events:none',
      'font:12px/1.4 monospace', 'color:#0f0', 'background:rgba(0,0,0,0.7)',
      'padding:6px 8px', 'border-radius:6px', 'white-space:pre', 'min-width:180px'
    ].join(';');
    document.body.appendChild(hud);
    return hud;
  }
  var hudState = { source: '-', x: 0, y: 0, mag: 0, force: 0, hits: 0, flash: 0 };
  function hudRender() {
    var el = ensureHud();
    var hot = (performance.now() - hudState.flash) < 150;
    el.style.borderLeft = hot ? '4px solid #ff0' : '4px solid transparent';
    el.textContent =
      'shake debug [' + hudState.source + ']\n' +
      'x: ' + hudState.x.toFixed(2) + '\n' +
      'y: ' + hudState.y.toFixed(2) + '\n' +
      'mag: ' + hudState.mag.toFixed(2) + '\n' +
      'force: ' + hudState.force.toFixed(2) + '\n' +
      'hits: ' + hudState.hits;
  }
  function hudLive(source, x, y, mag) {
    hudState.source = source; hudState.x = x; hudState.y = y; hudState.mag = mag;
    hudRender();
  }
  function hudFlash(source, mag, force) {
    hudState.source = source; hudState.mag = mag; hudState.force = force;
    hudState.hits++; hudState.flash = performance.now();
    hudRender();
  }

  // ===== Boot =============================================================
  function init() {
    startDesktopDetector();
    startMobileDetector();
    if (DEBUG) ensureHud();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
