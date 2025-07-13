// js/permissions.js
// ------------------------------------------------------------------
// Permission helpers for projects
// ------------------------------------------------------------------

/**
 * Collect every role string attached to the user profile.
 * Works with either `.roles` or `.employeeTypes` arrays.
 * All comparisons are case-insensitive.
 */
function roleList(user = {}) {
  const list = [
    ...(Array.isArray(user.roles)         ? user.roles         : []),
    ...(Array.isArray(user.employeeTypes) ? user.employeeTypes : [])
  ];
  return list.map(r => (typeof r === "string" ? r.toLowerCase() : ""));
}

/** Does the user have at least one of the requested roles? */
export function hasRole(user, ...roles) {
  const list = roleList(user);
  return roles.some(r => list.includes(String(r).toLowerCase()));
}

/** Auth-UID matches the `ownerId` stored on the project doc. */
export function isOwner(project, userAuth) {
  return !!(userAuth && project && userAuth.uid === project.ownerId);
}

/**
 * Can the user CREATE a new project?
 * Allowed roles: owner, admin, project-manager (pm / project manager).
 */
export function canCreateProject(userProfile) {
  return hasRole(userProfile, "owner", "admin", "pm", "project manager");
}

/**
 * Can the user EDIT (update) the project?
 * Allowed: document owner OR roles (admin, accountant, pm / project manager).
 */
export function canEditProject(project, userProfile) {
  return (
    isOwner(project, userProfile) ||
    hasRole(userProfile, "admin", "accountant", "pm", "project manager")
  );
}

/**
 * Can the user DELETE a project?
 * Allowed role: owner (organisation-level role), regardless of who created it.
 */
export function canDeleteProject(userProfile) {
  return hasRole(userProfile, "owner");
}

/** Show or hide any DOM element based on a boolean flag. */
export function setVisibility(el, allowed) {
  if (!el) return;
  el.style.display = allowed ? "" : "none";
}
