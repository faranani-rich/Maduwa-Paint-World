// public/projects/js/project.js
/* eslint-env browser */

// ─── Imports ────────────────────────────────────────────────────────────────
import { initAuthListener } from "../../authentication/auth.js";
import { getProjectById, updateProject } from "./storage.js";
import { projectTotals, calculateProgressPercent } from "./calc.js";
import {
  canEditProject,
  canDeleteProject
} from "./permissions.js";

// ─── Constants ──────────────────────────────────────────────────────────────
const EMPLOYEE_FIELDS = [
  "name",
  "role",
  "hours",
  "overtimeHours",
  "normalRate",
  "overtimeRate",
  "bonus"
];

/* ------------------------------------------------------------------ *
 *  Utility: mirror any <input>/<select>/<textarea> with a span that  *
 *  survives @media print on all devices.                             *
 * ------------------------------------------------------------------ */
function attachPrintMirror(el) {
  if (el.nextElementSibling?.classList.contains("print-value")) return; // avoid duplicates
  const span = document.createElement("span");
  span.className  = "print-value";
  span.textContent = readValue(el);
  el.insertAdjacentElement("afterend", span);

  const update = () => (span.textContent = readValue(el));
  el.addEventListener("input", update);
  if (el.tagName === "SELECT") el.addEventListener("change", update);
}
function readValue(el) {
  return el.tagName === "SELECT"
    ? el.options[el.selectedIndex]?.text || ""
    : el.value;
}

/* ------------------------------------------------------------------ *
 *  Calculate employee total pay                                      *
 * ------------------------------------------------------------------ */
function calcEmployeeTotalPay(emp) {
  return (
    (parseFloat(emp.hours) || 0)       * (parseFloat(emp.normalRate)   || 0) +
    (parseFloat(emp.overtimeHours) || 0) * (parseFloat(emp.overtimeRate) || 0) +
    (parseFloat(emp.bonus)        || 0)
  );
}

/* ------------------------------------------------------------------ *
 *  Main                                                               *
 * ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initAuthListener(async ({ user, profile }) => {
    if (!user || !profile) {
      return (window.location.href = "../authentication/login.html");
    }

    /* ─── Load project doc ───────────────────────────────────────── */
    const params    = new URLSearchParams(window.location.search);
    const projectId = params.get("id");
    let   project   = projectId ? await getProjectById(projectId) : null;
    if (!project) {
      document.body.innerHTML = "<p>Project not found.</p>";
      return;
    }

    /* ─── Permissions via permissions.js ────────────────────────── */
    const canEdit   = canEditProject(project, profile);
    const canDelete = canDeleteProject(project, user);

    /* ─── Ensure line arrays exist ──────────────────────────────── */
    project.lines = project.lines || {
      employees : [],
      paints    : [],
      vehicles  : [],
      materials : [],
      expenses  : []
    };
    ["employees", "paints", "vehicles", "materials", "expenses"].forEach(k => {
      if (!Array.isArray(project.lines[k])) project.lines[k] = [];
    });

    /* ─── Cache DOM ─────────────────────────────────────────────── */
    const form             = document.getElementById("project-form");
    const nameInput        = form.querySelector('input[name="name"]');
    const locationInput    = form.querySelector('input[name="location"]');
    const statusSelect     = form.querySelector('select[name="status"]');
    const notesInput       = form.querySelector('textarea[name="notes"]');
    const markupInput      = form.querySelector('input[name="markupPct"]');
    const pmNameInput      = form.querySelector('input[name="pm-name"]');
    const pmEmailInput     = form.querySelector('input[name="pm-email"]');
    const custNameInput    = form.querySelector('input[name="cust-name"]');
    const custEmailInput   = form.querySelector('input[name="cust-email"]');
    const estDurationInput = form.querySelector('input[name="estimated-duration"]');
    const hoursWorkedInput = form.querySelector('input[name="hours-worked"]');
    const progressInput    = form.querySelector('input[name="progress"]');
    const progressComment  = form.querySelector('textarea[name="progress-comment"]');
    const internalNotes    = form.querySelector('textarea[name="internal-notes"]');
    const totalsEl         = document.getElementById("totals");

    const addEmpBtn   = document.getElementById("add-employee-btn");
    const addPaintBtn = document.getElementById("add-paint-btn");
    const addMatBtn   = document.getElementById("add-material-btn");
    const addVehBtn   = document.getElementById("add-vehicle-btn");
    const addExpBtn   = document.getElementById("add-expense-btn");

    const printCustBtn = document.getElementById("print-customer-btn");
    const printIntBtn  = document.getElementById("print-internal-btn");

    /* ─── Lock UI if user cannot edit ───────────────────────────── */
    if (!canEdit) {
      form
        .querySelectorAll("input, select, textarea, button[type='submit']")
        .forEach(el => {
          if (el.type === "submit") el.style.display = "none";
          else el.disabled = true;
        });
      [addEmpBtn, addPaintBtn, addMatBtn, addVehBtn, addExpBtn].forEach(btn => {
        if (btn) btn.style.display = "none";
      });
    }

    /* ─── Populate static inputs ────────────────────────────────── */
    nameInput.value        = project.name          || "";
    locationInput.value    = project.location      || "";
    statusSelect.value     = project.status        || "quotation";
    notesInput.value       = project.notes         || "";
    markupInput.value      = project.markupPct     || 0;
    pmNameInput.value      = project.projectManager?.name  || "";
    pmEmailInput.value     = project.projectManager?.email || "";
    custNameInput.value    = project.customer?.name        || "";
    custEmailInput.value   = project.customer?.email       || "";
    estDurationInput.value = project.estimatedDuration     || "";
    hoursWorkedInput.value = project.hoursWorked           || "";
    progressInput.value    = project.progress?.percent     || 0;
    progressComment.value  = project.progress?.comment     || "";
    internalNotes.value    = project.internalNotes         || "";

    /* ─── Print mirrors for static inputs ───────────────────────── */
    form
      .querySelectorAll("input, select, textarea")
      .forEach(el => attachPrintMirror(el));

    /* ─── Table helpers ─────────────────────────────────────────── */
    function renderTable(section, tableId, fields, types = {}) {
      const tbody = document.querySelector(`#${tableId} tbody`);
      tbody.innerHTML = "";

      const internalFields = section === "employees"
        ? ["hours", "overtimeHours", "normalRate", "overtimeRate", "bonus"]
        : [];

      (project.lines[section] || []).forEach((item, i) => {
        const rowHtml = fields.map(f => {
          const type =
            types[f] ||
            (f.toLowerCase().includes("date")
              ? "date"
              : [
                  "normalRate", "overtimeRate", "hours", "overtimeHours", "bonus",
                  "buckets", "costPerBucket", "quantity", "unitCost",
                  "km", "petrol", "tolls", "amount"
                ].includes(f)
              ? "number"
              : "text");
          let val = item[f] ?? "";
          if (type === "date" && typeof val === "string" && val.length >= 10) {
            val = val.slice(0, 10);
          }
          const cls = internalFields.includes(f) ? ' class="internal-only"' : "";
          return `<td${cls}><input name="${f}" type="${type}" value="${val}" ${
            !canEdit ? "disabled" : ""
          } /></td>`;
        }).join("");

        let html = rowHtml;
        if (section === "employees") {
          const totalPay = calcEmployeeTotalPay(project.lines.employees[i]).toFixed(2);
          html += `<td class="internal-only"><span class="print-value">${totalPay}</span></td>`;
        }
        html += `<td><button type="button" class="remove-row" data-index="${i}" ${
          !canEdit ? "disabled" : ""
        }>×</button></td>`;

        const row = document.createElement("tr");
        row.innerHTML = html;
        tbody.appendChild(row);

        // add print mirrors for new inputs
        row.querySelectorAll("input").forEach(input => attachPrintMirror(input));
      });

      // remove handlers
      tbody.querySelectorAll(".remove-row").forEach(btn => {
        btn.addEventListener("click", () => {
          if (!canEdit) return;
          if (confirm("Remove this entry?")) {
            project.lines[section].splice(+btn.dataset.index, 1);
            renderTable(section, tableId, fields, types);
            updateTotals();
          }
        });
      });
    }

    function setupAddHandler(section, tableId, fields, addBtn, types = {}) {
      if (!addBtn) return;
      addBtn.addEventListener("click", () => {
        if (!canEdit) return;

        // persist existing rows before adding blank
        const tbody = document.querySelector(`#${tableId} tbody`);
        project.lines[section] = Array.from(tbody.children).map(r => {
          const inputs = r.querySelectorAll("input");
          const obj = {};
          fields.forEach((f, j) => {
            obj[f] = inputs[j].type === "number"
              ? parseFloat(inputs[j].value) || 0
              : inputs[j].value;
          });
          return obj;
        });

        // blank row obj
        const blank = {};
        fields.forEach(f => {
          const type = types[f] || (f.toLowerCase().includes("date") ? "date" : "text");
          blank[f] = type === "number" ? 0 : "";
        });
        project.lines[section].push(blank);

        renderTable(section, tableId, fields, types);
        updateTotals();
      });
    }

    /* ─── Initial table draws ───────────────────────────────────── */
    renderTable("employees", "employees-table", EMPLOYEE_FIELDS, {
      hours: "number", overtimeHours: "number",
      normalRate: "number", overtimeRate: "number", bonus: "number"
    });
    renderTable(
      "paints", "paints-table",
      ["type", "color", "buckets", "supplier", "dateBought", "costPerBucket"],
      { buckets: "number", costPerBucket: "number", dateBought: "date" }
    );
    renderTable(
      "materials", "materials-table",
      ["description", "quantity", "unitCost"],
      { quantity: "number", unitCost: "number" }
    );
    renderTable(
      "vehicles", "vehicles-table",
      ["driver", "car", "purpose", "km", "petrol", "tolls",
       "destination", "date", "notes"],
      { km: "number", petrol: "number", tolls: "number", date: "date" }
    );
    renderTable(
      "expenses", "expenses-table",
      ["type", "amount", "notes"],
      { amount: "number" }
    );

    setupAddHandler("employees", "employees-table", EMPLOYEE_FIELDS, addEmpBtn, {
      hours: "number", overtimeHours: "number",
      normalRate: "number", overtimeRate: "number", bonus: "number"
    });
    setupAddHandler(
      "paints", "paints-table",
      ["type", "color", "buckets", "supplier", "dateBought", "costPerBucket"],
      addPaintBtn,
      { buckets: "number", costPerBucket: "number", dateBought: "date" }
    );
    setupAddHandler(
      "materials", "materials-table",
      ["description", "quantity", "unitCost"],
      addMatBtn,
      { quantity: "number", unitCost: "number" }
    );
    setupAddHandler(
      "vehicles", "vehicles-table",
      ["driver", "car", "purpose", "km", "petrol", "tolls",
       "destination", "date", "notes"],
      addVehBtn,
      { km: "number", petrol: "number", tolls: "number", date: "date" }
    );
    setupAddHandler(
      "expenses", "expenses-table",
      ["type", "amount", "notes"],
      addExpBtn,
      { amount: "number" }
    );

    /* ─── Totals calc & progress helpers ───────────────────────── */
    function updateTotals() {
      const t = projectTotals(project);
      totalsEl.innerHTML = `
        <p class="internal-only">Cost: R${t.cost.toFixed(2)}</p>
        <p class="internal-only">Profit: R${t.profit.toFixed(2)}</p>
        <p>Total to be paid: R${t.price.toFixed(2)}</p>
      `;
      totalsEl.querySelectorAll("p").forEach(p => attachPrintMirror(p)); // re-attach mirrors
      renderTable("employees", "employees-table", EMPLOYEE_FIELDS, {
        hours: "number", overtimeHours: "number",
        normalRate: "number", overtimeRate: "number", bonus: "number"
      });
    }

    function updateProgressAndStatus() {
      const pct = calculateProgressPercent(
        estDurationInput.value,
        hoursWorkedInput.value
      );
      progressInput.value = pct;
      const bar = document.getElementById("progress-bar");
      if (bar) {
        bar.style.width = pct + "%";
        bar.innerText   = pct + "%";
      }
      if (pct >= 100)      statusSelect.value = "completed";
      else if (pct > 0)    statusSelect.value = "in-progress";
      else if (project.status !== "quotation") statusSelect.value = "quotation";
    }
    estDurationInput.addEventListener("input", updateProgressAndStatus);
    hoursWorkedInput.addEventListener("input", updateProgressAndStatus);

    /* ─── Save handler ──────────────────────────────────────────── */
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (!canEdit) {
        alert("You do not have permission to save changes.");
        return;
      }

      /* basic fields */
      project.name           = nameInput.value;
      project.location       = locationInput.value;
      project.status         = statusSelect.value;
      project.notes          = notesInput.value;
      project.markupPct      = parseFloat(markupInput.value) || 0;
      project.projectManager = { name: pmNameInput.value, email: pmEmailInput.value };
      project.customer       = { name: custNameInput.value, email: custEmailInput.value };
      project.estimatedDuration = estDurationInput.value;
      project.hoursWorked       = hoursWorkedInput.value;
      project.progress = {
        percent  : parseFloat(progressInput.value) || 0,
        comment  : progressComment.value,
        updatedAt: new Date().toISOString()
      };
      project.internalNotes = internalNotes.value;

      /* tables → project.lines */
      const sections = [
        { sec: "employees", fields: EMPLOYEE_FIELDS },
        {
          sec: "paints",
          fields: ["type", "color", "buckets", "supplier", "dateBought", "costPerBucket"]
        },
        { sec: "materials", fields: ["description", "quantity", "unitCost"] },
        {
          sec: "vehicles",
          fields: [
            "driver", "car", "purpose", "km", "petrol", "tolls",
            "destination", "date", "notes"
          ]
        },
        { sec: "expenses", fields: ["type", "amount", "notes"] }
      ];
      sections.forEach(({ sec, fields }) => {
        const tbody = document.querySelector(`#${sec}-table tbody`);
        project.lines[sec] = Array.from(tbody.children).map(row => {
          const inputs = row.querySelectorAll("input");
          const obj = {};
          fields.forEach((f, i) => {
            obj[f] = inputs[i].type === "number"
              ? parseFloat(inputs[i].value) || 0
              : inputs[i].value;
          });
          return obj;
        });
      });

      await updateProject(project.id, project);
      updateTotals();

      let toast = document.getElementById("save-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "save-toast";
        toast.textContent = "✔️ Saved!";
        document.body.appendChild(toast);
      }
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2000);
    });

    /* ─── Print handlers ───────────────────────────────────────── */
    if (printCustBtn) {
      printCustBtn.addEventListener("click", () => {
        document.body.classList.add("print-customer-mode");
        document.body.classList.remove("company");
        setTimeout(() => {
          window.print();
          document.body.classList.remove("print-customer-mode");
        }, 150);
      });
    }
    if (printIntBtn) {
      printIntBtn.addEventListener("click", () => {
        document.body.classList.add("company");
        document.body.classList.remove("print-customer-mode");
        window.print();
        setTimeout(() => document.body.classList.remove("company"), 300);
      });
    }

    /* ─── Initial draws ────────────────────────────────────────── */
    updateTotals();
    updateProgressAndStatus();
  });
});
