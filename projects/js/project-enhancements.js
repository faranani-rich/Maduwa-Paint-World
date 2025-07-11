// js/project-enhancements.js

// Smart duration parsing for progress bar:
function parseDuration(input) {
  let total = 0, match;
  match = /(\d+)\s*week/.exec(input);
  if (match) total += parseInt(match[1]) * 40;
  match = /(\d+)\s*day/.exec(input);
  if (match) total += parseInt(match[1]) * 8;
  match = /(\d+)\s*hour/.exec(input);
  if (match) total += parseInt(match[1]);
  return total;
}

// Sync percent and status on input:
const hoursWorkedInput = document.querySelector('input[name="hours-worked"]');
if (hoursWorkedInput) {
  hoursWorkedInput.addEventListener("input", function () {
    const estInput = document.querySelector('input[name="estimated-duration"]').value;
    const estHours = parseDuration(estInput);
    const hours = parseFloat(this.value) || 0;
    let percent = estHours > 0 ? Math.min(100, Math.round((hours / estHours) * 100)) : 0;
    document.querySelector('input[name="progress"]').value = percent;
    const bar = document.getElementById("progress-bar");
    bar.style.width = percent + "%";
    bar.innerText = percent + "%";
    // Auto-set status:
    const statusSel = document.querySelector('select[name="status"]');
    if (percent >= 100) {
      statusSel.value = "completed";
    } else if (percent > 0) {
      statusSel.value = "in-progress";
    }
  });
}

// Print mode toggles for customer/internal:
const printCustomerBtn = document.getElementById("print-customer");
if (printCustomerBtn) {
  printCustomerBtn.onclick = function () {
    document.body.classList.add('print-customer-mode');
    document.body.classList.remove('company');
    window.print();
    setTimeout(() => document.body.classList.remove('print-customer-mode'), 500);
  };
}
const printInternalBtn = document.getElementById("print-internal");
if (printInternalBtn) {
  printInternalBtn.onclick = function () {
    document.body.classList.add('company');
    document.body.classList.remove('print-customer-mode');
    window.print();
    setTimeout(() => document.body.classList.remove('company'), 500);
  };
}

// Back button logic
const backBtn = document.getElementById("back-btn");
if (backBtn) {
  backBtn.onclick = function () {
    window.location.href = "index.html";
  };
}
