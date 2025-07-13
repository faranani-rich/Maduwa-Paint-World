/* project-page.js
   ----------------------------------------------------------------
   Orchestrates the entire Project detail page
   ---------------------------------------------------------------- */
import { initAuthListener } from "../../authentication/auth.js";
import { getProjectById, updateProject } from "./storage.js";
import { projectTotals, calculateProgressPercent } from "./calc.js";
import { canEditProject } from "./permissions.js";

import { EMPLOYEE_FIELDS, cacheDom, attachPrintMirror } from "./project-dom.js";
import { renderTable, setupAddHandler } from "./project-tables.js";

/* ---------- Main ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initAuthListener(async ({ user, profile }) => {
    if (!user || !profile) {
      window.location.href = "../authentication/login.html";
      return;
    }

    /* load project doc */
    const id = new URLSearchParams(window.location.search).get("id");
    const project = id ? await getProjectById(id) : null;
    if (!project) {
      document.body.innerHTML = "<p>Project not found.</p>";
      return;
    }

    /* perms & DOM refs */
    const canEdit = canEditProject(project, profile);
    const dom     = cacheDom();

    /* ensure arrays */
    project.lines ??= { employees:[], paints:[], vehicles:[], materials:[], expenses:[] };
    Object.keys(project.lines).forEach(k => {
      if (!Array.isArray(project.lines[k])) project.lines[k] = [];
    });

    /* lock UI if view-only */
    if (!canEdit) {
      dom.form.querySelectorAll("input,select,textarea,button[type='submit']")
              .forEach(el => { if (el.type==="submit") el.style.display="none"; else el.disabled=true; });
      [dom.addEmpBtn,dom.addPaintBtn,dom.addMatBtn,dom.addVehBtn,dom.addExpBtn]
        .forEach(btn => btn && (btn.style.display="none"));
    }

    /* -----  Populate static inputs  ----- */
    const {
      nameInput, locationInput, statusSelect, notesInput, markupInput,
      pmNameInput, pmEmailInput, custNameInput, custEmailInput,
      estDurationInput, hoursWorkedInput, progressInput, progressComment,
      internalNotes
    } = dom;

    nameInput.value        = project.name          ?? "";
    locationInput.value    = project.location      ?? "";
    statusSelect.value     = project.status        ?? "quotation";
    notesInput.value       = project.notes         ?? "";
    markupInput.value      = project.markupPct     ?? 0;
    pmNameInput.value      = project.projectManager?.name  ?? "";
    pmEmailInput.value     = project.projectManager?.email ?? "";
    custNameInput.value    = project.customer?.name        ?? "";
    custEmailInput.value   = project.customer?.email       ?? "";
    estDurationInput.value = project.estimatedDuration     ?? "";
    hoursWorkedInput.value = project.hoursWorked           ?? "";
    progressInput.value    = project.progress?.percent     ?? 0;
    progressComment.value  = project.progress?.comment     ?? "";
    internalNotes.value    = project.internalNotes         ?? "";

    dom.form.querySelectorAll("input, select, textarea")
             .forEach(el => attachPrintMirror(el));

    /* -----  Tables  ----- */
    function initSection(section, tableId, fields, types, addBtn) {
      renderTable({ project, section, tableId, fields, types, canEdit });
      setupAddHandler({ project, section, tableId, fields, addBtn, types, canEdit });
    }

    initSection("employees","employees-table",EMPLOYEE_FIELDS,
                { hours:"number",overtimeHours:"number",
                  normalRate:"number",overtimeRate:"number",bonus:"number" }, dom.addEmpBtn);

    initSection("paints","paints-table",
                ["type","color","buckets","supplier","dateBought","costPerBucket"],
                { buckets:"number",costPerBucket:"number",dateBought:"date" }, dom.addPaintBtn);

    initSection("materials","materials-table",
                ["description","quantity","unitCost"],
                { quantity:"number",unitCost:"number" }, dom.addMatBtn);

    initSection("vehicles","vehicles-table",
                ["driver","car","purpose","km","petrol","tolls",
                 "destination","date","notes"],
                { km:"number",petrol:"number",tolls:"number",date:"date" }, dom.addVehBtn);

    initSection("expenses","expenses-table",
                ["type","amount","notes"],
                { amount:"number" }, dom.addExpBtn);

    /* -----  Totals & progress helpers  ----- */
    function updateTotals() {
      const t = projectTotals(project);
      dom.totalsEl.innerHTML = `
        <p class="internal-only">Cost: R${t.cost.toFixed(2)}</p>
        <p class="internal-only">Profit: R${t.profit.toFixed(2)}</p>
        <p>Total to be paid: R${t.price.toFixed(2)}</p>`;
      dom.totalsEl.querySelectorAll("p").forEach(p => attachPrintMirror(p));
      renderTable({ project, section:"employees", tableId:"employees-table",
                    fields:EMPLOYEE_FIELDS,
                    types:{ hours:"number",overtimeHours:"number",
                            normalRate:"number",overtimeRate:"number",bonus:"number" },
                    canEdit });
    }
    function updateProgress() {
      const pct = calculateProgressPercent(estDurationInput.value, hoursWorkedInput.value);
      progressInput.value = pct;
      const bar = document.getElementById("progress-bar");
      if (bar) { bar.style.width = pct+"%"; bar.innerText = pct+"%"; }
      statusSelect.value = pct >= 100 ? "completed" :
                           pct > 0    ? "in-progress" :
                           project.status !== "quotation" ? "quotation" : statusSelect.value;
    }
    estDurationInput.addEventListener("input", updateProgress);
    hoursWorkedInput .addEventListener("input", updateProgress);

    /* -----  SAVE  ----- */
    dom.form.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (!canEdit) return alert("You do not have permission to save changes.");

      /* copy inputs back to project obj */
      project.name             = nameInput.value;
      project.location         = locationInput.value;
      project.status           = statusSelect.value;
      project.notes            = notesInput.value;
      project.markupPct        = parseFloat(markupInput.value) || 0;
      project.projectManager   = { name: pmNameInput.value,  email: pmEmailInput.value  };
      project.customer         = { name: custNameInput.value, email: custEmailInput.value };
      project.estimatedDuration= estDurationInput.value;
      project.hoursWorked      = hoursWorkedInput.value;
      project.progress         = {
        percent  : parseFloat(progressInput.value) || 0,
        comment  : progressComment.value,
        updatedAt: new Date().toISOString()
      };
      project.internalNotes    = internalNotes.value;

      /* tables → project.lines */
      const sections = [
        {sec:"employees",fields:EMPLOYEE_FIELDS},
        {sec:"paints",fields:["type","color","buckets","supplier","dateBought","costPerBucket"]},
        {sec:"materials",fields:["description","quantity","unitCost"]},
        {sec:"vehicles",fields:["driver","car","purpose","km","petrol","tolls","destination","date","notes"]},
        {sec:"expenses",fields:["type","amount","notes"]}
      ];
      sections.forEach(({sec,fields}) => {
        const tb = document.querySelector(`#${sec}-table tbody`);
        project.lines[sec] = Array.from(tb.children).map(tr => {
          const inputs = tr.querySelectorAll("input");
          const obj = {};
          fields.forEach((f,i) => {
            obj[f] = inputs[i].type==="number"
              ? parseFloat(inputs[i].value)||0
              : inputs[i].value;
          });
          return obj;
        });
      });

      await updateProject(project.id, project);
      updateTotals();
      showToast();
    });

    /* -----  Print buttons  ----- */
    dom.printCustBtn?.addEventListener("click", () => {
      document.body.classList.add("print-customer-mode");
      document.body.classList.remove("company");
      setTimeout(()=>{ window.print(); document.body.classList.remove("print-customer-mode"); },150);
    });
    dom.printIntBtn?.addEventListener("click", () => {
      document.body.classList.add("company");
      document.body.classList.remove("print-customer-mode");
      window.print();
      setTimeout(()=> document.body.classList.remove("company"),300);
    });

    /* init */
    updateTotals();
    updateProgress();
  });
});

/* small toast helper */
function showToast() {
  let t = document.getElementById("save-toast");
  if (!t) { t = document.createElement("div"); t.id="save-toast"; t.textContent="✔️ Saved!"; document.body.appendChild(t); }
  t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2000);
}
