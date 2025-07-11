import { loadProjects, deleteProject } from './storage.js';

// Fetch and render all projects from Firestore
export async function renderProjectList() {
  const container = document.getElementById('projects-list');
  container.innerHTML = '';

  let projects = [];
  try {
    projects = await loadProjects();
  } catch (err) {
    container.textContent = "Couldn't load projects. Please try again later.";
    return;
  }

  if (projects.length === 0) {
    container.textContent = 'No projects yet. Click “New Project” to start one.';
    return;
  }

  projects.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <a class="project-link" href="project.html?id=${p.id}">
        <h2>${p.name || 'Untitled'}</h2>
        <p>Customer: ${p.customer || '—'}</p>
        <p>Location: ${p.location || '—'}</p>
      </a>
      <button class="delete-btn" data-id="${p.id}" title="Delete project">🗑️</button>
    `;
    container.appendChild(card);
  });

  // Attach delete handlers by project id
  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm("Are you sure you want to delete this project?")) {
        await deleteProject(id);
        renderProjectList(); // Re-render after delete
      }
    });
  });
}
