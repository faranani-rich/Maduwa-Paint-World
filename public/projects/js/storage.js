/* eslint-env browser */

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const PROJECTS_COLLECTION = "projects";

/* -------------------------------------------------------------- *
 *  READ helpers                                                  *
 * -------------------------------------------------------------- */

// Load every project in the collection (for admin/employee use only)
export async function loadProjects() {
  const qs = await getDocs(collection(db, PROJECTS_COLLECTION));
  return qs.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Fetch a single project by id
export async function getProjectById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, PROJECTS_COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Fetch all projects for a customer by email (customer.email field)
export async function getProjectsByCustomerEmail(email) {
  if (!email) return [];
  const normalizedEmail = email.trim().toLowerCase();
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where("customer.email", "==", normalizedEmail)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/* -------------------------------------------------------------- *
 *  CREATE helpers                                                *
 * -------------------------------------------------------------- */

export async function addProject(project) {
  try {
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), project);
    return docRef.id;
  } catch (err) {
    if (
      err.code === "permission-denied" ||
      (typeof err.message === "string" &&
       err.message.includes("Missing or insufficient permissions"))
    ) {
      alert("Server blocked project creation – you don’t have permission.");
    }
    throw err;
  }
}

export async function saveProject(project) {
  if (!project || typeof project !== "object") {
    throw new Error("saveProject: project object required");
  }

  if (!project.id) {
    return await addProject(project);
  }

  try {
    const ref = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(ref, project);
    return project.id;
  } catch (err) {
    if (
      err.code === "permission-denied" ||
      (typeof err.message === "string" &&
       err.message.includes("Missing or insufficient permissions"))
    ) {
      alert("Server blocked project save – you don’t have permission.");
    }
    throw err;
  }
}

/* -------------------------------------------------------------- *
 *  UPDATE & DELETE helpers                                       *
 * -------------------------------------------------------------- */

export async function updateProject(id, updates) {
  if (!id) throw new Error("Project ID required for update");
  await updateDoc(doc(db, PROJECTS_COLLECTION, id), updates);
}

export async function deleteProject(id) {
  if (!id) throw new Error("Project ID required for delete");
  await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
}
