/* project-page.js
   ---------------------------------------------------------------
   Orchestrates the entire Project detail page
   --------------------------------------------------------------- */
import { initAuthListener } from "../../authentication/auth.js";
import { getProjectById, updateProject } from "./storage.js";
import { projectTotals, calculateProgressPercent } from "./calc.js";
import { canEditProject } from "./permissions.js";

import {
  EMPLOYEE_FIELDS,
  cacheDom,
  attachPrintMirror
} from "./project-dom.js";
import { renderTable, setupAddHandler } from "./project-tables.js";

// 🔍 Detect if this is a customer view (PDF mode)
const isCustomerMode = new URLSearchParams(location.search).get("mode") === "customer";

document.addEventListener("DOMContentLoaded", () => {
  const dom = cacheDom();

  // Wire print buttons
  dom.printCustBtn?.addEventListener("click", () => {
    document.body.classList.add("print-customer-mode");
    window.print();
    document.body.classList.remove("print-customer-mode");
  });

  dom.printIntBtn?.addEventListener("click", () => {
    document.body.classList.add("company");
    window.print();
    document.body.classList.remove("company");
  });

  // Auth check
  initAuthListener(async ({ user, profile }) => {
    if (!user) {
      location.href = "../authentication/login.html";
      return;
    }

    if (profile.roles?.includes("customer") && !profile.roles?.includes("employee")) {
      document.body.innerHTML = "<p>You do not have access to this page.</p>";
      return;
    }

    const id = new URLSearchParams(location.search).get("id");

    // IMPORTANT: use let (we will replace it after save)
    let project = id ? await getProjectById(id) : null;
    if (!project) {
      document.body.innerHTML = "<p>Project not found.</p>";
      return;
    }

    // If somehow project came back as a string (bad legacy writes), normalize it
    if (typeof project === "string") {
      project = { name: project };
    }

    const canEdit = !isCustomerMode && canEditProject(project, profile);

    // Setup defaults / normalize structure
    project.lines = project.lines && typeof project.lines === "object" ? project.lines : {};
    project.lines.employees    = Array.isArray(project.lines.employees)    ? project.lines.employees    : [];
    project.lines.bucketLabour = Array.isArray(project.lines.bucketLabour) ? project.lines.bucketLabour : [];
    project.lines.paints       = Array.isArray(project.lines.paints)       ? project.lines.paints       : [];
    project.lines.vehicles     = Array.isArray(project.lines.vehicles)     ? project.lines.vehicles     : [];
    project.lines.expenses     = Array.isArray(project.lines.expenses)     ? project.lines.expenses     : [];

    // Back button
    dom.backBtn.addEventListener("click", () => {
      if (isCustomerMode) window.location.href = "../customer/dashboard.html";
      else window.location.href = "index.html";
    });

    // Disable editing for readonly or customer mode
    if (!canEdit) {
      dom.form.querySelectorAll("input,select,textarea,button[type='submit']")
        .forEach(el => el.disabled = true);
      [dom.addEmpBtn, dom.addBucketBtn, dom.addPaintBtn, dom.addVehBtn, dom.addExpBtn]
        .forEach(btn => btn && (btn.disabled = true));
    }

    // Fill form
    const {
      nameInput, locationInput, statusSelect, notesInput,
      pmNameInput, pmEmailInput, custNameInput, custEmailInput,
      estDurationInput, hoursWorkedInput, progressInput, progressComment,
      internalNotes, quotedPriceInput, customerPaidInput,
      budgetHourlyInput, budgetBucketInput, budgetPaintsInput,
      budgetVehiclesInput, budgetOtherInput,
      usedHourlyDisplay, remainingHourlyDisplay,
      usedBucketDisplay, remainingBucketDisplay,
      usedPaintsDisplay, remainingPaintsDisplay,
      usedVehiclesDisplay, remainingVehiclesDisplay,
      usedOtherDisplay, remainingOtherDisplay,
      expensesDisplay, profitDisplay, remainingPaymentDisplay
    } = dom;

    nameInput.value         = project.name                         || "";
    locationInput.value     = project.location                     || "";
    statusSelect.value      = project.status                       || "quotation";
    notesInput.value        = project.notes                        || "";
    pmNameInput.value       = project.projectManager?.name         || "";
    pmEmailInput.value      = project.projectManager?.email        || "";
    custNameInput.value     = project.customer?.name               || "";
    custEmailInput.value    = project.customer?.email              || "";
    estDurationInput.value  = project.estimatedDuration            || "";
    hoursWorkedInput.value  = project.hoursWorked                  || 0;
    progressInput.value     = project.progress?.percent            || 0;
    progressComment.value   = project.progress?.comment            || "";
    internalNotes.value     = project.internalNotes                || "";
    quotedPriceInput.value  = project.quotedPrice                  || 0;
    customerPaidInput.value = project.customer?.paid               || 0;

    // Budgets
    budgetHourlyInput.value   = project.budgets?.hourly            || 0;
    budgetBucketInput.value   = project.budgets?.bucket            || 0;
    budgetPaintsInput.value   = project.budgets?.paints            || 0;
    budgetVehiclesInput.value = project.budgets?.vehicles          || 0;
    budgetOtherInput.value    = project.budgets?.other             || 0;

    dom.form.querySelectorAll("input,select,textarea").forEach(attachPrintMirror);

    // Section rendering
    function initSection(section, tableId, fields, types, addBtn) {
      renderTable({ project, section, tableId, fields, types, canEdit });
      setupAddHandler({ project, section, tableId, fields, types, addBtn, canEdit });
    }

    initSection("employees", "employees-table", [
      ...EMPLOYEE_FIELDS, "totalPay"
    ], {
      hours: "number", overtimeHours: "number",
      normalRate: "number", overtimeRate: "number", bonus: "number"
    }, dom.addEmpBtn);

    initSection("bucketLabour", "bucket-table", [
      "name", "buckets", "ratePerBucket", "totalCost"
    ], {
      buckets: "number", ratePerBucket: "number"
    }, dom.addBucketBtn);

    initSection("paints", "paints-table", [
      "type", "color", "buckets", "dateBought", "costPerBucket", "totalCost"
    ], {
      buckets: "number", costPerBucket: "number", dateBought: "date"
    }, dom.addPaintBtn);

    initSection("vehicles", "vehicles-table", [
      "driver", "car", "purpose", "km", "petrol", "tolls", "totalCost", "destination", "date", "notes"
    ], {
      km: "number", petrol: "number", tolls: "number", date: "date"
    }, dom.addVehBtn);

    initSection("expenses", "expenses-table", [
      "type", "amount", "totalCost", "notes"
    ], {
      amount: "number"
    }, dom.addExpBtn);

    // Totals
    function updateTotals() {
      const t = projectTotals(project);

      expensesDisplay.textContent = t.totalCost.toFixed(2);
      profitDisplay.textContent = t.profit.toFixed(2);
      remainingPaymentDisplay.textContent =
        (Number(project.quotedPrice || 0) - Number(project.customer?.paid || 0)).toFixed(2);

      [
        ["hourly", t.labour,        budgetHourlyInput,   usedHourlyDisplay,     remainingHourlyDisplay],
        ["bucket", t.bucketLabour,  budgetBucketInput,   usedBucketDisplay,     remainingBucketDisplay],
        ["paints", t.paints,        budgetPaintsInput,   usedPaintsDisplay,     remainingPaintsDisplay],
        ["vehicles", t.vehicles,    budgetVehiclesInput, usedVehiclesDisplay,   remainingVehiclesDisplay],
        ["other",   t.otherExpenses,budgetOtherInput,    usedOtherDisplay,      remainingOtherDisplay]
      ].forEach(([_, usedAmt, budInp, usedSp, remSp]) => {
        const bud = Number(budInp.value) || 0;
        const rem = bud - usedAmt;
        usedSp.textContent = usedAmt.toFixed(2);
        remSp.textContent = rem.toFixed(2);
        remSp.classList.toggle("over-budget", rem < 0);
      });

      const warningEl = document.getElementById("budget-warning");
      if (t.profit < 0) {
        warningEl.textContent = `⚠️ Over-budget by R${Math.abs(t.profit).toFixed(2)} — this project is running at a loss.`;
        warningEl.classList.add("warning");
      } else {
        warningEl.textContent = "";
        warningEl.classList.remove("warning");
      }
    }

    function updateProgress() {
      const pct = calculateProgressPercent(
        estDurationInput.value,
        hoursWorkedInput.value
      );
      progressInput.value = pct;
      const bar = document.getElementById("progress-bar");
      if (bar) {
        bar.style.width = `${pct}%`;
        bar.innerText = `${pct}%`;
      }
      if (pct >= 100) statusSelect.value = "completed";
      else if (pct > 0) statusSelect.value = "in-progress";
    }

    estDurationInput.addEventListener("input", updateProgress);
    hoursWorkedInput.addEventListener("input", updateProgress);
    document.addEventListener("section-updated", updateTotals);

    // ---------- SAVE ----------
    dom.form.onsubmit = async ev => {
      ev.preventDefault();
      if (!canEdit) return alert("No permission to save.");

      // 1) Collect tables into a fresh object (no mutation on possibly-bad shapes)
      const linesFromDom = (tblId, fields) => {
        return Array.from(document.querySelectorAll(`#${tblId} tbody tr`)).map(tr => {
          const obj = {};
          fields.forEach(f => {
            const inp = tr.querySelector(`input[name="${f}"]`);
            if (!inp) {
              obj[f] = "";
            } else if (inp.type === "number") {
              obj[f] = Number(inp.value) || 0;
            } else if (inp.type === "date") {
              obj[f] = inp.value || "";
            } else {
              obj[f] = inp.value;
            }
          });
          return obj;
        });
      };

      const lines = {
        employees:    linesFromDom("employees-table", EMPLOYEE_FIELDS),
        bucketLabour: linesFromDom("bucket-table",   ["name", "buckets", "ratePerBucket"]),
        paints:       linesFromDom("paints-table",   ["type", "color", "buckets", "dateBought", "costPerBucket"]),
        vehicles:     linesFromDom("vehicles-table", ["driver", "car", "purpose", "km", "petrol", "tolls", "destination", "date", "notes"]),
        expenses:     linesFromDom("expenses-table", ["type", "amount", "notes"])
      };

      // 2) Normalize nested structs that might be strings in legacy docs
      const customer = (project.customer && typeof project.customer === "object")
        ? project.customer
        : {};
      const manager  = (project.projectManager && typeof project.projectManager === "object")
        ? project.projectManager
        : {};

      // 3) Build updated object purely from current form + tables
      const updated = {
        ...((typeof project === "object" && project) || {}), // guard if ever a string again
        id: project.id, // ensure id sticks
        name:            (nameInput.value || "").trim(),
        location:        (locationInput.value || "").trim(),
        status:          statusSelect.value || "quotation",
        notes:           notesInput.value || "",
        projectManager: {
          ...manager,
          name:  (pmNameInput.value || "").trim(),
          email: (pmEmailInput.value || "").trim()
        },
        customer: {
          ...customer,
          name:  (custNameInput.value || "").trim(),
          email: (custEmailInput.value || "").trim(),
          paid:  Number(customerPaidInput.value) || 0
        },
        quotedPrice:       Number(quotedPriceInput.value) || 0,
        estimatedDuration: estDurationInput.value || "",
        hoursWorked:       Number(hoursWorkedInput.value) || 0,
        progress: {
          percent: Number(progressInput.value) || 0,
          comment: progressComment.value || ""
        },
        internalNotes:     internalNotes.value || "",
        budgets: {
          hourly:   Number(budgetHourlyInput.value)   || 0,
          bucket:   Number(budgetBucketInput.value)   || 0,
          paints:   Number(budgetPaintsInput.value)   || 0,
          vehicles: Number(budgetVehiclesInput.value) || 0,
          other:    Number(budgetOtherInput.value)    || 0
        },
        lines
      };

      try {
        await updateProject(project.id, updated);

        // keep local state in sync for totals/progress re-render
        project = updated;

        updateTotals();
        showToast();
      } catch (err) {
        console.error("Save error", err);
        alert("Failed to save—see console");
      }
    };

    updateTotals();
    updateProgress();

    // If accessed as customer, trigger print version automatically
    if (isCustomerMode) {
      document.body.classList.add("print-customer-mode");
      setTimeout(() => window.print(), 600);
    }
  });
});

// Toast on save
function showToast() {
  let t = document.getElementById("save-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "save-toast";
    t.textContent = "✔️ Saved!";
    document.body.appendChild(t);
  }
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}
