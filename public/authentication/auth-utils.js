// /public/authentication/auth-utils.js

// Map employee subtypes → dashboard HTML.
// Keep this in sync with /employee/employee-portal.js DASHBOARD_CONFIG.
const EMPLOYEE_DASHBOARD_MAP = {
  owner:           "../employee/owner-dashboard.html",
  admin:           "../employee/admin-dashboard.html",
  "project-manager": "../employee/pm-dashboard.html",
  accountant:      "../employee/accountant-dashboard.html",
  inventory:       "../employee/inventory-dashboard.html",
  sales:           "/employee/sales-dashboard.html",
  // add more if you introduce new types
};

const EMPLOYEE_PORTAL = "../employee/employee-portal.html";
const CUSTOMER_HOME   = "../customer/home.html";

function norm(s) { return (s || "").toString().trim().toLowerCase(); }

function validPref(prefRaw) {
  const v = norm(prefRaw);
  return v === "customer" || v === "employee" || v === "auto" ? v : "auto";
}

/**
 * Decide where to land after sign-in.
 * @param {Object} opts
 * @param {'customer'|'employee'|'owner'|'admin'|'project-manager'|'accountant'|'inventory'|'sales'|null} [opts.role=null]
 *   Optional current role/subtype if you already know it at call time.
 *   If omitted, we use localStorage.app.lastRole written by your auth listener.
 */
export function resolveStartPage({ role = null } = {}) {
  const pref = validPref(localStorage.getItem("app.defaultStartPage"));

  // Explicit preference always wins
  if (pref === "customer") return CUSTOMER_HOME;
  if (pref === "employee") return EMPLOYEE_PORTAL;

  // 'auto' — infer from explicit role or last known role
  const guess = norm(role) || norm(localStorage.getItem("app.lastRole")) || "customer";

  // If customer, send to customer home
  if (guess === "customer") return CUSTOMER_HOME;

  // If we know a specific employee subtype, try to route straight to its dashboard.
  // Otherwise, use the employee portal (which can route again).
  if (guess in EMPLOYEE_DASHBOARD_MAP) {
    return EMPLOYEE_DASHBOARD_MAP[guess];
  }

  // Any other employee type or unknown → portal
  return EMPLOYEE_PORTAL;
}

/** Convenience redirect */
export function goToStartPage(opts = {}) {
  window.location.replace(resolveStartPage(opts));
}
