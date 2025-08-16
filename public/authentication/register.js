// /authentication/register.js

import { auth, db } from "./config.js";
import {
  // Email registration
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// New helpers from our updated auth.js
import {
  googleLogin,
  appleLogin,
  guestBrowse,
  phoneLoginStart,
  phoneLoginConfirm,
  saveProfile,
} from "./auth.js";

/* ---------- small DOM utils ---------- */
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function qs(id) {
  return document.getElementById(id);
}

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
  const box = qs("regMessage");
  if (!box) return alert(msg);
  box.classList.remove("ok", "err");
  box.classList.add(type);
  box.textContent = msg;
}

/* ---------- firebase error mapper ---------- */
function friendlyError(e) {
  const code = e?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already in use. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Try again later or use email/Google.";
    case "auth/invalid-phone-number":
      return "Please enter a valid phone number in international format (e.g. +27...).";
    case "auth/missing-verification-code":
    case "auth/invalid-verification-code":
      return "The code is invalid or expired. Please request a new one.";
    default:
      return e?.message || "Something went wrong.";
  }
}

/* ---------- create or update user profile doc ---------- */
async function writeUserDoc(uid, data) {
  await setDoc(
    doc(db, "users", uid),
    {
      roles: ["customer"],
      employeeTypes: [],
      isAdmin: false,
      isOwner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...data,
    },
    { merge: true }
  );
}

/* ---------- main ---------- */
onReady(() => {
  // OAuth buttons
  const googleBtn = qs("googleBtn");
  const appleBtn = qs("appleBtn");
  const guestBtn = qs("guestBtn");

  // Email panel elements
  const nameInput = qs("nameInput");
  const emailInput = qs("emailInput");
  const passwordInput = qs("passwordInput");
  const confirmInput = qs("confirmPasswordInput");
  const termsChk = qs("termsChk");
  const registerBtn = qs("registerBtn");

  // Phone panel elements
  const phoneInputReg = qs("phoneInputReg");
  const phoneStartBtnReg = qs("phoneStartBtnReg");
  const codeRowReg = qs("codeRowReg");
  const codeInputReg = qs("codeInputReg");
  const phoneConfirmBtnReg = qs("phoneConfirmBtnReg");
  const resendCodeBtnReg = qs("resendCodeBtnReg");
  const nameInputPhone = qs("nameInputPhone");

  let phoneConfirmation = null; // stores ConfirmationResult

  /* ===== OAuth flows ===== */
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      setLoading(googleBtn, true);
      try {
        await googleLogin();
        toast("Welcome! Account ready.", "ok");
        // Redirect after a short delay (adjust path if needed)
        setTimeout(() => (window.location.href = "./login.html"), 600);
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(googleBtn, false, "Continue with Google");
      }
    });
  }

  if (appleBtn) {
    appleBtn.addEventListener("click", async () => {
      setLoading(appleBtn, true);
      try {
        await appleLogin();
        toast("Welcome! Account ready.", "ok");
        setTimeout(() => (window.location.href = "./login.html"), 600);
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(appleBtn, false, "Continue with Apple");
      }
    });
  }

  if (guestBtn) {
    guestBtn.addEventListener("click", async () => {
      setLoading(guestBtn, true);
      try {
        await guestBrowse();
        toast("Browsing as guest. Limited features enabled.", "ok");
        setTimeout(() => (window.location.href = "./login.html"), 800);
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(guestBtn, false, "Browse as Guest");
      }
    });
  }

  /* ===== Email registration ===== */
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const name = (nameInput?.value || "").trim();
      const email = (emailInput?.value || "").trim();
      const pw = passwordInput?.value || "";
      const pw2 = confirmInput?.value || "";

      if (!email || !pw || !pw2) {
        toast("Please fill in all required fields.", "err");
        return;
      }
      if (typeof termsChk !== "undefined" && termsChk && !termsChk.checked) {
        toast("Please agree to the Terms and Privacy Policy.", "err");
        return;
      }
      if (pw !== pw2) {
        toast("Passwords do not match.", "err");
        return;
      }
      if (pw.length < 6) {
        toast("Password should be at least 6 characters.", "err");
        return;
      }

      setLoading(registerBtn, true);
      try {
        // Create auth user (auto signs in)
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        const user = cred.user;

        // Set display name in Auth
        if (name) {
          await updateProfile(user, { displayName: name });
        }

        // Create Firestore profile
        await writeUserDoc(user.uid, {
          email,
          name: name || user.displayName || (email ? email.split("@")[0] : "Unknown"),
        });

        toast("Account created successfully!", "ok");
        // Redirect (your login will auto-redirect if already signed in)
        setTimeout(() => (window.location.href = "./login.html"), 700);
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(registerBtn, false, "Create account");
      }
    });
  }

  /* ===== Phone registration (SMS) ===== */
  if (phoneStartBtnReg) {
    phoneStartBtnReg.addEventListener("click", async () => {
      const phone = (phoneInputReg?.value || "").trim();
      if (!phone) {
        toast("Please enter your phone number in international format (e.g. +27...)", "err");
        return;
      }
      setLoading(phoneStartBtnReg, true);
      try {
        // Start SMS flow (uses #recaptcha-container-reg)
        phoneConfirmation = await phoneLoginStart(phone, "recaptcha-container-reg");
        codeRowReg.removeAttribute("hidden");
        toast("Code sent. Check your SMS.", "ok");
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(phoneStartBtnReg, false, "Send code");
      }
    });
  }

  if (phoneConfirmBtnReg) {
    phoneConfirmBtnReg.addEventListener("click", async () => {
      if (!phoneConfirmation) {
        toast("Please request a code first.", "err");
        return;
      }
      const code = (codeInputReg?.value || "").trim();
      if (!code) {
        toast("Please enter the 6-digit code.", "err");
        return;
      }
      setLoading(phoneConfirmBtnReg, true);
      try {
        // Confirm sign-in with code
        const user = await phoneLoginConfirm(phoneConfirmation, code);

        // Optional: store display name if provided
        const displayName = (nameInputPhone?.value || "").trim();
        if (displayName) {
          await saveProfile({ displayName });
        }

        // Ensure a Firestore profile exists with phone
        await writeUserDoc(user.uid, {
          phone: user.phoneNumber || null,
          name: displayName || user.displayName || "Unknown",
          email: user.email || null,
        });

        toast("Phone verified and account created!", "ok");
        setTimeout(() => (window.location.href = "./login.html"), 700);
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(phoneConfirmBtnReg, false, "Verify & Create account");
      }
    });
  }

  if (resendCodeBtnReg) {
    resendCodeBtnReg.addEventListener("click", async () => {
      const phone = (phoneInputReg?.value || "").trim();
      if (!phone) {
        toast("Enter your phone number first.", "err");
        return;
      }
      setLoading(resendCodeBtnReg, true);
      try {
        phoneConfirmation = await phoneLoginStart(phone, "recaptcha-container-reg");
        toast("Code re-sent. Check your SMS.", "ok");
      } catch (e) {
        toast(friendlyError(e), "err");
      } finally {
        setLoading(resendCodeBtnReg, false, "Resend");
      }
    });
  }
});
