// js/calc.js

/**
 * Calculate per-employee total pay and other project totals.
 * @param {Object} project – full project object
 * @returns {Object} – { labour, paint, materials, vehicles, expenses, cost, profit, price, breakdown, employeePays }
 */
export function projectTotals(project, which = "actual") {
  const sum = arr => arr.reduce((t, x) => t + x, 0);

  // --- Employees (with detailed pay) ---
  const employees = project.lines.employees || [];
  const employeePays = employees.map(e => {
    // Use your field names!
    const hours         = Number(e.hours) || 0;
    const overtimeHours = Number(e.overtimeHours) || 0;
    const normalRate    = Number(e.normalRate) || 0;
    const overtimeRate  = Number(e.overtimeRate) || 0;
    const bonus         = Number(e.bonus) || 0;
    // fallback: if overtimeRate is blank, fallback to normalRate
    const totalPay = (hours * normalRate) + (overtimeHours * (overtimeRate || normalRate)) + bonus;
    return { ...e, totalPay };
  });

  const labour = sum(employeePays.map(e => e.totalPay));

  // --- Paints ---
  const paints = project.lines.paints || [];
  const paint = sum(paints.map(p =>
    (Number(p.buckets) || 0) * (Number(p.costPerBucket) || 0)
  ));

  // --- Materials ---
  const materialsArr = project.lines.materials || [];
  const materials = sum(materialsArr.map(m =>
    (Number(m.quantity) || 0) * (Number(m.unitCost) || 0)
  ));

  // --- Vehicles ---
  const vehicles = project.lines.vehicles || [];
  // Use: (km * petrol) + tolls (matches your previous logic)
  const vehiclesTotal = sum(vehicles.map(v =>
    ((Number(v.km) || 0) * (Number(v.petrol) || 0)) +
    (Number(v.tolls) || 0)
  ));

  // --- Expenses ---
  const expensesArr = project.lines.expenses || [];
  const expenses = sum(expensesArr.map(e => Number(e.amount) || 0));

  // --- Total cost, profit, price ---
  const cost = labour + paint + materials + vehiclesTotal + expenses;
  let markupPct = typeof project.markupPct === "number" ? project.markupPct : Number(project.markupPct) || 0;
  const profit = cost * (markupPct / 100);
  const price  = cost + profit;

  // --- Return breakdown with pays
  return {
    labour,
    paint,
    materials,
    vehicles: vehiclesTotal,
    expenses,
    cost,
    profit,
    price,
    employeePays, // array of { ...employee, totalPay }
    breakdown: {
      employees: employeePays,
      paints,
      materials: materialsArr,
      vehicles,
      expenses: expensesArr
    }
  };
}

/**
 * Calculate progress % from estimatedDuration and hoursWorked.
 * Accepts duration in hours (number or text like "1 week, 2 days").
 */
export function calculateProgressPercent(estimatedDuration, hoursWorked) {
  // Convert string to hours
  let totalHours = 0;
  if (typeof estimatedDuration === "string") {
    // Parse for "xx hour", "xx day", "xx week" etc
    const hrMatch = estimatedDuration.match(/(\d+)\s*hour/);
    const dayMatch = estimatedDuration.match(/(\d+)\s*day/);
    const weekMatch = estimatedDuration.match(/(\d+)\s*week/);
    totalHours += hrMatch ? parseInt(hrMatch[1], 10) : 0;
    totalHours += dayMatch ? parseInt(dayMatch[1], 10) * 8 : 0;
    totalHours += weekMatch ? parseInt(weekMatch[1], 10) * 40 : 0;
    // If just a number, treat as hours
    if (!isNaN(Number(estimatedDuration))) totalHours = Number(estimatedDuration);
  } else if (typeof estimatedDuration === "number") {
    totalHours = estimatedDuration;
  }
  hoursWorked = Number(hoursWorked) || 0;
  return totalHours > 0 ? Math.round((hoursWorked / totalHours) * 100) : 0;
}
