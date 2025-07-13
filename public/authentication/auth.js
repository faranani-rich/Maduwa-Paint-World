// authentication/auth.js
import { auth, db } from "./config.js";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  deleteUser,
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
// If you ever need to delete arbitrary Auth users via Cloud Functions:
// import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-functions.js";

/* ------------------------------------------------------------------
   Auto-create a Firestore profile if it was deleted but the Auth user
   still exists (e.g. removed via Role-Assign).
   ------------------------------------------------------------------ */
export async function ensureProfileExists(user) {
  if (!user || user.isAnonymous) return;          // guests don’t get profiles
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      name:  user.displayName || user.email.split("@")[0],
      roles: ["customer"],          // every account is always a customer
      employeeTypes: [],
      isAdmin: false,
      isOwner: false,
      createdAt: serverTimestamp(),
    });
  }
}

/* =========================================================
   1.  Auth-state listener
   ========================================================= */
export function initAuthListener(onChange) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onChange(null);
      return;
    }

    // Re-seed minimal profile if missing
    await ensureProfileExists(user);

    // Fetch up-to-date profile data
    let profile = null;
    if (!user.isAnonymous) {
      const snap = await getDoc(doc(db, "users", user.uid));
      profile = snap.exists() ? snap.data() : null;
    }
    onChange({ user, profile });
  });
}

/* =========================================================
   2.  Sign-in helpers
   ========================================================= */
export async function googleLogin() {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  await ensureProfileExists(credential.user);
  return credential.user;
}

export async function appleLogin() {
  const credential = await signInWithPopup(auth, new OAuthProvider("apple.com"));
  await ensureProfileExists(credential.user);
  return credential.user;
}

export function guestBrowse() {
  return signInAnonymously(auth);   // anonymous guest
}

export function logout() {
  return signOut(auth);
}

/* =========================================================
   3.  Self-delete
   ========================================================= */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  await deleteDoc(doc(db, "users", user.uid));   // profile
  await deleteUser(user);                        // auth user
}

/* =========================================================
   4.  Admin / owner utilities
   ========================================================= */
export async function updateUserProfile(uid, updates) {
  // normalise employeeTypes
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

/* Basic fetch helpers */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/* Legacy: update roles array only */
export async function setUserRoles(uid, roles) {
  return updateDoc(doc(db, "users", uid), { roles });
}

/* Remove Firestore + (via Cloud Fn) Auth account */
export async function removeUser(uid) {
  await deleteDoc(doc(db, "users", uid));
  // Then call your secure Cloud Function if needed.
}

/* =========================================================
   5.  Tiny helpers
   ========================================================= */
export const hasEmployeeType = (p, t) =>
  Array.isArray(p?.employeeTypes) && p.employeeTypes.includes(t);

export const hasRole = (p, r) =>
  Array.isArray(p?.roles) && p.roles.includes(r);

export const isAdmin = (p) => !!p?.isAdmin;
export const isOwner = (p) => !!p?.isOwner;
