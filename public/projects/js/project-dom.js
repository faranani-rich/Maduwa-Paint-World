/* project-dom.js
   ----------------------------------------------------------------
   DOM utilities shared by the Project page
   ---------------------------------------------------------------- */
export const EMPLOYEE_FIELDS = [
  "name",
  "role",
  "hours",
  "overtimeHours",
  "normalRate",
  "overtimeRate",
  "bonus"
];

/* Mirror any <input>/<select>/<textarea> value into a span that prints */
export function attachPrintMirror(el) {
  if (el.nextElementSibling?.classList.contains("print-value")) return;
  const span = document.createElement("span");
  span.className   = "print-value";
  span.textContent = readValue(el);
  el.insertAdjacentElement("afterend", span);
  const update = () => (span.textContent = readValue(el));
  el.addEventListener("input", update);
  if (el.tagName === "SELECT") el.addEventListener("change", update);
}

export function readValue(el) {
  return el.tagName === "SELECT"
    ? el.options[el.selectedIndex]?.text || ""
    : el.value;
}

/**
 * Grab every DOM element the page uses once, then re-use the refs
 */
export function cacheDom() {
  const form = document.getElementById("project-form");
  if (!form) throw new Error("#project-form not found");

  // Project Info
  const nameInput     = form.querySelector('input[name="name"]');
  const locationInput = form.querySelector('input[name="location"]');
  const statusSelect  = form.querySelector('select[name="status"]');
  const notesInput    = form.querySelector('textarea[name="notes"]');
  const internalNotes = form.querySelector('textarea[name="internal-notes"]');

  // Progress & estimation
  const estDurationInput = form.querySelector('input[name="estimated-duration"]');
  const hoursWorkedInput = form.querySelector('input[name="hours-worked"]');
  const progressInput    = form.querySelector('input[name="progress"]');
  const progressComment  = form.querySelector('textarea[name="progress-comment"]');

  // Manager / Customer
  const pmNameInput    = form.querySelector('input[name="pm-name"]');
  const pmEmailInput   = form.querySelector('input[name="pm-email"]');
  const custNameInput  = form.querySelector('input[name="cust-name"]');
  const custEmailInput = form.querySelector('input[name="cust-email"]');

  // Budget inputs
  const budgetHourlyInput   = form.querySelector('input[name="budget-hourly"]');
  const budgetBucketInput   = form.querySelector('input[name="budget-bucket"]');
  const budgetPaintsInput   = form.querySelector('input[name="budget-paints"]');
  const budgetVehiclesInput = form.querySelector('input[name="budget-vehicles"]');
  const budgetOtherInput    = form.querySelector('input[name="budget-other"]');

  // Quote & payments
  const quotedPriceInput  = form.querySelector('input[name="quoted-price"]');
  const customerPaidInput = form.querySelector('input[name="customer-paid"]');

  // Display spans
  const remainingPaymentDisplay = document.getElementById("remaining-payment");
  const expensesDisplay         = document.getElementById("expensesDisplay");
  const profitDisplay           = document.getElementById("profitDisplay");

  // Used / Remaining spans
  const usedHourlyDisplay        = document.getElementById("used-hourly");
  const remainingHourlyDisplay   = document.getElementById("remaining-hourly");
  const usedBucketDisplay        = document.getElementById("used-bucket");
  const remainingBucketDisplay   = document.getElementById("remaining-bucket");
  const usedPaintsDisplay        = document.getElementById("used-paints");
  const remainingPaintsDisplay   = document.getElementById("remaining-paints");
  const usedVehiclesDisplay      = document.getElementById("used-vehicles");
  const remainingVehiclesDisplay = document.getElementById("remaining-vehicles");
  const usedOtherDisplay         = document.getElementById("used-other");
  const remainingOtherDisplay    = document.getElementById("remaining-other");

  // Tables & bodies
  const employeesTable = document.getElementById("employees-table");
  const bucketTable    = document.getElementById("bucket-table");
  const paintsTable    = document.getElementById("paints-table");
  const vehiclesTable  = document.getElementById("vehicles-table");
  const expensesTable  = document.getElementById("expenses-table");
  const employeesTbody = employeesTable.querySelector("tbody");
  const bucketTbody    = bucketTable.querySelector("tbody");
  const paintsTbody    = paintsTable.querySelector("tbody");
  const vehiclesTbody  = vehiclesTable.querySelector("tbody");
  const expensesTbody  = expensesTable.querySelector("tbody");

  // Buttons
  const addEmpBtn    = document.getElementById("add-employee-btn");
  const addBucketBtn = document.getElementById("add-bucket-btn");
  const addPaintBtn  = document.getElementById("add-paint-btn");
  const addVehBtn    = document.getElementById("add-vehicle-btn");
  const addExpBtn    = document.getElementById("add-expense-btn");

  // Print & navigation
  const printCustBtn = document.getElementById("print-customer-btn");
  const printIntBtn  = document.getElementById("print-internal-btn");
  const backBtn      = document.getElementById("back-btn");

  return {
    form,
    nameInput,
    locationInput,
    statusSelect,
    notesInput,
    internalNotes,
    estDurationInput,
    hoursWorkedInput,
    progressInput,
    progressComment,
    pmNameInput,
    pmEmailInput,
    custNameInput,
    custEmailInput,
    budgetHourlyInput,
    budgetBucketInput,
    budgetPaintsInput,
    budgetVehiclesInput,
    budgetOtherInput,
    quotedPriceInput,
    customerPaidInput,
    remainingPaymentDisplay,
    expensesDisplay,
    profitDisplay,
    usedHourlyDisplay,
    remainingHourlyDisplay,
    usedBucketDisplay,
    remainingBucketDisplay,
    usedPaintsDisplay,
    remainingPaintsDisplay,
    usedVehiclesDisplay,
    remainingVehiclesDisplay,
    usedOtherDisplay,
    remainingOtherDisplay,
    employeesTable,
    bucketTable,
    paintsTable,
    vehiclesTable,
    expensesTable,
    employeesTbody,
    bucketTbody,
    paintsTbody,
    vehiclesTbody,
    expensesTbody,
    addEmpBtn,
    addBucketBtn,
    addPaintBtn,
    addVehBtn,
    addExpBtn,
    printCustBtn,
    printIntBtn,
    backBtn
  };
}
