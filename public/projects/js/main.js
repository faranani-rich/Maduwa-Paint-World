// public/projects/js/main.js
/* eslint-env browser */

import { initAuthListener } from "../../authentication/auth.js";
import { saveProject }      from "./storage.js";
import { emptyProject }     from "./models.js";
import { canCreateProject, canDeleteProject } from "./permissions.js";

// Optional, if you expose it. We fall back nicely if not present.
import { listProjects as _listProjectsMaybe, deleteProject as _deleteProjectMaybe } from "./storage.js";

/* ========= 0) Small helpers ========= */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STATUS_ORDER = ["quotation", "approved", "in-progress", "completed"];
const STATUS_LABEL = {
  quotation: "Quotation",
  approved: "Approved",
  "in-progress": "In Progress",
  completed: "Completed",
};

const toStr = (v) => (v ?? "").toString();
const norm  = (s) => toStr(s).trim().toLowerCase();
const by = (sel, dir = "asc") => (a, b) => {
  const A = sel(a), B = sel(b);
  if (A < B) return dir === "asc" ? -1 : 1;
  if (A > B) return dir === "asc" ?  1 : -1;
  return 0;
};
const parseISO = (s) => (s ? Date.parse(s) || 0 : 0);

/* ========= 1) State ========= */
let all = [];          // full dataset
let filtered = [];     // after search / status filter
let page = 1;
let pageSize = 12;
let sortKey = "created";
let sortDir = "desc";
let statusFilter = "all";
let searchQuery = "";
let cols = 3;

let currentUser = null;
let currentProfile = null;

/* ========= 2) DOM refs ========= */
const cardsRegion   = $("#cardsRegion");
const cardTemplate  = $("#projectCardTemplate");

const searchInput   = $("#searchInput");
const clearSearch   = $("#clearSearchBtn");
const sortSelect    = $("#sortSelect");
const colsSelect    = $("#colsSelect");
const clearFilters  = $("#clearFiltersBtn");

const tabs          = $$(".status-tabs .tab");

const listLoading   = $("#listLoading");
const listEmpty     = $("#listEmpty");
const listError     = $("#listError");

const prevBtn       = $("#prevPageBtn");
const nextBtn       = $("#nextPageBtn");
const pageStatus    = $("#pageStatus");
const pageSizeSel   = $("#pageSizeSelect");

const newBtn        = $("#newProjectBtn");
const backBtn       = $("#backBtn");

/* ========= 3) Data I/O ========= */
async function listProjects() {
  if (typeof _listProjectsMaybe === "function") {
    return await _listProjectsMaybe();
  }
  // Fallback sample data (remove when storage.js is wired)
  console.warn("[projects] Using fallback sample data from main.js");
  return [
    {
      id: "demo-1",
      name: "Showroom Revamp",
      customer: "Maduwa HQ",
      location: "Tzaneen",
      status: "quotation",
      createdAt: "2025-01-04T10:00:00Z",
      modifiedAt: "2025-02-02T09:00:00Z",
      createdBy: "demo",
    },
    {
      id: "demo-2",
      name: "Warehouse Coating",
      customer: "Makonde Logistics",
      location: "Polokwane",
      status: "in-progress",
      createdAt: "2024-12-19T10:00:00Z",
      modifiedAt: "2025-02-05T12:00:00Z",
      createdBy: "demo",
    },
    {
      id: "demo-3",
      name: "Estate Villas",
      customer: "Green Hills",
      location: "Giyani",
      status: "approved",
      createdAt: "2024-11-01T10:00:00Z",
      modifiedAt: "2025-01-28T08:00:00Z",
      createdBy: "demo",
    },
    {
      id: "demo-4",
      name: "Factory Line Repaint",
      customer: "Maduwa Paint World",
      location: "Makhado",
      status: "completed",
      createdAt: "2024-10-01T10:00:00Z",
      modifiedAt: "2024-12-15T08:00:00Z",
      createdBy: "demo",
    },
  ];
}

async function deleteProject(id) {
  if (typeof _deleteProjectMaybe === "function") {
    return await _deleteProjectMaybe(id);
  }
  // Fallback if storage.js hasn’t implemented delete yet.
  throw new Error("deleteProject is not implemented in storage.js");
}

/* ========= 4) Pipeline: filter → sort → paginate ========= */
function applyFilters() {
  const q = norm(searchQuery);
  filtered = all.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (q) {
      const hay = `${toStr(p.name)} ${toStr(p.customer)} ${toStr(p.location)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function applySort() {
  const dir = sortDir;
  switch (sortKey) {
    case "created":
      filtered.sort(by((p) => parseISO(p.createdAt), dir));
      break;
    case "modified":
      filtered.sort(by((p) => parseISO(p.modifiedAt), dir));
      break;
    case "name":
      filtered.sort(by((p) => norm(p.name), dir));
      break;
    case "customer":
      filtered.sort(by((p) => norm(p.customer), dir));
      break;
    case "location":
      filtered.sort(by((p) => norm(p.location), dir));
      break;
    case "status":
      filtered.sort(by((p) => STATUS_ORDER.indexOf(p.status ?? "quotation"), "asc"));
      break;
    default:
      break;
  }
}

function pageSlice() {
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (page > pages) page = pages;
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  return { start, end, total, pages };
}

/* ========= 5) Render ========= */
function setGridColumns(n) {
  const clamped = Math.max(2, Math.min(5, Number(n) || 3));
  cols = clamped;
  cardsRegion.style.display = "grid";
  cardsRegion.style.gridTemplateColumns = `repeat(${clamped}, minmax(260px, 1fr))`;
  cardsRegion.style.gap = "16px";
}

function clearStates() {
  listLoading.classList.add("hidden");
  listEmpty.classList.add("hidden");
  listError.classList.add("hidden");
}

function fmtDate(iso) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function renderCard(node, p) {
  // badge
  const badge = node.querySelector(".status-badge");
  badge.dataset.status = p.status || "quotation";
  badge.textContent = STATUS_LABEL[p.status] || "Quotation";

  // text
  node.querySelector(".proj-title").textContent = p.name || "Untitled";
  node.querySelector(".customer").textContent   = p.customer || "—";
  node.querySelector(".location").textContent   = p.location || "—";
  node.querySelector(".modified").textContent   = fmtDate(p.modifiedAt);
  node.querySelector(".created").textContent    = fmtDate(p.createdAt);

  // open
  node.querySelector(".open-btn").addEventListener("click", () => {
    if (!p.id) return;
    window.location.href = `project.html?id=${encodeURIComponent(p.id)}`;
  });

  // delete (permission gated)
  const delBtn = node.querySelector(".delete-btn");
  if (delBtn) {
    const setAuthState = () => {
      const allowed = canDeleteProject(currentProfile, p, currentUser);
      delBtn.disabled = !allowed;
      delBtn.title = allowed ? "Delete project" : "You do not have permission to delete this project";
      delBtn.setAttribute("aria-disabled", String(!allowed));
    };
    setAuthState();

    delBtn.addEventListener("click", async () => {
      if (!canDeleteProject(currentProfile, p, currentUser)) {
        alert("You do not have the authority to delete this project.");
        return;
      }
      const ok = confirm(`Delete “${p.name || "this project"}”? This cannot be undone.`);
      if (!ok) return;

      try {
        await deleteProject(p.id);
        // remove locally & re-render
        all = all.filter((x) => x.id !== p.id);
        runPipeline();
      } catch (err) {
        console.error("[projects] delete failed:", err);
        alert("Could not delete project.");
      }
    });

    // keep a reference if we need to re-enable after auth arrives
    delBtn._setAuthState = setAuthState;
  }
}

function paint() {
  clearStates();

  const { start, end, total, pages } = pageSlice();

  if (total === 0) {
    cardsRegion.innerHTML = "";
    listEmpty.classList.remove("hidden");
    pageStatus.textContent = "Page 1 of 1";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  cardsRegion.innerHTML = "";
  for (let i = start; i < end; i++) {
    const p = filtered[i];
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    renderCard(node, p);
    cardsRegion.appendChild(node);
  }

  pageStatus.textContent = `Page ${page} of ${pages}`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= pages;

  // if auth landed late, refresh delete button enabled state
  cardsRegion.querySelectorAll(".delete-btn").forEach((b) => b._setAuthState?.());
}

/* ========= 6) Controller ========= */
function runPipeline() {
  applyFilters();
  applySort();
  paint();
}

const debounce = (fn, ms = 180) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* ========= 7) Init & Events ========= */
async function initPage() {
  setGridColumns(cols);

  try {
    clearStates();
    listLoading.classList.remove("hidden");
    all = await listProjects();
  } catch (err) {
    console.error("[projects] load failed:", err);
    clearStates();
    listError.classList.remove("hidden");
    return;
  } finally {
    listLoading.classList.add("hidden");
  }

  runPipeline();
}

function wireControls() {
  // Search
  searchInput?.addEventListener("input", debounce(() => {
    searchQuery = searchInput.value || "";
    page = 1;
    runPipeline();
  }, 200));
  clearSearch?.addEventListener("click", () => {
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    page = 1;
    runPipeline();
  });

  // Sort
  sortSelect?.addEventListener("change", () => {
    const [k, d] = (sortSelect.value || "created.desc").split(".");
    sortKey = (k === "status" || k === "status.order") ? "status"
            : ["created","modified","name","customer","location"].includes(k) ? k
            : "modified";
    sortDir = (d === "asc" || d === "desc") ? d : "desc";
    page = 1;
    runPipeline();
  });

  // Columns per row
  colsSelect?.addEventListener("change", () => {
    setGridColumns(Number(colsSelect.value));
  });

  // Clear filters
  clearFilters?.addEventListener("click", () => {
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    sortKey = "created"; sortDir = "desc";
    if (sortSelect) sortSelect.value = "created.desc";
    statusFilter = "all";
    $$(".status-tabs .tab").forEach((t) => {
      const active = t.dataset.status === "all";
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    page = 1;
    runPipeline();
  });

  // Status tabs
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      statusFilter = tab.dataset.status || "all";
      page = 1;
      runPipeline();
    });
  });

  // Pagination
  pageSizeSel?.addEventListener("change", () => {
    pageSize = Number(pageSizeSel.value || 12);
    page = 1;
    runPipeline();
  });
  prevBtn?.addEventListener("click", () => {
    if (page > 1) { page--; paint(); }
  });
  nextBtn?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page < totalPages) { page++; paint(); }
  });

  // New project (role-gated)
  if (newBtn) {
    if (!canCreateProject(currentProfile, currentUser)) {
      // Keep space stable: hide visually but keep layout if desired
      newBtn.style.display = "none";
      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("You do not have the authority to create a new project.");
      });
    } else {
      newBtn.addEventListener("click", async () => {
        try {
          const project = emptyProject();
          const now = new Date().toISOString();
          project.name       = "Untitled";
          project.createdAt  = now;
          project.modifiedAt = now;
          project.ownerId    = currentUser?.uid || null;
          project.status     = "quotation";

          const id = await saveProject(project);
          window.location.href = `project.html?id=${encodeURIComponent(id)}`;
        } catch (err) {
          console.error("[saveProject] error:", err);
          alert("Failed to create project. Please try again.");
        }
      });
    }
  }

  // Back
  backBtn?.addEventListener("click", () => {
    window.location.href = "../employee/employee-portal.html";
  });
}

/* ========= 8) Auth gate & boot ========= */
document.addEventListener("DOMContentLoaded", () => {
  initAuthListener(async ({ user, profile }) => {
    if (!user || !profile) {
      alert("You must be signed in to view or manage projects.");
      return;
    }
    currentUser = user;
    currentProfile = profile;

    wireControls();
    await initPage();

    // enable/disable delete buttons now that we know roles
    cardsRegion?.querySelectorAll(".delete-btn").forEach((b) => b._setAuthState?.());
  });
});
