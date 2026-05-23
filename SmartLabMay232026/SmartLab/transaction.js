/* =====================================================
   transaction.js — CAS SmartLab Transaction Records
   Connected to Smartlab Backend API (/api/reservations)
   ===================================================== */
(function () {
  "use strict";

  /* ── State ─────────────────────────────────────────── */
  let allTransactions = [];   // normalised from API
  let currentTab      = "all";
  let currentSearch   = "";
  let currentPage     = 1;
  const PAGE_SIZE     = 8;

  /* ── API helpers (mirrors inventory.js pattern) ────── */
  function apiUrl(path) {
    return CONFIG.BASE_URL + path;
  }

  function apiFetch(path, options = {}) {
    return fetch(apiUrl(path), {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
    }).then(async res => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      return json;
    });
  }

  /* ── Normalise a raw reservation → flat transaction ── */
  function normalise(r) {
    const student   = r.student || {};
    const firstName = student.first_name || "";
    const lastName  = student.last_name  || "";
    const fullName  = [firstName, lastName].filter(Boolean).join(" ") || r.student_id || "—";

    // Collect items from all four junction arrays + chemicals
    const items = [];

    (r.reservation_apparatus || []).forEach(a => {
      const name = a.inventory_apparatus?.apparatus_name || `Apparatus #${a.apparatus_id}`;
      items.push({ name, category: "apparatus", qty: a.quantity });
    });
    (r.reservation_glassware || []).forEach(g => {
      const name = g.inventory_glassware?.glassware || `Glassware #${g.glassware_id}`;
      items.push({ name, category: "glassware", qty: g.quantity });
    });
    (r.reservation_equipment || []).forEach(e => {
      const name = e.inventory_equipment?.equipment_name || `Equipment #${e.equipment_id}`;
      items.push({ name, category: "equipment", qty: e.quantity });
    });
    (r.reservation_supplies || []).forEach(s => {
      const name = s.inventory_supplies?.supplies_name || `Supply #${s.supplies_id}`;
      items.push({ name, category: "supply", qty: s.quantity });
    });
    (r.chemical_items || []).forEach(c => {
      const name = c.chemical?.chemical_name || `Chemical #${c.chemical_id}`;
      items.push({ name, category: "chemical", qty: c.quantity });
    });

    // Derive display status
    const rawStatus = (r.status || "").toLowerCase();
    let status;
    if (rawStatus === "approved")    status = "borrowed";
    else if (rawStatus === "rejected") status = "rejected";
    else if (rawStatus === "conditional") status = "conditional";
    else                               status = "pending";

    return {
      id:         r.reservation_id,
      txId:       `TX-${String(r.reservation_id).padStart(3, "0")}`,
      studentId:  r.student_id     || "—",
      name:       fullName,
      course:     student.college  || "—",
      yearLevel:  student.year_level || "",
      section:    student.section  || "",
      subject:    r.subject        || "—",
      courseYearSection: r.course_year_section || "",
      profName:   r.prof_name      || "—",
      items,
      dateBorrowed:  r.date_borrowed  ? r.date_borrowed.split("T")[0]  : null,
      dateReserved:  r.date_reserved  ? r.date_reserved.split("T")[0]  : null,
      timeStart:     r.time_start     ? r.time_start.split("T")[1]?.slice(0,5) || r.time_start : null,
      timeEnd:       r.time_end       ? r.time_end.split("T")[1]?.slice(0,5)   || r.time_end   : null,
      rawStatus:     r.status,
      status,
      members:    (r.members || []).map(m => m.name),
    };
  }

  /* ── Load from API ──────────────────────────────────── */
  async function loadTransactions() {
    showLoading();
    try {
      const res  = await apiFetch("/reservations");
      const rows = res.data || res || [];
      allTransactions = rows.map(normalise);
      renderAll();
    } catch (err) {
      console.error("Failed to load transactions:", err);
      showError("Failed to load transactions. Make sure the backend is running.");
    }
  }

  /* ── Helpers ────────────────────────────────────────── */
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function chipClass(category) {
    const map = {
      apparatus: "chip-apparatus",
      equipment: "chip-equipment",
      supply:    "chip-supply",
      glassware: "chip-glassware",
      chemical:  "chip-chemical",
    };
    return map[category] || "chip-apparatus";
  }

  function badgeClass(status) {
    const map = {
      borrowed:    "badge-borrowed",
      pending:     "badge-pending",
      rejected:    "badge-rejected",
      conditional: "badge-conditional",
    };
    return map[status] || "badge-pending";
  }

  function badgeLabel(status) {
    const map = {
      borrowed:    "Approved",
      pending:     "Pending",
      rejected:    "Rejected",
      conditional: "Conditional",
    };
    return map[status] || status;
  }

  /* ── Filter ─────────────────────────────────────────── */
  function getFiltered() {
    return allTransactions.filter(tx => {
      const matchTab = currentTab === "all" || tx.status === currentTab;
      const q = currentSearch.toLowerCase();
      const matchSearch = !q
        || tx.name.toLowerCase().includes(q)
        || tx.txId.toLowerCase().includes(q)
        || tx.studentId.toLowerCase().includes(q)
        || tx.course.toLowerCase().includes(q)
        || tx.subject.toLowerCase().includes(q)
        || (tx.courseYearSection || "").toLowerCase().includes(q)
        || tx.items.some(i => i.name.toLowerCase().includes(q));
      return matchTab && matchSearch;
    });
  }

  /* ── Render all ─────────────────────────────────────── */
  function renderAll() {
    updateCounts();
    renderTable();
  }

  /* ── Summary counts ─────────────────────────────────── */
  function updateCounts() {
    const total       = allTransactions.length;
    const borrowed    = allTransactions.filter(t => t.status === "borrowed").length;
    const pending     = allTransactions.filter(t => t.status === "pending").length;
    const rejected    = allTransactions.filter(t => t.status === "rejected").length;
    const conditional = allTransactions.filter(t => t.status === "conditional").length;

    setEl("totalCount",    total);
    setEl("borrowedCount", borrowed);
    setEl("pendingCount",  pending);

    setEl("tab-all-count",         total);
    setEl("tab-borrowed-count",    borrowed);
    setEl("tab-pending-count",     pending);
    setEl("tab-rejected-count",    rejected);
    setEl("tab-conditional-count", conditional);
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Render table ───────────────────────────────────── */
  function renderTable() {
    const filtered = getFiltered();
    const total    = filtered.length;
    const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    const tbody     = document.getElementById("txTableBody");
    const emptyEl   = document.getElementById("emptyState");
    const metaEl    = document.getElementById("tableMeta");
    const pageInfoEl = document.getElementById("pageInfo");

    if (metaEl)    metaEl.textContent = `${total} record${total !== 1 ? "s" : ""} found`;
    if (pageInfoEl) pageInfoEl.textContent = total === 0
      ? "Showing 0–0 of 0"
      : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`;

    if (slice.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
    } else {
      if (emptyEl) emptyEl.style.display = "none";
      tbody.innerHTML = slice.map(tx => {
        const itemChips = tx.items.length
          ? tx.items.map(i =>
              `<span class="item-chip ${chipClass(i.category)}">${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}</span>`
            ).join("")
          : `<span style="color:#9ca3af;font-size:12px;">—</span>`;

        const courseDisplay = tx.courseYearSection || tx.course || "—";

        return `
          <tr>
            <td><span class="tx-id">${tx.txId}</span></td>
            <td><span class="tx-name">${tx.name}</span></td>
            <td><span class="tx-id-num">${tx.studentId}</span></td>
            <td><span class="tx-course">${courseDisplay}</span></td>
            <td><span class="tx-course">${tx.subject}</span></td>
            <td>${itemChips}</td>
            <td><div class="date-cell"><div class="date-main">${formatDate(tx.dateBorrowed)}</div></div></td>
            <td><div class="date-cell">
              ${tx.timeStart ? `<div class="date-main">${tx.timeStart}${tx.timeEnd ? " – " + tx.timeEnd : ""}</div>` : "<div class=\"date-main\">—</div>"}
              <div class="date-sub">Time slot</div>
            </div></td>
            <td><span class="badge ${badgeClass(tx.status)}">${badgeLabel(tx.status)}</span></td>
            <td>
              <button class="action-btn view" title="View details" onclick="openModal(${tx.id})">
                <i class="fa-solid fa-eye"></i>
              </button>
            </td>
          </tr>`;
      }).join("");
    }

    renderPagination(pages);
  }

  /* ── Pagination ─────────────────────────────────────── */
  function renderPagination(pages) {
    const container = document.getElementById("pageBtns");
    if (!container) return;
    container.innerHTML = "";

    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prev.disabled  = currentPage === 1;
    prev.onclick   = () => { currentPage--; renderTable(); };
    container.appendChild(prev);

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage   = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement("button");
      btn.className = "page-btn" + (i === currentPage ? " active" : "");
      btn.textContent = i;
      btn.onclick = () => { currentPage = i; renderTable(); };
      container.appendChild(btn);
    }

    const next = document.createElement("button");
    next.className = "page-btn";
    next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    next.disabled  = currentPage === pages;
    next.onclick   = () => { currentPage++; renderTable(); };
    container.appendChild(next);
  }

  /* ── Loading / error states ─────────────────────────── */
  function showLoading() {
    const tbody = document.getElementById("txTableBody");
    if (tbody) tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:40px;color:#9ca3af;">
          <i class='bx bx-loader-alt bx-spin' style="font-size:28px;display:block;margin-bottom:8px;"></i>
          Loading transactions…
        </td>
      </tr>`;
    const meta = document.getElementById("tableMeta");
    if (meta) meta.textContent = "Loading…";
  }

  function showError(msg) {
    const tbody = document.getElementById("txTableBody");
    if (tbody) tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:40px;color:#ef4444;">
          <i class='bx bx-error-circle' style="font-size:28px;display:block;margin-bottom:8px;"></i>
          ${msg}
        </td>
      </tr>`;
  }

  /* ── Modal ──────────────────────────────────────────── */
  window.openModal = function (txId) {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) return;

    setEl("modalTitle",    `Transaction ${tx.txId}`);
    setEl("modalSubtitle", `${tx.name} · ${tx.subject}`);

    const itemRows = tx.items.length
      ? tx.items.map(i => `
          <tr>
            <td>${i.name}</td>
            <td><span class="item-chip ${chipClass(i.category)}">${i.category}</span></td>
            <td style="text-align:center;">${i.qty}</td>
          </tr>`).join("")
      : `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:12px;">No items recorded</td></tr>`;

    const membersHtml = tx.members.length
      ? `<div class="modal-field" style="margin-bottom:16px;">
          <label>Group Members</label>
          <div class="value">${tx.members.join(", ")}</div>
        </div>
        <div class="modal-divider"></div>`
      : "";

    document.getElementById("modalBody").innerHTML = `
      <div class="modal-row">
        <div class="modal-field">
          <label>Transaction ID</label>
          <div class="value">${tx.txId}</div>
        </div>
        <div class="modal-field">
          <label>Status</label>
          <div class="value"><span class="badge ${badgeClass(tx.status)}">${badgeLabel(tx.status)}</span></div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Student Name</label>
          <div class="value">${tx.name}</div>
        </div>
        <div class="modal-field">
          <label>Student ID</label>
          <div class="value">${tx.studentId}</div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Course / Year / Section</label>
          <div class="value">${tx.courseYearSection || tx.course || "—"}</div>
        </div>
        <div class="modal-field">
          <label>Professor</label>
          <div class="value">${tx.profName}</div>
        </div>
      </div>
      <div class="modal-field" style="margin-bottom:16px;">
        <label>Subject</label>
        <div class="value">${tx.subject}</div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Date Reserved</label>
          <div class="value">${formatDate(tx.dateReserved)}</div>
        </div>
        <div class="modal-field">
          <label>Date Borrowed</label>
          <div class="value">${formatDate(tx.dateBorrowed)}</div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Time Start</label>
          <div class="value">${tx.timeStart || "—"}</div>
        </div>
        <div class="modal-field">
          <label>Time End</label>
          <div class="value">${tx.timeEnd || "—"}</div>
        </div>
      </div>
      <div class="modal-divider"></div>
      ${membersHtml}
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px;">Items Borrowed</div>
      <table class="items-table">
        <thead><tr><th>Item</th><th>Category</th><th style="text-align:center;">Qty</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>`;

    document.getElementById("modalOverlay").classList.add("open");
  };

  window.closeModal = function () {
    document.getElementById("modalOverlay").classList.remove("open");
  };

  /* ── Tabs ───────────────────────────────────────────── */
  window.setTab = function (btn) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab  = btn.dataset.tab;
    currentPage = 1;
    renderTable();
  };

  /* ── Search ─────────────────────────────────────────── */
  function initSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    input.addEventListener("input", () => {
      currentSearch = input.value.trim();
      currentPage   = 1;
      renderTable();
    });
  }

  /* ── Sidebar ────────────────────────────────────────── */
  function initSidebar() {
    const toggle  = document.querySelector(".toggle");
    const sidebar = document.querySelector(".sidebar");
    if (toggle && sidebar) {
      toggle.addEventListener("click", () => sidebar.classList.toggle("close"));
    }
  }

  /* ── Dark mode ──────────────────────────────────────── */
  function initDarkMode() {
    const toggleSwitch = document.querySelector(".toggle-switch");
    const modeText     = document.querySelector(".mode-text");
    if (!toggleSwitch) return;
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark");
      if (modeText) modeText.textContent = "Light Mode";
    }
    toggleSwitch.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem("darkMode", isDark);
      if (modeText) modeText.textContent = isDark ? "Light Mode" : "Dark Mode";
    });
  }

  /* ── Profile panel ──────────────────────────────────── */
  function initProfilePanel() {
    const profile = document.querySelector(".profile");
    const panel   = document.getElementById("profilePanel");
    if (!profile || !panel) return;
    profile.addEventListener("click", e => {
      e.stopPropagation();
      panel.classList.toggle("open");
    });
    document.addEventListener("click", () => panel.classList.remove("open"));
    panel.addEventListener("click", e => e.stopPropagation());
  }

  /* ── Modal overlay click ────────────────────────────── */
  function initModalOverlay() {
    const overlay = document.getElementById("modalOverlay");
    if (overlay) overlay.addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
  }

  /* ── Init ───────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    initSidebar();
    initDarkMode();
    initProfilePanel();
    initSearch();
    initModalOverlay();
    loadTransactions();
  });

})();