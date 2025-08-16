// customer/home.js
import { logout, initAuthListener } from "../authentication/auth.js";

/* -------------------- DOM -------------------- */
const $ = (id) => document.getElementById(id);
const logoutBtn           = $("logoutBtn");
const userNameSpan        = $("userName");
const projectsLink        = $("projectsLink");          // new CTA <a id="projectsLink">
const employeePortalLink  = $("employeePortalLink");    // hidden by default in HTML
const legacyProjectsBlock = $("projectsButton");        // old <section id="projectsButton">

 document.getElementById('settingsBtn')?.addEventListener('click', () => {
    // put your actual path
    window.location.href = '../settings/index.html';
  });

/* -------------------- UI helpers -------------------- */
function setVisible(el, show) {
  if (!el) return;
  // Prefer the .hidden utility in CSS (keeps layout tidy)
  el.classList.toggle("hidden", !show);
  // For legacy nodes that used inline display:none
  if (el === legacyProjectsBlock) {
    el.style.display = show ? "block" : "none";
  }
}
function setGreeting(name) {
  if (userNameSpan) userNameSpan.textContent = name || "friend";
}

/* -------------------- Logout -------------------- */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logout();
    } catch (err) {
      alert("Logout failed:\n" + (err?.message || err));
    } finally {
      window.location.href = "../authentication/login.html";
    }
  });
}

/* -------------------- Auth state -------------------- */
initAuthListener((payload) => {
  // First tick can be null before Firebase restores the session
  if (!payload || !payload.user) {
    setGreeting("friend");
    setVisible(projectsLink, false);
    setVisible(employeePortalLink, false);
    setVisible(legacyProjectsBlock, false);
    return;
  }

  const { user, profile } = payload;

  // Friendly greeting: displayName → profile.name → email local-part → friend
  const emailLocal = (user.email || "").split("@")[0];
  const display =
    user.displayName ||
    profile?.name ||
    emailLocal ||
    "friend";
  setGreeting(display);

  // Role checks
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];
  const employeeTypes = Array.isArray(profile?.employeeTypes) ? profile.employeeTypes : [];

  const isCustomer = roles.includes("customer");
  const isEmployee = !!profile?.isOwner || !!profile?.isAdmin || employeeTypes.length > 0;

  // Show the customer-only Projects CTA
  setVisible(projectsLink, isCustomer);
  setVisible(legacyProjectsBlock, isCustomer); // backward-compat with old markup

  // If the same account is also an employee, reveal Employee Portal link
  setVisible(employeePortalLink, isEmployee);
});
