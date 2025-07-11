import { auth, db } from "./config.js";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

/**
 * Listen to auth changes. Calls onChange({ user, profile }) or onChange(null).
 */
export function initAuthListener(onChange) {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      onChange(null);
      return;
    }
    let profile = null;
    if (!user.isAnonymous) {
      const snap = await getDoc(doc(db, "users", user.uid));
      profile = snap.exists() ? snap.data() : null;
    }
    onChange({ user, profile });
  });
}

/**
 * Sign in with Google popup.
 * On first login, seed Firestore profile.
 */
export async function googleLogin() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  const info = getAdditionalUserInfo(credential);

  if (info.isNewUser) {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      roles: ["customer"],     // Default to customer only
      employeeTypes: [],       // Always as array
      isAdmin: false,
      isOwner: false
      // No currentRole!
    });
  }
  return user;
}

/**
 * Sign in with Apple popup.
 * On first login, seed Firestore profile.
 */
export async function appleLogin() {
  const provider = new OAuthProvider("apple.com");
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  const info = getAdditionalUserInfo(credential);

  if (info.isNewUser) {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      roles: ["customer"],
      employeeTypes: [],
      isAdmin: false,
      isOwner: false
      // No currentRole!
    });
  }
  return user;
}

/**
 * Guest (anonymous) sign-in.
 */
export function guestBrowse() {
  return signInAnonymously(auth);
}

/**
 * Log out current user.
 */
export function logout() {
  return signOut(auth);
}

/**
 * Delete the current user’s Firestore profile AND Auth account.
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
}

/**
 * Update another user’s roles, employeeTypes, admin flags, etc.
 * Only admins/owners should call this in UI!
 * @param {string} uid - target user's uid
 * @param {Object} updates - fields to update (e.g. roles, employeeTypes, isAdmin)
 */
export async function updateUserProfile(uid, updates) {
  // Always ensure employeeTypes is an array (never a string)
  if ("employeeTypes" in updates) {
    if (typeof updates.employeeTypes === "string") {
      updates.employeeTypes = [updates.employeeTypes];
    }
    if (!Array.isArray(updates.employeeTypes)) {
      updates.employeeTypes = [];
    }
  }
  // SECURITY: Don't let a non-owner assign isOwner: true or remove the only owner
  // (Enforce this also with Firestore security rules!)
  return updateDoc(doc(db, "users", uid), updates);
}

/**
 * Fetch a user’s profile (for admin/staff management screens)
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Fetch all user profiles (for role-select UI)
 */
export async function getAllUsers() {
  const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js");
  const snapshot = await getDocs(collection(db, "users"));
  const users = [];
  snapshot.forEach(docSnap => {
    users.push({ uid: docSnap.id, ...docSnap.data() });
  });
  return users;
}

/**
 * Utility: check if profile has a given employeeType (array)
 * @example
 *   hasEmployeeType(profile, "admin")
 */
export function hasEmployeeType(profile, type) {
  return Array.isArray(profile?.employeeTypes) && profile.employeeTypes.includes(type);
}

/**
 * Utility: check if profile has a given role (array)
 * @example
 *   hasRole(profile, "customer")
 */
export function hasRole(profile, role) {
  return Array.isArray(profile?.roles) && profile.roles.includes(role);
}

/**
 * Utility: check if profile is admin/owner
 */
export function isAdmin(profile) {
  return !!profile?.isAdmin;
}
export function isOwner(profile) {
  return !!profile?.isOwner;
}
