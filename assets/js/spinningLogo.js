
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

function triggerConfetti()
{
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    let piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = (Math.random() * 100) + 'vw';
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = (Math.random() * 0.4) + 's';
    piece.style.animationDuration = (2 + Math.random() * 1.8) + 's';
    piece.style.setProperty('--drift', ((Math.random() * 300) - 150) + 'px');
    piece.style.setProperty('--rot', ((Math.random() * 720) + 360) * (Math.random() < 0.5 ? -1 : 1) + 'deg');
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}

// Measured at load/resize so the logo stops at the top of the footer instead of an arbitrary buffer
var bottomBuffer = 60;

window.onload = window.onresize = function (event) {
  //Half the value so we can better use it without division on the hot path
	screenWidth = window.innerWidth/2
	screenHeight = window.innerHeight/2

  let footer = document.querySelector('.nav-footer');
  if (footer) bottomBuffer = footer.offsetHeight;
};

// Triggered from the logo
async function triggerSpin (element)
{
  bigCount++;

  if (speed !== 0 && bigCount % 10n === 0n) triggerConfetti();

  // Mid-flight click: kick the logo so it keeps flying
  if (speed !== 0)
  {
    // Opacity stays at its launched value — don't bump during flight
    renderBigCount();

    totalRot += rotAmount;
    element.style.transform = `rotate(${totalRot}deg)`;

    hit = 0;
    speed = maxSpeed;

    let rand = Math.random();
    xDir = (1 - rand);
    yDir = (1 - xDir);

    // Randomize sign so the kick can go any of the four diagonals
    if (Math.random() < 0.5) xDir *= -1;
    if (Math.random() < 0.5) yDir *= -1;

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

  //Send the logo spinning and bounce a few times before returning to the center on the last bounce
  if (clicks >= throwLogoClickThreshold)
  {
    speed = maxSpeed;
    
    dSpeed = (1 / (returnOnMaxHit+1));

    //Pick a random direction and go off at a constant speed
    let rand = Math.random();

    xDir = (1 - rand);
    yDir = (1 - xDir);

    x = 0;
    y = 0;

    update();
  }else{
    timeoutId = setTimeout(() => {
      resetLogoRot(element);
    }, 3500)
  }

  await new Promise(() => timeoutId);
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
        
  if (((y+imgHeight+borderPadding) > screenHeight && yDir > 0) || ((y-imgHeight) < -(screenHeight-bottomBuffer) && yDir < 0)) {
      yDir *= -1;
      hitBounds();
      return;
  }
}

function hitBounds()
{

	hit++;

  // Spin ~180° on every bounce, with a little randomness so it doesn't feel mechanical
  totalRot += 180 + ((Math.random() * 120) - 60);
  logoElement.children[0].style.transform = `rotate(${totalRot}deg)`;

  if (hit >= returnOnMaxHit)
  {
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

      //Move the logo
      x += (speed * xDir);
      y += (speed * yDir);

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
      logoElement.style.position = "unset";
      hit = 0;

      // Rotation already eased to homeTargetRot (a multiple of 360, visually equal to 0).
      // Sync the variable to it so the CSS transition isn't triggered by a literal snap to 0.
      totalRot = homeTargetRot;
      clicks = 0;
      homeStartDist = 0;
      bigOpacity = 0;
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