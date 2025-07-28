import { getProjectById } from "../projects/js/storage.js";
import { initAuthListener } from "../authentication/auth.js";

// Back button
document.getElementById("backBtn").onclick = () => {
  window.location.href = "dashboard.html";
};

document.addEventListener("DOMContentLoaded", () => {
  initAuthListener(async ({ user, profile }) => {
    const statusEl = document.getElementById("statusMessage");
    const detailsEl = document.getElementById("projectDetails");

    if (!user?.email) {
      statusEl.textContent = "Please sign in to view this project.";
      return;
    }

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      statusEl.textContent = "Missing project ID.";
      return;
    }

    let project;
    try {
      project = await getProjectById(id);
    } catch (err) {
      console.error("🔥 Firestore fetch error:", err);
      statusEl.textContent = "Error fetching project: " + err.message;
      return;
    }

    if (!project) {
      statusEl.textContent = "Project not found.";
      return;
    }

    // 🔒 Customer access check
    const customerEmail = typeof project.customer === "string"
      ? project.customer
      : project.customer?.email;

    if (customerEmail !== user.email) {
      statusEl.textContent = "You do not have permission to view this project.";
      return;
    }

    // ✅ Passed access checks
    statusEl.style.display = "none";
    detailsEl.style.display = "block";

    const get = (val, fallback = "—") => val ?? fallback;

    // Project info
    document.getElementById("projectName").textContent     = get(project.name);
    document.getElementById("location").textContent        = get(project.location);
    document.getElementById("status").textContent          = get(project.status);
    document.getElementById("duration").textContent        = get(project.estimatedDuration);
    document.getElementById("progress").textContent        = `${get(project.progress?.percent, 0)}%`;
    document.getElementById("managerName").textContent     = get(project.projectManager?.name);
    document.getElementById("managerEmail").textContent    = get(project.projectManager?.email);
    document.getElementById("customerName").textContent    = get(profile?.name || "—");
    document.getElementById("customerEmail").textContent   = get(user.email);
    document.getElementById("notes").textContent           = get(project.notes);

    // Financials
    const quoted  = Number(project.quotedPrice || 0);
    const paid    = Number(typeof project.customer === "object" ? project.customer?.paid : 0);
    const balance = quoted - paid;

    document.getElementById("quotedPrice").textContent  = quoted.toFixed(2);
    document.getElementById("paymentMade").textContent  = paid.toFixed(2);
    document.getElementById("balanceDue").textContent   = balance.toFixed(2);

    // 🔘 Button: Print
    document.getElementById("printBtn").onclick = () => window.print();
  });
});
