// customer/dashboard.js

import { logout, initAuthListener } from "../authentication/auth.js";
import { getProjectsByCustomerEmail } from "../projects/js/storage.js";

// --- Buttons ---
document.getElementById("logoutBtn").onclick = async () => {
  try {
    await logout();
    window.location.href = "../authentication/login.html";
  } catch (err) {
    alert("Logout failed:\n" + err.message);
  }
};

document.getElementById("backBtn").onclick = () => {
  window.location.href = "home.html";
};

const statusFilter = document.getElementById("statusFilter");

initAuthListener(async ({ user, profile }) => {
  const statusEl = document.getElementById("statusMessage");
  const projectsSection = document.getElementById("projectsSection");
  const noProjectsSection = document.getElementById("noProjectsSection");
  const projectList = document.getElementById("projectList");

  if (!user) {
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

  // --- Filter projects by status
  statusFilter.onchange = () => renderProjects();
  renderProjects();

  function renderProjects() {
    const selectedStatus = statusFilter.value;
    projectList.innerHTML = "";

    const filtered = selectedStatus === "all"
      ? allProjects
      : allProjects.filter(p => (p.status || "").toLowerCase() === selectedStatus.toLowerCase());

    filtered.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card";

      const name = project.name || "Unnamed Project";
      const location = project.location || "—";
      const status = project.status || "—";
      const startDate = project.startDate || "—";
      const email = project.customer?.email || "—";
      const projectId = project.id;

      card.innerHTML = `
        <h3>${name}</h3>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Start Date:</strong> ${startDate}</p>
        <p><strong>Customer Email:</strong> ${email}</p>
        <div class="card-buttons">
          <button class="btn view-btn" data-id="${projectId}">View</button>
          <button class="btn print-btn">Print</button>
          <button class="btn whatsapp-btn">Share via WhatsApp</button>
          <button class="btn pdf-btn">Export PDF</button>
        </div>
      `;

      // View handler
      card.querySelector(".view-btn").onclick = () => {
        window.location.href = `project-view.html?id=${projectId}`;
      };

      // Print handler
      card.querySelector(".print-btn").onclick = () => {
        window.print();
      };

      // WhatsApp Share
      card.querySelector(".whatsapp-btn").onclick = () => {
        const msg = `Maduwa Paint Project:\n${name}\nStatus: ${status}\nLocation: ${location}\nStart: ${startDate}`;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      };

      // Export PDF placeholder
      card.querySelector(".pdf-btn").onclick = () => {
        alert("PDF export coming soon! 📄");
      };

      projectList.appendChild(card);
    });

    projectsSection.style.display = "block";
    noProjectsSection.style.display = "none";
  }
});
