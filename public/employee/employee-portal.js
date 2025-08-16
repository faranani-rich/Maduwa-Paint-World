// /employee/employee-portal.js
import { initAuthListener, logout } from "../authentication/auth.js";

/* ------------------------------------------------------------------
   0) Mark current role (helps your cross-page redirects)
   ------------------------------------------------------------------ */
try { sessionStorage.setItem("currentRole", "employee"); } catch {}

/* ------------------------------------------------------------------
   1) Dashboard config (type ↔ label ↔ html file)
   ------------------------------------------------------------------ */
const DASHBOARD_CONFIG = [
  { type: "owner",            label: "Owner Dashboard",            file: "owner-dashboard.html" },
  { type: "admin",            label: "Admin Dashboard",            file: "admin-dashboard.html" },
  { type: "accountant",       label: "Accountant Dashboard",       file: "accountant-dashboard.html" },
  { type: "project-manager",  label: "Project Manager Dashboard",  file: "pm-dashboard.html" },
  { type: "inventory",        label: "Inventory Dashboard",        file: "inventory-dashboard.html" },
  { type: "sales",            label: "Sales Dashboard",            file: "sales-dashboard.html" },
  { type: "factory",          label: "Factory Dashboard",          file: "factory-dashboard.html" },
  { type: "chemist",          label: "Chemist Dashboard",          file: "chemist-dashboard.html" },
  { type: "driver",           label: "Driver Dashboard",           file: "driver-dashboard.html" },
  { type: "painter",          label: "Painter Dashboard",          file: "painter-dashboard.html" },
  { type: "general-employee", label: "General Employee Dashboard", file: "general-dashboard.html" },
];

/* ------------------------------------------------------------------
   2) DOM refs
   ------------------------------------------------------------------ */
const welcomeDiv        = document.getElementById("welcome");
const userNameSpan      = document.getElementById("userName");
const dashboardLinksDiv = document.getElementById("dashboardLinks");
const adminToolsSection = document.getElementById("adminToolsSection");
const logoutBtn         = document.getElementById("logoutBtn");
const profileBtn        = document.getElementById("profileBtn");
const actionsNav        = document.querySelector(".actions") || (profileBtn && profileBtn.parentElement);

 document.getElementById('settingsBtn')?.addEventListener('click', () => {
    // put your actual path
    window.location.href = '../settings/index.html';
  });

/* ------------------------------------------------------------------
   3) Helpers
   ------------------------------------------------------------------ */
const titleCase = (s) =>
  String(s || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function setWelcomeName(name) {
  if (userNameSpan) {
    userNameSpan.textContent = name;
  } else if (welcomeDiv) {
    welcomeDiv.innerHTML = `Welcome, <b>${name}</b>`;
  }
}

function ensureProjectsTile() {
  if (!dashboardLinksDiv) return;
  const already = [...dashboardLinksDiv.querySelectorAll("a")].some((a) =>
    a.getAttribute("href")?.includes("../projects/index.html")
  );
  if (already) return;

  const a = document.createElement("a");
  a.href = "../projects/index.html";
  a.className = "tile";
  a.innerHTML = `
    <div class="tile-title">Projects Portal</div>
    <div class="tile-sub">Create, track & invoice</div>
  `;
  dashboardLinksDiv.appendChild(a);
}

function ensureCustomerButton(show) {
  if (!actionsNav) return;
  let btn = document.getElementById("customerHomeLink");
  if (show) {
    if (!btn) {
      btn = document.createElement("a");
      btn.id = "customerHomeLink";
      btn.className = "btn ghost";
      btn.href = "../customer/home.html";
      btn.textContent = "Customer Home";
      // Insert before Logout if possible
      if (logoutBtn && logoutBtn.parentElement === actionsNav) {
        actionsNav.insertBefore(btn, logoutBtn);
      } else {
        actionsNav.appendChild(btn);
      }
      // When switching, remember chosen role
      btn.addEventListener("click", () => {
        try { sessionStorage.setItem("currentRole", "customer"); } catch {}
      });
    }
    btn.classList.remove("hidden");
  } else if (btn) {
    btn.classList.add("hidden");
  }
}

/* ------------------------------------------------------------------
   4) Logout + Profile link
   ------------------------------------------------------------------ */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try { await logout(); } finally {
      window.location.href = "../authentication/login.html";
    }
  });
}

// Works whether profile button is <a> or <button>
if (profileBtn) {
  const href = "../authentication/profile.html?from=employee";
  if (profileBtn.tagName.toLowerCase() === "a") {
    profileBtn.setAttribute("href", href);
  } else {
    profileBtn.addEventListener("click", () => (window.location.href = href));
  }
}

/* ------------------------------------------------------------------
   5) Auth listener
   ------------------------------------------------------------------ */
initAuthListener((payload) => {
  if (!payload || !payload.user) return;

  const { user, profile } = payload;
  if (!profile) {
    window.location.href = "../authentication/login.html";
    return;
  }

  // Greeting: displayName → profile.name → email local-part → "User"
  const fallbackLocal = (user.email || "").split("@")[0] || "User";
  const display = user.displayName || profile.name || fallbackLocal;
  setWelcomeName(display);

  // Flags
  const isOwner = !!profile.isOwner;
  const isAdmin = !!profile.isAdmin;
  const employeeTypes = Array.isArray(profile.employeeTypes) ? profile.employeeTypes : [];
  const isCustomer = Array.isArray(profile.roles) && profile.roles.includes("customer");

  // Admin tools visibility
  if (adminToolsSection) {
    adminToolsSection.hidden = !(isOwner || isAdmin);
  }

  // Dashboards
  if (dashboardLinksDiv) {
    dashboardLinksDiv.innerHTML = "";
    DASHBOARD_CONFIG.forEach((cfg) => {
      const show = isOwner || employeeTypes.includes(cfg.type);
      if (!show) return;
      const a = document.createElement("a");
      a.href = cfg.file;
      a.className = "tile";
      a.innerHTML = `
        <div class="tile-title">${cfg.label}</div>
        <div class="tile-sub">${titleCase(cfg.type)}</div>
      `;
      dashboardLinksDiv.appendChild(a);
    });
    ensureProjectsTile();
  }

  // Show "Customer Home" for accounts that are also customers (should be all, but safe)
  ensureCustomerButton(!!isCustomer);

  // (Optional) quick stats placeholders
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("openProjectsCount", "—");
  setText("pendingInvoicesCount", "—");
  setText("tasksTodayCount", "—");
});
