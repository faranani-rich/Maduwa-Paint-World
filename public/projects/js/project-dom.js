/* project-dom.js
   ----------------------------------------------------------------
   DOM utilities shared by the Project page
   ---------------------------------------------------------------- */
export const EMPLOYEE_FIELDS = [
  "name", "role", "hours", "overtimeHours",
  "normalRate", "overtimeRate", "bonus"
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

/* Grab every DOM element the page uses once, then re-use the refs */
export function cacheDom() {
  const form = document.getElementById("project-form");
  if (!form) throw new Error("#project-form not found");

  return {
    form,
    nameInput        : form.querySelector('input[name="name"]'),
    locationInput    : form.querySelector('input[name="location"]'),
    statusSelect     : form.querySelector('select[name="status"]'),
    notesInput       : form.querySelector('textarea[name="notes"]'),
    markupInput      : form.querySelector('input[name="markupPct"]'),
    pmNameInput      : form.querySelector('input[name="pm-name"]'),
    pmEmailInput     : form.querySelector('input[name="pm-email"]'),
    custNameInput    : form.querySelector('input[name="cust-name"]'),
    custEmailInput   : form.querySelector('input[name="cust-email"]'),
    estDurationInput : form.querySelector('input[name="estimated-duration"]'),
    hoursWorkedInput : form.querySelector('input[name="hours-worked"]'),
    progressInput    : form.querySelector('input[name="progress"]'),
    progressComment  : form.querySelector('textarea[name="progress-comment"]'),
    internalNotes    : form.querySelector('textarea[name="internal-notes"]'),
    totalsEl         : document.getElementById("totals"),

    addEmpBtn  : document.getElementById("add-employee-btn"),
    addPaintBtn: document.getElementById("add-paint-btn"),
    addMatBtn  : document.getElementById("add-material-btn"),
    addVehBtn  : document.getElementById("add-vehicle-btn"),
    addExpBtn  : document.getElementById("add-expense-btn"),

    printCustBtn: document.getElementById("print-customer-btn"),
    printIntBtn : document.getElementById("print-internal-btn")
  };
}
