// project-tables.js
// ----------------------------------------------------------------
// Table rendering + “add row” handlers for each section
// ----------------------------------------------------------------
import { attachPrintMirror } from "./project-dom.js";

/** Per-employee total helper */
function calcEmployeeTotalPay(emp) {
  return (
    (parseFloat(emp.hours)         || 0) * (parseFloat(emp.normalRate)   || 0) +
    (parseFloat(emp.overtimeHours) || 0) * (parseFloat(emp.overtimeRate) || emp.normalRate || 0) +
    (parseFloat(emp.bonus)         || 0)
  );
}

/**
 * Render a section’s table.
 */
export function renderTable({ project, section, tableId, fields, types = {}, canEdit }) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";

  const lines = project.lines[section] || [];
  lines.forEach((item, rowIndex) => {
    const tr = document.createElement("tr");

    fields.forEach(f => {
      const type = types[f] || "text";
      let value = item[f] ?? "";

      // compute totals
      if (f === "totalPay" || f === "totalCost") {
        if (section === "employees") {
          value = calcEmployeeTotalPay(item).toFixed(2);
        }
        if (section === "bucketLabour") {
          value = ((item.buckets||0)*(item.ratePerBucket||0)).toFixed(2);
        }
        if (section === "paints") {
          value = ((item.buckets||0)*(item.costPerBucket||0)).toFixed(2);
        }
        if (section === "vehicles") {
          // petrol is a total cost, not rate/km
          value = (
            (parseFloat(item.petrol) || 0) +
            (parseFloat(item.tolls)  || 0)
          ).toFixed(2);
        }
        if (section === "expenses") {
          value = (item.amount||0).toFixed(2);
        }
      }

      const td = document.createElement("td");
      td.dataset.field = f;

      if (f === "totalPay" || f === "totalCost") {
        // render as readonly input for on-screen visibility
        td.innerHTML = `<input name="${f}" type="text" value="${value}" readonly />`;
        const inp = td.querySelector("input");
        // mirror for print
        attachPrintMirror(inp);
      } else {
        // regular editable cell
        td.innerHTML = `<input name="${f}" type="${type}" value="${value}" ${!canEdit ? "disabled" : ""} />`;
        const inp = td.querySelector("input");
        attachPrintMirror(inp);
      }

      tr.appendChild(td);
    });

    // remove button
    const removeTd = document.createElement("td");
    removeTd.innerHTML = `<button type="button" class="remove-row" data-index="${rowIndex}" ${!canEdit?'disabled':''}>×</button>`;
    tr.appendChild(removeTd);

    tbody.appendChild(tr);

    // live‐update row total
    const inputs = tr.querySelectorAll("input:not([readonly])");
    const totalInput = tr.querySelector(`input[name="${section === "employees" ? "totalPay" : "totalCost"}"]`);

    inputs.forEach(inp => {
      inp.addEventListener("input", () => {
        // rebuild row object
        const rowObj = {};
        fields.forEach(f => {
          const cellInp = tr.querySelector(`input[name="${f}"]`);
          if (!cellInp) return;
          rowObj[f] = cellInp.type === "number"
            ? parseFloat(cellInp.value) || 0
            : cellInp.value;
        });

        // recompute total
        let newTotal = "0.00";
        if (section === "employees") {
          newTotal = calcEmployeeTotalPay(rowObj).toFixed(2);
        }
        if (section === "bucketLabour") {
          newTotal = ((rowObj.buckets||0)*(rowObj.ratePerBucket||0)).toFixed(2);
        }
        if (section === "paints") {
          newTotal = ((rowObj.buckets||0)*(rowObj.costPerBucket||0)).toFixed(2);
        }
        if (section === "vehicles") {
          newTotal = (
            (rowObj.petrol || 0) +
            (rowObj.tolls  || 0)
          ).toFixed(2);
        }
        if (section === "expenses") {
          newTotal = (rowObj.amount||0).toFixed(2);
        }

        if (totalInput) totalInput.value = newTotal;
        // update its print mirror
        totalInput.nextElementSibling.textContent = newTotal;

        document.dispatchEvent(new CustomEvent("section-updated", { detail:{section} }));
      });
    });
  });

  // remove-row handlers
  tbody.querySelectorAll('.remove-row').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!canEdit) return;
      if (confirm('Remove this entry?')) {
        project.lines[section].splice(+btn.dataset.index,1);
        renderTable({ project, section, tableId, fields, types, canEdit });
        document.dispatchEvent(new CustomEvent("section-updated", { detail:{section} }));
      }
    });
  });
}

/**
 * Setup the +Add Row handler for any section
 */
export function setupAddHandler({ project, section, tableId, fields, types = {}, addBtn, canEdit }) {
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    if (!canEdit) return;

    // sync existing rows
    const tbody = document.querySelector(`#${tableId} tbody`);
    project.lines[section] = Array.from(tbody.children).map(tr => {
      const obj = {};
      fields.forEach(f => {
        const inp = tr.querySelector(`input[name="${f}"]`);
        obj[f] = inp && inp.type === 'number'
          ? parseFloat(inp.value) || 0
          : inp?.value ?? '';
      });
      return obj;
    });

    // add blank
    const blank = {};
    fields.forEach(f => blank[f] = types[f]==='number'?0:'');
    project.lines[section].push(blank);

    renderTable({ project, section, tableId, fields, types, canEdit });
    document.dispatchEvent(new CustomEvent("section-updated", { detail:{section} }));
  });
}
