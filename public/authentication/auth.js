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

/* --------------------------------------------------------------
   Small navigation helpers for "Default start page"
   -------------------------------------------------------------- */
export function resolveStartPage({ role = null } = {}) {
  const pref = (localStorage.getItem("app.defaultStartPage") || "auto").toLowerCase();
  if (pref === "customer") return "/customer/home.html";
  if (pref === "employee") return "/employee/employee-portal.html";

  const last = (role || localStorage.getItem("app.lastRole") || "customer").toLowerCase();
  return last === "employee" ? "/employee/employee-portal.html" : "/customer/home.html";
}

export function goToStartPage(opts = {}) {
  const url = resolveStartPage(opts);
  window.location.replace(url);
}

/* --------------------------------------------------------------
   Internal helpers
   -------------------------------------------------------------- */
async function _ensureProfileExists(user) {
  if (!user || user.isAnonymous) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || null,
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
      name:
        user.displayName ||
        (user.email ? user.email.split("@")[0] : null) ||
        null,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* ignore if profile not created yet */
  }
}

async function _withRecentLogin(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e?.code === "auth/requires-recent-login") {
      const u = auth.currentUser;
      if (!u) throw e;
      const methods = u.email ? await fetchSignInMethodsForEmail(auth, u.email) : [];
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

/* --------------------------------------------------------------
   1) Auth state
   - Writes app.lastRole so "Automatic" start-page works.
   -------------------------------------------------------------- */
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

      const isEmployee =
        Array.isArray(profile?.employeeTypes) && profile.employeeTypes.length > 0;
      try {
        localStorage.setItem("app.lastRole", isEmployee ? "employee" : "customer");
      } catch {}
    }

    onChange({ user, profile });
  });
}

/* --------------------------------------------------------------
   2) Sign in methods (Google, Apple, Guest, Email/Password)
   -------------------------------------------------------------- */
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

/* --------------------------------------------------------------
   3) Account management (profile, email, password, providers)
   -------------------------------------------------------------- */
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

/* --------------------------------------------------------------
   4) Account deletion (with re-auth)
   -------------------------------------------------------------- */
export async function deleteAccount() {
  const u = auth.currentUser;
  if (!u) throw new Error("No user is signed in");
  await _withRecentLogin(async () => {
    await deleteDoc(doc(db, "users", u.uid));
    await deleteUser(u);
  });
}

/* --------------------------------------------------------------
   5) Admin/owner utilities (unchanged API)
   -------------------------------------------------------------- */
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

/* --------------------------------------------------------------
   6) Tiny helpers (kept)
   -------------------------------------------------------------- */
export const hasEmployeeType = (p, t) =>
  Array.isArray(p?.employeeTypes) && p.employeeTypes.includes(t);
export const hasRole = (p, r) =>
  Array.isArray(p?.roles) && p.roles.includes(r);
export const isAdmin = (p) => !!p?.isAdmin;
export const isOwner = (p) => !!p?.isOwner;
