// public/projects/js/ui.js
/* eslint-env browser */

import { initAuthListener } from "../../authentication/auth.js";
import { loadProjects, deleteProject } from "./storage.js";
import { canDeleteProject } from "./permissions.js";

let currentUser    = null;   // Firebase Auth user (for other future checks)
let currentProfile = null;   // User document (roles etc.)
let projects       = [];     // cache so we can re-render after deletes

/* -------------------------------------------------------------- *
 *  Auth listener → once we know who the user is, render list     *
 * -------------------------------------------------------------- */
initAuthListener(async ({ user, profile }) => {
  currentUser    = user;
  currentProfile = profile;   // <- keep the profile for role checks
  await renderProjectList();  // first render
});

/* -------------------------------------------------------------- *
 *  Fetch and render all projects                                 *
 * -------------------------------------------------------------- */
export async function renderProjectList() {
  const container = document.getElementById("projects-list");
  container.innerHTML = "Loading…";

  try {
    projects = await loadProjects();
  } catch (err) {
    console.error("[renderProjectList] failed:", err);
    container.textContent =
      "Couldn't load projects. Please try again later.";
    return;
  }

  if (projects.length === 0) {
    container.textContent =
      'No projects yet. Click “New Project” to start one.';
    return;
  }

  container.innerHTML = ""; // clear loading text

  projects.forEach((p) => {
    /* --- Smart customer display -------------------------------- */
    const customerName =
      typeof p.customer === "string"
        ? p.customer
        : (p.customer &&
            (p.customer.name ||
             p.customer.fullName ||
             p.customer.email)) || "—";

    const customerEmail =
      p.customer?.email && typeof p.customer.email === "string"
        ? p.customer.email
        : null;

    /* --- Card markup ------------------------------------------- */
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <a class="project-link" href="project.html?id=${p.id}">
        <h2>${p.name || "Untitled"}</h2>
        <p>Customer: ${customerName}${
          customerEmail && customerName !== customerEmail
            ? `<br><small>${customerEmail}</small>`
            : ""
        }</p>
        <p>Location: ${p.location || "—"}</p>
      </a>
      <button class="delete-btn" title="Delete project">🗑️</button>
    `;
    container.appendChild(card);

    /* --- Delete button logic ----------------------------------- */
    const deleteBtn   = card.querySelector(".delete-btn");
    const allowDelete = currentProfile && canDeleteProject(currentProfile);

    if (!allowDelete) {
      deleteBtn.classList.add("disabled");   // grey it out (optional CSS)
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("You do not have the authority to delete this project.");
      });
    } else {
      deleteBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to delete this project?")) {
          try {
            await deleteProject(p.id);
            await renderProjectList();       // re-render after delete
          } catch (err) {
            alert("Delete failed. Please try again.");
            console.error("[deleteProject]", err);
          }
        }
      });
    }
  });
}
