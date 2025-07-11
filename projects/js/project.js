// js/project.js

import { getProjectById, saveProject, updateProject } from './storage.js';
import { projectTotals } from './calc.js';
import { emptyProject } from './models.js';

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

  // --- 2. Ensure Model Defaults ---
  if (!project.lines) {
    project.lines = { employees: [], paints: [], vehicles: [], materials: [], expenses: [] };
  }
  ['employees', 'paints', 'vehicles', 'materials', 'expenses'].forEach(k => {
    if (!Array.isArray(project.lines[k])) project.lines[k] = [];
  });

  // --- 3. Cache DOM Elements ---
  const form = document.getElementById('project-form');
  // Basic fields
  const nameInput = form.querySelector('input[name="name"]');
  const locationInput = form.querySelector('input[name="location"]');
  const statusSelect = form.querySelector('select[name="status"]');
  const notesInput = form.querySelector('textarea[name="notes"]');
  const markupInput = form.querySelector('input[name="markupPct"]');
  // Project manager/customer
  const pmNameInput = form.querySelector('input[name="pm-name"]');
  const pmEmailInput = form.querySelector('input[name="pm-email"]');
  const custNameInput = form.querySelector('input[name="cust-name"]');
  const custEmailInput = form.querySelector('input[name="cust-email"]');
  // Progress, internal notes, signature
  const progressInput = form.querySelector('input[name="progress"]');
  const progressComment = form.querySelector('textarea[name="progress-comment"]');
  const internalNotes = form.querySelector('textarea[name="internal-notes"]');
  const sigCanvas = document.getElementById('sig-canvas');
  const clearSigBtn = document.getElementById('clear-signature');
  // Totals and controls
  const totalsEl = document.getElementById('totals');
  const backBtn = document.getElementById('back-btn');
  const printCustBtn = document.getElementById('print-customer');
  const printIntBtn = document.getElementById('print-internal');
  // Add buttons
  const addEmpBtn = document.getElementById('add-employee-btn');
  const addPaintBtn = document.getElementById('add-paint-btn');
  const addMatBtn = document.getElementById('add-material-btn');
  const addVehBtn = document.getElementById('add-vehicle-btn');
  const addExpBtn = document.getElementById('add-expense-btn');

  // --- 4. SignaturePad Setup ---
  const signaturePad = new SignaturePad(sigCanvas);
  if (project.signatureData) signaturePad.fromDataURL(project.signatureData);
  clearSigBtn.addEventListener('click', () => signaturePad.clear());

  // --- 5. Feedback (as before) ---
  // ...same as your logic...

  // --- 6. Populate Basic Fields ---
  nameInput.value = project.name || '';
  locationInput.value = project.location || '';
  statusSelect.value = project.status || 'quotation';
  notesInput.value = project.notes || '';
  markupInput.value = project.markupPct || 0;
  pmNameInput.value = project.projectManager?.name || '';
  pmEmailInput.value = project.projectManager?.email || '';
  custNameInput.value = project.customer?.name || '';
  custEmailInput.value = project.customer?.email || '';
  progressInput.value = project.progress?.percent || 0;
  progressComment.value = project.progress?.comment || '';
  internalNotes.value = project.internalNotes || '';

  // --- 7. Render Dynamic Sections (EMPLOYEES/PAINTS/etc.) ---
  function renderTable(section, tableId, fields) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    (project.lines[section] || []).forEach((item, i) => {
      const row = document.createElement('tr');
      row.innerHTML = fields.map(f =>
        `<td><input name="${f}" value="${item[f] || ''}" ${f.includes('rate') || f.includes('cost') || f.includes('hours') || f.includes('buckets') || f.includes('bonus') || f.includes('overtime') || f.includes('quantity') || f.includes('unitCost') || f.includes('km') || f.includes('petrol') || f.includes('tolls') || f.includes('amount') ? 'type="number"' : ''} /></td>`
      ).join('') +
      `<td><button type="button" class="remove-row" data-index="${i}">×</button></td>`;
      tbody.appendChild(row);
    });
    tbody.querySelectorAll('.remove-row').forEach(btn => {
      btn.addEventListener('click', () => {
        project.lines[section].splice(+btn.dataset.index, 1);
        renderTable(section, tableId, fields);
        updateTotals();
      });
    });
  }

  // --- 8. Add Row Handlers ---
  function setupAddHandler(section, tableId, fields, addBtn) {
    addBtn.addEventListener('click', () => {
      // Save current edits
      const tbody = document.querySelector(`#${tableId} tbody`);
      project.lines[section] = Array.from(tbody.children).map(r => {
        const cells = r.querySelectorAll('input');
        let entry = {};
        fields.forEach((f, i) => entry[f] = cells[i].type === "number" ? parseFloat(cells[i].value) || 0 : cells[i].value);
        return entry;
      });
      // Add empty row
      let emptyRow = {};
      fields.forEach(f => emptyRow[f] = (fields.includes('rate') || fields.includes('cost') || fields.includes('hours') || fields.includes('buckets') || fields.includes('bonus') || fields.includes('overtime') || fields.includes('quantity') || fields.includes('unitCost') || fields.includes('km') || fields.includes('petrol') || fields.includes('tolls') || fields.includes('amount')) ? 0 : '');
      project.lines[section].push(emptyRow);
      renderTable(section, tableId, fields);
      updateTotals();
    });
  }

  // --- 9. Set Up All Dynamic Sections ---
  renderTable('employees', 'employees-table', ['name', 'role', 'hours', 'rate', 'overtime', 'bonus']);
  renderTable('paints', 'paints-table', ['type', 'color', 'buckets', 'costPerBucket', 'supplier']);
  renderTable('materials', 'materials-table', ['description', 'quantity', 'unitCost']);
  renderTable('vehicles', 'vehicles-table', ['driver', 'car', 'purpose', 'km', 'petrol', 'tolls', 'location', 'date', 'notes']);
  renderTable('expenses', 'expenses-table', ['type', 'amount', 'notes']);

  setupAddHandler('employees', 'employees-table', ['name', 'role', 'hours', 'rate', 'overtime', 'bonus'], addEmpBtn);
  setupAddHandler('paints', 'paints-table', ['type', 'color', 'buckets', 'costPerBucket', 'supplier'], addPaintBtn);
  setupAddHandler('materials', 'materials-table', ['description', 'quantity', 'unitCost'], addMatBtn);
  setupAddHandler('vehicles', 'vehicles-table', ['driver', 'car', 'purpose', 'km', 'petrol', 'tolls', 'location', 'date', 'notes'], addVehBtn);
  setupAddHandler('expenses', 'expenses-table', ['type', 'amount', 'notes'], addExpBtn);

  // --- 10. Update Totals ---
  function updateTotals() {
    const t = projectTotals(project);
    totalsEl.innerHTML = `
      <p class="internal-only">Cost: R${t.cost.toFixed(2)}</p>
      <p class="internal-only">Profit: R${t.profit.toFixed(2)}</p>
      <p>Price: R${t.price.toFixed(2)}</p>
    `;
  }

  // --- 11. Save Handler ---
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    project.name = nameInput.value;
    project.location = locationInput.value;
    project.status = statusSelect.value;
    project.notes = notesInput.value;
    project.markupPct = parseFloat(markupInput.value) || 0;
    // Project manager/customer
    project.projectManager = { name: pmNameInput.value, email: pmEmailInput.value };
    project.customer = { name: custNameInput.value, email: custEmailInput.value };
    // Progress, internal, signature
    project.progress = {
      percent: parseFloat(progressInput.value) || 0,
      comment: progressComment.value,
      updatedAt: new Date().toISOString()
    };
    project.internalNotes = internalNotes.value;
    if (!signaturePad.isEmpty()) {
      project.signatureData = signaturePad.toDataURL();
    }

    // Save all tables
    // (Reuse renderTable logic to save latest user edits)
    ['employees', 'paints', 'materials', 'vehicles', 'expenses'].forEach((section, i) => {
      const fields = [
        ['name', 'role', 'hours', 'rate', 'overtime', 'bonus'],
        ['type', 'color', 'buckets', 'costPerBucket', 'supplier'],
        ['description', 'quantity', 'unitCost'],
        ['driver', 'car', 'purpose', 'km', 'petrol', 'tolls', 'location', 'date', 'notes'],
        ['type', 'amount', 'notes']
      ][i];
      const tbody = document.querySelector(`#${section}-table tbody`);
      project.lines[section] = Array.from(tbody.children).map(r => {
        const cells = r.querySelectorAll('input');
        let entry = {};
        fields.forEach((f, j) => entry[f] = cells[j].type === "number" ? parseFloat(cells[j].value) || 0 : cells[j].value);
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

  // --- 12. Print Buttons ---
  printCustBtn.addEventListener('click', () => {
    document.body.classList.remove('company');
    window.print();
  });
  printIntBtn.addEventListener('click', () => {
    document.body.classList.add('company');
    window.print();
    document.body.classList.remove('company');
  });

  // --- 13. Initial Render ---
  updateTotals();

  // Feedback logic can be slotted in as in your original file

  // Optionally: progress bar UI, reassignment log, etc.

});
