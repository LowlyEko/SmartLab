/* 1. TOOLBAR DROPDOWNS */
document.querySelectorAll(".toolbar .dropdown").forEach(dropdown => {
  const btn   = dropdown.querySelector(".dropdown-btn");
  const menu  = dropdown.querySelector(".dropdown-menu");
  const items = dropdown.querySelectorAll(".item");
  const label = btn.querySelector("span");

  btn.addEventListener("click", e => {
    e.stopPropagation();
    document.querySelectorAll(".toolbar .dropdown-menu").forEach(m => {
      if (m !== menu) m.style.display = "none";
    });
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  });

  items.forEach(item => {
    item.addEventListener("click", () => {
      items.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      label.textContent = item.textContent.trim();
      menu.style.display = "none";

      const menuId = menu.id;
      if (menuId === "filterMenu") {
        currentFilter = item.dataset.value || item.textContent.trim().toLowerCase();
        activePage = 1;
        applyActiveTable();
      } else if (menuId === "sortMenu") {
        currentSort = item.dataset.value || "name";
        activePage = 1;
        applyActiveTable();
      } else if (menuId === "viewMenu") {
        const view = item.dataset.value || "table";
        setViewForSection("active-section", view);
        setViewForSection("pending-section", view);
      }
    });
  });
});

window.addEventListener("click", () => {
  document.querySelectorAll(".toolbar .dropdown-menu").forEach(m => {
    m.style.display = "none";
  });
});

/* 2. SHOW TOGGLE */
const activeSection  = document.getElementById("active-section");
const pendingSection = document.getElementById("pending-section");
const showToggleBtns = document.querySelectorAll(".show-toggle-btn");

function showSection(which) {
  const showActive  = which === "all";
  const showPending = which === "pending-approval";

  activeSection.style.display  = showActive  ? "" : "none";
  pendingSection.style.display = showPending ? "" : "none";

  showToggleBtns.forEach(b =>
    b.classList.toggle("active", b.dataset.show === which)
  );

  applyActiveTable();
  applyPendingTable();
}

showToggleBtns.forEach(btn => {
  btn.addEventListener("click", () => showSection(btn.dataset.show));
});


/* 3. SECTION VIEW TOGGLE */
function setViewForSection(sectionId, view) {
  const section   = document.getElementById(sectionId);
  if (!section) return;

  const tableView = section.querySelector(".res-table-view");
  const cardView  = section.querySelector(".res-card-view");
  const viewBtns  = section.querySelectorAll(".view-toggle-btn");

  viewBtns.forEach(b => b.classList.toggle("active", b.dataset.view === view));

  if (view === "card") {
    buildCardView(section);
    if (tableView) tableView.style.display = "none";
    if (cardView)  cardView.style.display  = "";
  } else {
    if (tableView) tableView.style.display = "";
    if (cardView)  cardView.style.display  = "none";
  }
}

document.querySelectorAll(".reservation-table-card").forEach(card => {
  card.querySelectorAll(".view-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      setViewForSection(card.id, view);

      const toolbarViewItems = document.querySelectorAll("#viewMenu .item");
      toolbarViewItems.forEach(i => {
        const match = (i.dataset.value || i.textContent.trim().toLowerCase()) === view;
        i.classList.toggle("active", match);
        if (match) {
          const label = document.querySelector("#viewDropdown .dropdown-btn span");
          if (label) label.textContent = i.textContent.trim();
        }
      });
    });
  });
});


/* 4. CARD VIEW BUILDER */
function buildCardView(section) {
  const cardContainer = section.querySelector(".res-card-view");
  if (!cardContainer) return;

  const isActive  = section.id === "active-section";
  const isPending = section.id === "pending-section";

  const rows = Array.from(section.querySelectorAll("tbody tr"))
    .filter(r => r.style.display !== "none");

  cardContainer.innerHTML = "";

  if (rows.length === 0) {
    cardContainer.innerHTML = `<div class="empty-state">No records found.</div>`;
    return;
  }

  rows.forEach(row => {
    const nameEl   = row.querySelector(".name");
    const subEl    = row.querySelector(".sub");
    const avatarEl = row.querySelector(".avatar");
    const tags     = Array.from(row.querySelectorAll(".tag"))
                         .map(t => t.outerHTML).join("");

    const card = document.createElement("div");
    card.className = "res-card";

    if (isActive) {
      const statusEl  = row.querySelector(".status");
      const dateReq   = row.children[2]?.textContent.trim() || "";
      const dueReturn = row.children[3]?.textContent.trim() || "";
      const isDanger  = row.children[3]?.classList.contains("danger");

      card.innerHTML = `
        <div class="res-card-header">
          ${avatarEl ? avatarEl.outerHTML : ""}
          <div>
            <div class="res-card-name">${nameEl?.textContent || ""}</div>
            <div class="res-card-sub">${subEl?.textContent || ""}</div>
          </div>
        </div>
        <div class="res-card-tags">${tags}</div>
        <div class="res-card-meta">
          <span>📅 Requested: ${dateReq}</span>
          <span style="${isDanger ? "color:#e73535;font-weight:500;" : ""}">
            ⏰ Due: ${dueReturn}
          </span>
        </div>
        <div class="res-card-footer">
          ${statusEl ? statusEl.outerHTML : ""}
        </div>
      `;
      card.style.cursor = "pointer";
      card.addEventListener("click", () => openDetailModal(row, "active"));
    }

    if (isPending) {
      const reqId    = row.querySelector(".id")?.textContent.trim() || "";
      const dateTime = row.children[3]?.textContent.trim() || "";
      const until    = row.children[4]?.textContent.trim() || "";

      card.innerHTML = `
        <div class="res-card-header">
          ${avatarEl ? avatarEl.outerHTML : ""}
          <div>
            <div class="res-card-name">${nameEl?.textContent || ""}</div>
            <div class="res-card-sub">${subEl?.textContent || ""}</div>
          </div>
          <span class="id" style="margin-left:auto;">${reqId}</span>
        </div>
        <div class="res-card-tags">${tags}</div>
        <div class="res-card-meta">
          <span>📅 ${dateTime}</span>
          <span>⏰ Until: ${until}</span>
        </div>
        <div class="res-card-actions">
          <button class="pending-btn accept card-accept">Accept</button>
          <button class="pending-btn reject card-reject">Reject</button>
        </div>
      `;
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("card-accept") && !e.target.classList.contains("card-reject")) {
          openDetailModal(row, "pending");
        }
      });
      card.querySelector(".card-accept").addEventListener("click", (e) => {
        e.stopPropagation();
        dismissPendingRow(row, card);
      });
      card.querySelector(".card-reject").addEventListener("click", (e) => {
        e.stopPropagation();
        dismissPendingRow(row, card);
      });
    }

    cardContainer.appendChild(card);
  });
}

function dismissPendingRow(row, card) {
  [row, card].forEach(el => {
    el.style.transition    = "opacity 0.3s";
    el.style.opacity       = "0.3";
    el.style.pointerEvents = "none";
  });
  setTimeout(() => {
    row.remove();
    card.remove();
    pendingPage = 1;
    applyPendingTable();
    const section  = document.getElementById("pending-section");
    const cardView = section?.querySelector(".res-card-view");
    if (cardView && cardView.style.display !== "none") buildCardView(section);
  }, 320);
}


/* 5. PAGINATION HELPERS */
let activePage     = 1;
let activePageSize = 5;
let pendingPage    = 1;
let pendingPageSize = 5;

/**
 * Renders pagination UI into `containerId`.
 * @param {string} containerId  - id of the .pagination-wrap element
 * @param {number} totalItems   - total visible rows
 * @param {number} currentPage
 * @param {number} pageSize
 * @param {function} onPageChange  - callback(newPage)
 * @param {function} onSizeChange  - callback(newSize)
 */
function renderPagination(containerId, totalItems, currentPage, pageSize, onPageChange, onSizeChange) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  wrap.innerHTML = `
    <div class="rows-per-page">
      <span>Rows per page:</span>
      <select class="page-size-select">
        ${[5, 10, 20].map(n => `<option value="${n}"${n === pageSize ? " selected" : ""}>${n}</option>`).join("")}
      </select>
    </div>
    <div class="pagination-controls">
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} title="Previous">
        <i class="fa-solid fa-chevron-left" style="font-size:11px;"></i>
      </button>
      <button class="page-btn active">${currentPage}</button>
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} title="Next">
        <i class="fa-solid fa-chevron-right" style="font-size:11px;"></i>
      </button>
    </div>
  `;

  wrap.querySelectorAll(".page-btn[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p >= 1 && p <= totalPages) onPageChange(p);
    });
  });

  wrap.querySelector(".page-size-select").addEventListener("change", e => {
    onSizeChange(parseInt(e.target.value));
  });
}


/* 6. DETAIL MODAL */

function openDetailModal(row, type) {
  document.getElementById("res-detail-modal")?.remove();

  const name     = row.querySelector(".name")?.textContent.trim() || "";
  const sub      = row.querySelector(".sub")?.textContent.trim()  || "";
  const avatarEl = row.querySelector(".avatar");
  const tags     = Array.from(row.querySelectorAll(".tag")).map(t => t.textContent.trim());

  let modalHTML = "";

  if (type === "active") {
    const statusEl  = row.querySelector(".status");
    const statusTxt = statusEl?.textContent.trim() || "";
    const statusCls = statusEl?.className || "";
    const dateReq   = row.children[2]?.textContent.trim() || "";
    const dueReturn = row.children[3]?.textContent.trim() || "";
    const isDanger  = row.children[3]?.classList.contains("danger");
    const resId     = sub.split("•")[1]?.trim() || "";
    const course    = sub.split("•")[0]?.trim() || "";
    const location  = getPlausibleLocation(course);
    const statusNote = getStatusNote(statusTxt.toLowerCase());

    modalHTML = `
      <div class="detail-modal-overlay" id="res-detail-modal">
        <div class="detail-modal">
          <div class="detail-modal-header">
            <h2>Reservation Details</h2>
            <button class="detail-modal-close" id="detail-close-btn">&times;</button>
          </div>
          <div class="detail-modal-body">
            <div class="detail-row">
              <span class="detail-label">Requestor</span>
              <span class="detail-value">
                <div class="user">
                  ${avatarEl ? avatarEl.outerHTML : ""}
                  <div><div class="name">${name}</div><div class="sub">${course}</div></div>
                </div>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Reservation ID</span>
              <span class="detail-value"><span class="id">${resId}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Equipment / Items</span>
              <span class="detail-value">
                <div class="detail-tags">${tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date Requested</span>
              <span class="detail-value">${dateReq}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Due Return</span>
              <span class="detail-value" style="${isDanger ? "color:#e73535;font-weight:600;" : ""}">${dueReturn}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Location</span>
              <span class="detail-value">${location}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value"><span class="${statusCls}">${statusTxt}</span></span>
            </div>
            ${statusNote ? `
            <div class="detail-row">
              <span class="detail-label">Status Note</span>
              <span class="detail-value detail-note">${statusNote}</span>
            </div>` : ""}
          </div>
          <div class="detail-modal-footer">
            <button class="detail-btn-close" id="detail-close-btn2">Close</button>
            ${statusTxt.toLowerCase() !== "returned" ? `<button class="detail-btn-action" id="detail-action-btn">Mark Returned</button>` : ""}
          </div>
        </div>
      </div>`;
  }

  if (type === "pending") {
    const reqId    = row.querySelector(".id")?.textContent.trim() || "";
    const dateTime = row.children[3]?.textContent.trim() || "";
    const until    = row.children[4]?.textContent.trim() || "";
    const course   = sub.split("•")[0]?.trim() || sub;
    const location = getPlausibleLocation(course);

    modalHTML = `
      <div class="detail-modal-overlay" id="res-detail-modal">
        <div class="detail-modal">
          <div class="detail-modal-header">
            <h2>Request Details</h2>
            <button class="detail-modal-close" id="detail-close-btn">&times;</button>
          </div>
          <div class="detail-modal-body">
            <div class="detail-row">
              <span class="detail-label">Requestor</span>
              <span class="detail-value">
                <div class="user">
                  ${avatarEl ? avatarEl.outerHTML : ""}
                  <div><div class="name">${name}</div><div class="sub">${course}</div></div>
                </div>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Request ID</span>
              <span class="detail-value"><span class="id">${reqId}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Equipment / Items</span>
              <span class="detail-value">
                <div class="detail-tags">${tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date &amp; Time</span>
              <span class="detail-value">${dateTime}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Requested Until</span>
              <span class="detail-value">${until}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Location</span>
              <span class="detail-value">${location}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value"><span class="status conditional">Pending Approval</span></span>
            </div>
          </div>
          <div class="detail-modal-footer">
            <button class="detail-btn-close" id="detail-close-btn2">Close</button>
            <button class="detail-btn-reject" id="detail-reject-btn">Reject</button>
            <button class="detail-btn-action" id="detail-accept-btn">Accept</button>
          </div>
        </div>
      </div>`;
  }

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const overlay = document.getElementById("res-detail-modal");
  const closeModal = () => overlay.remove();

  document.getElementById("detail-close-btn")?.addEventListener("click", closeModal);
  document.getElementById("detail-close-btn2")?.addEventListener("click", closeModal);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

  document.getElementById("detail-action-btn")?.addEventListener("click", () => {
    const badge = row.querySelector(".status");
    if (badge) { badge.className = "status returned"; badge.textContent = "Returned"; }
    row.dataset.status = "returned";
    applyActiveTable();
    closeModal();
  });

  document.getElementById("detail-accept-btn")?.addEventListener("click", () => {
    row.style.transition = "opacity 0.3s";
    row.style.opacity    = "0.3";
    row.style.pointerEvents = "none";
    setTimeout(() => { row.remove(); pendingPage = 1; applyPendingTable(); }, 320);
    closeModal();
  });

  document.getElementById("detail-reject-btn")?.addEventListener("click", () => {
    row.style.transition = "opacity 0.3s";
    row.style.opacity    = "0.3";
    row.style.pointerEvents = "none";
    setTimeout(() => { row.remove(); pendingPage = 1; applyPendingTable(); }, 320);
    closeModal();
  });

  requestAnimationFrame(() => overlay.classList.add("visible"));
}

function getPlausibleLocation(course) {
  const c = (course || "").toLowerCase();
  if (c.includes("chemistry")) return "Room 201 — Laboratory A";
  if (c.includes("biology"))   return "Room 105 — Biology Lab";
  if (c.includes("physics"))   return "Room 302 — Physics Lab";
  return "Room 101 — General Lab";
}

function getStatusNote(status) {
  if (status === "conditional") return "Requires coordination with department.";
  if (status === "invalid")     return "Item overdue — please contact the borrower.";
  if (status === "returned")    return "All items successfully returned.";
  return "";
}


/* 7. FILTER / SEARCH / SORT — Active table */
let currentFilter = "all status";
let currentSort   = "name";
let searchQuery   = "";

function getActiveRows() {
  return Array.from(document.querySelectorAll("#active-tbody tr"));
}

function parseDate(text) { return new Date(text.trim()); }

function applyActiveTable() {
  const allRows = getActiveRows();

  // 1. Filter + search
  allRows.forEach(row => {
    const status  = (row.dataset.status || "").toLowerCase();
    const name    = (row.dataset.name   || "").toLowerCase();
    const dateReq = (row.dataset.date   || "").toLowerCase();
    const dueRet  = (row.dataset.due    || "").toLowerCase();
    const allText = row.textContent.toLowerCase();

    const matchFilter = currentFilter === "all status" || status === currentFilter;
    const matchSearch = !searchQuery ||
      name.includes(searchQuery) || dateReq.includes(searchQuery) ||
      dueRet.includes(searchQuery) || status.includes(searchQuery) ||
      allText.includes(searchQuery);

    row._visible = matchFilter && matchSearch;
    row.style.display = "none"; // hide all first; pagination controls visibility
  });

  // 2. Sort visible rows
  const visible = allRows.filter(r => r._visible);
  visible.sort((a, b) => {
    switch (currentSort) {
      case "name":         return (a.dataset.name || "").localeCompare(b.dataset.name || "");
      case "date_request": return parseDate(a.dataset.date || "") - parseDate(b.dataset.date || "");
      case "due_return":   return parseDate(a.dataset.due  || "") - parseDate(b.dataset.date || "");
      case "status":       return (a.dataset.status || "").localeCompare(b.dataset.status || "");
      default:             return 0;
    }
  });

  // 3. Clamp page
  const totalPages = Math.max(1, Math.ceil(visible.length / activePageSize));
  if (activePage > totalPages) activePage = totalPages;

  // 4. Show only current page slice
  const start = (activePage - 1) * activePageSize;
  const end   = start + activePageSize;
  const tbody = document.getElementById("active-tbody");

  visible.forEach((r, i) => {
    r.style.display = (i >= start && i < end) ? "" : "none";
    tbody.appendChild(r); // re-order in DOM
  });

  // 5. Update count badge (total visible, not just this page)
  updateCount("active-count", visible.length);

  // 6. Render pagination
  renderPagination(
    "active-pagination",
    visible.length,
    activePage,
    activePageSize,
    (p) => { activePage = p; applyActiveTable(); },
    (s) => { activePageSize = s; activePage = 1; applyActiveTable(); }
  );

  // 7. Sync card view
  const actSection = document.getElementById("active-section");
  const cardView   = actSection?.querySelector(".res-card-view");
  if (cardView && cardView.style.display !== "none") buildCardView(actSection);
}


/* 8. SEARCH + ACCEPT/REJECT — Pending table */

function getPendingRows() {
  return Array.from(document.querySelectorAll("#pending-tbody tr"));
}

function applyPendingTable() {
  const allRows = getPendingRows();

  // 1. Filter by search
  allRows.forEach(row => {
    const allText = row.textContent.toLowerCase();
    row._visible  = !searchQuery || allText.includes(searchQuery);
    row.style.display = "none";
  });

  const visible = allRows.filter(r => r._visible);

  // 2. Clamp page
  const totalPages = Math.max(1, Math.ceil(visible.length / pendingPageSize));
  if (pendingPage > totalPages) pendingPage = totalPages;

  // 3. Show only current page slice
  const start = (pendingPage - 1) * pendingPageSize;
  const end   = start + pendingPageSize;
  const tbody = document.getElementById("pending-tbody");

  visible.forEach((r, i) => {
    r.style.display = (i >= start && i < end) ? "" : "none";
    tbody.appendChild(r);
  });

  // 4. Update count badge
  updateCount("pending-count", visible.length);

  // 5. Render pagination
  renderPagination(
    "pending-pagination",
    visible.length,
    pendingPage,
    pendingPageSize,
    (p) => { pendingPage = p; applyPendingTable(); },
    (s) => { pendingPageSize = s; pendingPage = 1; applyPendingTable(); }
  );

  // 6. Sync card view
  const pendSect = document.getElementById("pending-section");
  const cardView = pendSect?.querySelector(".res-card-view");
  if (cardView && cardView.style.display !== "none") buildCardView(pendSect);
}

// Table-row Accept / Reject buttons
document.querySelectorAll("#pending-tbody .pending-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const row = btn.closest("tr");
    row.style.transition    = "opacity 0.3s";
    row.style.opacity       = "0.3";
    row.style.pointerEvents = "none";
    setTimeout(() => {
      row.remove();
      pendingPage = 1;
      applyPendingTable();
      const pendingSection = document.getElementById("pending-section");
      const cardView = pendingSection?.querySelector(".res-card-view");
      if (cardView && cardView.style.display !== "none") buildCardView(pendingSection);
    }, 320);
  });
});


/* 9. ROW CLICK HANDLERS */
document.querySelectorAll("#active-tbody").forEach(tbody => {
  tbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("action-menu-btn")) return;
    const row = e.target.closest("tr");
    if (row) openDetailModal(row, "active");
  });
});

document.querySelectorAll("#pending-tbody").forEach(tbody => {
  tbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("pending-btn")) return;
    const row = e.target.closest("tr");
    if (row) openDetailModal(row, "pending");
  });
});


/* 10. SEARCH BOX */

document.getElementById("searchBox")?.addEventListener("input", e => {
  searchQuery  = e.target.value.trim().toLowerCase();
  activePage   = 1;
  pendingPage  = 1;
  applyActiveTable();
  applyPendingTable();
});


/* 11. HELPERS */

function updateCount(id, count) {
  const el = document.getElementById(id);
  if (el) el.textContent = `${count} record${count !== 1 ? "s" : ""}`;
}


/* 12. INIT */

showSection("all");
applyActiveTable();
applyPendingTable();