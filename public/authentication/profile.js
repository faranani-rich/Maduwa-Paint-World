// /authentication/profile.js

import {
  initAuthListener,
  logout,
  saveProfile,
  changeEmail,
  setOrChangePassword,
  sendReset,
  unlinkProvider,
  linkGoogle,
  currentProviderIds,
  deleteAccount,
} from "./auth.js";

// Firebase Storage for photo uploads
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const $ = (id) => document.getElementById(id);
const msg = $("profileMessage");

function toast(text, type = "ok") {
  if (!msg) {
    alert(text);
    return;
  }
  msg.classList.remove("ok", "err");
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
    case "auth/requires-recent-login":
      return "Please re-authenticate to continue.";
    case "auth/invalid-email":
      return "That email looks invalid.";
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    default:
      return e?.message || "Something went wrong.";
  }
}

function roleBackHref(profile) {
  const params = new URLSearchParams(location.search);
  const from = params.get("from"); // "customer" or "employee"
  if (from === "customer") return "../customer/home.html";
  if (from === "employee") return "../employee/employee-portal.html";

  const isCustomer =
    Array.isArray(profile?.roles) && profile.roles.includes("customer");
  const isEmployee =
    Array.isArray(profile?.roles) &&
    profile.roles.includes("employee") &&
    Array.isArray(profile?.employeeTypes) &&
    profile.employeeTypes.length > 0;

  if (isEmployee && !isCustomer) return "../employee/employee-portal.html";
  if (isCustomer) return "../customer/home.html";
  return "./login.html";
}

function renderProviders() {
  const list = currentProviderIds();
  const el = $("providerList");
  if (!el) return;
  el.replaceChildren(); // clear
  const label = document.createElement("span");
  label.textContent = `Connected: ${list.length ? list.join(", ") : "none"}`;
  el.appendChild(label);
}

/* ---------- User cache ---------- */
let userCache = null;
let profileCache = null;

document.addEventListener("DOMContentLoaded", () => {
  // 1) Auth state & pre-fill fields
  initAuthListener((payload) => {
    if (!payload || !payload.user) {
      location.href = "./login.html";
      return;
    }
    const { user, profile } = payload;
    userCache = user;
    profileCache = profile || null;

    if ($("nameInput"))
      $("nameInput").value = user.displayName || profile?.displayName || "";
    if ($("photoInput")) $("photoInput").value = user.photoURL || "";
    if ($("emailCurrent")) $("emailCurrent").value = user.email || "";

    if ($("avatarPreview")) {
      $("avatarPreview").src =
        user.photoURL ||
        "https://dummyimage.com/96x96/ffffff/cccccc&text=%20";
    }

    renderProviders();

    // Back + Logout
    $("backBtn") &&
      ($("backBtn").onclick = () => {
        location.href = roleBackHref(profileCache);
      });
    $("logoutBtn") &&
      ($("logoutBtn").onclick = async () => {
        await logout();
        location.href = "./login.html";
      });
  });

  // 2) Save display name & photo URL together
  $("saveProfileBtn") &&
    ($("saveProfileBtn").onclick = async () => {
      setLoading($("saveProfileBtn"), true);
      try {
        await saveProfile({
          displayName: $("nameInput")?.value.trim(),
          photoURL: $("photoInput")?.value.trim() || null,
        });
        if ($("avatarPreview") && $("photoInput")) {
          $("avatarPreview").src =
            $("photoInput").value.trim() || $("avatarPreview").src;
        }
        toast("Profile saved.", "ok");
      } catch (e) {
        toast(friendly(e), "err");
      } finally {
        setLoading($("saveProfileBtn"), false, "Save profile");
      }
    });

  // 3) Apply photo URL only
  $("savePhotoUrlBtn") &&
    ($("savePhotoUrlBtn").onclick = async () => {
      const url = $("photoInput")?.value.trim();
      if (!url) {
        toast("Enter a photo URL or upload a file.", "err");
        return;
      }
      setLoading($("savePhotoUrlBtn"), true);
      try {
        await saveProfile({ photoURL: url });
        if ($("avatarPreview")) $("avatarPreview").src = url;
        toast("Photo updated.", "ok");
      } catch (e) {
        toast(friendly(e), "err");
      } finally {
        setLoading($("savePhotoUrlBtn"), false, "Use URL");
      }
    });

  // 4) Upload & use photo (Firebase Storage)
  $("uploadPhotoBtn") &&
    ($("uploadPhotoBtn").onclick = async () => {
      const file = $("photoFile")?.files?.[0];
      if (!file) {
        toast("Choose an image to upload.", "err");
        return;
      }
      if (!userCache) {
        toast("Not signed in.", "err");
        return;
      }

      setLoading($("uploadPhotoBtn"), true);
      try {
        const storage = getStorage();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `users/${userCache.uid}/profile-${Date.now()}.${ext}`;
        const r = ref(storage, path);
        await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
        const url = await getDownloadURL(r);

        if ($("photoInput")) $("photoInput").value = url;
        if ($("avatarPreview")) $("avatarPreview").src = url;
        await saveProfile({ photoURL: url });
        toast("Photo uploaded and set.", "ok");
      } catch (e) {
        toast(friendly(e), "err");
      } finally {
        setLoading($("uploadPhotoBtn"), false, "Upload & Use Photo");
      }
    });

  // 5) Change email
  $("changeEmailBtn") &&
    ($("changeEmailBtn").onclick = async () => {
      const newEmail = $("emailNew")?.value.trim();
      if (!newEmail) {
        toast("Enter a new email.", "err");
        return;
      }
      setLoading($("changeEmailBtn"), true);
      try {
        await changeEmail(newEmail);
        if ($("emailCurrent")) $("emailCurrent").value = newEmail;
        if ($("emailNew")) $("emailNew").value = "";
        toast("Email updated.", "ok");
      } catch (e) {
        toast(friendly(e), "err");
      } finally {
        setLoading($("changeEmailBtn"), false, "Update email");
      }
    });

  // 6) Set or change password
  $("changePwBtn") &&
    ($("changePwBtn").onclick = async () => {
      const pw = $("newPw")?.value;
      if (!pw || pw.length < 6) {
        toast("Password should be at least 6 characters.", "err");
        return;
      }
      setLoading($("changePwBtn"), true);
      try {
        await setOrChangePassword(pw);
        if ($("newPw")) $("newPw").value = "";
        toast("Password saved.", "ok");
      } catch (e) {
        toast(friendly(e), "err");
      } finally {
        setLoading($("changePwBtn"), false, "Save password");
      }
    });

  // 7) Send password reset
  $("resetPwBtn") &&
    ($("resetPwBtn").onclick = async () => {
      const email = $("emailCurrent")?.value;
      if (!email) {
        toast("No email on this account.", "err");
        return;
      }
      setLoading($("resetPwBtn"), true);
      try {
        await sendReset(email);
        toast("Password reset email sent.", "ok");
      } catch (e) {
        toast(friendly(e), "err");
      } finally {
        setLoading($("resetPwBtn"), false, "Send password reset email");
      }
    });

  // 8) Provider: Google link/unlink
  $("linkGoogleBtn") &&
    ($("linkGoogleBtn").onclick = async () => {
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
    });

  $("unlinkGoogleBtn") &&
    ($("unlinkGoogleBtn").onclick = async () => {
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
    });

  // 9) Danger zone: delete account
  $("deleteBtn") &&
    ($("deleteBtn").onclick = async () => {
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
    });
});
