// js/project-enhancements.js

// --- Smart duration parsing for progress bar ---
function parseDuration(input) {
  let total = 0, match;
  match = /(\d+)\s*week/.exec(input);
  if (match) total += parseInt(match[1], 10) * 40;
  match = /(\d+)\s*day/.exec(input);
  if (match) total += parseInt(match[1], 10) * 8;
  match = /(\d+)\s*hour/.exec(input);
  if (match) total += parseInt(match[1], 10);
  return total;
}

// --- Sync percent and status on input ---
const hoursWorkedInput = document.querySelector('input[name="hours-worked"]');
if (hoursWorkedInput) {
  hoursWorkedInput.addEventListener('input', function () {
    const estInput = document.querySelector('input[name="estimated-duration"]').value;
    const estHours = parseDuration(estInput);
    const hours = parseFloat(this.value) || 0;
    const percent = estHours > 0
      ? Math.min(100, Math.round((hours / estHours) * 100))
      : 0;

    const progressInput = document.querySelector('input[name="progress"]');
    if (progressInput) progressInput.value = percent;

    const bar = document.getElementById('progress-bar');
    if (bar) {
      bar.style.width = percent + '%';
      bar.innerText = percent + '%';
    }

    const statusSel = document.querySelector('select[name="status"]');
    if (statusSel) {
      if (percent >= 100) {
        statusSel.value = 'completed';
      } else if (percent > 0) {
        statusSel.value = 'in-progress';
      }
    }
  });
}

// --- Print-prep / cleanup utilities ---
function preparePrintView(containerSelector = '#print-view') {
  const container = document.querySelector(containerSelector) ||
                    document.getElementById('project-form');
  if (!container) return;

  container.querySelectorAll('input, textarea, select').forEach(el => {
    const span = document.createElement('span');
    if (el.tagName === 'SELECT') {
      span.textContent = el.options[el.selectedIndex]?.text || '';
    } else {
      span.textContent = el.value;
    }
    span.classList.add('print-value');
    el.dataset._oldDisplay = el.style.display || '';
    el.parentNode.insertBefore(span, el);
    el.style.display = 'none';
  });
}

function cleanupPrintView(containerSelector = '#print-view') {
  const container = document.querySelector(containerSelector) ||
                    document.getElementById('project-form');
  if (!container) return;

  container.querySelectorAll('.print-value').forEach(span => {
    const inp = span.nextElementSibling;
    if (inp && inp.dataset._oldDisplay !== undefined) {
      inp.style.display = inp.dataset._oldDisplay;
      delete inp.dataset._oldDisplay;
    }
    span.remove();
  });
}

// --- Print mode toggles ---

// Customer copy: print customer-only view
const printCustomerBtn = document.getElementById('print-customer-btn');
if (printCustomerBtn) {
  printCustomerBtn.addEventListener('click', e => {
    e.preventDefault();
    document.body.classList.add('print-customer-mode');
    document.body.classList.remove('company');

    preparePrintView();
    window.print();
    cleanupPrintView();

    document.body.classList.remove('print-customer-mode');
  });
}

// Internal copy: print with internal fields visible
const printInternalBtn = document.getElementById('print-internal-btn');
if (printInternalBtn) {
  printInternalBtn.addEventListener('click', e => {
    e.preventDefault();
    document.body.classList.add('company');
    document.body.classList.remove('print-customer-mode');

    preparePrintView();
    window.print();
    cleanupPrintView();

    document.body.classList.remove('company');
  });
}

// --- Back button logic ---
const backBtn = document.getElementById('back-btn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}
