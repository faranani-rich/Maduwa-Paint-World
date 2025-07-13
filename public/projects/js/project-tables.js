/* project-tables.js
   ----------------------------------------------------------------
   Table rendering + “add row” handlers for each section
   ---------------------------------------------------------------- */
import { attachPrintMirror } from "./project-dom.js";

/* Pay helper for employees table */
function calcEmployeeTotalPay(emp) {
  return (
    (parseFloat(emp.hours)         || 0) * (parseFloat(emp.normalRate)   || 0) +
    (parseFloat(emp.overtimeHours) || 0) * (parseFloat(emp.overtimeRate) || 0) +
    (parseFloat(emp.bonus)         || 0)
  );
}

/* Render a section’s table */
export function renderTable({ project, section, tableId, fields, types = {}, canEdit }) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";

  const internalFields = section === "employees"
    ? ["hours","overtimeHours","normalRate","overtimeRate","bonus"]
    : [];

  (project.lines[section] || []).forEach((item, i) => {
    const rowHtml = fields.map(f => {
      const type =
        types[f] ||
        (f.toLowerCase().includes("date")
          ? "date"
          : ["normalRate","overtimeRate","hours","overtimeHours","bonus",
             "buckets","costPerBucket","quantity","unitCost",
             "km","petrol","tolls","amount"].includes(f)
          ? "number"
          : "text");
      let val = item[f] ?? "";
      if (type === "date" && typeof val === "string" && val.length >= 10) {
        val = val.slice(0, 10);
      }
      const cls = internalFields.includes(f) ? ' class="internal-only"' : "";
      return `<td${cls}>
               <input name="${f}" type="${type}" value="${val}" ${!canEdit ? "disabled" : ""}/>
             </td>`;
    }).join("");

    let html = rowHtml;
    if (section === "employees") {
      const totalPay = calcEmployeeTotalPay(project.lines.employees[i]).toFixed(2);
      html += `<td class="internal-only"><span class="print-value">${totalPay}</span></td>`;
    }
    html += `<td><button type="button" class="remove-row" data-index="${i}" ${
      !canEdit ? "disabled" : ""
    }>×</button></td>`;

    const tr = document.createElement("tr");
    tr.innerHTML = html;
    tbody.appendChild(tr);
    tr.querySelectorAll("input").forEach(inp => attachPrintMirror(inp));
  });

  /* remove handlers */
  tbody.querySelectorAll(".remove-row").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!canEdit) return;
      if (confirm("Remove this entry?")) {
        project.lines[section].splice(+btn.dataset.index, 1);
        renderTable({ project, section, tableId, fields, types, canEdit });
      }
    });
  });
}

/* “+ Add row” button */
export function setupAddHandler({ project, section, tableId, fields, addBtn, types = {}, canEdit }) {
  if (!addBtn) return;
  addBtn.addEventListener("click", () => {
    if (!canEdit) return;

    /* snapshot current table → project.lines */
    const tbody = document.querySelector(`#${tableId} tbody`);
    project.lines[section] = Array.from(tbody.children).map(tr => {
      const inputs = tr.querySelectorAll("input");
      const obj = {};
      fields.forEach((f, j) => {
        obj[f] = inputs[j].type === "number"
          ? parseFloat(inputs[j].value) || 0
          : inputs[j].value;
      });
      return obj;
    });

    /* push blank record */
    const blank = {};
    fields.forEach(f => {
      const type = types[f] || (f.toLowerCase().includes("date") ? "date" : "text");
      blank[f] = type === "number" ? 0 : "";
    });
    project.lines[section].push(blank);

    renderTable({ project, section, tableId, fields, types, canEdit });
  });
}
