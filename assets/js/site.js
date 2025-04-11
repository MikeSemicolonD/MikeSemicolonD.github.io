// Setting the background relative to the time of day for the user
var datestr = new Date(new Date().getHours() * 3600 * 1000).toUTCString().replace(/ GMT$/, "");
var hour = datestr.substring(datestr.lastIndexOf(' ') + 1);
hour = hour.substring(0, hour.indexOf(':'));

if (hour > 5 && hour < 18) {
    document.getElementById("background").style.backgroundImage = "url(assets/images/lighthouse.jpeg)";
}
else {
    document.getElementById("background").style.backgroundImage = "url(assets/images/lake.jpeg)";
}




// Listening for nav menu toggling when on mobile
const checkbox = document.querySelector("#menu-toggle");
const nav = document.querySelector(".nav-links");
checkbox.addEventListener("change", () => {
  if (checkbox.checked) {
    nav.setAttribute("style", "display: flex !important");
  } else {
    nav.style.display = "none";
  }
});

// Resetting style changes when zooming out past a limit
window.addEventListener('resize', function() {
    if(window.innerWidth > 768)
    {
        nav.style = null;
    }
});