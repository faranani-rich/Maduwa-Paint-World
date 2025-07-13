// js/progress.js

/**
 * Set the current progress of a project (percent and comment).
 * Also updates the progress.updatedAt timestamp.
 * @param {Object} project - The project object.
 * @param {number} percent - Percent complete (0–100).
 * @param {string} comment - Optional comment or note.
 */
export function setProgress(project, percent, comment = '') {
  if (!project.progress) project.progress = {};
  project.progress.percent = Math.max(0, Math.min(100, Number(percent) || 0));
  project.progress.comment = comment || '';
  project.progress.updatedAt = new Date().toISOString();
}

/**
 * Add a progress log entry to project.reassignments or project.progressLog.
 * (Keeps a history of updates. Optional: Use this for a visible progress timeline.)
 * @param {Object} project - The project object.
 * @param {string} action - Description of action (e.g., "Reached 50% - walls painted").
 * @param {string} [user] - Name/email of user making the update.
 */
export function addProgressLog(project, action, user = '') {
  if (!project.progressLog) project.progressLog = [];
  project.progressLog.push({
    action,
    user,
    date: new Date().toISOString()
  });
}

/**
 * Get a formatted summary of progress for display.
 * @param {Object} project - The project object.
 * @returns {string}
 */
export function progressSummary(project) {
  if (!project.progress) return "Progress not set.";
  return `${project.progress.percent || 0}% complete — ${project.progress.comment || ""}`;
}
