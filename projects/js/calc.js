// js/calc.js

/**
 * Calculates totals for all cost areas: labour, paints, materials, vehicles, expenses.
 * Supports both quotation and actual costs.
 * @param {Object} project – full project object
 * @param {string} which – "actual" or "quotation" ("actual" by default)
 * @returns {Object} – { labour, paint, materials, vehicles, expenses, cost, profit, price, breakdown }
 */
export function projectTotals(project, which = "actual") {
  const sum = arr => arr.reduce((t, x) => t + x, 0);

  // Employees: (hours * rate) + overtime + bonus
  const employees = project.lines.employees || [];
  const labour = sum(employees.map(e =>
    (Number(e.hours) || 0) * (Number(e.rate) || 0) +
    (Number(e.overtime) || 0) +
    (Number(e.bonus) || 0)
  ));

  // Paints: buckets * cost per bucket
  const paints = project.lines.paints || [];
  const paint = sum(paints.map(p =>
    (Number(p.buckets) || 0) * (Number(p.costPerBucket) || 0)
  ));

  // Materials: quantity * unitCost
  const materialsArr = project.lines.materials || [];
  const materials = sum(materialsArr.map(m =>
    (Number(m.quantity) || 0) * (Number(m.unitCost) || 0)
  ));

  // Vehicles: (km * petrol) + tolls + extra (if needed)
  const vehicles = project.lines.vehicles || [];
  const vehiclesTotal = sum(vehicles.map(v =>
    ((Number(v.km) || 0) * (Number(v.petrol) || 0)) +
    (Number(v.tolls) || 0)
  ));

  // Other expenses: sum all expense.amount
  const expensesArr = project.lines.expenses || [];
  const expenses = sum(expensesArr.map(e => Number(e.amount) || 0));

  // Total cost
  const cost = labour + paint + materials + vehiclesTotal + expenses;

  // Markup/profit logic (supports both quotation/actual)
  let markupPct = 0;
  if (which === "quotation" && project.quotation && typeof project.quotation.price === "number") {
    markupPct = project.quotation.price && project.quotation.cost ? 
      ((project.quotation.price - project.quotation.cost) / project.quotation.cost) * 100 : (project.markupPct || 0);
  } else if (typeof project.markupPct === "number") {
    markupPct = project.markupPct;
  }
  const profit = cost * (markupPct / 100);
  const price  = cost + profit;

  // Return detailed breakdown for UI
  return {
    labour,
    paint,
    materials,
    vehicles: vehiclesTotal,
    expenses,
    cost,
    profit,
    price,
    breakdown: {
      employees,
      paints,
      materials: materialsArr,
      vehicles,
      expenses: expensesArr
    }
  };
}
