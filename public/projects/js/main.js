// public/projects/js/main.js   (or adjust path to match your tree)
/* eslint-env browser */

import { initAuthListener }   from "../../authentication/auth.js";
import { saveProject }        from "./storage.js";
import { renderProjectList }  from "./ui.js";
import { emptyProject }       from "./models.js";
import { canCreateProject }   from "./permissions.js";   // ← NEW

let currentProfile = null;    // store profile for role checks

document.addEventListener("DOMContentLoaded", () => {

  /* -------------------------------------------------------------- *
   *  Wait for authentication before doing anything Firestore-y     *
   * -------------------------------------------------------------- */
  initAuthListener(async ({ user, profile }) => {
    if (!user || !profile) {
      alert("You must be signed in to view or manage projects.");
      return;
    }

    currentProfile = profile;          // keep the role info
    renderProjectList();               // list the existing projects

    /* ---------- “+ New Project” button ---------- */
    const newBtn = document.getElementById("new-project-btn");
    if (!newBtn) return;

    /* Hide button for unauthorised roles */
    if (!canCreateProject(currentProfile)) {
      newBtn.style.display = "none";   // or grey it out with CSS
      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("You do not have the authority to create a new project.");
      });
      return;   // done – no create handler attached
    }

    /* Authorised flow */
    newBtn.addEventListener("click", async () => {
      try {
        // 1. create skeleton doc
        const project = emptyProject();
        project.name      = "Untitled";
        project.createdAt = new Date().toISOString();
        project.ownerId   = user.uid;
        project.status    = "quotation";

        // 2. save to Firestore (saveProject returns the new id)
        const id = await saveProject(project);

        // 3. navigate straight into edit screen
        window.location.href = `project.html?id=${id}`;
        // Alternatively comment line above & just re-render list:
        // await renderProjectList();
      } catch (err) {
        alert("Failed to create project. Please try again.");
        console.error("[saveProject]", err);
      }
    });
  });
});
