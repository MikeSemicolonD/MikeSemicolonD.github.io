
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
var returnOnMaxHit = 6;

// Captured when the logo enters its homing phase so rotation can ease back to original orientation
var homeStartRot = 0;
var homeTargetRot = 0;
var homeStartDist = 0;

window.onload = window.onresize = function (event) {
  //Half the value so we can better use it without division on the hot path
	screenWidth = window.innerWidth/2
	screenHeight = window.innerHeight/2
};

// Triggered from the logo
async function triggerSpin (element)
{
  // Mid-flight click: kick the logo so it keeps flying
  if (speed !== 0)
  {
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

// Extra padding so the right and bottom of the screen doesn't create scrollbar when bouncing
// (It's not perfect but I prefer this than disabling scroll bar via style)
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
        
  if (((y+imgHeight+borderPadding) > screenHeight && yDir > 0) || ((y-imgHeight) < -(screenHeight-(borderPadding*2)) && yDir < 0)) {
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

    // Snap target to nearest full rotation so easing lands at original orientation
    homeStartRot = totalRot;
    homeTargetRot = Math.round(totalRot / 360) * 360;
    homeStartDist = Math.sqrt(x*x + y*y);
  }
  else{
	  speed -= (maxSpeed * dSpeed);
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
    }

  }, tickRate)
}

function resetLogoRot(element) {
  // Reset it's rotation based on the amount of times it's rotated
  totalRot = 0;
  clicks = 0;
  element.style.transform = "rotate(" + totalRot + "deg)";
}