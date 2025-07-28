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
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

/* ------------------------------------------------------------------
   Auto-create a Firestore profile if it was deleted but the Auth user
   still exists (e.g. removed via Role-Assign).
   ------------------------------------------------------------------ */
export async function ensureProfileExists(user) {
  if (!user || user.isAnonymous) return; // guests don’t get profiles
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || null,
      phone: user.phoneNumber || null,
      name: user.displayName || user.email?.split("@")[0] || "Unknown",
      roles: ["customer"],
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

    await ensureProfileExists(user);

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
  return signInAnonymously(auth);
}

export function logout() {
  return signOut(auth);
}

/* ✅ NEW: Email + Password login */
export async function emailLogin(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureProfileExists(credential.user);
  return credential.user;
}

/* ✅ NEW: Phone + Password login (requires email lookup) */
export async function phoneLogin(phone, password) {
  // Step 1: Query Firestore for email matching the phone number
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("phone", "==", phone));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("No account found with that phone number.");
  }

  const userDoc = snap.docs[0];
  const userData = userDoc.data();

  if (!userData.email) {
    throw new Error("This phone number is not linked to an email/password account.");
  }

  // Step 2: Use found email to sign in
  const credential = await signInWithEmailAndPassword(auth, userData.email, password);
  await ensureProfileExists(credential.user);
  return credential.user;
}

/* =========================================================
   3.  Self-delete
   ========================================================= */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  await deleteDoc(doc(db, "users", user.uid)); // profile
  await deleteUser(user);                      // auth user
}

/* =========================================================
   4.  Admin / owner utilities
   ========================================================= */
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

/* =========================================================
   5.  Tiny helpers
   ========================================================= */
export const hasEmployeeType = (p, t) =>
  Array.isArray(p?.employeeTypes) && p.employeeTypes.includes(t);

export const hasRole = (p, r) =>
  Array.isArray(p?.roles) && p.roles.includes(r);

export const isAdmin = (p) => !!p?.isAdmin;
export const isOwner = (p) => !!p?.isOwner;
