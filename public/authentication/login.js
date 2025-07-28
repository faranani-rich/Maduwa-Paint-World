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
  deleteAccount,
  emailLogin,
  phoneLogin
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
  console.log("REDIRECT PROFILE:", profile);

  const isCustomer = hasCustomer(profile);
  const isEmployee = hasEmployee(profile);

  if (isCustomer && isEmployee) {
    const roleChoice = sessionStorage.getItem("currentRole");
    if (roleChoice === "customer") {
      window.location.href = "../customer/home.html";
      return;
    }
    if (roleChoice === "employee") {
      window.location.href = "../employee/employee-portal.html";
      return;
    }
    window.location.href = "./role-choice.html";
    return;
  }

  if (isCustomer && !isEmployee) {
    window.location.href = "../customer/home.html";
    return;
  }

  if (isEmployee && !isCustomer) {
    window.location.href = "../employee/employee-portal.html";
    return;
  }

  window.location.href = "./role-choice.html";
}

// --- MAIN INIT ---
function init() {
  const googleBtn = document.getElementById("googleBtn");
  const appleBtn = document.getElementById("appleBtn");
  const guestBtn = document.getElementById("guestBtn");
  const emailBtn = document.getElementById("emailLoginBtn");
  const phoneBtn = document.getElementById("phoneLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const phoneInput = document.getElementById("phoneInput");
  const phonePasswordInput = document.getElementById("phonePasswordInput");

  // 1) Auth Listener
  initAuthListener((payload) => {
    console.log("AUTH PAYLOAD:", payload);

    if (!payload || !payload.user) return;

    const { user, profile } = payload;

    if (user.isAnonymous) {
      window.location.href = "../customer/home.html";
      return;
    }

    if (!profile || !Array.isArray(profile.roles)) {
      window.location.href = "./role-choice.html";
      return;
    }

    redirectBasedOnProfile(profile);
  });

  // 2) Google login
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        await googleLogin();
      } catch (err) {
        alert("Google sign-in failed:\n" + err.message);
      }
    });
  }

  // 3) Apple login
  if (appleBtn) {
    appleBtn.addEventListener("click", async () => {
      try {
        await appleLogin();
      } catch (err) {
        alert("Apple sign-in failed:\n" + err.message);
      }
    });
  }

  // 4) Guest browse
  if (guestBtn) {
    guestBtn.addEventListener("click", async () => {
      try {
        await guestBrowse();
      } catch (err) {
        alert("Guest sign-in failed:\n" + err.message);
      }
    });
  }

  // 5) Email login
  if (emailBtn && emailInput && passwordInput) {
    emailBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }
      try {
        await emailLogin(email, password);
      } catch (err) {
        alert("Email login failed:\n" + err.message);
      }
    });
  }

  // 6) Phone login
  if (phoneBtn && phoneInput && phonePasswordInput) {
    phoneBtn.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();
      const password = phonePasswordInput.value;
      if (!phone || !password) {
        alert("Please enter both phone number and password.");
        return;
      }
      try {
        await phoneLogin(phone, password);
      } catch (err) {
        alert("Phone login failed:\n" + err.message);
      }
    });
  }

  // 7) Log out
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logout();
        sessionStorage.removeItem("currentRole");
        window.location.href = "./login.html";
      } catch (err) {
        alert("Logout failed:\n" + err.message);
      }
    });
  }

  // 8) Delete account
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Delete your account? This action is irreversible.")) return;
      try {
        await deleteAccount();
        sessionStorage.removeItem("currentRole");
        window.location.href = "./login.html";
      } catch (err) {
        alert("Account deletion failed:\n" + err.message);
      }
    });
  }
}

onReady(init);
