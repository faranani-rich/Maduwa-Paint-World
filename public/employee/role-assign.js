/* =========================================================
   /employee/role-assign.js  – Role / Employee-type manager
   ========================================================= */

import { initAuthListener } from "../authentication/auth.js";
import {
  listAllUsers,
  updateUserEmployeeTypes,
  deleteUserAccount,
} from "../services/userService.js";



/* ---------- 1.  Config ---------- */
/* All recognised employee-level types (drives modal checklist). */
const EMP_TYPES = [
  "owner",
  "admin",
  "accountant",
  "project-manager",
  "inventory",
  "sales",
  "factory",
  "chemist",
  "driver",
  "painter",
  "general-employee",
];

/* ---------- 2.  DOM refs ---------- */
const tbody       = document.getElementById("users-table-body");
const dlg         = document.getElementById("edit-modal");
const form        = document.getElementById("edit-form");
const chkEmployee = document.getElementById("chk-employee");
const empGrid     = document.getElementById("emp-types-checkboxes");
const empWrapper  = document.getElementById("emp-types-wrapper");
const nameInput   = document.getElementById("edit-name");
const emailInput  = document.getElementById("edit-email");

/* ---------- 3.  Runtime flags ---------- */
let signedInIsOwner     = false;
let signedInIsAdminOnly = false; // admin but NOT owner
let currentUserRef      = null;  // { uid, data }

/* ---------- 4.  Build static checklist ---------- */
function buildEmpTypeCheckboxes() {
  empGrid.innerHTML = "";
  EMP_TYPES.forEach((t) => {
    empGrid.insertAdjacentHTML(
      "beforeend",
      `<label>
         <input type="checkbox" value="${t}" id="emp-${t}" />
         <span>${t.replace("-", " ")}</span>
       </label>`
    );
  });
}
buildEmpTypeCheckboxes();

/* ---------- 5.  Helpers ---------- */
function toggleEmpTypeFieldset() {
  empWrapper.toggleAttribute("disabled", !chkEmployee.checked);
}

/* Owner ⇒ admin before computing flags */
function gatherFormValues() {
  const roles = ["customer"];
  const employeeTypes = [];

  if (chkEmployee.checked) {
    roles.push("employee");
    empGrid
      .querySelectorAll("input[type=checkbox]:checked")
      .forEach((c) => employeeTypes.push(c.value));
  }

  if (employeeTypes.includes("owner") && !employeeTypes.includes("admin")) {
    employeeTypes.push("admin");
  }

  const isOwner = employeeTypes.includes("owner");
  const isAdmin = employeeTypes.includes("admin");

  return { roles, employeeTypes, isOwner, isAdmin };
}

/* ---------- 6.  Render table ---------- */
async function renderTable() {
  tbody.textContent = "Loading…";
  const users = await listAllUsers();
  tbody.innerHTML = "";

  users.forEach((u) => {
    const uTypes  = Array.isArray(u.employeeTypes) ? u.employeeTypes : [];
    const isEmp   = (u.roles || []).includes("employee");
    const typeStr = isEmp ? (uTypes.join(", ") || "employee") : "—";

    tbody.insertAdjacentHTML(
      "beforeend",
      `<tr>
         <td>${u.name || ""}</td>
         <td>${u.email}</td>
         <td>${typeStr}</td>
         <td class="min-col">
           <button class="btn" data-edit   data-id="${u.uid}">Edit&nbsp;Roles</button>
           <button class="btn" data-delete data-id="${u.uid}">Delete</button>
         </td>
       </tr>`
    );
  });
}

/* ---------- 7.  Modal open ---------- */
async function openEditor(uid) {
  const users = await listAllUsers();
  const data  = users.find((u) => u.uid === uid);
  if (!data) return alert("User not found.");

  /* Admins cannot modify owner accounts */
  if (
    !signedInIsOwner &&
    (data.employeeTypes || []).includes("owner")
  ) {
    return alert("Only the owner can modify owner accounts.");
  }

  currentUserRef = { uid, data };

  nameInput.value  = data.name  || data.email.split("@")[0];
  emailInput.value = data.email;

  chkEmployee.checked = (data.roles || []).includes("employee");
  toggleEmpTypeFieldset();

  empGrid.querySelectorAll("input[type=checkbox]").forEach((c) => {
    c.checked = (data.employeeTypes || []).includes(c.value);
  });

  dlg.showModal();
}

/* ---------- 8.  Save ---------- */
async function handleSave(e) {
  e.preventDefault();
  if (!currentUserRef) return;

  const { roles, employeeTypes, isOwner, isAdmin } = gatherFormValues();

  /* Admin-only user may not assign owner */
  if (
    signedInIsAdminOnly &&
    employeeTypes.includes("owner")
  ) {
    return alert("Only the owner can assign or edit the owner role.");
  }

  try {
    await updateUserEmployeeTypes(currentUserRef.uid, {
      roles,
      employeeTypes,
      isAdmin,
      isOwner,
    });
    dlg.close();
    await renderTable();
  } catch (err) {
    console.error("Failed to update user:", err);
    alert("Save failed – see console.");
  }
}

/* ---------- 9.  Delete ---------- */
async function handleDelete(uid, email) {
  if (!signedInIsOwner) return alert("Only the owner can delete accounts.");
  if (!confirm(`Delete account for ${email}?`)) return;

  try {
    await deleteUserAccount(uid);
    await renderTable();
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Error deleting user – see console.");
  }
}

/* ---------- 10.  Auth gate & boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initAuthListener(async ({ user, profile }) => {
    if (!user || !profile) {
      location.href = "../authentication/login.html";
      return;
    }

    const types = profile.employeeTypes || [];
    signedInIsOwner     = types.includes("owner");
    signedInIsAdminOnly = types.includes("admin") && !signedInIsOwner;

    if (!signedInIsOwner && !signedInIsAdminOnly) {
      document.body.innerHTML = "<p>Access denied.</p>";
      return;
    }

    await renderTable();
  });
});

/* ---------- 11.  Event delegation ---------- */
tbody.addEventListener("click", (e) => {
  const edit   = e.target.closest("[data-edit]");
  const delBtn = e.target.closest("[data-delete]");

  if (edit) {
    openEditor(edit.dataset.id);
  } else if (delBtn) {
    const email = delBtn.closest("tr")?.children[1]?.textContent || "";
    handleDelete(delBtn.dataset.id, email);
  }
});

/* ---------- 12.  Modal events ---------- */
chkEmployee.addEventListener("change", toggleEmpTypeFieldset);
form.addEventListener("submit", handleSave);
dlg.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close")) dlg.close();
});
