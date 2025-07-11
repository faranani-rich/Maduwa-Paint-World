import { initAuthListener } from '../../authentication/auth.js'; // Adjust path as needed
import { saveProject } from './storage.js';
import { renderProjectList } from './ui.js';
import { emptyProject } from './models.js';

document.addEventListener('DOMContentLoaded', () => {
  // Wait for authentication before interacting with Firestore
  initAuthListener(async ({ user, profile }) => {
    if (!user) {
      alert('You must be signed in to view or manage projects.');
      // Optionally redirect to login
      // window.location.href = '/authentication/login.html';
      return;
    }

    // Render the current list of projects
    renderProjectList();

    // Handle "New Project" button
    const newProjectBtn = document.getElementById('new-project-btn');
    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', async () => {
        // 1. Create a fully structured empty project
        const newProj = emptyProject();

        // 2. Fill in default fields
        newProj.name = 'Untitled';
        newProj.createdAt = new Date().toISOString();
        newProj.ownerId = user.uid; // Auth user's ID

        // Optionally, use signed-in user as default project manager
        newProj.projectManager = {
          name: profile?.displayName || user.displayName || '',
          email: profile?.email || user.email || ''
        };

        // If you want to record who created the project (could also add createdBy field)
        // newProj.createdBy = { uid: user.uid, name: user.displayName, email: user.email };

        // 3. Save to Firestore
        await saveProject(newProj);
        renderProjectList();
      });
    }
  });
});
