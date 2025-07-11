// /authentication/login.js

// Clear any previous role choice when you load the login page!
sessionStorage.removeItem("currentRole");


function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

import {
  googleLogin,
  appleLogin,
  guestBrowse,
  logout,
  initAuthListener,
  deleteAccount
} from "./auth.js";

// --- Role Check Helpers ---
function hasCustomer(profile) {
  return Array.isArray(profile.roles) && profile.roles.includes("customer");
}
function hasEmployee(profile) {
  return (
    Array.isArray(profile.roles) &&
    profile.roles.includes("employee") &&
    Array.isArray(profile.employeeTypes) &&
    profile.employeeTypes.length > 0
  );
}

// --- MAIN REDIRECT LOGIC ---
function redirectBasedOnProfile(profile) {
  // Debug
  console.log("REDIRECT PROFILE:", profile);

  const isCustomer = hasCustomer(profile);
  const isEmployee = hasEmployee(profile);

  // Both roles: need session role switch
  if (isCustomer && isEmployee) {
    const roleChoice = sessionStorage.getItem("currentRole");
    if (roleChoice === "customer") {
      window.location.href = "/customer/home.html";
      return;
    }
    if (roleChoice === "employee") {
      window.location.href = "/employee/employee-portal.html";
      return;
    }
    // No session role selected yet
    window.location.href = "/authentication/role-choice.html";
    return;
  }

  // Only customer
  if (isCustomer && !isEmployee) {
    window.location.href = "/customer/home.html";
    return;
  }

  // Only employee
  if (isEmployee && !isCustomer) {
    window.location.href = "/employee/employee-portal.html";
    return;
  }

  // No roles yet: prompt to pick a role
  window.location.href = "role-select.html";
}

// --- MAIN INIT ---
function init() {
  const googleBtn = document.getElementById("googleBtn");
  const appleBtn = document.getElementById("appleBtn");
  const guestBtn = document.getElementById("guestBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  // 1) Auth Listener
  initAuthListener((payload) => {
    console.log("AUTH PAYLOAD:", payload);

    if (!payload || !payload.user) {
      // Not signed in. Stay on login.
      return;
    }

    const { user, profile } = payload;
    if (user.isAnonymous) {
      window.location.href = "/customer/home.html";
      return;
    }
    if (!profile || !Array.isArray(profile.roles)) {
      window.location.href = "role-select.html";
      return;
    }
    redirectBasedOnProfile(profile);
  });

  // 2) Google login
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        console.log("Google login clicked");
        await googleLogin();
        // onAuthListener will handle redirect
      } catch (err) {
        alert("Google sign-in failed:\n" + err.message);
      }
    });
  }

  // 3) Apple login
  if (appleBtn) {
    appleBtn.addEventListener("click", async () => {
      try {
        console.log("Apple login clicked");
        await appleLogin();
      } catch (err) {
        alert("Apple sign-in failed:\n" + err.message);
      }
    });
  }

  // 4) Guest (anonymous) browse
  if (guestBtn) {
    guestBtn.addEventListener("click", async () => {
      try {
        console.log("Guest browse clicked");
        await guestBrowse();
      } catch (err) {
        alert("Guest sign-in failed:\n" + err.message);
      }
    });
  }

  // 5) Log out
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logout();
        sessionStorage.removeItem("currentRole");
        window.location.href = "login.html";
      } catch (err) {
        alert("Logout failed:\n" + err.message);
      }
    });
  }

  // 6) Delete account
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Delete your account? This action is irreversible.")) return;
      try {
        await deleteAccount();
        sessionStorage.removeItem("currentRole");
        window.location.href = "login.html";
      } catch (err) {
        alert("Account deletion failed:\n" + err.message);
      }
    });
  }
}

onReady(init);
