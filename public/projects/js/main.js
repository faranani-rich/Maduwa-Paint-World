import { initAuthListener } from '../../authentication/auth.js'; // Adjust path as needed
import { saveProject } from './storage.js';
import { renderProjectList } from './ui.js';
import { emptyProject } from './models.js';

document.addEventListener('DOMContentLoaded', () => {
  // Wait for authentication before interacting with Firestore
  initAuthListener(async ({ user /*, profile*/ }) => {
    if (!user) {
      alert('You must be signed in to view or manage projects.');
      return;
    }

    // Render the current list of projects
    renderProjectList();

    // Handle “New Project” button
    const newProjectBtn = document.getElementById('new-project-btn');
    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', async () => {
        // 1. Create a fully structured empty project (with a unique id)
        const newProj = emptyProject();

        // 2. Essential defaults only — leave manager fields blank
        newProj.name       = 'Untitled';
        newProj.createdAt  = new Date().toISOString();
        newProj.ownerId    = user.uid;
        newProj.projectManager = {
          name:  '',   // user will fill in manually
          email: ''    // user will fill in manually
        };

        // 3. Save to Firestore
        await saveProject(newProj);

        // 4. Rerender or redirect as you prefer
        renderProjectList();
        // window.location.href = `project.html?id=${newProj.id}`;
      });
    }
  });
});
