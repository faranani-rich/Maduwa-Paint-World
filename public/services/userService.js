// /services/userService.js
import { db } from "../authentication/config.js";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

/* =========================================================
   1. Query helpers
   ========================================================= */
export async function listAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/* =========================================================
   2. Legacy helper (roles array only)
   ========================================================= */
export async function updateUserRoles(uid, rolesArray) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { roles: rolesArray });
}

/* =========================================================
   3. Preferred helper (employeeTypes & flags)
      – Now supports **both** old (array) and new (object) signatures
   ========================================================= */
export async function updateUserEmployeeTypes(uid, payload) {
  const ref = doc(db, "users", uid);

  /* ---------- A. Back-compat  ---------- */
  if (Array.isArray(payload)) {
    const employeeTypes = payload;
    await updateDoc(ref, {
      employeeTypes,
      isAdmin: employeeTypes.includes("admin") || employeeTypes.includes("owner"),
      isOwner: employeeTypes.includes("owner"),
    });
    return;
  }

  /* ---------- B. New, flexible payload  ----------
     Expected shape:
        {
          roles: ["customer", "employee"],
          employeeTypes: ["admin", "accountant"],
          isAdmin: true,
          isOwner: false
        }
  */
  await updateDoc(ref, payload);
}

/* =========================================================
   4. Delete helper
   ========================================================= */
export async function deleteUserAccount(uid) {
  await deleteDoc(doc(db, "users", uid));
  // If you also remove the Auth user, call your Cloud Function here.
}
