// /authentication/profile.js

import {
  initAuthListener,
  logout,
  saveProfile,
  changeEmail,
  setOrChangePassword,
  sendReset,
  linkPhoneStart,
  linkPhoneConfirm,
  unlinkProvider,
  linkGoogle,
  currentProviderIds,
  deleteAccount
} from "./auth.js";

// Firebase Storage for photo uploads
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const $ = (id) => document.getElementById(id);
const msg = $("profileMessage");

function toast(text, type = "ok") {
  if (!msg) { alert(text); return; }
  msg.classList.remove("ok","err");
  msg.classList.add(type);
  msg.textContent = text;
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

function friendly(e) {
  const c = e?.code || "";
  switch (c) {
    case "auth/requires-recent-login": return "Please re-authenticate to continue.";
    case "auth/invalid-email": return "That email looks invalid.";
    case "auth/email-already-in-use": return "That email is already in use.";
    case "auth/weak-password": return "Password should be at least 6 characters.";
    case "auth/invalid-phone-number": return "Enter a valid phone number in international format (e.g. +27…).";
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code": return "Invalid or expired code.";
    default: return e?.message || "Something went wrong.";
  }
}

function roleBackHref(profile) {
  const params = new URLSearchParams(location.search);
  const from = params.get("from"); // "customer" or "employee"
  if (from === "customer") return "../customer/home.html";
  if (from === "employee") return "../employee/employee-portal.html";

  const isCustomer = Array.isArray(profile?.roles) && profile.roles.includes("customer");
  const isEmployee = Array.isArray(profile?.roles) && profile.roles.includes("employee")
                     && Array.isArray(profile?.employeeTypes) && profile.employeeTypes.length > 0;
  if (isEmployee && !isCustomer) return "../employee/employee-portal.html";
  if (isCustomer) return "../customer/home.html";
  return "./login.html";
}

function renderProviders() {
  const list = currentProviderIds();
  $("providerList").textContent = `Connected: ${list.length ? list.join(", ") : "none"}`;
}

/* ---------- Phone link flow state ---------- */
let linkConfirmation = null;
/* ---------- User cache ---------- */
let userCache = null;
let profileCache = null;

document.addEventListener("DOMContentLoaded", () => {
  // IMPORTANT: don't destructure; payload can be null on first tick.
  initAuthListener((payload) => {
    if (!payload || !payload.user) { location.href = "./login.html"; return; }
    const { user, profile } = payload;
    userCache = user;
    profileCache = profile || null;

    // Fill current values (allow user to set a name if none)
    $("nameInput").value  = user.displayName || profile?.displayName || "";
    $("photoInput").value = user.photoURL || "";
    $("emailCurrent").value = user.email || "";
    $("avatarPreview").src = user.photoURL || "https://dummyimage.com/96x96/ffffff/cccccc&text=%20";

    renderProviders();

    // Back + Logout
    $("backBtn").onclick = () => { location.href = roleBackHref(profileCache); };
    $("logoutBtn").onclick = async () => { await logout(); location.href = "./login.html"; };
  });

  // Save display name / photo URL
  $("saveProfileBtn").onclick = async () => {
    setLoading($("saveProfileBtn"), true);
    try {
      await saveProfile({
        displayName: $("nameInput").value.trim(),
        photoURL: $("photoInput").value.trim() || null
      });
      $("avatarPreview").src = $("photoInput").value.trim() || $("avatarPreview").src;
      toast("Profile saved.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("saveProfileBtn"), false, "Save profile");
    }
  };

  $("savePhotoUrlBtn").onclick = async () => {
    const url = $("photoInput").value.trim();
    if (!url) { toast("Enter a photo URL or upload a file.", "err"); return; }
    setLoading($("savePhotoUrlBtn"), true);
    try {
      await saveProfile({ photoURL: url });
      $("avatarPreview").src = url;
      toast("Photo updated.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("savePhotoUrlBtn"), false, "Use URL");
    }
  };

  // Upload & use photo (Firebase Storage)
  $("uploadPhotoBtn").onclick = async () => {
    const file = $("photoFile").files?.[0];
    if (!file) { toast("Choose an image to upload.", "err"); return; }
    if (!userCache) { toast("Not signed in.", "err"); return; }

    setLoading($("uploadPhotoBtn"), true);
    try {
      const storage = getStorage();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `users/${userCache.uid}/profile-${Date.now()}.${ext}`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
      const url = await getDownloadURL(r);

      $("photoInput").value = url;
      $("avatarPreview").src = url;
      await saveProfile({ photoURL: url });
      toast("Photo uploaded and set.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("uploadPhotoBtn"), false, "Upload & Use Photo");
    }
  };

  // Change email
  $("changeEmailBtn").onclick = async () => {
    const newEmail = $("emailNew").value.trim();
    if (!newEmail) { toast("Enter a new email.", "err"); return; }
    setLoading($("changeEmailBtn"), true);
    try {
      await changeEmail(newEmail);
      $("emailCurrent").value = newEmail;
      $("emailNew").value = "";
      toast("Email updated.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("changeEmailBtn"), false, "Update email");
    }
  };

  // Set or change password
  $("changePwBtn").onclick = async () => {
    const pw = $("newPw").value;
    if (!pw || pw.length < 6) { toast("Password should be at least 6 characters.", "err"); return; }
    setLoading($("changePwBtn"), true);
    try {
      await setOrChangePassword(pw);
      $("newPw").value = "";
      toast("Password saved.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("changePwBtn"), false, "Save password");
    }
  };

  // Send reset
  $("resetPwBtn").onclick = async () => {
    const email = $("emailCurrent").value;
    if (!email) { toast("No email on this account.", "err"); return; }
    setLoading($("resetPwBtn"), true);
    try {
      await sendReset(email);
      toast("Password reset email sent.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("resetPwBtn"), false, "Send password reset email");
    }
  };

  // Provider: Google
  $("linkGoogleBtn").onclick = async () => {
    setLoading($("linkGoogleBtn"), true);
    try {
      await linkGoogle();
      renderProviders();
      toast("Google linked.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("linkGoogleBtn"), false, "Link Google");
    }
  };
  $("unlinkGoogleBtn").onclick = async () => {
    setLoading($("unlinkGoogleBtn"), true);
    try {
      await unlinkProvider("google.com");
      renderProviders();
      toast("Google unlinked.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("unlinkGoogleBtn"), false, "Unlink Google");
    }
  };

  // Provider: Phone SMS (link)
  $("linkPhoneStartBtn").onclick = async () => {
    const phone = $("phoneInput").value.trim();
    if (!phone) { toast("Enter your phone number (e.g. +27…)", "err"); return; }
    setLoading($("linkPhoneStartBtn"), true);
    try {
      linkConfirmation = await linkPhoneStart(phone, "recaptcha-container-profile");
      $("phoneCodeRow").hidden = false;
      toast("Code sent. Check your SMS.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("linkPhoneStartBtn"), false, "Link phone - send code");
    }
  };

  $("linkPhoneConfirmBtn").onclick = async () => {
    if (!linkConfirmation) { toast("Request a code first.", "err"); return; }
    const code = $("phoneCodeInput").value.trim();
    if (!code) { toast("Enter the 6-digit code.", "err"); return; }
    setLoading($("linkPhoneConfirmBtn"), true);
    try {
      await linkPhoneConfirm(linkConfirmation, code);
      $("phoneCodeInput").value = "";
      renderProviders();
      toast("Phone linked.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("linkPhoneConfirmBtn"), false, "Verify & Link");
    }
  };

  $("resendPhoneBtn").onclick = async () => {
    const phone = $("phoneInput").value.trim();
    if (!phone) { toast("Enter your phone number first.", "err"); return; }
    setLoading($("resendPhoneBtn"), true);
    try {
      linkConfirmation = await linkPhoneStart(phone, "recaptcha-container-profile");
      toast("Code re-sent.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("resendPhoneBtn"), false, "Resend");
    }
  };

  $("unlinkPhoneBtn").onclick = async () => {
    setLoading($("unlinkPhoneBtn"), true);
    try {
      await unlinkProvider("phone"); // 'phone' is the providerId
      renderProviders();
      toast("Phone unlinked.", "ok");
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("unlinkPhoneBtn"), false, "Unlink phone");
    }
  };

  // Danger zone: delete account
  $("deleteBtn").onclick = async () => {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    setLoading($("deleteBtn"), true);
    try {
      await deleteAccount();
      location.href = "./login.html";
    } catch (e) {
      toast(friendly(e), "err");
    } finally {
      setLoading($("deleteBtn"), false, "Delete my account");
    }
  };
});
