// js/log.js

/**
 * Adds a change log entry to the project.
 * @param {Object} project - The project object.
 * @param {string} action - Description of what changed ("Updated status", "Edited materials", etc).
 * @param {Object} [details] - Optional: object with old/new values, specific field names, etc.
 * @param {Object} [user] - Optional: { uid, name, email }
 */
export function addChangeLog(project, action, details = {}, user = {}) {
  if (!project.changeLog) project.changeLog = [];
  project.changeLog.push({
    action,              // e.g., "Updated status"
    details,             // e.g., { from: "in-progress", to: "completed" }
    user: {
      uid: user.uid || "",
      name: user.name || "",
      email: user.email || "",
    },
    date: new Date().toISOString(),
  });
}

/**
 * Get the formatted change log (most recent first).
 * @param {Object} project - The project object.
 * @returns {Array}
 */
export function getChangeLog(project) {
  return (project.changeLog || []).slice().reverse();
}
