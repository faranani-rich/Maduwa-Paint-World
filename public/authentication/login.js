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
  deleteAccount,   // Only used if you place a delete button on this page
  emailLogin,
  sendReset,       // Forgot password
} from "./auth.js";

/* ---------------- Role Check Helpers ---------------- */
function hasCustomer(profile) {
  return Array.isArray(profile?.roles) && profile.roles.includes("customer");
}
function hasEmployee(profile) {
  return (
    Array.isArray(profile?.roles) &&
    profile.roles.includes("employee") &&
    Array.isArray(profile?.employeeTypes) &&
    profile.employeeTypes.length > 0
  );
}

/* ---------------- Redirect Logic ---------------- */
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

  // Fallback (e.g., new user without roles yet)
  window.location.href = "./role-choice.html";
}

/* ---------------- UI helpers ---------------- */
const qs = (id) => document.getElementById(id);

function setLoading(el, loading, labelWhenDone) {
  if (!el) return;
  if (loading) {
    el.dataset.label = el.textContent;
    el.disabled = true;
    el.textContent = "Working...";
  } else {
    el.disabled = false;
    el.textContent = labelWhenDone || el.dataset.label || el.textContent;
  }
}

function toast(msg, type = "err") {
  const box = qs("authMessage");
  if (!box) { alert(msg); return; }
  box.classList.remove("ok", "err");
  box.classList.add(type);
  box.textContent = msg;
}

function friendlyError(e) {
  const code = e?.code || "";
  switch (code) {
    case "auth/invalid-login-credentials":
      return "Wrong email/password or no password set for this account. If you signed up with Google first, use ‘Forgot password’ to set one.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/requires-recent-login":
      return "Please re-authenticate to continue.";
    default:
      return e?.message || "Something went wrong.";
  }
}

/* ---------------- MAIN INIT ---------------- */
function init() {
  // Buttons
  const googleBtn   = qs("googleBtn");
  const appleBtn    = qs("appleBtn");
  const guestBtn    = qs("guestBtn");
  const emailBtn    = qs("emailLoginBtn");
  const forgotPwBtn = qs("forgotPwBtn");

  // Inputs
  const emailInput    = qs("emailInput");
  const passwordInput = qs("passwordInput");

  // (Optional) present on some screens
  const logoutBtn = qs("logoutBtn");
  const deleteBtn = qs("deleteBtn");

  /* 1) Auth Listener: auto-redirect once logged in */
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

  /* 2) Google login */
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      setLoading(googleBtn, true);
      try {
        await googleLogin();
        toast("Signed in with Google.", "ok");
      } catch (err) {
        toast(friendlyError(err), "err");
      } finally {
        setLoading(googleBtn, false, "Sign in with Google");
      }
    });
  }

  /* 3) Apple login */
  if (appleBtn) {
    appleBtn.addEventListener("click", async () => {
      setLoading(appleBtn, true);
      try {
        await appleLogin();
        toast("Signed in with Apple.", "ok");
      } catch (err) {
        toast(friendlyError(err), "err");
      } finally {
        setLoading(appleBtn, false, "Sign in with Apple");
      }
    });
  }

  /* 4) Guest browse */
  if (guestBtn) {
    guestBtn.addEventListener("click", async () => {
      setLoading(guestBtn, true);
      try {
        await guestBrowse();
        toast("Browsing as guest. Limited features enabled.", "ok");
      } catch (err) {
        toast(friendlyError(err), "err");
      } finally {
        setLoading(guestBtn, false, "Continue as Guest");
      }
    });
  }

  /* 5) Email login */
  if (emailBtn && emailInput && passwordInput) {
    emailBtn.addEventListener("click", async () => {
      const email = (emailInput.value || "").trim();
      const password = passwordInput.value || "";
      if (!email || !password) {
        toast("Please enter both email and password.", "err");
        return;
      }
      setLoading(emailBtn, true);
      try {
        await emailLogin(email, password);
        toast("Welcome back!", "ok");
      } catch (err) {
        toast(friendlyError(err), "err");
      } finally {
        setLoading(emailBtn, false, "Sign in with Email");
      }
    });

    // Press Enter in password field to trigger login
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") emailBtn.click();
    });
  }

  /* 6) Forgot password */
  if (forgotPwBtn) {
    forgotPwBtn.addEventListener("click", async () => {
      const email = (emailInput?.value || "").trim();
      if (!email) {
        toast("Enter your email first, then click ‘Forgot password?’", "err");
        return;
      }
      setLoading(forgotPwBtn, true);
      try {
        await sendReset(email);
        toast("Password reset email sent. Check your inbox.", "ok");
      } catch (err) {
        toast(friendlyError(err), "err");
      } finally {
        setLoading(forgotPwBtn, false, "Forgot password?");
      }
    });
  }

  /* 7) Optional logout & delete (if you placed these buttons on this page) */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logout();
        sessionStorage.removeItem("currentRole");
        window.location.href = "./login.html";
      } catch (err) {
        toast("Logout failed: " + friendlyError(err), "err");
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Delete your account? This action is irreversible.")) return;
      try {
        await deleteAccount();
        sessionStorage.removeItem("currentRole");
        window.location.href = "./login.html";
      } catch (err) {
        toast("Account deletion failed: " + friendlyError(err), "err");
      }
    });
  }
}

onReady(init);
