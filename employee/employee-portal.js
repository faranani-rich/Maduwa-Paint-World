import { initAuthListener, logout } from "../authentication/auth.js";

// All dashboards (label & html file)
const DASHBOARD_CONFIG = [
  { type: "owner", label: "Owner Dashboard", file: "owner-dashboard.html" },
  { type: "admin", label: "Admin Dashboard", file: "admin-dashboard.html" },
  { type: "accountant", label: "Accountant Dashboard", file: "accountant-dashboard.html" },
  { type: "pm", label: "Project Manager Dashboard", file: "pm-dashboard.html" },
  { type: "inventory", label: "Inventory Dashboard", file: "inventory-dashboard.html" },
  { type: "sales", label: "Sales Dashboard", file: "sales-dashboard.html" },
  { type: "factory", label: "Factory Dashboard", file: "factory-dashboard.html" },
  { type: "chemist", label: "Chemist Dashboard", file: "chemist-dashboard.html" },
  { type: "driver", label: "Driver Dashboard", file: "driver-dashboard.html" },
  { type: "painter", label: "Painter Dashboard", file: "painter-dashboard.html" },
  { type: "general", label: "General Employee Dashboard", file: "general-dashboard.html" }
];

const ALL_ACCESS_TYPES = ["owner", "admin", "accountant"];

const welcomeDiv = document.getElementById('welcome');
const dashboardLinksDiv = document.getElementById('dashboardLinks');
const adminToolsSection = document.getElementById('adminToolsSection');
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn.onclick = async function () {
  await logout();
  window.location.href = "../authentication/login.html";
};

function hasAllAccess(profile) {
  return Array.isArray(profile.employeeTypes) && profile.employeeTypes.some(t => ALL_ACCESS_TYPES.includes(t));
}

initAuthListener(({ user, profile }) => {
  if (!user || !profile) {
    window.location.href = "../authentication/login.html";
    return;
  }

  // Welcome text
  const rolesText = Array.isArray(profile.employeeTypes) && profile.employeeTypes.length
    ? profile.employeeTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
    : "N/A";
  welcomeDiv.innerHTML = `Welcome, <b>${profile.email}</b>.<br>Your roles: <b>${rolesText}</b>`;

  // Dashboards
  dashboardLinksDiv.innerHTML = "";
  if (hasAllAccess(profile)) {
    // Show all dashboards for owner/admin/accountant
    DASHBOARD_CONFIG.forEach(cfg => {
      dashboardLinksDiv.innerHTML +=
        `<a href="${cfg.file}" class="role-btn" style="margin:0.5em;">${cfg.label}</a>`;
    });
  } else if (Array.isArray(profile.employeeTypes)) {
    // Show only dashboards for their roles
    DASHBOARD_CONFIG.forEach(cfg => {
      if (profile.employeeTypes.includes(cfg.type)) {
        dashboardLinksDiv.innerHTML +=
          `<a href="${cfg.file}" class="role-btn" style="margin:0.5em;">${cfg.label}</a>`;
      }
    });
  }

  // Admin tools
  if (hasAllAccess(profile)) {
    adminToolsSection.style.display = "";
  } else {
    adminToolsSection.style.display = "none";
  }
});
