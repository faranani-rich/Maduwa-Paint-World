// /public/customer/dashboard.js

import { logout, initAuthListener } from "../authentication/auth.js";
import { getProjectsByCustomerEmail } from "../projects/js/storage.js";

// Logout button
document.getElementById("logoutBtn").onclick = async () => {
  try {
    await logout();
    window.location.href = "../authentication/login.html";
  } catch (err) {
    alert("Logout failed:\n" + err.message);
  }
};

// Back to home
document.getElementById("backBtn").onclick = () => {
  window.location.href = "home.html";
};

const statusFilter = document.getElementById("statusFilter");

initAuthListener(async ({ user, profile }) => {
  const statusEl = document.getElementById("statusMessage");
  const projectsSection = document.getElementById("projectsSection");
  const noProjectsSection = document.getElementById("noProjectsSection");
  const projectList = document.getElementById("projectList");

  if (!user || !user.email) {
    statusEl.innerHTML = "<p>Please sign in to view your dashboard.</p>";
    return;
  }

  const welcomeEl = document.getElementById("welcomeMessage");
  welcomeEl.textContent = `Welcome, ${profile?.name || user.email}!`;

  let allProjects = [];
  try {
    const normalizedEmail = user.email.trim().toLowerCase();
    allProjects = await getProjectsByCustomerEmail(normalizedEmail);
  } catch (err) {
    statusEl.innerHTML = `<p style="color: red;">Error loading projects: ${err.message}</p>`;
    return;
  }

  statusEl.style.display = "none";

  if (!allProjects || allProjects.length === 0) {
    noProjectsSection.style.display = "block";
    return;
  }

  // Setup filter logic
  statusFilter.onchange = () => renderProjects();
  renderProjects();

  function renderProjects() {
    const selectedStatus = statusFilter.value;
    projectList.innerHTML = "";

    const filtered = selectedStatus === "all"
      ? allProjects
      : allProjects.filter(p =>
          (p.status || "").toLowerCase() === selectedStatus.toLowerCase()
        );

    filtered.forEach(project => {
      const name = project.name || "Unnamed Project";
      const location = project.location || "—";
      const status = project.status || "—";
      const projectId = project.id;

      const card = document.createElement("div");
      card.className = "project-card";

      card.innerHTML = `
        <h3>${name}</h3>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Status:</strong> ${status}</p>

        <div class="card-buttons">
          <button class="btn view-btn" data-id="${projectId}">View Summary</button>
        </div>
      `;

      // View Summary → same tab
      card.querySelector(".view-btn").onclick = () => {
        window.location.href = `project-view.html?id=${projectId}`;
      };

      projectList.appendChild(card);
    });

    projectsSection.style.display = "block";
    noProjectsSection.style.display = "none";
  }
});
