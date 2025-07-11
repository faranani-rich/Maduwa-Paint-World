// js/storage.js

// Import Firestore dependencies & your Firebase config
import { db } from './firebase-config.js'; // Export db from your config file!
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// The Firestore collection for your projects
const PROJECTS_COLLECTION = "projects";

// Get all projects from Firestore
export async function loadProjects() {
  const querySnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

// Add a new project to Firestore
export async function saveProject(project) {
  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), project);
  // Return new project with assigned Firestore id
  return { id: docRef.id, ...project };
}

// Fetch a single project by ID from Firestore
export async function getProjectById(id) {
  if (!id) return null;
  const ref = doc(db, PROJECTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Update an existing project in Firestore
export async function updateProject(id, updates) {
  if (!id) throw new Error("Project ID required for update");
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  await updateDoc(docRef, updates);
}

// Delete a project by ID
export async function deleteProject(id) {
  if (!id) throw new Error("Project ID required for delete");
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  await deleteDoc(docRef);
}
