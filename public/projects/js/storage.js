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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const PROJECTS_COLLECTION = "projects";

/* --------------------------------------------------------------
   Helpers
-------------------------------------------------------------- */

/** Convert Firestore Timestamp / ISO / Date → ISO string */
function toIso(val) {
  if (!val) return null;
  try {
    if (typeof val.toDate === "function") return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  } catch (_) {}
  return null;
}

/** Normalize status string to: quotation | approved | in-progress | completed */
function normalizeStatus(s) {
  const raw = (s || "").toString().trim().toLowerCase();
  if (!raw) return "quotation";
  const x = raw.replace(/_/g, "-").replace(/\s+/g, "-");
  if (["quotation", "approved", "in-progress", "completed"].includes(x)) return x;
  if (raw.includes("progress")) return "in-progress";
  if (raw.includes("quote")) return "quotation";
  if (raw.includes("complete")) return "completed";
  if (raw.includes("approve")) return "approved";
  return "quotation";
}

/** Ensure we always have an OBJECT shape for nested maps */
function asObject(val, fallback = {}) {
  return val && typeof val === "object" ? val : fallback;
}

/** Normalize a project for UI without destroying nested shapes */
function normalizeProject(p) {
  const createdAt = toIso(p.createdAt) || toIso(p.created_at) || null;
  const modifiedAt = toIso(p.modifiedAt) || toIso(p.updatedAt) || toIso(p.modified_at) || createdAt;

  // Keep customer as an OBJECT (critical fix)
  const customerObj = asObject(p.customer, {});
  const customerNameFlat =
    customerObj.name ||
    (typeof p.customer === "string" ? p.customer : p.customerName) ||
    "";

  const projectManagerObj = asObject(p.projectManager, {});

  // Keep lines as objects/arrays (don’t stringify)
  const lines = asObject(p.lines, {});
  lines.employees    = Array.isArray(lines.employees)    ? lines.employees    : [];
  lines.bucketLabour = Array.isArray(lines.bucketLabour) ? lines.bucketLabour : [];
  lines.paints       = Array.isArray(lines.paints)       ? lines.paints       : [];
  lines.vehicles     = Array.isArray(lines.vehicles)     ? lines.vehicles     : [];
  lines.expenses     = Array.isArray(lines.expenses)     ? lines.expenses     : [];

  return {
    ...p,
    name: p.name || "Untitled",
    location: p.location || "",
    status: normalizeStatus(p.status),
    createdAt: createdAt || new Date(0).toISOString(),
    modifiedAt: modifiedAt || createdAt || new Date(0).toISOString(),

    // Keep nested objects intact:
    customer: {
      name: customerObj.name || "",
      email: (customerObj.email || "").toLowerCase(),
      paid: Number(customerObj.paid || 0),
    },
    projectManager: {
      name: projectManagerObj.name || "",
      email: (projectManagerObj.email || "").toLowerCase(),
    },
    budgets: asObject(p.budgets, {
      hourly: 0, bucket: 0, paints: 0, vehicles: 0, other: 0,
    }),
    progress: asObject(p.progress, { percent: 0, comment: "" }),
    lines,

    // Convenience flat field for lists that used to rely on a string:
    customerName: customerNameFlat,
  };
}

/* --------------------------------------------------------------
   READ
-------------------------------------------------------------- */

// Load every project (admin/employee use)
export async function loadProjects() {
  const qs = await getDocs(collection(db, PROJECTS_COLLECTION));
  return qs.docs.map(d => normalizeProject({ id: d.id, ...d.data() }));
}

/** listProjects(): normalized records for UI lists */
export async function listProjects() {
  return await loadProjects();
}

// Fetch a single project by id (normalized, with customer kept as object)
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
      status: normalizeStatus(project.status),
      createdAt: project.createdAt || nowIso,
      modifiedAt: project.modifiedAt || nowIso,
      _createdAt: serverTimestamp(),
      _modifiedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
    return docRef.id;
  } catch (err) {
    if (
      err.code === "permission-denied" ||
      (typeof err.message === "string" && err.message.includes("Missing or insufficient permissions"))
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
      (typeof err.message === "string" && err.message.includes("Missing or insufficient permissions"))
    ) {
      alert("Server blocked project save – you don’t have permission.");
    }
    throw err;
  }
}

/* --------------------------------------------------------------
   UPDATE & DELETE
-------------------------------------------------------------- */

/**
 * Robust update that preserves/updates nested maps like customer and projectManager.
 * Prefers setDoc(..., {merge:true}); falls back to updateDoc with dotted paths if needed.
 */
export async function updateProject(id, updates) {
  if (!id) throw new Error("Project ID required for update");

  // Build a payload with timestamps and normalized status, but KEEP objects intact.
  const payload = {
    ...updates,
    ...(updates.status ? { status: normalizeStatus(updates.status) } : null),
    modifiedAt: new Date().toISOString(),
    _modifiedAt: serverTimestamp(),
  };

  // Remove undefined so we don’t clobber fields with undefined
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const ref = doc(db, PROJECTS_COLLECTION, id);

  // First try a merge write (handles nested objects in most cases)
  try {
    await setDoc(ref, payload, { merge: true });
    return;
  } catch (e) {
    // If there’s a legacy type conflict (e.g., customer was a string), we’ll fix it below.
    console.warn("setDoc(merge) failed in updateProject; retrying with targeted patch:", e);
  }

  // Fallback: patch with dotted paths for problematic nested maps
  const upd = {};

  if (payload.customer && typeof payload.customer === "object") {
    upd["customer.name"]  = payload.customer.name  || "";
    upd["customer.email"] = (payload.customer.email || "").toLowerCase();
    upd["customer.paid"]  = Number(payload.customer.paid || 0);
  }
  if (payload.projectManager && typeof payload.projectManager === "object") {
    upd["projectManager.name"]  = payload.projectManager.name  || "";
    upd["projectManager.email"] = (payload.projectManager.email || "").toLowerCase();
  }

  // primitives / other objects we trust to merge as-is
  [
    "name","location","status","notes","quotedPrice",
    "estimatedDuration","hoursWorked","progress","internalNotes","budgets","lines","teamEmails","managerEmail"
  ].forEach(k => {
    if (k in payload && upd[k] === undefined) upd[k] = payload[k];
  });

  upd._modifiedAt = serverTimestamp();
  upd.modifiedAt  = new Date().toISOString();

  await updateDoc(ref, upd);
}

export async function deleteProject(id) {
  if (!id) throw new Error("Project ID required for delete");
  await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
}
