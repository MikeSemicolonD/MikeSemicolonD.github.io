
var timeoutId = undefined;
const rotAmount = 360;

var totalRot = 0;
var clicks = 0;

var hit = 0;

var maxSpeed = 10;

var dSpeed = (1 / 6);

var speed = 0;
var x = 0, y = 0;
var xDir = 0, yDir = 0;
var screenWidth = 0, screenHeight = 0;

var imgWidth = 0, imgHeight = 0;

// How far the logo's resting center sits below the viewport's vertical center.
// On landscape/short viewports the logo stacks under the welcome text, well below
// center, so the bounce window must be anchored to the viewport (where the boss
// lives at top:50%) instead of being symmetric around the logo's rest position.
var restOffsetY = 0;

var logoElement;

var throwLogoClickThreshold = 8;
var centerThreshold = 10;
var returnOnMaxHit = 9;

// Captured when the logo enters its homing phase so rotation can ease back to original orientation
var homeStartRot = 0;
var homeTargetRot = 0;
var homeStartDist = 0;

// Big background click counter — only fades in when the user is within BIG_FADE_WINDOW clicks of spin-off
// BigInt so even autoclicker-level counts never overflow or lose precision
var bigCount = 0n;
var bigOpacity = 0;
const BIG_FADE_WINDOW = 3;
const BIG_SCI_LENGTH = 16;
var bigCountElement = null;

function formatBigCount(n)
{
  let s = n.toString();
  if (s.length < BIG_SCI_LENGTH) return s;
  let mantissa = s[0] + '.' + s.substring(1, 3);
  return `${mantissa}e+${s.length - 1}`;
}

function renderBigCount()
{
  if (!bigCountElement) bigCountElement = document.getElementById('big-count');
  if (!bigCountElement) return;
  bigCountElement.textContent = formatBigCount(bigCount);
  bigCountElement.style.opacity = bigOpacity;
}

const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff9900', '#ffffff'];
const CONFETTI_COUNT = 256;
const CONFETTI_BURST_COUNT = 100;

function triggerConfetti()
{
  if (window.gameSound) window.gameSound.play('confetti');

  // Build into a fragment so all pieces hit the DOM in a single reflow
  let frag = document.createDocumentFragment();
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    let piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = (Math.random() * 100) + 'vw';
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = (Math.random() * 0.4) + 's';
    piece.style.animationDuration = (2 + Math.random() * 1.8) + 's';
    piece.style.setProperty('--drift', ((Math.random() * 300) - 150) + 'px');
    piece.style.setProperty('--rot', ((Math.random() * 720) + 360) * (Math.random() < 0.5 ? -1 : 1) + 'deg');
    frag.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
  document.body.appendChild(frag);
}

function burstConfettiFromCenter()
{
  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let frag = document.createDocumentFragment();
  for (let i = 0; i < CONFETTI_BURST_COUNT; i++) {
    let p = document.createElement('div');
    p.className = 'confetti-burst-piece';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

    let angle = Math.random() * Math.PI * 2;
    let mag = 200 + Math.random() * 350;
    let dx = Math.cos(angle) * mag;
    let dy = Math.sin(angle) * mag + 250; // gravity bias so it falls after the burst
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    p.style.setProperty('--rot', ((Math.random() * 720) + 360) * (Math.random() < 0.5 ? -1 : 1) + 'deg');
    p.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
    frag.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
  document.body.appendChild(frag);
}

// Measured at load/resize so the logo stops at the top of the footer instead of an arbitrary buffer
var bottomBuffer = 60;

window.onload = window.onresize = function (event) {
  //Half the value so we can better use it without division on the hot path
	screenWidth = window.innerWidth/2
	screenHeight = window.innerHeight/2

  let footer = document.querySelector('.nav-footer');
  if (footer) bottomBuffer = footer.offsetHeight;

  // The logo scales with viewport height on short/landscape screens, so its
  // cached half-size is stale after a resize/rotation. Re-measure directly so
  // a mid-flight rotation doesn't leave the hitbox at 0.
  let logoImg = document.querySelector('.logo.profile');
  if (logoImg && logoImg.clientWidth) {
    imgWidth = logoImg.clientWidth / 2;
    imgHeight = logoImg.clientHeight / 2;
  } else {
    imgWidth = 0;
    imgHeight = 0;
  }

  // Measure where the logo rests relative to the viewport center. The container's
  // rect already includes any active flight offset (bottom: y px raises it), so
  // add y back to recover the true rest center.
  let container = document.querySelector('.logo-shadow-container');
  if (container) {
    let cr = container.getBoundingClientRect();
    let restCenterY = cr.top + cr.height / 2 + y;
    restOffsetY = restCenterY - window.innerHeight / 2;
  } else {
    restOffsetY = 0;
  }

  // Less buffer on short viewports so the smaller play area isn't eaten up
  borderPadding = window.innerHeight < 600 ? 20 : 50;
};

// Extends the logo's effective click hitbox beyond its visible circle, so it's
// easier to catch when bouncing fast. Clicks on real interactive elements pass through.
const LOGO_CLICK_MARGIN = 40;
document.addEventListener('mousedown', function(e) {
  if (e.target.closest('a, button, input, select, textarea, label')) return;
  let logo = (logoElement && logoElement.children[0]) || document.querySelector('.logo.profile');
  if (!logo) return;
  let r = logo.getBoundingClientRect();
  let cx = r.left + r.width / 2;
  let cy = r.top + r.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  let hitR = Math.min(r.width, r.height) / 2 + LOGO_CLICK_MARGIN;
  if (dx*dx + dy*dy < hitR * hitR) {
    e.preventDefault();
    triggerSpin(logo);
  }
});

// External input entry point (see deviceShake.js): a physical shake registers as a
// hit whose launch direction/force come from the shake instead of being random.
// dirX/dirY: shake direction vector (any scale). force: ~[0,1] normalized strength.
window.triggerShakeHit = function (dirX, dirY, force) {
  let logo = (logoElement && logoElement.children[0]) || document.querySelector('.logo.profile');
  if (!logo) return;
  triggerSpin(logo, { dirX: dirX, dirY: dirY, force: force });
};

// Clamp helper for force->speed mapping
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// Lowest launch speed a (weak) shake can produce, so a gentle nudge still moves
var minLaunchSpeed = 4;

// Resolves an external shake override into xDir/yDir/speed. Returns true if applied.
// override = { dirX, dirY, force }; force is an abstract magnitude normalized by the caller.
function applyShakeOverride(override)
{
  if (!override) return false;
  let len = Math.hypot(override.dirX, override.dirY);
  if (len === 0) return false;
  xDir = override.dirX / len;
  yDir = override.dirY / len;
  // force is delivered pre-normalized to ~[0,1]; map onto [minLaunchSpeed, maxSpeed]
  let f = clamp(override.force, 0, 1);
  speed = clamp(minLaunchSpeed + f * (maxSpeed - minLaunchSpeed), minLaunchSpeed, maxSpeed);
  return true;
}

// Triggered from the logo. `override` (optional) carries a shake's direction + force;
// when absent the launch direction is random as before.
async function triggerSpin (element, override)
{
  // First interaction starts the game — reveal the sound toggle from here on
  if (window.gameSound) window.gameSound.reveal();

  bigCount++;

  if (bigCount === BOSS_TRIGGER_COUNT) spawnBoss();
  if (!bossActive && speed !== 0 && bigCount % 10n === 0n) triggerConfetti();

  // Mid-flight click: kick the logo so it keeps flying
  if (speed !== 0)
  {
    if (window.gameSound) window.gameSound.play('kick');

    // Opacity stays at its launched value — don't bump during flight
    renderBigCount();

    totalRot += rotAmount;
    element.style.transform = `rotate(${totalRot}deg)`;

    hit = 0;
    speed = maxSpeed;

    if (!applyShakeOverride(override)) {
      let rand = Math.random();
      xDir = (1 - rand);
      yDir = (1 - xDir);

      // Randomize sign so the kick can go any of the four diagonals
      if (Math.random() < 0.5) xDir *= -1;
      if (Math.random() < 0.5) yDir *= -1;
    }

    return;
  }

  // Because the logo is housed in a 'shadow' container
  logoElement = element.parentElement;

  totalRot += rotAmount;
  clicks++;

  // Fade in the big number only when within BIG_FADE_WINDOW clicks of spin-off
  let fadeStart = throwLogoClickThreshold - BIG_FADE_WINDOW;
  if (clicks >= fadeStart) {
    bigOpacity = Math.min(1, (clicks - fadeStart + 1) / BIG_FADE_WINDOW);
  }
  renderBigCount();

  if (imgHeight === 0 || imgWidth === 0)
  {
    //Half the value so we can better use it without division on the hot path
    imgWidth = element.clientWidth/2;
    imgHeight = element.clientHeight/2;
  }

  element.style.transform = `rotate(${totalRot}deg)`;

  clearTimeout(timeoutId);

  //Send the logo spinning and bounce a few times before returning to the center on the last bounce.
  //In boss mode, a single click relaunches — no build-up needed when the logo is at rest.
  let launchThreshold = bossActive ? 1 : throwLogoClickThreshold;
  if (clicks >= launchThreshold)
  {
    if (window.gameSound) window.gameSound.play('spin');

    speed = maxSpeed;

    dSpeed = (1 / (returnOnMaxHit+1));

    if (!applyShakeOverride(override)) {
      //Pick a random direction and go off at a constant speed
      let rand = Math.random();

      xDir = (1 - rand);
      yDir = (1 - xDir);
    }

    if (!bossActive) {
      // Reset to the natural rest position only outside boss mode.
      // In boss mode, launch from wherever the logo last stopped.
      x = 0;
      y = 0;
    }

    update();
  }else{
    if (window.gameSound) window.gameSound.play('click');

    timeoutId = setTimeout(() => {
      resetLogoRot(element);
    }, 3500)
  }
}

// Buffer so the logo doesn't visibly clip into the navbar/footer area when bouncing
var borderPadding = 50;

//Check for border collision
function checkHitBox()
{
	
  if (hit >= returnOnMaxHit &&
    (x <= centerThreshold && x >= -centerThreshold) &&
    (y <= centerThreshold && y >= -centerThreshold))
	{
		speed = 0;
		return;
  }
  
  if (((x+imgWidth+(borderPadding*1.1)) > screenWidth && xDir > 0) || ((x-imgWidth) < -screenWidth && xDir < 0)) {
      xDir *= -1;
      hitBounds();
      return;
  }
        
  // Vertical caps are shifted by restOffsetY so the play area tracks the viewport
  // (top edge reaches near the top, bottom edge stops at the footer) regardless of
  // where the logo rests in the page layout.
  if (((y+imgHeight+borderPadding) > screenHeight + restOffsetY && yDir > 0) || ((y-imgHeight) < -(screenHeight-bottomBuffer) + restOffsetY && yDir < 0)) {
      yDir *= -1;
      hitBounds();
      return;
  }
}

function hitBounds()
{
  if (window.gameSound) window.gameSound.play('bounce');

	hit++;

  // Spin ~180° on every bounce, with a little randomness so it doesn't feel mechanical
  totalRot += 180 + ((Math.random() * 120) - 60);
  logoElement.children[0].style.transform = `rotate(${totalRot}deg)`;

  if (hit >= returnOnMaxHit)
  {
    if (bossActive) {
      // During boss fight: stop where we landed instead of returning to center
      speed = 0;
      return;
    }

    //Set direction so it speed towards the center (x = 0, y = 0)
    xDir = -(x/screenWidth)
    yDir = -(y/screenHeight)

    // Cap homing speed so a gentle decay doesn't rocket back to center
    speed = Math.min(speed, maxSpeed * 0.4);

    // Snap target to nearest full rotation so easing lands at original orientation
    homeStartRot = totalRot;
    homeTargetRot = Math.round(totalRot / 360) * 360;
    homeStartDist = Math.sqrt(x*x + y*y);
  }
  else{
    // Multiplicative random decay — gentler than subtraction, gives "on ice" feel with variance
    speed *= 0.90 + (Math.random() * 0.08);
  }
}

// Update position every 5 ms
var tickRate = 5;

function update()
{
  setTimeout(() => {
    if (speed !== 0) {

      //Move the logo (timeScale enables hit-stop slow-mo during boss fight)
      x += (speed * xDir * timeScale);
      y += (speed * yDir * timeScale);

      logoElement.style.position = "relative";
      logoElement.style.bottom = `${y}px`;
      logoElement.style.left = `${x}px`;

      // While homing, ease rotation back toward original orientation based on distance to center.
      // Use sqrt(2)*centerThreshold so progress reaches 1 before the square centerThreshold check ends the loop.
      if (hit >= returnOnMaxHit && homeStartDist > 0)
      {
        let dist = Math.sqrt(x*x + y*y);
        let effThreshold = Math.SQRT2 * centerThreshold;
        let denom = Math.max(1, homeStartDist - effThreshold);
        let progress = Math.min(1, Math.max(0, (homeStartDist - dist) / denom));
        totalRot = homeStartRot + (homeTargetRot - homeStartRot) * progress;
        logoElement.children[0].style.transform = `rotate(${totalRot}deg)`;
      }

      //Check for collision
      checkHitBox();

      update();
    } else {
      if (!bossActive) {
        // Snap back to natural position and sync rotation to a multiple of 360
        // (visually equal to 0, so CSS transition doesn't animate a spin-back)
        logoElement.style.position = "unset";
        totalRot = homeTargetRot;
        // Outside boss mode, the count fades away when the spin-off counter resets
        bigOpacity = 0;
      }
      // In boss mode: leave position, rotation, and the score visible
      hit = 0;
      clicks = 0;
      homeStartDist = 0;
      renderBigCount();
    }

  }, tickRate)
}

function resetLogoRot(element) {
  // Reset it's rotation based on the amount of times it's rotated
  totalRot = 0;
  clicks = 0;
  bigOpacity = 0;
  element.style.transform = "rotate(" + totalRot + "deg)";
  renderBigCount();
}

// === Boss orb mini-game ===
// Triggers at BOSS_TRIGGER_COUNT clicks: a glowing orb appears center-screen with a healthbar,
// red orbs stream in from left/right toward it. The bouncing logo intercepts red orbs;
// any orb that reaches the center damages the boss. When the boss dies, everything resets.
const BOSS_TRIGGER_COUNT = 50n;
const BOSS_MAX_HEALTH = 10;
const RED_ORB_INITIAL_INTERVAL = 1200;
const RED_ORB_MIN_INTERVAL = 150;
const RED_ORB_INTERVAL_DECAY = 0.96; // each spawn shortens the wait by 4%
const RED_ORB_SPEED = 2.5;
const RED_ORB_RADIUS = 12;
const BOSS_ORB_RADIUS = 50;

// Boss orbit kicks in after this many logo intercepts in a single fight
const BOSS_MOVE_TRIGGER = 25;
const BOSS_ORBIT_RADIUS = 175;
const BOSS_ORBIT_SPEED = 0.0025; // radians per tick
// When the orbit starts, the radius eases out from 0 → BOSS_ORBIT_RADIUS so the
// boss spirals out of the center instead of snapping to the orbit edge
const BOSS_ORBIT_RAMP = 0.04; // per tick — fraction of remaining radius closed

// Slow-mo hit-stop on every logo intercept — drops to TIMESCALE_HIT then ramps back to 1
const TIMESCALE_HIT = 0.15;
const TIMESCALE_RECOVER = 0.25; // per boss tick (16ms)

var bossActive = false;
var bossHealth = 0;
var bossOrbEl = null;
var bossBarFillEl = null;
var redOrbs = [];
var redOrbsSpawnedThisFight = 0;
var bossSpawnTimer = null;
var bossTickTimer = null;
var bossOrbsHitByLogo = 0;
var bossMoving = false;
var bossAngle = 0;
var bossOrbitRadius = 0; // eases up to BOSS_ORBIT_RADIUS once the orbit begins
var timeScale = 1;

function spawnBoss()
{
  if (bossActive) return;
  if (window.gameSound) window.gameSound.play('bossSpawn');
  bossActive = true;
  bossHealth = BOSS_MAX_HEALTH;

  bossOrbEl = document.createElement('div');
  bossOrbEl.className = 'boss-orb';
  document.body.appendChild(bossOrbEl);

  let bar = document.createElement('div');
  bar.className = 'boss-healthbar';
  let fill = document.createElement('div');
  fill.className = 'boss-healthbar-fill';
  bar.appendChild(fill);
  document.body.appendChild(bar);
  bossBarFillEl = fill;

  // Trigger entrance animation on next frame (after initial styles apply)
  requestAnimationFrame(() => {
    if (bossOrbEl) bossOrbEl.classList.add('boss-shown');
    if (bar) bar.classList.add('boss-shown');
  });

  burstConfettiFromCenter();

  redOrbsSpawnedThisFight = 0;
  scheduleNextRedOrb();
  bossTickTimer = setInterval(updateBoss, 16);
}

function scheduleNextRedOrb()
{
  if (!bossActive) return;
  let interval = Math.max(
    RED_ORB_MIN_INTERVAL,
    RED_ORB_INITIAL_INTERVAL * Math.pow(RED_ORB_INTERVAL_DECAY, redOrbsSpawnedThisFight)
  );
  bossSpawnTimer = setTimeout(() => {
    spawnRedOrb();
    redOrbsSpawnedThisFight++;
    scheduleNextRedOrb();
  }, interval);
}

function spawnRedOrb()
{
  if (!bossActive) return;
  let fromLeft = Math.random() < 0.5;
  let centerX = window.innerWidth / 2;
  let centerY = window.innerHeight / 2;
  let startX = fromLeft ? -30 : window.innerWidth + 30;
  let startY = centerY + (Math.random() - 0.5) * window.innerHeight * 0.6;

  // Initial heading: toward center but skewed by up to ±80° so the path arcs widely
  let dx = centerX - startX;
  let dy = centerY - startY;
  let baseAngle = Math.atan2(dy, dx);
  let offset = (Math.random() - 0.5) * Math.PI * 0.9;
  let angle = baseAngle + offset;
  let speed = RED_ORB_SPEED * (0.7 + Math.random() * 0.6);

  // ~half of orbs wobble on a sine perpendicular to their motion; the rest go smoothly
  let wobbleAmp = Math.random() < 0.5 ? 0 : (0.6 + Math.random() * 2.8);

  let el = document.createElement('div');
  el.className = 'red-orb';
  el.style.left = startX + 'px';
  el.style.top = startY + 'px';
  document.body.appendChild(el);

  redOrbs.push({
    el: el,
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed: speed,
    // Steering strength toward center per tick — lower = wider arc, higher = tighter curve
    homing: 0.02 + Math.random() * 0.14,
    wobbleAmp: wobbleAmp,
    wobbleFreq: 0.06 + Math.random() * 0.18,
    wobblePhase: Math.random() * Math.PI * 2,
  });
}

function placeBossOrb(cx, cy)
{
  if (bossOrbEl) {
    bossOrbEl.style.left = cx + 'px';
    bossOrbEl.style.top  = cy + 'px';
  }
  if (bossBarFillEl && bossBarFillEl.parentElement) {
    bossBarFillEl.parentElement.style.left = cx + 'px';
    bossBarFillEl.parentElement.style.top  = (cy - 90) + 'px';
  }
}

function updateBoss()
{
  if (!bossActive) return;

  // Recover from hit-stop slow-mo
  if (timeScale < 1) timeScale = Math.min(1, timeScale + TIMESCALE_RECOVER);

  // Boss position: stationary at viewport center until BOSS_MOVE_TRIGGER intercepts,
  // then orbits in a fixed-radius circle
  let centerX, centerY;
  if (bossMoving) {
    bossAngle += BOSS_ORBIT_SPEED * timeScale;
    // Ease the radius out from the center so the orbit spirals in smoothly
    bossOrbitRadius += (BOSS_ORBIT_RADIUS - bossOrbitRadius) * BOSS_ORBIT_RAMP * timeScale;
    centerX = window.innerWidth / 2 + bossOrbitRadius * Math.cos(bossAngle);
    centerY = window.innerHeight / 2 + bossOrbitRadius * Math.sin(bossAngle);
  } else {
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }
  placeBossOrb(centerX, centerY);

  // Logo position (for intercept collision)
  let logoRect = null;
  let logo = logoElement || document.querySelector('.logo-shadow-container');
  if (logo) {
    let r = logo.getBoundingClientRect();
    logoRect = {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      r: Math.min(r.width, r.height) / 2,
    };
  }

  let bossHitR2 = (BOSS_ORB_RADIUS + RED_ORB_RADIUS) ** 2;

  for (let i = redOrbs.length - 1; i >= 0; i--) {
    let orb = redOrbs[i];

    // Steer current velocity toward the boss's current position for a curved approach
    let toCx = centerX - orb.x;
    let toCy = centerY - orb.y;
    let toCmag = Math.sqrt(toCx*toCx + toCy*toCy) || 1;
    let desiredVx = (toCx / toCmag) * orb.speed;
    let desiredVy = (toCy / toCmag) * orb.speed;
    orb.vx += (desiredVx - orb.vx) * orb.homing * timeScale;
    orb.vy += (desiredVy - orb.vy) * orb.homing * timeScale;

    // Perpendicular sine wobble (some orbs have amp=0 and skip the effect)
    let wobbleX = 0, wobbleY = 0;
    if (orb.wobbleAmp > 0) {
      let vmag = Math.sqrt(orb.vx*orb.vx + orb.vy*orb.vy) || 1;
      let perpX = -orb.vy / vmag;
      let perpY =  orb.vx / vmag;
      let w = Math.sin(orb.wobblePhase) * orb.wobbleAmp;
      wobbleX = perpX * w;
      wobbleY = perpY * w;
      orb.wobblePhase += orb.wobbleFreq * timeScale;
    }

    orb.x += (orb.vx + wobbleX) * timeScale;
    orb.y += (orb.vy + wobbleY) * timeScale;
    orb.el.style.left = orb.x + 'px';
    orb.el.style.top = orb.y + 'px';

    // Intercepted by the logo — explode in the direction of impact, heal a bit, count toward score
    if (logoRect) {
      let dx = orb.x - logoRect.cx;
      let dy = orb.y - logoRect.cy;
      let killR = logoRect.r + RED_ORB_RADIUS;
      if (dx*dx + dy*dy < killR * killR) {
        let mag = Math.sqrt(dx*dx + dy*dy) || 1;
        if (window.gameSound) window.gameSound.play('intercept');
        explodeOrb(orb.x, orb.y, dx / mag, dy / mag);
        bossHealth = Math.min(BOSS_MAX_HEALTH, bossHealth + 0.5);
        updateBossHealthbar();
        orb.el.remove();
        redOrbs.splice(i, 1);
        bigCount++;
        bigOpacity = 1;
        renderBigCount();
        // Trigger hit-stop slow-mo and tick the orbit threshold
        timeScale = TIMESCALE_HIT;
        bossOrbsHitByLogo++;
        if (!bossMoving && bossOrbsHitByLogo >= BOSS_MOVE_TRIGGER) {
          bossMoving = true;
          bossAngle = 0;
          bossOrbitRadius = 0; // start at center; updateBoss eases it outward
        }
        continue;
      }
    }

    // Reached the boss
    let dx = orb.x - centerX;
    let dy = orb.y - centerY;
    if (dx*dx + dy*dy < bossHitR2) {
      bossHealth--;
      if (window.gameSound) window.gameSound.play('bossHit');
      updateBossHealthbar();
      killRedOrb(i);
      if (bossOrbEl) {
        bossOrbEl.classList.remove('boss-hit');
        void bossOrbEl.offsetWidth;
        bossOrbEl.classList.add('boss-hit');
      }
      if (bossHealth <= 0) {
        endBoss();
        return;
      }
    }
  }
}

function killRedOrb(i)
{
  let orb = redOrbs[i];
  orb.el.classList.add('red-orb-poof');
  setTimeout(() => orb.el.remove(), 300);
  redOrbs.splice(i, 1);
}

var lastScoreEl = null;
function showLastScore(scoreCount)
{
  if (!lastScoreEl) {
    lastScoreEl = document.createElement('div');
    lastScoreEl.className = 'last-score';
    let footer = document.querySelector('.nav-footer');
    if (footer) footer.appendChild(lastScoreEl);
  }
  lastScoreEl.textContent = `Score: ${formatBigCount(scoreCount)}`;
}

const SPARK_COLORS = ['#ff4400', '#ff7722', '#ffbb44', '#ffee88', '#ffffff'];
const SPARK_COUNT = 18;

function explodeOrb(originX, originY, dirX, dirY)
{
  let frag = document.createDocumentFragment();
  for (let i = 0; i < SPARK_COUNT; i++) {
    let s = document.createElement('div');
    s.className = 'orb-spark';
    let color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
    s.style.left = originX + 'px';
    s.style.top = originY + 'px';
    s.style.backgroundColor = color;
    s.style.color = color;

    // 60% along impact direction + 40% random spread for a fan-shaped burst
    let angle = Math.random() * Math.PI * 2;
    let spread = 0.45;
    let mag = 70 + Math.random() * 90;
    let vx = (dirX * (1 - spread) + Math.cos(angle) * spread) * mag;
    let vy = (dirY * (1 - spread) + Math.sin(angle) * spread) * mag;

    s.style.setProperty('--dx', vx + 'px');
    s.style.setProperty('--dy', vy + 'px');
    s.style.animationDuration = (0.6 + Math.random() * 0.5) + 's';
    frag.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
  document.body.appendChild(frag);
}

function updateBossHealthbar()
{
  if (!bossBarFillEl) return;
  let pct = Math.max(0, bossHealth / BOSS_MAX_HEALTH);
  bossBarFillEl.style.width = (pct * 100) + '%';
}

function endBoss()
{
  if (window.gameSound) window.gameSound.play('bossDeath');

  // Capture the score (count at moment of defeat) before resetting
  showLastScore(bigCount);

  bossActive = false;
  clearTimeout(bossSpawnTimer);
  clearInterval(bossTickTimer);
  bossSpawnTimer = null;
  bossTickTimer = null;

  if (bossOrbEl) bossOrbEl.remove();
  bossOrbEl = null;
  if (bossBarFillEl && bossBarFillEl.parentElement) bossBarFillEl.parentElement.remove();
  bossBarFillEl = null;
  redOrbs.forEach(o => o.el.remove());
  redOrbs = [];

  // Full reset: stop motion, snap rotation to a multiple of 360 (visually 0°
  // so the CSS transition doesn't animate a spin-back), zero out state
  speed = 0;
  hit = 0;
  x = 0;
  y = 0;
  homeStartRot = 0;
  homeTargetRot = 0;
  homeStartDist = 0;

  let snap = Math.round(totalRot / 360) * 360;
  totalRot = snap;

  if (logoElement) {
    logoElement.style.position = "unset";
    logoElement.style.left = '';
    logoElement.style.bottom = '';
    if (logoElement.children[0]) {
      logoElement.children[0].style.transform = `rotate(${snap}deg)`;
    }
  }

  bigCount = 0n;
  bigOpacity = 0;
  clicks = 0;
  clearTimeout(timeoutId);

  // Reset boss-fight-only state so the next fight starts clean
  bossOrbsHitByLogo = 0;
  bossMoving = false;
  bossAngle = 0;
  bossOrbitRadius = 0;
  timeScale = 1;

  renderBigCount();
}