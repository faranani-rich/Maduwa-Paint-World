import { getProjectById } from "../projects/js/storage.js";

document.getElementById("backBtn").onclick = () => {
  window.location.href = "dashboard.html";
};

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const statusEl = document.getElementById("statusMessage");
  const nameEl = document.getElementById("projectName");
  const detailsEl = document.getElementById("projectDetails");

  if (!id) {
    statusEl.textContent = "Missing project ID.";
    return;
  }

  let project;
  try {
    project = await getProjectById(id);
  } catch (err) {
    statusEl.textContent = "Error fetching project: " + err.message;
    return;
  }

  if (!project) {
    statusEl.textContent = "Project not found.";
    return;
  }

  // Show project
  statusEl.style.display = "none";
  detailsEl.style.display = "block";

  nameEl.textContent = project.name || "Unnamed Project";

  // Fill basic info
  document.getElementById("location").textContent = project.location || "—";
  document.getElementById("status").textContent = project.status || "—";
  document.getElementById("startDate").textContent = project.startDate || "—";
  document.getElementById("endDate").textContent = project.endDate || "—";
  document.getElementById("customerName").textContent = project.customer?.name || "—";
  document.getElementById("email").textContent = project.customer?.email || "—";

  // Render tables
  renderTable("employeesTable", project?.lines?.employees, renderEmployeeRow);
  renderTable("paintsTable", project?.lines?.paints, renderPaintRow);
  renderTable("vehiclesTable", project?.lines?.vehicles, renderVehicleRow);
  renderTable("overheadsTable", project?.lines?.overheads, renderOverheadRow);

  // Totals
  const totals = calculateProjectTotals(project);
  document.getElementById("employeeTotal").textContent = totals.labour.toFixed(2);
  document.getElementById("paintTotal").textContent = totals.paints.toFixed(2);
  document.getElementById("vehicleTotal").textContent = totals.vehicles.toFixed(2);
  document.getElementById("overheadTotal").textContent = totals.overheads.toFixed(2);
  document.getElementById("markup").textContent = `${totals.markupPct.toFixed(2)}%`;
  document.getElementById("grandTotal").textContent = totals.totalWithMarkup.toFixed(2);

  // WhatsApp Share
  document.getElementById("whatsappBtn").onclick = () => {
    const msg = `Project: ${project.name || "Unnamed"}\nLocation: ${project.location}\nStatus: ${project.status}\nTotal: R${totals.totalWithMarkup.toFixed(2)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Print
  document.getElementById("printBtn").onclick = () => {
    window.print();
  };

  // PDF Export
  document.getElementById("pdfBtn").onclick = () => {
    import("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js").then(() => {
      const element = document.querySelector("main");
      const opt = {
        margin: 0.4,
        filename: `${project.name || "project"}-summary.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };
      html2pdf().set(opt).from(element).save();
    });
  };
});

// Helpers
function renderTable(tableId, rows, renderFn) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";
  if (!Array.isArray(rows)) return;
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = renderFn(row);
    tbody.appendChild(tr);
  });
}

// Row renderers
function renderEmployeeRow(e) {
  return `
    <td>${e.name || ""}</td>
    <td>${e.role || ""}</td>
    <td>${e.hours || 0}</td>
    <td>${e.overtimeHours || 0}</td>
    <td>${e.normalRate || 0}</td>
    <td>${e.overtimeRate || 0}</td>
    <td>${e.bonus || 0}</td>
    <td>${e.total || 0}</td>
  `;
}

function renderPaintRow(p) {
  return `
    <td>${p.item || ""}</td>
    <td>${p.qty || 0}</td>
    <td>${p.price || 0}</td>
    <td>${p.total || 0}</td>
  `;
}

function renderVehicleRow(v) {
  return `
    <td>${v.name || ""}</td>
    <td>${v.rate || 0}</td>
    <td>${v.trips || 0}</td>
    <td>${v.total || 0}</td>
  `;
}

function renderOverheadRow(o) {
  return `
    <td>${o.desc || ""}</td>
    <td>${o.total || 0}</td>
  `;
}

function calculateProjectTotals(project) {
  const safeSum = (arr, field) =>
    Array.isArray(arr) ? arr.reduce((sum, x) => sum + (parseFloat(x[field]) || 0), 0) : 0;

  const labour = safeSum(project?.lines?.employees, "total");
  const paints = safeSum(project?.lines?.paints, "total");
  const vehicles = safeSum(project?.lines?.vehicles, "total");
  const overheads = safeSum(project?.lines?.overheads, "total");
  const markupPct = parseFloat(project.markupPct) || 0;
  const base = labour + paints + vehicles + overheads;
  const totalWithMarkup = base * (1 + markupPct / 100);

  return { labour, paints, vehicles, overheads, markupPct, totalWithMarkup };
}
