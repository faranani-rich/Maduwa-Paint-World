// js/permissions.js

/**
 * Check if the current user is the owner of the project.
 * @param {Object} project - The full project object.
 * @param {Object} user - The current auth user object (must have .uid).
 * @returns {boolean}
 */
export function isOwner(project, user) {
  return user && project && user.uid === project.ownerId;
}

/**
 * Check if the user can edit the project (owner or admin).
 * Extend this for role-based logic (e.g. user.isAdmin).
 * @param {Object} project - The project object.
 * @param {Object} user - The current auth user.
 * @returns {boolean}
 */
export function canEditProject(project, user) {
  // Extend: if user.isAdmin or similar, return true.
  return isOwner(project, user);
}

/**
 * Hide or show elements based on permission.
 * @param {HTMLElement} el - The element to show/hide.
 * @param {boolean} allowed - If true, show; if false, hide.
 */
export function setVisibility(el, allowed) {
  if (!el) return;
  el.style.display = allowed ? '' : 'none';
}
