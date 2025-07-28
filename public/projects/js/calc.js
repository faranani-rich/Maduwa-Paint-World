// js/calc.js

/**
 * Calculate project financials: costs, remaining budgets, payments, profit.
 * @param {Object} project – full project object, including budgets and lines
 * @returns {Object} – detailed totals and remaining balances
 */
export function projectTotals(project) {
  const sum = arr => arr.reduce((t, x) => t + x, 0);

  // --- Employees (hourly labour) ---
  const employees = project.lines.employees || [];
  const employeePays = employees.map(e => {
    const hours = Number(e.hours) || 0;
    const overtimeHours = Number(e.overtimeHours) || 0;
    const normalRate = Number(e.normalRate) || 0;
    const overtimeRate = Number(e.overtimeRate) || normalRate;
    const bonus = Number(e.bonus) || 0;
    const totalPay = (hours * normalRate) + (overtimeHours * overtimeRate) + bonus;
    return { ...e, totalPay };
  });
  const labourCost = sum(employeePays.map(e => e.totalPay));

  // --- Bucket-based labour ---
  const buckets = project.lines.bucketLabour || [];
  const bucketCost = sum(buckets.map(b =>
    (Number(b.buckets) || 0) * (Number(b.ratePerBucket) || 0)
  ));

  // --- Paints ---
  const paints = project.lines.paints || [];
  const paintCost = sum(paints.map(p =>
    (Number(p.buckets) || 0) * (Number(p.costPerBucket) || 0)
  ));

  // --- Vehicles ---
  const vehicles = project.lines.vehicles || [];
  const vehiclesCost = sum(vehicles.map(v =>
    // PETROL is the total petrol cost, TOLLS is tolls
    (Number(v.petrol) || 0) + (Number(v.tolls) || 0)
  ));

  // --- Other expenses ---
  const others = project.lines.expenses || [];
  const otherCost = sum(others.map(o => Number(o.amount) || 0));

  // --- Budgets from project.budgets ---
  const budgets = {
    hourly: Number(project.budgets?.hourly) || 0,
    bucket: Number(project.budgets?.bucket) || 0,
    paints: Number(project.budgets?.paints) || 0,
    vehicles: Number(project.budgets?.vehicles) || 0,
    other: Number(project.budgets?.other) || 0
  };

  // --- Remaining budget per category ---
  const remaining = {
    hourly: budgets.hourly - labourCost,
    bucket: budgets.bucket - bucketCost,
    paints: budgets.paints - paintCost,
    vehicles: budgets.vehicles - vehiclesCost,
    other: budgets.other - otherCost
  };

  // --- Grand totals ---
  const totalCost = labourCost + bucketCost + paintCost + vehiclesCost + otherCost;
  const quotedPrice = Number(project.quotedPrice) || 0;
  const customerPaid = Number(project.customer?.paid) || 0;
  const remainingToPay = quotedPrice - customerPaid;
  const profit = quotedPrice - totalCost;

  return {
    // raw costs
    labour: labourCost,
    bucketLabour: bucketCost,
    paints: paintCost,
    vehicles: vehiclesCost,
    otherExpenses: otherCost,
    totalCost,
    // budgets & remaining
    budgets,
    remaining,
    // payments & profit
    quotedPrice,
    customerPaid,
    remainingToPay,
    profit,
    // detailed breakdown
    employeePays,
    breakdown: {
      employees: employeePays,
      buckets,
      paints,
      vehicles,
      expenses: others
    }
  };
}

/**
 * Calculate progress % from estimatedDuration and hoursWorked.
 * Accepts duration in hours or text like "1 week, 2 days".
 */
export function calculateProgressPercent(estimatedDuration, hoursWorked) {
  let totalHours = 0;
  if (typeof estimatedDuration === "string") {
    const hrMatch = estimatedDuration.match(/(\d+)\s*hour/);
    const dayMatch = estimatedDuration.match(/(\d+)\s*day/);
    const weekMatch = estimatedDuration.match(/(\d+)\s*week/);
    if (hrMatch) totalHours += parseInt(hrMatch[1], 10);
    if (dayMatch) totalHours += parseInt(dayMatch[1], 10) * 8;
    if (weekMatch) totalHours += parseInt(weekMatch[1], 10) * 40;
    if (!isNaN(Number(estimatedDuration))) totalHours = Number(estimatedDuration);
  } else if (typeof estimatedDuration === "number") {
    totalHours = estimatedDuration;
  }
  const worked = Number(hoursWorked) || 0;
  return totalHours > 0 ? Math.round((worked / totalHours) * 100) : 0;
}
