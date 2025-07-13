// customer/home.js
import { logout, initAuthListener } from "../authentication/auth.js";

document.getElementById("logoutBtn").onclick = async function () {
  try {
    await logout();
    window.location.href = "../authentication/login.html";
  } catch (err) {
    alert("Logout failed:\n" + err.message);
  }
};

// Show project button if logged in as customer
initAuthListener(({ user, profile }) => {
  if (user && profile?.roles?.includes("customer")) {
    document.getElementById("projectsButton").style.display = "block";
  }
});
