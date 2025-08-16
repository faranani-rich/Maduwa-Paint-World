// /employee/role-assign.js – Role / Employee-type manager (enhanced UI)

import { initAuthListener } from "../authentication/auth.js";
import {
  listAllUsers,
  updateUserEmployeeTypes,
  deleteUserAccount
} from "../services/userService.js";

/* ============================================
   1) Config / constants
   ============================================ */
const EMP_TYPES = [
  "owner", "admin", "accountant", "project-manager",
  "inventory", "sales", "factory", "chemist",
  "driver", "painter", "general-employee"
];
// roles are conceptually ["customer","employee"]; we expose filters for convenience:
const KNOWN_ROLES = ["customer", "employee"];

/* ============================================
   2) DOM refs
   ============================================ */
// table + states
const tbody            = document.getElementById("users-table-body");
const usersTable       = document.getElementById("usersTable");
const tableLoading     = document.getElementById("tableLoading");
const tableEmpty       = document.getElementById("tableEmpty");
const tableError       = document.getElementById("tableError");
const retryBtn         = document.getElementById("retryBtn");
// row template
const rowTpl           = document.getElementById("userRowTemplate");

// header + controls
const refreshBtn       = document.getElementById("refreshBtn");

const searchInput      = document.getElementById("searchInput");
const clearSearchBtn   = document.getElementById("clearSearchBtn");
const sortSelect       = document.getElementById("sortSelect");

const roleFilterBtn    = document.getElementById("roleFilterBtn");
const roleFilterList   = document.getElementById("roleFilterList");
const typeFilterBtn    = document.getElementById("typeFilterBtn");
const typeFilterList   = document.getElementById("typeFilterList");

const onlyEmployeesTgl = document.getElementById("onlyEmployeesToggle");
const includeDisabledTgl = document.getElementById("includeDisabledToggle");

const activeChipsWrap  = document.getElementById("activeFilters");

// bulk bar
const bulkBar          = document.getElementById("bulkBar");
const bulkCountEl      = document.getElementById("bulkCount");
const bulkAddRoleBtn   = document.getElementById("bulkAddRoleBtn");
const bulkRemoveRoleBtn= document.getElementById("bulkRemoveRoleBtn");
const bulkTypesBtn     = document.getElementById("bulkTypesBtn");
const bulkClearBtn     = document.getElementById("bulkClearBtn");

// pagination
const pageSizeSelect   = document.getElementById("pageSizeSelect");
const prevPageBtn      = document.getElementById("prevPageBtn");
const nextPageBtn      = document.getElementById("nextPageBtn");
const pageStatus       = document.getElementById("pageStatus");
const selectAll        = document.getElementById("selectAll");

// modals
const editDlg          = document.getElementById("edit-modal");
const editForm         = document.getElementById("edit-form");
const chkEmployee      = document.getElementById("chk-employee");
const empGrid          = document.getElementById("emp-types-checkboxes");
const empWrapper       = document.getElementById("emp-types-wrapper");
const nameInput        = document.getElementById("edit-name");
const emailInput       = document.getElementById("edit-email");

const bulkDlg          = document.getElementById("bulk-modal");
const bulkForm         = document.getElementById("bulk-form");
const bulkControls     = document.getElementById("bulkControls");

// toast
const toastEl          = document.getElementById("toast");

/* ============================================
   3) Runtime state
   ============================================ */
let signedInUser = null;
let signedInProfile = null;
let signedInIsOwner = false;
let signedInIsAdminOnly = false;

let allUsers = [];           // raw from backend
let filtered = [];           // after search/filters
let page = 1;
let pageSize = parseInt(pageSizeSelect?.value || "25", 10);
let sortState = { key: "name", dir: "asc" };

let roleFilterSet = new Set();       // values from KNOWN_ROLES
let typeFilterSet = new Set();       // values from EMP_TYPES
let onlyEmployees = false;
let includeDisabled = false;

let selectedIds = new Set();         // bulk selection

let currentEditUid = null;

/* ============================================
   4) Utilities
   ============================================ */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function showToast(msg, ms = 2500) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  setTimeout(() => { toastEl.hidden = true; }, ms);
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function normStr(x) {
  return (x || "").toString().trim().toLowerCase();
}

function joinTypes(u) {
  const isEmp = (u.roles || []).includes("employee");
  const uTypes = Array.isArray(u.employeeTypes) ? u.employeeTypes : [];
  return isEmp ? (uTypes.length ? uTypes.join(", ") : "employee") : "—";
}

function isOwnerUser(u) {
  return Array.isArray(u.employeeTypes) && u.employeeTypes.includes("owner");
}

function canEditUser(u) {
  if (signedInIsOwner) return true;
  // Admin cannot edit owners
  if (signedInIsAdminOnly && isOwnerUser(u)) return false;
  return signedInIsAdminOnly;
}

function canDeleteUser(u) {
  // Only owner can delete and not themselves
  return signedInIsOwner && u.uid !== signedInUser?.uid;
}

/* ============================================
   5) Build dynamic UI pieces (filters, checkboxes)
   ============================================ */
function buildEmpTypeCheckboxes() {
  empGrid.innerHTML = "";
  EMP_TYPES.forEach(t => {
    empGrid.insertAdjacentHTML(
      "beforeend",
      `<label>
        <input type="checkbox" value="${t}" id="emp-${t}" />
        <span>${t.replace(/-/g, " ")}</span>
      </label>`
    );
  });
}

function buildFilterPopups() {
  // role filter
  roleFilterList.innerHTML = "";
  KNOWN_ROLES.forEach(role => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "option");
    btn.dataset.value = role;
    btn.textContent = role;
    btn.addEventListener("click", () => toggleRoleFilter(role));
    roleFilterList.appendChild(btn);
  });

  // employee type filter
  typeFilterList.innerHTML = "";
  EMP_TYPES.forEach(t => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "option");
    btn.dataset.value = t;
    btn.textContent = t.replace(/-/g, " ");
    btn.addEventListener("click", () => toggleTypeFilter(t));
    typeFilterList.appendChild(btn);
  });

  updateFilterPopupSelections();
  updateFilterButtons();
}

function updateFilterPopupSelections() {
  [...roleFilterList.querySelectorAll("button")].forEach(b => {
    b.setAttribute("aria-selected", roleFilterSet.has(b.dataset.value) ? "true" : "false");
  });
  [...typeFilterList.querySelectorAll("button")].forEach(b => {
    b.setAttribute("aria-selected", typeFilterSet.has(b.dataset.value) ? "true" : "false");
  });
}

function updateFilterButtons() {
  roleFilterBtn.textContent = roleFilterSet.size ? [...roleFilterSet].join(", ") : "Any role";
  typeFilterBtn.textContent = typeFilterSet.size ? [...typeFilterSet].map(x => x.replace(/-/g, " ")).join(", ") : "Any type";
}

function togglePopup(btn, listEl) {
  const expanded = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", expanded ? "false" : "true");
  // clicking outside closes both
  const onDocClick = (e) => {
    if (!btn.contains(e.target) && !listEl.contains(e.target)) {
      btn.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onDocClick);
    }
  };
  document.addEventListener("click", onDocClick);
}

function toggleRoleFilter(role) {
  if (roleFilterSet.has(role)) roleFilterSet.delete(role);
  else roleFilterSet.add(role);
  updateFilterPopupSelections();
  updateFilterButtons();
  render();
}

function toggleTypeFilter(t) {
  if (typeFilterSet.has(t)) typeFilterSet.delete(t);
  else typeFilterSet.add(t);
  updateFilterPopupSelections();
  updateFilterButtons();
  render();
}

function renderActiveFilterChips() {
  activeChipsWrap.innerHTML = "";
  // search chip
  const q = normStr(searchInput.value);
  if (q) addChip(`Search: ${q}`, () => { searchInput.value = ""; render(); });

  // role chips
  roleFilterSet.forEach(r => addChip(`Role: ${r}`, () => { roleFilterSet.delete(r); updateFilterButtons(); render(); }));

  // type chips
  typeFilterSet.forEach(t => addChip(`Type: ${t.replace(/-/g, " ")}`, () => { typeFilterSet.delete(t); updateFilterButtons(); render(); }));

  if (onlyEmployees) addChip("Employees only", () => { onlyEmployeesTgl.checked = false; onlyEmployees = false; render(); });
  if (includeDisabled) addChip("Include disabled", () => { includeDisabledTgl.checked = false; includeDisabled = false; render(); });

  function addChip(label, onRemove) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${label} <button type="button" aria-label="Remove">&times;</button>`;
    chip.querySelector("button").addEventListener("click", onRemove);
    activeChipsWrap.appendChild(chip);
  }
}

/* ============================================
   6) Data pipeline: fetch → filter → sort → paginate → paint
   ============================================ */
async function fetchUsers() {
  try {
    tableError.hidden = true;
    tableEmpty.hidden = true;
    tableLoading.classList.remove("hidden");
    const data = await listAllUsers();
    allUsers = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("listAllUsers failed:", err);
    tableError.hidden = false;
    showToast("Failed to load users");
  } finally {
    tableLoading.classList.add("hidden");
  }
}

function applyFilters() {
  const q = normStr(searchInput.value);
  const rf = roleFilterSet;
  const tf = typeFilterSet;

  filtered = allUsers.filter(u => {
    // includeDisabled toggle: if false and u.disabled === true, skip
    if (!includeDisabled && u.disabled) return false;

    // only employees?
    const isEmp = (u.roles || []).includes("employee");
    if (onlyEmployees && !isEmp) return false;

    // role filter set (customer/employee) – if any selected, must match at least one
    if (rf.size) {
      const has = [...rf].some(r => (u.roles || []).includes(r));
      if (!has) return false;
    }

    // employee types filter – if any selected, user must have at least one
    if (tf.size) {
      const types = Array.isArray(u.employeeTypes) ? u.employeeTypes : [];
      const match = types.some(t => tf.has(t));
      if (!match) return false;
    }

    // search query against name, email, roles, types
    if (q) {
      const hay = [
        u.name, u.email,
        ...(u.roles || []),
        ...((u.employeeTypes && Array.isArray(u.employeeTypes)) ? u.employeeTypes : [])
      ].map(normStr).join(" ");
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

function applySort() {
  // sortSelect can override header sort; if it's set, use it
  const val = sortSelect?.value;
  let key = sortState.key, dir = sortState.dir;
  if (val && val.includes(".")) {
    const [k, d1, d2] = val.split(".");
    key = k === "roles" && d1 === "count" ? "roles.count" : k;
    dir = (d2 || d1) === "desc" ? "desc" : "asc";
  }

  const dirMul = dir === "desc" ? -1 : 1;
  filtered.sort((a, b) => {
    let A, B;
    switch (key) {
      case "email":
        A = normStr(a.email); B = normStr(b.email); break;
      case "roles.count":
        A = (a.employeeTypes?.length || 0); B = (b.employeeTypes?.length || 0); break;
      case "name":
      default:
        A = normStr(a.name || a.email); B = normStr(b.name || b.email); break;
    }
    if (A < B) return -1 * dirMul;
    if (A > B) return  1 * dirMul;
    return 0;
  });

  // reflect in header sort buttons
  usersTable.querySelectorAll(".th-btn").forEach(btn => {
    const k = btn.dataset.sort;
    if ((k === "roles" && key === "roles.count") || k === key) {
      btn.setAttribute("data-dir", dir);
    } else {
      btn.removeAttribute("data-dir");
    }
  });
}

function getPageSlice() {
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(page, pages);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  return { start, end, total, pages };
}

function paintTable() {
  tbody.innerHTML = "";
  const { start, end, total, pages } = getPageSlice();

  if (total === 0) {
    tableEmpty.hidden = false;
    pageStatus.textContent = "Page 1 of 1";
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    selectAll.checked = false;
    bulkSelectionChanged();
    return;
  } else {
    tableEmpty.hidden = true;
  }

  for (let i = start; i < end; i++) {
    const u = filtered[i];
    const tr = rowTpl.content.firstElementChild.cloneNode(true);

    // selection checkbox
    const rowChk = tr.querySelector(".row-select");
    rowChk.dataset.id = u.uid;
    rowChk.checked = selectedIds.has(u.uid);
    rowChk.addEventListener("change", onRowCheckboxChange);

    // name + avatar
    tr.querySelector(".name-text").textContent = u.name || (u.email?.split("@")[0] || "—");

    // email
    const emailLink = tr.querySelector(".email-link");
    emailLink.textContent = u.email || "—";
    if (u.email) {
      emailLink.href = `mailto:${u.email}`;
    } else {
      emailLink.removeAttribute("href");
    }

    // roles / types chips
    const chipsWrap = tr.querySelector(".role-chips");
    chipsWrap.innerHTML = "";
    const isEmp = (u.roles || []).includes("employee");
    if (isEmp) {
      const types = Array.isArray(u.employeeTypes) ? u.employeeTypes : [];
      if (types.length === 0) {
        chipsWrap.appendChild(makeChip("employee"));
      } else {
        types.forEach(t => chipsWrap.appendChild(makeChip(t)));
      }
    } else {
      chipsWrap.appendChild(makeChip("customer"));
    }

    // actions
    const editBtn = tr.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => openEditor(u.uid));
    editBtn.disabled = !canEditUser(u);
    editBtn.title = editBtn.disabled ? "Insufficient permissions" : "Edit roles";

    const moreBtn = tr.querySelector(".more-btn");
    moreBtn.addEventListener("click", () => showRowMoreMenu(moreBtn, u));

    tbody.appendChild(tr);
  }

  pageStatus.textContent = `Page ${page} of ${Math.max(1, Math.ceil(filtered.length / pageSize))}`;
  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= Math.ceil(filtered.length / pageSize);

  // update selectAll based on visible rows
  const visibleIds = visibleRowIds();
  const allChecked = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  selectAll.checked = allChecked;

  bulkSelectionChanged();
}

function visibleRowIds() {
  return [...tbody.querySelectorAll(".row-select")].map(chk => chk.dataset.id);
}

function makeChip(text) {
  const span = document.createElement("span");
  span.className = "chip";
  span.textContent = text.replace(/-/g, " ");
  return span;
}

/* ============================================
   7) Bulk selection + actions
   ============================================ */
function onRowCheckboxChange(e) {
  const id = e.target.dataset.id;
  if (e.target.checked) selectedIds.add(id);
  else selectedIds.delete(id);

  bulkSelectionChanged();

  // reflect selectAll if all visible checked
  const vis = visibleRowIds();
  selectAll.checked = vis.length > 0 && vis.every(v => selectedIds.has(v));
}

function bulkSelectionChanged() {
  const count = selectedIds.size;
  bulkCountEl.textContent = count;
  bulkBar.hidden = count === 0;
}

function clearBulkSelection() {
  selectedIds.clear();
  [...tbody.querySelectorAll(".row-select")].forEach(chk => chk.checked = false);
  selectAll.checked = false;
  bulkSelectionChanged();
}

function openBulkModal(kind) {
  // kind: 'add-role' | 'remove-role' | 'set-types'
  bulkControls.innerHTML = "";

  if (kind === "add-role" || kind === "remove-role") {
    const label = document.createElement("label");
    label.textContent = (kind === "add-role") ? "Choose role to add:" : "Choose role to remove:";
    label.style.display = "block";
    label.style.marginBottom = ".4rem";

    const sel = document.createElement("select");
    sel.id = "bulkRoleSelect";
    ["employee", "customer"].forEach(r => {
      const opt = document.createElement("option");
      opt.value = r; opt.textContent = r;
      sel.appendChild(opt);
    });

    bulkControls.appendChild(label);
    bulkControls.appendChild(sel);
  } else if (kind === "set-types") {
    const wrap = document.createElement("div");
    wrap.className = "checkbox-grid";
    EMP_TYPES.forEach(t => {
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox" value="${t}"><span>${t.replace(/-/g," ")}</span>`;
      wrap.appendChild(lab);
    });

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "This replaces each selected user's employee type list.";
    bulkControls.appendChild(wrap);
    bulkControls.appendChild(hint);
  }

  bulkForm.dataset.kind = kind;
  bulkDlg.showModal();
}

async function applyBulkAction(e) {
  e.preventDefault();
  const kind = bulkForm.dataset.kind;
  if (!kind || selectedIds.size === 0) return;

  const ids = [...selectedIds];
  // Build operations
  try {
    if (kind === "add-role" || kind === "remove-role") {
      const role = document.getElementById("bulkRoleSelect").value;
      const adding = kind === "add-role";

      for (const id of ids) {
        const u = allUsers.find(x => x.uid === id);
        if (!u) continue;

        // build new roles/types
        const roles = new Set(u.roles || ["customer"]);
        const types = new Set(u.employeeTypes || []);

        if (adding) roles.add(role);
        else roles.delete(role);

        // ensure invariants
        if (!roles.size) roles.add("customer");
        if (!roles.has("employee")) {
          // if removing employee role, clear types
          roles.delete("employee");
          types.clear();
        }

        const payload = {
          roles: [...roles],
          employeeTypes: [...types],
          isOwner: types.has("owner"),
          isAdmin: types.has("admin")
        };

        // admin cannot touch owners
        if (!signedInIsOwner && payload.isOwner) continue;

        await updateUserEmployeeTypes(id, payload);
      }
    } else if (kind === "set-types") {
      const checks = [...bulkControls.querySelectorAll('input[type="checkbox"]:checked')];
      const chosen = checks.map(c => c.value);

      for (const id of ids) {
        const u = allUsers.find(x => x.uid === id);
        if (!u) continue;

        const roles = new Set(u.roles || ["customer"]);
        // If setting types, ensure employee role present
        roles.add("employee");

        const types = new Set(chosen);
        // owner implies admin
        if (types.has("owner")) types.add("admin");

        const payload = {
          roles: [...roles],
          employeeTypes: [...types],
          isOwner: types.has("owner"),
          isAdmin: types.has("admin")
        };

        if (!signedInIsOwner && payload.isOwner) continue;

        await updateUserEmployeeTypes(id, payload);
      }
    }

    bulkDlg.close();
    clearBulkSelection();
    await reload();
    showToast("Bulk update applied");
  } catch (err) {
    console.error("Bulk update failed:", err);
    showToast("Bulk update failed");
  }
}

/* ============================================
   8) Edit modal
   ============================================ */
function toggleEmpTypeFieldset() {
  empWrapper.toggleAttribute("disabled", !chkEmployee.checked);
}

function gatherFormValues() {
  const roles = new Set(["customer"]);
  const types = new Set();

  if (chkEmployee.checked) {
    roles.add("employee");
    empGrid.querySelectorAll('input[type="checkbox"]:checked').forEach(c => types.add(c.value));
  }

  // owner implies admin
  if (types.has("owner")) types.add("admin");

  return {
    roles: [...roles],
    employeeTypes: [...types],
    isOwner: types.has("owner"),
    isAdmin: types.has("admin")
  };
}

async function openEditor(uid) {
  const data = allUsers.find(u => u.uid === uid);
  if (!data) return showToast("User not found");

  if (!signedInIsOwner && isOwnerUser(data)) {
    return showToast("Only the owner can modify owner accounts");
  }

  currentEditUid = uid;

  nameInput.value  = data.name || data.email?.split("@")[0] || "";
  emailInput.value = data.email || "";

  chkEmployee.checked = (data.roles || []).includes("employee");
  toggleEmpTypeFieldset();

  // set checkboxes
  empGrid.querySelectorAll('input[type="checkbox"]').forEach(c => {
    c.checked = (data.employeeTypes || []).includes(c.value);
  });

  editDlg.showModal();
}

async function handleSave(e) {
  e.preventDefault();
  if (!currentEditUid) return;

  const payload = gatherFormValues();

  if (signedInIsAdminOnly && payload.isOwner) {
    return showToast("Only the owner can assign or edit the owner role");
  }

  try {
    await updateUserEmployeeTypes(currentEditUid, payload);
    editDlg.close();
    await reload();
    showToast("Changes saved");
  } catch (err) {
    console.error("Failed to update user:", err);
    showToast("Save failed");
  }
}

/* ============================================
   9) Row "more" actions (delete)
   ============================================ */
function showRowMoreMenu(btn, u) {
  // For now, we just do delete with confirm. In future this could be a proper popover.
  if (!canDeleteUser(u)) {
    return showToast("You don't have permission to delete this account");
  }
  const ok = confirm(`Permanently delete account for ${u.email || u.name || "this user"}?`);
  if (!ok) return;
  deleteUserAccount(u.uid)
    .then(async () => { await reload(); showToast("Account deleted"); })
    .catch(err => { console.error(err); showToast("Delete failed"); });
}

/* ============================================
   10) Render coordinator
   ============================================ */
function render() {
  // sync controls state
  onlyEmployees = !!onlyEmployeesTgl?.checked;
  includeDisabled = !!includeDisabledTgl?.checked;
  pageSize = parseInt(pageSizeSelect?.value || "25", 10);

  // pipeline
  applyFilters();
  applySort();
  paintTable();
  renderActiveFilterChips();
}

async function reload() {
  await fetchUsers();
  // preserve page if possible; otherwise clamp happens in getPageSlice()
  render();
}

/* ============================================
   11) Event wiring
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  // auth gate
  initAuthListener(async ({ user, profile }) => {
    if (!user || !profile) {
      location.href = "../authentication/login.html";
      return;
    }

    signedInUser = user;
    signedInProfile = profile;

    const types = profile.employeeTypes || [];
    signedInIsOwner = types.includes("owner");
    signedInIsAdminOnly = types.includes("admin") && !signedInIsOwner;

    if (!signedInIsOwner && !signedInIsAdminOnly) {
      document.body.innerHTML = "<main class='container'><section class='card'><p>Access denied.</p></section></main>";
      return;
    }

    // initial UI setup
    buildEmpTypeCheckboxes();
    buildFilterPopups();

    // initial fetch & paint
    await reload();
  });
});

/* Controls */
const onSearch = debounce(() => { page = 1; render(); }, 220);
searchInput?.addEventListener("input", onSearch);
clearSearchBtn?.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  page = 1;
  render();
});

sortSelect?.addEventListener("change", () => { page = 1; render(); });

onlyEmployeesTgl?.addEventListener("change", () => { page = 1; render(); });
includeDisabledTgl?.addEventListener("change", () => { page = 1; render(); });

roleFilterBtn?.addEventListener("click", () => togglePopup(roleFilterBtn, roleFilterList));
typeFilterBtn?.addEventListener("click", () => togglePopup(typeFilterBtn, typeFilterList));

refreshBtn?.addEventListener("click", () => reload());
retryBtn?.addEventListener("click", () => reload());

/* Header sort buttons */
usersTable?.querySelectorAll(".th-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const k = btn.dataset.sort; // "name" | "email" | "roles"
    // map "roles" to "roles.count"
    const key = (k === "roles") ? "roles.count" : k;
    // toggle dir
    const newDir = (sortState.key === key && sortState.dir === "asc") ? "desc" : "asc";
    sortState = { key, dir: newDir };
    // clear dropdown to reflect header choice
    if (sortSelect) sortSelect.selectedIndex = 0;
    render();
  });
});

/* Pagination */
pageSizeSelect?.addEventListener("change", () => { page = 1; render(); });
prevPageBtn?.addEventListener("click", () => { if (page > 1) { page--; render(); } });
nextPageBtn?.addEventListener("click", () => {
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (page < maxPage) { page++; render(); }
});

/* Select all */
selectAll?.addEventListener("change", () => {
  const vis = visibleRowIds();
  if (selectAll.checked) vis.forEach(id => selectedIds.add(id));
  else vis.forEach(id => selectedIds.delete(id));

  // update visible checkboxes
  [...tbody.querySelectorAll(".row-select")].forEach(chk => {
    if (vis.includes(chk.dataset.id)) chk.checked = selectAll.checked;
  });
  bulkSelectionChanged();
});

/* Bulk actions */
bulkAddRoleBtn?.addEventListener("click", () => openBulkModal("add-role"));
bulkRemoveRoleBtn?.addEventListener("click", () => openBulkModal("remove-role"));
bulkTypesBtn?.addEventListener("click", () => openBulkModal("set-types"));
bulkClearBtn?.addEventListener("click", () => clearBulkSelection());
bulkForm?.addEventListener("submit", applyBulkAction);
bulkDlg?.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) bulkDlg.close(); });

/* Edit modal events */
chkEmployee?.addEventListener("change", toggleEmpTypeFieldset);
editForm?.addEventListener("submit", handleSave);
editDlg?.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) editDlg.close(); });

/* ============================================
   12) Keyboard niceties
   ============================================ */
// Close popups with Escape, close modals with cancel
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    roleFilterBtn?.setAttribute("aria-expanded", "false");
    typeFilterBtn?.setAttribute("aria-expanded", "false");
  }
});

/* ============================================
   13) Optional: Expose small helpers for debugging
   ============================================ */
// window._roleAssign = { reload, state: () => ({ allUsers, filtered, page, pageSize, sortState, roleFilterSet, typeFilterSet, selectedIds }) };
