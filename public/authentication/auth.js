// /authentication/auth.js
import { auth, db } from "./config.js";
import {
  // Core auth
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  deleteUser,

  // Popup providers
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,

  // Email/password
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  linkWithCredential,

  // Profile
  updateProfile,

  // Re-auth
  reauthenticateWithCredential,
  reauthenticateWithPopup,

  // Phone (SMS)
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,

  // Provider mgmt
  linkWithPopup,
  unlink,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

/* ──────────────────────────────────────────────────────────────
   Small navigation helpers for "Default start page"
   ────────────────────────────────────────────────────────────── */
export function resolveStartPage({ role = null } = {}) {
  // User preference from Settings
  const pref = (localStorage.getItem("app.defaultStartPage") || "auto").toLowerCase();
  if (pref === "customer") return "/customer/home.html";
  if (pref === "employee") return "/employee/employee-portal.html";

  // 'auto' — decide from explicit role or last known role (set in initAuthListener)
  const last = (role || localStorage.getItem("app.lastRole") || "customer").toLowerCase();
  return last === "employee" ? "/employee/employee-portal.html" : "/customer/home.html";
}

export function goToStartPage(opts = {}) {
  const url = resolveStartPage(opts);
  window.location.replace(url);
}

/* ──────────────────────────────────────────────────────────────
   Internal helpers
   ────────────────────────────────────────────────────────────── */
async function _ensureProfileExists(user) {
  if (!user || user.isAnonymous) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || null,
      phone: user.phoneNumber || null,
      name:
        user.displayName ||
        (user.email ? user.email.split("@")[0] : null) ||
        "Unknown",
      roles: ["customer"],
      employeeTypes: [],
      isAdmin: false,
      isOwner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function _syncProfileBasics(user) {
  if (!user || user.isAnonymous) return;
  try {
    await updateDoc(doc(db, "users", user.uid), {
      email: user.email || null,
      phone: user.phoneNumber || null,
      name:
        user.displayName ||
        (user.email ? user.email.split("@")[0] : null) ||
        null,
      updatedAt: serverTimestamp(),
    });
  } catch { /* ignore if not created yet */ }
}

async function _withRecentLogin(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e?.code === "auth/requires-recent-login") {
      const u = auth.currentUser;
      if (!u) throw e;
      const methods = u.email
        ? await fetchSignInMethodsForEmail(auth, u.email)
        : [];
      if (methods.includes("password")) {
        const pw = prompt("Re-enter your password to continue:");
        if (!pw) throw e;
        const cred = EmailAuthProvider.credential(u.email, pw);
        await reauthenticateWithCredential(u, cred);
      } else {
        await reauthenticateWithPopup(u, new GoogleAuthProvider());
      }
      return await fn();
    }
    throw e;
  }
}

/* ──────────────────────────────────────────────────────────────
   1) Auth state
   - Writes app.lastRole so "Automatic" start-page works.
   ────────────────────────────────────────────────────────────── */
export function initAuthListener(onChange) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      try { localStorage.removeItem("app.lastRole"); } catch {}
      onChange(null);
      return;
    }

    await _ensureProfileExists(user);
    await _syncProfileBasics(user);

    let profile = null;
    if (!user.isAnonymous) {
      const snap = await getDoc(doc(db, "users", user.uid));
      profile = snap.exists() ? snap.data() : null;

      // Determine role snapshot for navigation heuristics
      const isEmployee =
        Array.isArray(profile?.employeeTypes) && profile.employeeTypes.length > 0;
      try {
        localStorage.setItem("app.lastRole", isEmployee ? "employee" : "customer");
      } catch {}
    }

    onChange({ user, profile });
  });
}

/* ──────────────────────────────────────────────────────────────
   2) Sign in methods (Google, Apple, Guest, Email/Password)
   ────────────────────────────────────────────────────────────── */
export async function googleLogin() {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  await _ensureProfileExists(cred.user);
  await _syncProfileBasics(cred.user);
  return cred.user;
}

export async function appleLogin() {
  const cred = await signInWithPopup(auth, new OAuthProvider("apple.com"));
  await _ensureProfileExists(cred.user);
  await _syncProfileBasics(cred.user);
  return cred.user;
}

export function guestBrowse() {
  return signInAnonymously(auth);
}

export function logout() {
  return signOut(auth);
}

export async function emailLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await _ensureProfileExists(cred.user);
  await _syncProfileBasics(cred.user);
  return cred.user;
}

/* ──────────────────────────────────────────────────────────────
   3) Phone (SMS) sign-in + linking  ✅ UPDATED
   Public API (unchanged):
     const conf = await phoneLoginStart("+27…", "recaptcha-container");
     const user = await phoneLoginConfirm(conf, code);

     const conf = await linkPhoneStart("+27…", "recaptcha-container");
     await linkPhoneConfirm(conf, code);
   ────────────────────────────────────────────────────────────── */

// Singleton recaptcha instance we can reuse
let _recaptcha = null;
let _recaptchaContainerId = null;

/** Ensure a container exists; return the element */
function _ensureContainer(containerId = "recaptcha-container") {
  let el = document.getElementById(containerId);
  if (!el) {
    el = document.createElement("div");
    el.id = containerId;
    // Keep minimal size; invisible recaptcha still needs a node
    el.style.minHeight = "1px";
    el.style.minWidth = "1px";
    document.body.appendChild(el);
  }
  return el;
}

/** Get or create a RecaptchaVerifier (reused across calls) */
function _getRecaptcha(containerId = "recaptcha-container", size = "invisible") {
  _ensureContainer(containerId);

  // If we already have one bound to the same container, reuse it
  if (_recaptcha && _recaptchaContainerId === containerId) return _recaptcha;

  // If an old instance exists for a different container, clear it
  try { _recaptcha?.clear?.(); } catch {}
  _recaptcha = new RecaptchaVerifier(auth, containerId, {
    size, // "invisible" | "normal"
    callback: () => { /* solved */ },
    "expired-callback": () => { /* user can retry */ },
  });
  _recaptchaContainerId = containerId;
  return _recaptcha;
}

/** Clear the recaptcha if we hit a hard error (will recreate next time) */
function _resetRecaptcha() {
  try { _recaptcha?.clear?.(); } catch {}
  _recaptcha = null;
  _recaptchaContainerId = null;
}

export async function phoneLoginStart(
  phone,
  recaptchaContainerId = "recaptcha-container",
  { size = "invisible" } = {}
) {
  // Basic sanity: require E.164 format
  if (!phone || !phone.startsWith("+")) {
    const err = new Error("Invalid phone number format. Use +27…");
    err.code = "auth/invalid-phone-number";
    throw err;
  }
  const verifier = _getRecaptcha(recaptchaContainerId, size);
  try {
    // signInWithPhoneNumber renders the verifier if needed
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    return confirmation; // ConfirmationResult
  } catch (e) {
    // Recover from common recaptcha/render errors by resetting
    if (
      e?.code === "auth/app-not-authorized" ||
      e?.code === "auth/operation-not-allowed" ||
      e?.code === "auth/network-request-failed"
    ) {
      _resetRecaptcha();
    }
    throw e;
  }
}

export async function phoneLoginConfirm(confirmationResult, code) {
  if (!confirmationResult) {
    const err = new Error("Missing confirmation session. Request a code first.");
    err.code = "auth/missing-verification-code";
    throw err;
  }
  const cred = await confirmationResult.confirm((code || "").trim());
  await _ensureProfileExists(cred.user);
  await _syncProfileBasics(cred.user);
  return cred.user;
}

export async function linkPhoneStart(
  phone,
  recaptchaContainerId = "recaptcha-container",
  { size = "invisible" } = {}
) {
  if (!auth.currentUser) {
    throw new Error("Must be signed in to link a phone number.");
  }
  if (!phone || !phone.startsWith("+")) {
    const err = new Error("Invalid phone number format. Use +27…");
    err.code = "auth/invalid-phone-number";
    throw err;
  }
  const verifier = _getRecaptcha(recaptchaContainerId, size);
  try {
    const confirmation = await linkWithPhoneNumber(auth.currentUser, phone, verifier);
    return confirmation;
  } catch (e) {
    _resetRecaptcha();
    throw e;
  }
}

export async function linkPhoneConfirm(confirmationResult, code) {
  if (!confirmationResult) {
    const err = new Error("Send the verification code first.");
    err.code = "auth/missing-verification-code";
    throw err;
  }
  await confirmationResult.confirm((code || "").trim());
  await _syncProfileBasics(auth.currentUser);
  return auth.currentUser;
}

/* ──────────────────────────────────────────────────────────────
   4) Account management (profile, email, password, providers)
   ────────────────────────────────────────────────────────────── */
export async function saveProfile({ displayName, photoURL }) {
  const u = auth.currentUser;
  if (!u) throw new Error("No user");
  await _withRecentLogin(() =>
    updateProfile(u, {
      displayName: (displayName ?? "").trim() || null,
      photoURL: (photoURL ?? "").trim() || null,
    })
  );
  await _syncProfileBasics(auth.currentUser);
}

export async function changeEmail(newEmail) {
  const u = auth.currentUser;
  if (!u) throw new Error("No user");
  await _withRecentLogin(() => updateEmail(u, newEmail.trim()));
  await _syncProfileBasics(auth.currentUser);
}

export async function setOrChangePassword(newPassword) {
  const u = auth.currentUser;
  if (!u) throw new Error("No user");
  const methods = u.email ? await fetchSignInMethodsForEmail(auth, u.email) : [];
  if (methods.includes("password")) {
    await _withRecentLogin(() => updatePassword(u, newPassword));
  } else {
    const cred = EmailAuthProvider.credential(u.email, newPassword);
    await _withRecentLogin(() => linkWithCredential(u, cred));
  }
}

export function sendReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function linkGoogle() {
  await _withRecentLogin(() => linkWithPopup(auth.currentUser, new GoogleAuthProvider()));
}

export async function unlinkProvider(providerId) {
  const providers = currentProviderIds();
  if (providers.length <= 1) throw new Error("You cannot unlink your only sign-in method.");
  await _withRecentLogin(() => unlink(auth.currentUser, providerId));
}

export function currentProviderIds() {
  const u = auth.currentUser;
  return u ? u.providerData.map((p) => p.providerId) : [];
}

/* ──────────────────────────────────────────────────────────────
   5) Account deletion (with re-auth)
   ────────────────────────────────────────────────────────────── */
export async function deleteAccount() {
  const u = auth.currentUser;
  if (!u) throw new Error("No user is signed in");
  await _withRecentLogin(async () => {
    await deleteDoc(doc(db, "users", u.uid));
    await deleteUser(u);
  });
}

/* ──────────────────────────────────────────────────────────────
   6) Admin/owner utilities (unchanged API)
   ────────────────────────────────────────────────────────────── */
export async function updateUserProfile(uid, updates) {
  if ("employeeTypes" in updates) {
    if (typeof updates.employeeTypes === "string") {
      updates.employeeTypes = [updates.employeeTypes];
    }
    if (!Array.isArray(updates.employeeTypes)) {
      updates.employeeTypes = [];
    }
  }
  return updateDoc(doc(db, "users", uid), updates);
}
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}
export async function setUserRoles(uid, roles) {
  return updateDoc(doc(db, "users", uid), { roles });
}
export async function removeUser(uid) {
  await deleteDoc(doc(db, "users", uid));
}

/* ──────────────────────────────────────────────────────────────
   7) Tiny helpers (kept)
   ────────────────────────────────────────────────────────────── */
export const hasEmployeeType = (p, t) =>
  Array.isArray(p?.employeeTypes) && p.employeeTypes.includes(t);
export const hasRole = (p, r) =>
  Array.isArray(p?.roles) && p.roles.includes(r);
export const isAdmin = (p) => !!p?.isAdmin;
export const isOwner = (p) => !!p?.isOwner;
