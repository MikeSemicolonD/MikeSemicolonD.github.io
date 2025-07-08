// Hi, hope you don't mind the arcane JS.

// Setting the background relative to the time of day for the user (day or night)
const hour = new Date().getHours();

document.getElementById("background").style.backgroundImage = (hour > 5 && hour < 18) ? "url(assets/images/lighthouse.jpeg)" : "url(assets/images/lake.jpeg)";





// Corresponds with @media (max-width: 768px) in style.css
const STYLE_MAX_WIDTH = 768; 





// Listening for nav menu toggling when on mobile
const checkbox = document.querySelector("#menu-toggle");
const nav = document.querySelector(".nav-links");

checkbox.addEventListener("change", () => ToggleMobileNavBar());




// Resetting style changes when zooming out past a limit
window.addEventListener('resize', () => 
{
    if(window.innerWidth > STYLE_MAX_WIDTH)
    {
      // Display the navbar if there's enough width regardless of dropdown
      if(checkbox.checked)
      {
        nav.setAttribute("style", "display: flex !important");
      }
    }
    else
    {
      // If there isn't enough space update to reflect checkbox status
      ToggleMobileNavBar(checkbox.checked);
    }
});




const itchDropdown = document.getElementById("itchDropdown");

// Close the dropdown if the user clicks outside of it
window.onclick = (e) => 
{
  if (!e.target.matches('.drop-button')) 
  {
    if (itchDropdown.classList.contains('show')) 
    {
      itchDropdown.classList.remove('show');
    }
  }
}

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
  }, 5000)

  await new Promise(() => timeoutId);
}

// Triggered from a button
function openNavDropdown() 
{
  itchDropdown.classList.toggle("show");
}

function ToggleMobileNavBar(forceDisplay = null)
{
  if(forceDisplay !== null)
  {
    if (!forceDisplay) 
    {
      nav.setAttribute("style", "display: flex !important");
      //checkbox.checked = true;
    } 
    else 
    {
      nav.setAttribute("style", "display: none !important");
      //checkbox.checked = false;
    }
  }
  else
  {
    if (!checkbox.checked) 
    {
      nav.setAttribute("style", "display: flex !important");
    } 
    else 
    {
      nav.setAttribute("style", "display: none !important");
    }
  }
}



// Start hamburger menu as closed if we're on mobile
if(window.innerWidth <= STYLE_MAX_WIDTH)
{
  checkbox.checked = true;
  ToggleMobileNavBar()
}
