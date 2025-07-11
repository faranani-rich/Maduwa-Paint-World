// js/project.js

import { getProjectById, updateProject } from './storage.js';
import { projectTotals, calculateProgressPercent } from './calc.js'; // Ensure both are exported
import { emptyProject } from './models.js';
import { sendCustomerReceipt } from './email.js'; // ← you need this!

const EMPLOYEE_FIELDS = [
  'name', 'role', 'hours', 'overtimeHours', 'normalRate', 'overtimeRate', 'bonus'
];

// Helper to calculate employee total pay
function calcEmployeeTotalPay(emp) {
  return (
    (parseFloat(emp.hours) || 0) * (parseFloat(emp.normalRate) || 0) +
    (parseFloat(emp.overtimeHours) || 0) * (parseFloat(emp.overtimeRate) || 0) +
    (parseFloat(emp.bonus) || 0)
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  // --- 1. Load Project ---
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');
  let project = null;
  if (projectId) {
    project = await getProjectById(projectId);
  }
  if (!project) {
    document.body.innerHTML = '<p>Project not found.</p>';
    return;
  }

  // --- 2. Model Defaults ---
  if (!project.lines) {
    project.lines = { employees: [], paints: [], vehicles: [], materials: [], expenses: [] };
  }
  ['employees', 'paints', 'vehicles', 'materials', 'expenses'].forEach(k => {
    if (!Array.isArray(project.lines[k])) project.lines[k] = [];
  });

  // --- 3. Cache DOM Elements ---
  const form = document.getElementById('project-form');
  const nameInput = form.querySelector('input[name="name"]');
  const locationInput = form.querySelector('input[name="location"]');
  const statusSelect = form.querySelector('select[name="status"]');
  const notesInput = form.querySelector('textarea[name="notes"]');
  const markupInput = form.querySelector('input[name="markupPct"]');
  const pmNameInput = form.querySelector('input[name="pm-name"]');
  const pmEmailInput = form.querySelector('input[name="pm-email"]');
  const custNameInput = form.querySelector('input[name="cust-name"]');
  const custEmailInput = form.querySelector('input[name="cust-email"]');
  const estDurationInput = form.querySelector('input[name="estimated-duration"]');
  const hoursWorkedInput = form.querySelector('input[name="hours-worked"]');
  const progressInput = form.querySelector('input[name="progress"]');
  const progressComment = form.querySelector('textarea[name="progress-comment"]');
  const internalNotes = form.querySelector('textarea[name="internal-notes"]');
  const totalsEl = document.getElementById('totals');
  const addEmpBtn = document.getElementById('add-employee-btn');
  const addPaintBtn = document.getElementById('add-paint-btn');
  const addMatBtn = document.getElementById('add-material-btn');
  const addVehBtn = document.getElementById('add-vehicle-btn');
  const addExpBtn = document.getElementById('add-expense-btn');

  // Print Buttons
  const printCustBtn = document.getElementById('print-customer');
  const printIntBtn = document.getElementById('print-internal');

  // --- 4. Populate Basic Fields ---
  nameInput.value = project.name || '';
  locationInput.value = project.location || '';
  statusSelect.value = project.status || 'quotation';
  notesInput.value = project.notes || '';
  markupInput.value = project.markupPct || 0;
  pmNameInput.value = project.projectManager?.name || '';
  pmEmailInput.value = project.projectManager?.email || '';
  custNameInput.value = project.customer?.name || '';
  custEmailInput.value = project.customer?.email || '';
  estDurationInput.value = project.estimatedDuration || '';
  hoursWorkedInput.value = project.hoursWorked || '';
  progressInput.value = project.progress?.percent || 0;
  progressComment.value = project.progress?.comment || '';
  internalNotes.value = project.internalNotes || '';

  // --- 5. Render Dynamic Sections (tables) ---
  function renderTable(section, tableId, fields, types = {}) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    (project.lines[section] || []).forEach((item, i) => {
      let rowHtml = fields.map(f => {
        const type =
          types[f] ||
          (f.includes('date') ? 'date'
            : (['normalRate', 'overtimeRate', 'hours', 'overtimeHours', 'bonus', 'buckets', 'costPerBucket', 'quantity', 'unitCost', 'km', 'petrol', 'tolls', 'amount'].includes(f) ? 'number' : 'text'));
        let val = item[f] ?? '';
        if (type === 'date' && val && typeof val === 'string' && val.length > 5) {
          val = val.slice(0, 10);
        }
        return `<td><input name="${f}" type="${type}" value="${val}" /></td>`;
      }).join('');
      // For employees: add Total Pay column (internal only)
      if (section === 'employees') {
        const totalPay = calcEmployeeTotalPay(item).toFixed(2);
        rowHtml += `<td class="internal-only"><span>${totalPay}</span></td>`;
      }
      // Always add Remove button as the last column:
      rowHtml += `<td><button type="button" class="remove-row" data-index="${i}">×</button></td>`;
      const row = document.createElement('tr');
      row.innerHTML = rowHtml;
      tbody.appendChild(row);
    });
    // Confirm before removing any row
    tbody.querySelectorAll('.remove-row').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Are you sure you want to remove this entry? This cannot be undone.')) {
          project.lines[section].splice(+btn.dataset.index, 1);
          renderTable(section, tableId, fields, types);
          updateTotals();
        }
      });
    });
  }

  // --- 6. Add Row Handlers ---
  function setupAddHandler(section, tableId, fields, addBtn, types = {}) {
    addBtn.addEventListener('click', () => {
      // Save current edits
      const tbody = document.querySelector(`#${tableId} tbody`);
      project.lines[section] = Array.from(tbody.children).map(r => {
        const cells = r.querySelectorAll('input');
        let entry = {};
        fields.forEach((f, i) => {
          const type = types[f] || cells[i].type;
          if (type === "number") {
            entry[f] = parseFloat(cells[i].value) || 0;
          } else if (type === "date") {
            entry[f] = cells[i].value;
          } else {
            entry[f] = cells[i].value;
          }
        });
        return entry;
      });
      // Add empty row
      let emptyRow = {};
      fields.forEach(f => {
        const type = types[f] || (f.includes('date') ? 'date'
          : (['normalRate', 'overtimeRate', 'hours', 'overtimeHours', 'bonus', 'buckets', 'costPerBucket', 'quantity', 'unitCost', 'km', 'petrol', 'tolls', 'amount'].includes(f) ? 'number' : 'text'));
        emptyRow[f] = (type === 'number') ? 0 : '';
      });
      project.lines[section].push(emptyRow);
      renderTable(section, tableId, fields, types);
      updateTotals();
    });
  }

  // --- 7. Set Up All Dynamic Sections ---
  renderTable('employees', 'employees-table', EMPLOYEE_FIELDS, {
    hours: 'number',
    overtimeHours: 'number',
    normalRate: 'number',
    overtimeRate: 'number',
    bonus: 'number'
  });
  renderTable('paints', 'paints-table', ['type', 'color', 'buckets', 'supplier', 'dateBought', 'costPerBucket'], { dateBought: 'date', buckets: 'number', costPerBucket: 'number' });
  renderTable('materials', 'materials-table', ['description', 'quantity', 'unitCost'], { quantity: 'number', unitCost: 'number' });
  renderTable('vehicles', 'vehicles-table', ['driver', 'car', 'purpose', 'km', 'petrol', 'tolls', 'destination', 'date', 'notes'], { km: 'number', petrol: 'number', tolls: 'number', date: 'date' });
  renderTable('expenses', 'expenses-table', ['type', 'amount', 'notes'], { amount: 'number' });

  setupAddHandler('employees', 'employees-table', EMPLOYEE_FIELDS, addEmpBtn, {
    hours: 'number',
    overtimeHours: 'number',
    normalRate: 'number',
    overtimeRate: 'number',
    bonus: 'number'
  });
  setupAddHandler('paints', 'paints-table', ['type', 'color', 'buckets', 'supplier', 'dateBought', 'costPerBucket'], addPaintBtn, { dateBought: 'date', buckets: 'number', costPerBucket: 'number' });
  setupAddHandler('materials', 'materials-table', ['description', 'quantity', 'unitCost'], addMatBtn, { quantity: 'number', unitCost: 'number' });
  setupAddHandler('vehicles', 'vehicles-table', ['driver', 'car', 'purpose', 'km', 'petrol', 'tolls', 'destination', 'date', 'notes'], addVehBtn, { km: 'number', petrol: 'number', tolls: 'number', date: 'date' });
  setupAddHandler('expenses', 'expenses-table', ['type', 'amount', 'notes'], addExpBtn, { amount: 'number' });

  // --- 8. Update Totals ---
  function updateTotals() {
    const t = projectTotals(project);
    totalsEl.innerHTML = `
      <p class="internal-only">Cost: R${t.cost.toFixed(2)}</p>
      <p class="internal-only">Profit: R${t.profit.toFixed(2)}</p>
      <p>Price: R${t.price.toFixed(2)}</p>
    `;
    // Re-render employees table to update total pay
    renderTable('employees', 'employees-table', EMPLOYEE_FIELDS, {
      hours: 'number',
      overtimeHours: 'number',
      normalRate: 'number',
      overtimeRate: 'number',
      bonus: 'number'
    });
  }

  // --- 9. Auto-calculate Progress % and Status ---
  function updateProgressAndStatus() {
    const estVal = estDurationInput.value;
    const hoursVal = hoursWorkedInput.value;
    const percent = calculateProgressPercent(estVal, hoursVal);
    progressInput.value = percent;
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
      progressBar.style.width = percent + "%";
      progressBar.innerText = percent + "%";
    }
    // Auto-update status
    if (percent >= 100) {
      statusSelect.value = "completed";
    } else if (percent > 0) {
      statusSelect.value = "in-progress";
    } else if (percent === 0 && project.status !== "quotation") {
      statusSelect.value = "quotation";
    }
  }
  estDurationInput.addEventListener("input", updateProgressAndStatus);
  hoursWorkedInput.addEventListener("input", updateProgressAndStatus);

  // --- 10. Save Handler ---
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    project.name = nameInput.value;
    project.location = locationInput.value;
    project.status = statusSelect.value;
    project.notes = notesInput.value;
    project.markupPct = parseFloat(markupInput.value) || 0;
    project.projectManager = { name: pmNameInput.value, email: pmEmailInput.value };
    project.customer = { name: custNameInput.value, email: custEmailInput.value };
    project.estimatedDuration = estDurationInput.value;
    project.hoursWorked = hoursWorkedInput.value;
    project.progress = {
      percent: parseFloat(progressInput.value) || 0,
      comment: progressComment.value,
      updatedAt: new Date().toISOString()
    };
    project.internalNotes = internalNotes.value;

    // Save all tables (capture current state)
    const allSections = [
      { section: 'employees', fields: EMPLOYEE_FIELDS },
      { section: 'paints', fields: ['type', 'color', 'buckets', 'supplier', 'dateBought', 'costPerBucket'] },
      { section: 'materials', fields: ['description', 'quantity', 'unitCost'] },
      { section: 'vehicles', fields: ['driver', 'car', 'purpose', 'km', 'petrol', 'tolls', 'destination', 'date', 'notes'] },
      { section: 'expenses', fields: ['type', 'amount', 'notes'] }
    ];
    allSections.forEach(({ section, fields }) => {
      const tbody = document.querySelector(`#${section}-table tbody`);
      project.lines[section] = Array.from(tbody.children).map(r => {
        const cells = r.querySelectorAll('input');
        let entry = {};
        fields.forEach((f, j) => {
          if (cells[j].type === "number") {
            entry[f] = parseFloat(cells[j].value) || 0;
          } else if (cells[j].type === "date") {
            entry[f] = cells[j].value;
          } else {
            entry[f] = cells[j].value;
          }
        });
        return entry;
      });
    });

    await updateProject(project.id, project);
    updateTotals();

    // Toast as before
    let toast = document.getElementById('save-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'save-toast';
      toast.textContent = '✔️ Saved!';
      document.body.appendChild(toast);
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  });

  // --- 11. Print/Email Customer Copy (minimal fields, then restore screen) ---
  printCustBtn.addEventListener('click', async () => {
    // Prepare minimal summary for print
    buildCustomerPrintSummary(project);

    document.body.classList.add('print-customer-mode');
    document.body.classList.remove('company');

    // Print (wait a tick for DOM changes)
    setTimeout(() => {
      window.print();
      // After printing, remove summary and restore full form
      document.body.classList.remove('print-customer-mode');
      const summary = document.getElementById('customer-print-summary');
      if (summary) summary.remove();
      // Optionally, send email to customer!
      const totals = projectTotals(project);
      sendCustomerReceipt(project, totals).catch(e => {
        alert('Failed to email customer: ' + e.message);
      });
    }, 150);
  });

  // --- 12. Print Internal Copy ---
  printIntBtn.addEventListener('click', () => {
    document.body.classList.add('company');
    document.body.classList.remove('print-customer-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('company');
    }, 300);
  });

  // --- 13. Customer Print Summary Builder ---
  function buildCustomerPrintSummary(proj) {
    // Remove any old summary first
    let oldSummary = document.getElementById('customer-print-summary');
    if (oldSummary) oldSummary.remove();

    // Build Employee rows (only Name, Role)
    const empRows = (proj.lines.employees || []).map(e =>
      `<tr>
        <td>${e.name || ''}</td>
        <td>${e.role || ''}</td>
      </tr>`
    ).join('');
    // Use latest totals for price
    const t = projectTotals(proj);

    // Build and insert summary div before form
    const summary = document.createElement('div');
    summary.id = 'customer-print-summary';
    summary.innerHTML = `
      <h2>Project Summary</h2>
      <p><strong>Project Name:</strong> ${proj.name || ''}</p>
      <p><strong>Location:</strong> ${proj.location || ''}</p>
      <p><strong>Status:</strong> ${proj.status || ''}</p>
      <p><strong>Progress:</strong> ${proj.progress?.percent || 0}%</p>
      <h3>Assigned Employees</h3>
      <table style="width:350px; margin-bottom: 1em;">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          ${empRows}
        </tbody>
      </table>
      <p><strong>Total Price:</strong> R${t.price.toFixed(2)}</p>
      <hr>
      <p style="font-size:0.95em;color:#888;">Thank you for choosing Maduwa Paint World.</p>
    `;
    form.parentNode.insertBefore(summary, form);
  }

  // --- 14. Initial Render ---
  updateTotals();
  updateProgressAndStatus();
});
