
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

window.onload = window.onresize = function (event) {
  //Half the value so we can better use it without division on the hot path
	screenWidth = window.innerWidth/2
	screenHeight = window.innerHeight/2
};

// Triggered from the logo
async function triggerSpin (element)
{

  if (speed !== 0)
    return;

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
  
  if (((x+imgWidth+borderPadding) > screenWidth && xDir > 0) || ((x-imgWidth) < -screenWidth && xDir < 0)) {
      xDir *= -1;
      hitBounds();
      return;
  }
        
  if (((y+imgHeight) > screenHeight && yDir > 0) || ((y-imgHeight-borderPadding) < -screenHeight && yDir < 0)) {
      yDir *= -1;
      hitBounds();
      return;
  }
}

function hitBounds()
{
	hit++;

  if (hit >= returnOnMaxHit)
  {
    //Set direction so it speed towards the center (x = 0, y = 0)
    xDir = -(x/screenWidth)
    yDir = -(y/screenHeight)
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

      //Check for collision 
      checkHitBox();

      update();
    } else {
      logoElement.style.position = "unset";
      hit = 0;

      // If we sent this logo flying, when it returns reset it's rotation
      resetLogoRot(logoElement.children[0]);
    }

  }, tickRate)
}

function resetLogoRot(element) {
  // Reset it's rotation based on the amount of times it's rotated
  totalRot = 0;
  clicks = 0;
  element.style.transform = "rotate(" + totalRot + "deg)";
}