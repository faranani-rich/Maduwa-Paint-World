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
  where,
  serverTimestamp,           // ← add server timestamps
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const PROJECTS_COLLECTION = "projects";

/* --------------------------------------------------------------
   Helpers: normalize Firestore → UI
-------------------------------------------------------------- */

/** Convert Firestore Timestamp / ISO / Date → ISO string */
function toIso(val) {
  if (!val) return null;
  try {
    // Firestore Timestamp has a toDate()
    if (typeof val.toDate === "function") {
      return val.toDate().toISOString();
    }
    // Date instance
    if (val instanceof Date) return val.toISOString();
    // String: pass through if Date.parse works
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  } catch (_) {}
  return null;
}

/** Normalize status string to one of: quotation | approved | in-progress | completed */
function normalizeStatus(s) {
  const raw = (s || "").toString().trim().toLowerCase();
  if (!raw) return "quotation";
  const x = raw
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/in-progress|in\-progress/, "in-progress");
  if (["quotation", "approved", "in-progress", "completed"].includes(x)) return x;
  // map a few common variants to our canonical set
  if (raw.includes("progress")) return "in-progress";
  if (raw.includes("quote"))    return "quotation";
  if (raw.includes("complete")) return "completed";
  if (raw.includes("approve"))  return "approved";
  return "quotation";
}

/** UI-facing projection: keeps original fields, adds flat ones used by main.js */
function normalizeProject(p) {
  const createdAt = toIso(p.createdAt) || toIso(p.created_at) || null;
  const modifiedAt = toIso(p.modifiedAt) || toIso(p.updatedAt) || toIso(p.modified_at) || createdAt;

  // Customer might be an object { name, email } or just a string
  const customerName =
    (p.customer && typeof p.customer === "object" && p.customer.name) ||
    (typeof p.customer === "string" ? p.customer : p.customerName) ||
    "";

  return {
    ...p,
    // UI-simple fields:
    name: p.name || "Untitled",
    customer: customerName,
    location: p.location || "",
    status: normalizeStatus(p.status),
    createdAt: createdAt || new Date(0).toISOString(),
    modifiedAt: modifiedAt || createdAt || new Date(0).toISOString(),
  };
}

/* --------------------------------------------------------------
   READ
-------------------------------------------------------------- */

// Load every project in the collection (for admin/employee use only)
export async function loadProjects() {
  const qs = await getDocs(collection(db, PROJECTS_COLLECTION));
  return qs.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * New: listProjects() — what main.js consumes.
 * Returns records already normalized for the UI.
 */
export async function listProjects() {
  const raw = await loadProjects();
  return raw.map(normalizeProject);
}

// Fetch a single project by id
export async function getProjectById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, PROJECTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return normalizeProject({ id: snap.id, ...snap.data() });
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
  return snapshot.docs.map(d => normalizeProject({ id: d.id, ...d.data() }));
}

/* --------------------------------------------------------------
   CREATE
-------------------------------------------------------------- */

export async function addProject(project) {
  try {
    const nowIso = new Date().toISOString();
    const payload = {
      ...project,
      // ensure canon status + timestamps
      status: normalizeStatus(project.status),
      createdAt: project.createdAt || nowIso,
      modifiedAt: project.modifiedAt || nowIso,
      // server authoritative timestamps (optional, useful for queries)
      _createdAt: serverTimestamp(),
      _modifiedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
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

/**
 * Save (create or replace) a project document.
 * - If project.id is missing → create
 * - Always sets normalized status and updated modifiedAt
 */
export async function saveProject(project) {
  if (!project || typeof project !== "object") {
    throw new Error("saveProject: project object required");
  }

  const nowIso = new Date().toISOString();
  const payload = {
    ...project,
    status: normalizeStatus(project.status),
    // make sure these exist when writing
    createdAt: project.createdAt || nowIso,
    modifiedAt: nowIso,
    _modifiedAt: serverTimestamp(),
  };

  if (!project.id) {
    return await addProject(payload);
  }

  try {
    const ref = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(ref, payload, { merge: true });
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

/* --------------------------------------------------------------
   UPDATE & DELETE
-------------------------------------------------------------- */

export async function updateProject(id, updates) {
  if (!id) throw new Error("Project ID required for update");
  const patch = {
    ...updates,
    status: updates.status ? normalizeStatus(updates.status) : undefined,
    modifiedAt: new Date().toISOString(),
    _modifiedAt: serverTimestamp(),
  };
  // remove undefined keys so we don't write them
  Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
  await updateDoc(doc(db, PROJECTS_COLLECTION, id), patch);
}

export async function deleteProject(id) {
  if (!id) throw new Error("Project ID required for delete");
  await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
}
