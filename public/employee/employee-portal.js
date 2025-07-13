// /employee/employee-portal.js
import { initAuthListener, logout } from "../authentication/auth.js";

/* ------------------------------------------------------------------
   1. Dashboard config  (type ↔ label ↔ html file)
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
   2. DOM refs
   ------------------------------------------------------------------ */
const welcomeDiv        = document.getElementById("welcome");
const dashboardLinksDiv = document.getElementById("dashboardLinks");
const adminToolsSection = document.getElementById("adminToolsSection");
const logoutBtn         = document.getElementById("logoutBtn");

/* ------------------------------------------------------------------
   3. Logout
   ------------------------------------------------------------------ */
logoutBtn.onclick = async () => {
  await logout();
  window.location.href = "../authentication/login.html";
};

/* ------------------------------------------------------------------
   4. Auth listener
   ------------------------------------------------------------------ */
initAuthListener(({ user, profile }) => {
  if (!user || !profile) {
    window.location.href = "../authentication/login.html";
    return;
  }

  /* ----- Flags & arrays ----- */
  const isOwner = !!profile.isOwner;
  const isAdmin = !!profile.isAdmin;
  const employeeTypes = Array.isArray(profile.employeeTypes)
    ? profile.employeeTypes
    : [];

  /* ----- Welcome message ----- */
  const rolesText = employeeTypes.length
    ? employeeTypes
        .map((r) =>
          r
            .replace("-", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        )
        .join(", ")
    : "N/A";

  welcomeDiv.innerHTML = `
    Welcome, <b>${profile.email}</b>.<br>
    Your employee types: <b>${rolesText}</b>
  `;

  /* ----- Dashboard links ----- */
  dashboardLinksDiv.innerHTML = "";

  // Owners see everything, admins/employees see matching types
  DASHBOARD_CONFIG.forEach((cfg) => {
    const shouldShow =
      isOwner || employeeTypes.includes(cfg.type);

    if (shouldShow) {
      dashboardLinksDiv.insertAdjacentHTML(
        "beforeend",
        `<a href="${cfg.file}" class="role-btn" style="margin:0.5em;">
           ${cfg.label}
         </a>`
      );
    }
  });

  /* ----- Admin tools visibility ----- */
  adminToolsSection.style.display = isOwner || isAdmin ? "" : "none";
});
