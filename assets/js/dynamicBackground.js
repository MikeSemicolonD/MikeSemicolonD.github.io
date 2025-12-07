
// Setting the background relative to the time of day for the user (day or night)
const hour = new Date().getHours();

document.getElementById("background").style.backgroundImage = (hour > 5 && hour < 18) ? "url(assets/images/lighthouse.jpeg)" : "url(assets/images/lake.jpeg)";
