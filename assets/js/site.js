
// Corresponds with @media (max-width: 768px) in style.css
const STYLE_MAX_WIDTH = 768; 



// Listening for nav menu toggling when on mobile
const checkbox = document.querySelector("#menu-toggle");
const nav = document.querySelector(".nav-links");

if(checkbox)
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

var lastDropdown = null;

// Close the dropdown if the user clicks outside of it
window.onclick = (e) => 
{
  if (!e.target.classList.matches('.drop-button')) 
  {
    toggleNavDropdown(e);
  }
}

// Triggered from a button
function toggleNavDropdown(e) {
  if (lastDropdown != e && lastDropdown != null) {
    toggleNavDropdown(lastDropdown);
  }

  var el = e.parentElement.querySelector('#dropdown')
  if (el) {
    el.classList.toggle("show");
    lastDropdown = e;
  }
  else {
    lastDropdown = null;
  }
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

