
var timeoutId = undefined;
const rotAmount = 360;

var totalRot = 0;

// Triggered from the logo
async function triggerSpin (element)
{
  totalRot += rotAmount;

  element.style.transform = "rotate("+totalRot+"deg)";

  clearTimeout(timeoutId);

  timeoutId = setTimeout(() => {
    totalRot = 0;
    element.style.transform = "rotate("+totalRot+"deg)";
  }, 3500)

  await new Promise(() => timeoutId);
}
