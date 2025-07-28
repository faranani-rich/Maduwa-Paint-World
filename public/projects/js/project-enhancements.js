// js/project-enhancements.js
import { cacheDom, attachPrintMirror } from "./project-dom.js";
import { projectTotals, calculateProgressPercent } from "./calc.js";
import { renderTable, setupAddHandler } from "./project-tables.js";

// --- Entry point ---
document.addEventListener("DOMContentLoaded", () => {
  const dom = cacheDom();
  const project = window.currentProject;
  const canEdit = project.canEdit;

  // --- Populate basic inputs ---
  dom.nameInput.value     = project.name || "";
  dom.locationInput.value = project.location || "";
  dom.statusSelect.value  = project.status || "quotation";
  dom.pmNameInput.value   = project.pmName || "";
  dom.pmEmailInput.value  = project.pmEmail || "";
  dom.custNameInput.value = project.custName || "";
  dom.custEmailInput.value= project.custEmail || "";
  dom.estDurationInput.value = project.estimatedDuration || "";
  dom.hoursWorkedInput.value = project.hoursWorked || 0;
  dom.progressInput.value    = calculateProgressPercent(project.estimatedDuration, project.hoursWorked);
  dom.progressComment.value  = project.progressComment || "";
  dom.notesInput.value        = project.notes || "";
  dom.internalNotes.value     = project.internalNotes || "";

  // --- Budget & Payment fields ---
  project.budgets = project.budgets || {};
  dom.budgetHourlyInput.value   = project.budgets.hourly || 0;
  dom.budgetBucketInput.value   = project.budgets.bucket || 0;
  dom.budgetPaintsInput.value   = project.budgets.paints || 0;
  dom.budgetVehiclesInput.value = project.budgets.vehicles || 0;
  dom.budgetOtherInput.value    = project.budgets.other || 0;

  dom.quotedPriceInput.value  = project.quotedPrice || 0;
  dom.customerPaidInput.value = project.customerPaid || 0;

  // --- Attach print mirrors ---
  dom.form.querySelectorAll("input,textarea,select").forEach(attachPrintMirror);

  // --- Section configs ---
  const sections = [
    { key: "employees",    tableId: "employees-table",    fields: ["name","role","hours","overtimeHours","normalRate","overtimeRate","bonus","totalPay"],     types: { hours: "number", overtimeHours: "number", normalRate: "number", overtimeRate: "number", bonus: "number" }, addBtn: dom.addEmpBtn },
    { key: "bucketLabour", tableId: "bucket-table",       fields: ["name","buckets","ratePerBucket","totalPay"],                                  types: { buckets: "number", ratePerBucket: "number" },             addBtn: dom.addBucketBtn },
    { key: "paints",       tableId: "paints-table",       fields: ["type","color","buckets","supplier","dateBought","costPerBucket","totalCost"], types: { buckets: "number", costPerBucket: "number", dateBought: "date" }, addBtn: dom.addPaintBtn },
    { key: "vehicles",     tableId: "vehicles-table",     fields: ["driver","car","purpose","km","petrol","tolls","totalCost","destination","date","notes"], types: { km: "number", petrol: "number", tolls: "number", date: "date" }, addBtn: dom.addVehBtn },
    { key: "expenses",     tableId: "expenses-table",     fields: ["type","amount","totalCost","notes"],                                                          types: { amount: "number" },                                       addBtn: dom.addExpBtn }
  ];

  // --- Render tables & setup add row ---
  sections.forEach(cfg => {
    renderTable({ project, canEdit, ...cfg });
    setupAddHandler({ project, canEdit, ...cfg });
  });

  // --- Update all totals & warnings ---
  function updateTotals() {
    const t = projectTotals(project);
    // Used & Remaining
    dom.usedHourlyDisplay.textContent     = t.labour.toFixed(2);
    dom.remainingHourlyDisplay.textContent= t.remaining.hourly.toFixed(2);
    dom.usedBucketDisplay.textContent     = t.bucketLabour.toFixed(2);
    dom.remainingBucketDisplay.textContent= t.remaining.bucket.toFixed(2);
    dom.usedPaintsDisplay.textContent     = t.paints.toFixed(2);
    dom.remainingPaintsDisplay.textContent= t.remaining.paints.toFixed(2);
    dom.usedVehiclesDisplay.textContent   = t.vehicles.toFixed(2);
    dom.remainingVehiclesDisplay.textContent=t.remaining.vehicles.toFixed(2);
    dom.usedOtherDisplay.textContent      = t.otherExpenses.toFixed(2);
    dom.remainingOtherDisplay.textContent = t.remaining.other.toFixed(2);

    // Expenses, Profit, Payments
    dom.expensesDisplay.textContent       = t.totalCost.toFixed(2);
    dom.profitDisplay.textContent         = t.profit.toFixed(2);
    dom.remainingPaymentDisplay.textContent= t.remainingToPay.toFixed(2);

    // Warnings
    [
      [t.labour, t.budgets.hourly, dom.budgetHourlyInput],
      [t.bucketLabour, t.budgets.bucket, dom.budgetBucketInput],
      [t.paints, t.budgets.paints, dom.budgetPaintsInput],
      [t.vehicles, t.budgets.vehicles, dom.budgetVehiclesInput],
      [t.otherExpenses, t.budgets.other, dom.budgetOtherInput]
    ].forEach(([used, bud, inp]) => {
      if (used > bud) inp.classList.add("warning"); else inp.classList.remove("warning");
    });
  }

  // --- Wire budget & payment inputs to recalc ---
  [
    dom.budgetHourlyInput, dom.budgetBucketInput,
    dom.budgetPaintsInput, dom.budgetVehiclesInput,
    dom.budgetOtherInput
  ].forEach(inp => {
    inp.addEventListener("input", () => {
      project.budgets[inp.name.replace("budget-","")] = parseFloat(inp.value) || 0;
      updateTotals();
    });
  });

  [dom.quotedPriceInput, dom.customerPaidInput].forEach(inp => {
    inp.addEventListener("input", () => {
      project.quotedPrice  = parseFloat(dom.quotedPriceInput.value) || 0;
      project.customerPaid = parseFloat(dom.customerPaidInput.value) || 0;
      updateTotals();
    });
  });

  // Initial totals
  updateTotals();

  // --- Progress sync ---
  dom.hoursWorkedInput.addEventListener("input", () => {
    const percent = calculateProgressPercent(dom.estDurationInput.value, dom.hoursWorkedInput.value);
    dom.progressInput.value = percent;
    dom.progressBar.style.width = percent+"%";
    dom.progressBar.innerText = percent+"%";
    if (percent >= 100) dom.statusSelect.value = 'completed';
    else if (percent>0) dom.statusSelect.value = 'in-progress';
  });

  // --- Print buttons handled in project-dom via CSS toggles ---
  dom.printCustBtn.addEventListener('click', () => {
    document.body.classList.add('print-customer-mode'); window.print(); document.body.classList.remove('print-customer-mode');
  });
  dom.printIntBtn.addEventListener('click', () => {
    document.body.classList.add('company'); window.print(); document.body.classList.remove('company');
  });

  // --- Back button ---
  dom.form.querySelector('#back-btn').addEventListener('click', ()=> window.location.href='index.html');
});
