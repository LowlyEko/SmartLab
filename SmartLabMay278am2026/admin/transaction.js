/* =====================================================
   transaction.js — CAS SmartLab Transaction Records
   Connected to Smartlab Backend API (/api/reservations)
   ===================================================== */
(function () {
  "use strict";

  /* ── State ─────────────────────────────────────────── */
  const ARCHIVE_DAYS  = 5;    // Must match reservation.js — records older than this appear here
  let allTransactions = [];   // normalised from API
  let currentTab      = "all";
  let currentSearch   = "";
  let currentPage     = 1;
  const PAGE_SIZE     = 8;

  /* ── API helpers ────────────────────────────────────── */
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

    const rawStatus = (r.status || "").toLowerCase();
    let status;
    if (rawStatus === "approved")      status = "borrowed";
    else if (rawStatus === "returned") status = "returned";
    else if (rawStatus === "rejected") status = "rejected";
    else if (rawStatus === "conditional") status = "conditional";
    else if (rawStatus === "invalid")  status = "invalid";
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
      dateReturned:  r.date_returned  ? r.date_returned.split("T")[0]  : null,
      dueDate:       r.due_date       ? r.due_date.split("T")[0]       : null,
      timeStart:     r.time_start     ? (r.time_start.split("T")[1]?.slice(0,5) || r.time_start) : null,
      timeEnd:       r.time_end       ? (r.time_end.split("T")[1]?.slice(0,5)   || r.time_end)   : null,
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
      allTransactions = rows.map(normalise).filter(tx => {
        // Archive reservations that have been returned AND date_returned is 5+ days ago
        if (!tx.dateReturned) return false;
        const daysDiff = (Date.now() - new Date(tx.dateReturned).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff >= ARCHIVE_DAYS;
      });
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
      returned:    "badge-returned",
      pending:     "badge-pending",
      rejected:    "badge-rejected",
      conditional: "badge-conditional",
      invalid:     "badge-rejected",
    };
    return map[status] || "badge-pending";
  }

  function badgeLabel(status) {
    const map = {
      borrowed:    "Approved",
      returned:    "Returned",
      pending:     "Pending",
      rejected:    "Rejected",
      conditional: "Conditional",
      invalid:     "Invalid",
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

    const tbody      = document.getElementById("txTableBody");
    const emptyEl    = document.getElementById("emptyState");
    const metaEl     = document.getElementById("tableMeta");
    const pageInfoEl = document.getElementById("pageInfo");

    if (metaEl)     metaEl.textContent = `${total} record${total !== 1 ? "s" : ""} found`;
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

  /* ── Reservation Modal ──────────────────────────────── */
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
          <label>Due Return Date</label>
          <div class="value">${formatDate(tx.dueDate)}</div>
        </div>
        <div class="modal-field">
          <label>Date Returned</label>
          <div class="value">${formatDate(tx.dateReturned)}</div>
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

  /* ── Reservation Tabs ───────────────────────────────── */
  window.setTab = function (btn) {
    // Only affect reservation tabs (inside sectionReservations)
    document.querySelectorAll("#sectionReservations .tab-btn").forEach(b => b.classList.remove("active"));
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

  /* ── Modal overlay click ────────────────────────────── */
  function initModalOverlay() {
    const overlay = document.getElementById("modalOverlay");
    if (overlay) overlay.addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
  }

  /* ══════════════════════════════════════════════════════
     SECTION SWITCHER
  ══════════════════════════════════════════════════════ */
  window.switchSection = function(section) {
    const isReservations = section === 'reservations';
    document.getElementById('sectionReservations').style.display   = isReservations ? '' : 'none';
    document.getElementById('sectionAccountability').style.display = isReservations ? 'none' : '';
    document.getElementById('sectionBtnReservations').classList.toggle('active', isReservations);
    document.getElementById('sectionBtnAccountability').classList.toggle('active', !isReservations);

    if (isReservations) {
      const card1 = document.querySelector('.sum-card:nth-child(1)');
      const card2 = document.querySelector('.sum-card:nth-child(2)');
      const card3 = document.querySelector('.sum-card:nth-child(3)');
      if (card1) card1.querySelector('.sum-label').textContent = 'Total Transactions';
      if (card2) card2.querySelector('.sum-label').textContent = 'Currently Borrowed';
      if (card3) card3.querySelector('.sum-label').textContent = 'Pending';
      updateCounts();
    } else {
      const card1 = document.querySelector('.sum-card:nth-child(1)');
      const card2 = document.querySelector('.sum-card:nth-child(2)');
      const card3 = document.querySelector('.sum-card:nth-child(3)');
      if (card1) card1.querySelector('.sum-label').textContent = 'Total Records';
      if (card2) card2.querySelector('.sum-label').textContent = 'Active';
      if (card3) card3.querySelector('.sum-label').textContent = 'Overdue';

      if (accAllRecords.length === 0) {
        loadAccountability();
      } else {
        updateAccCounts();
        renderAccTable();
      }
    }
  };

  function updateAccCounts() {
    const total    = accAllRecords.length;
    const active   = accAllRecords.filter(r => r.status === 'active' || r.status === 'pending').length;
    const resolved = accAllRecords.filter(r => r.status === 'resolved').length;
    const overdue  = accAllRecords.filter(r => r.status === 'overdue').length;
    setEl('totalCount',    total);
    setEl('borrowedCount', active);
    setEl('pendingCount',  overdue);
  }

  /* ══════════════════════════════════════════════════════
     ACCOUNTABILITY SECTION
  ══════════════════════════════════════════════════════ */
  let accAllRecords  = [];
  let accCurrentTab  = 'all';
  let accCurrentPage = 1;
  let accSearch      = '';
  const ACC_PAGE_SIZE = 8;

  async function loadAccountability() {
    const tbody = document.getElementById('accTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;"><i class='bx bx-loader-alt bx-spin' style="font-size:28px;display:block;margin-bottom:8px;"></i>Loading accountability records…</td></tr>`;

    const metaEl = document.getElementById('accTableMeta');
    if (metaEl) metaEl.textContent = 'Loading…';

    try {
      const res  = await apiFetch('/accountability');
      const rows = res.data || res || [];
      accAllRecords = rows.map(mapAccRecord).filter(r => {
        // Only archive records that have been resolved (date_replaced set)
        // AND at least ARCHIVE_DAYS days have passed since date_replaced
        if (!r.dateReplaced) return false;
        const daysDiff = (Date.now() - new Date(r.dateReplaced).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff >= ARCHIVE_DAYS;
      });
      renderAccAll();
    } catch (err) {
      console.error('Failed to load accountability:', err);
      const tbody = document.getElementById('accTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#ef4444;"><i class='bx bx-error-circle' style="font-size:28px;display:block;margin-bottom:8px;"></i>Failed to load accountability records. Make sure the backend is running.</td></tr>`;
      const metaEl = document.getElementById('accTableMeta');
      if (metaEl) metaEl.textContent = 'Error loading records.';
    }
  }

  /**
   * Maps a raw API accountability record to a flat display object.
   * Mirrors the full mapRecord() in accountability.js.
   */
  function mapAccRecord(r) {
    const studentRel = r.student || {};
    const name = studentRel.first_name
      ? `${studentRel.first_name} ${studentRel.last_name}`
      : (r.student_name || `Student ${r.student_id || '—'}`);
    const sid = studentRel.student_id || r.student_id || '—';

    // Resolve reservation label
    const resLabel = r.reservation
      ? `RES-${String(r.reservation.reservation_id).padStart(3, '0')}${r.reservation.subject ? ' — ' + r.reservation.subject : ''}`
      : (r.reservation_id ? `RES-${String(r.reservation_id).padStart(3, '0')}` : '—');

    // Received by (admin relation)
    const receivedByName = r.receiver
      ? `${r.receiver.first_name} ${r.receiver.last_name}`
      : (r.received_by ? `Admin #${r.received_by}` : '—');

    // All persons (primary member + accountability_members)
    const allPersons = [];
    if (r.member_name) allPersons.push(r.member_name);
    (r.members || []).forEach(m => {
      if (m.member_name && m.member_name !== r.member_name) allPersons.push(m.member_name);
    });

    // Status — use remarks field (matches accountability.js mapStatus logic)
    const remarksRaw = (r.remarks || '').toLowerCase();
    let status;
    if (remarksRaw === 'resolved')     status = 'resolved';
    else if (remarksRaw === 'overdue') status = 'overdue';
    else if (remarksRaw === 'pending') status = 'pending';
    else                               status = 'active';

    // Dates
    const parseDate = v => {
      if (!v) return null;
      return typeof v === 'string' ? v.split('T')[0] : new Date(v).toISOString().split('T')[0];
    };

    // Time
    const extractTime = val => {
      if (!val) return '';
      if (typeof val === 'string') {
        if (/^\d{2}:\d{2}/.test(val)) return val.slice(0, 5);
        const m = val.match(/T(\d{2}:\d{2})/);
        if (m) return m[1];
      }
      if (val instanceof Date) return val.toTimeString().slice(0, 5);
      return String(val).slice(0, 5);
    };

    return {
      id:              r.accountability_id,
      accId:           `ACC-${String(r.accountability_id).padStart(3, '0')}`,
      name,
      sid,
      subject:         r.subject           || '—',
      materials:       r.materials_broken  || '—',
      profName:        r.prof_name         || '—',
      profEmail:       r.prof_email        || '',
      programSection:  r.program_course_section || '—',
      date:            parseDate(r.date_borrowed),
      deadline:        parseDate(r.deadline),
      dateReplaced:    parseDate(r.date_replaced),
      timeStart:       extractTime(r.time_start),
      timeEnd:         extractTime(r.time_end),
      persons:         allPersons,
      receivedBy:      receivedByName,
      reservationId:   r.reservation_id  || null,
      reservationLabel: resLabel,
      emailStage:      r.email_stage     || 'none',
      stageLabel:      r.stage_label     || 'Not yet notified',
      remarks:         r.remarks         || '—',
      status,
    };
  }

  function getAccFiltered() {
    return accAllRecords.filter(r => {
      const matchTab = accCurrentTab === 'all' || r.status === accCurrentTab;
      const q = accSearch.toLowerCase();
      const matchSearch = !q
        || r.name.toLowerCase().includes(q)
        || r.accId.toLowerCase().includes(q)
        || r.sid.toLowerCase().includes(q)
        || r.subject.toLowerCase().includes(q)
        || r.materials.toLowerCase().includes(q)
        || r.profName.toLowerCase().includes(q)
        || r.programSection.toLowerCase().includes(q)
        || (r.reservationLabel || '').toLowerCase().includes(q)
        || r.persons.some(p => p.toLowerCase().includes(q));
      return matchTab && matchSearch;
    });
  }

  function renderAccAll() {
    const total    = accAllRecords.length;
    const active   = accAllRecords.filter(r => r.status === 'active' || r.status === 'pending').length;
    const resolved = accAllRecords.filter(r => r.status === 'resolved').length;
    const overdue  = accAllRecords.filter(r => r.status === 'overdue').length;

    setEl('acc-tab-all-count',      total);
    setEl('acc-tab-active-count',   active);
    setEl('acc-tab-resolved-count', resolved);
    setEl('acc-tab-overdue-count',  overdue);

    // Badge on switcher button
    const badge = document.getElementById('accBadgeCount');
    if (badge) { badge.textContent = overdue; badge.style.display = overdue > 0 ? 'inline' : 'none'; }

    // Update summary cards if accountability section is visible
    const accSection = document.getElementById('sectionAccountability');
    if (accSection && accSection.style.display !== 'none') {
      updateAccCounts();
    }

    renderAccTable();
  }

  function renderAccTable() {
    const filtered   = getAccFiltered();
    const total      = filtered.length;
    const pages      = Math.max(1, Math.ceil(total / ACC_PAGE_SIZE));
    if (accCurrentPage > pages) accCurrentPage = 1;

    const start      = (accCurrentPage - 1) * ACC_PAGE_SIZE;
    const slice      = filtered.slice(start, start + ACC_PAGE_SIZE);

    const tbody      = document.getElementById('accTableBody');
    const emptyEl    = document.getElementById('accEmptyState');
    const metaEl     = document.getElementById('accTableMeta');
    const pageInfoEl = document.getElementById('accPageInfo');

    if (metaEl)     metaEl.textContent = `${total} record${total !== 1 ? 's' : ''} found`;
    if (pageInfoEl) pageInfoEl.textContent = total === 0
      ? 'Showing 0–0 of 0'
      : `Showing ${start + 1}–${Math.min(start + ACC_PAGE_SIZE, total)} of ${total}`;

    if (slice.length === 0) {
      if (tbody)   tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';

      const accStatusBadge = status => {
        const map = {
          active:   'badge-pending',
          pending:  'badge-pending',
          resolved: 'badge-borrowed',
          overdue:  'badge-conditional',
        };
        return map[status] || 'badge-pending';
      };
      const accStatusLabel = status => {
        const map = {
          active:   'Active',
          pending:  'Pending',
          resolved: 'Resolved',
          overdue:  'Overdue',
        };
        return map[status] || status;
      };

      tbody.innerHTML = slice.map(r => {
        const isOverdue = r.status === 'overdue';
        const deadlineStyle = isOverdue ? 'color:#dc2626;font-weight:600;' : '';
        const resLink = r.reservationId
          ? `<a href="#" onclick="switchSection('reservations');setTimeout(()=>openModal(${r.reservationId}),100);return false;" style="color:#205e38;font-size:11px;">${r.reservationLabel}</a>`
          : '—';
        return `<tr>
          <td><span class="tx-id">${r.accId}</span></td>
          <td>
            <span class="tx-name">${r.name}</span>
            ${r.persons.length > 1 ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">+${r.persons.length - 1} more</div>` : ''}
          </td>
          <td><span class="tx-id-num">${r.sid}</span></td>
          <td><span class="tx-course">${r.subject}</span></td>
          <td><span class="tx-course">${r.materials}</span></td>
          <td><div class="date-cell"><div class="date-main">${r.date ? formatDate(r.date) : '—'}</div></div></td>
          <td><div class="date-cell"><div class="date-main" style="${deadlineStyle}">${r.deadline ? formatDate(r.deadline) : '—'}</div>${isOverdue ? '<div class="date-sub" style="color:#dc2626;">Overdue</div>' : ''}</div></td>
          <td><span class="badge ${accStatusBadge(r.status)}">${accStatusLabel(r.status)}</span></td>
          <td>
            <button class="action-btn view" title="View details" onclick="openAccModal(${r.id})">
              <i class='bx bx-show'></i>
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    renderAccPagination(pages);
  }

  function renderAccPagination(pages) {
    const container = document.getElementById('accPageBtns');
    if (!container) return;
    container.innerHTML = '';

    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prev.disabled  = accCurrentPage === 1;
    prev.onclick   = () => { accCurrentPage--; renderAccTable(); };
    container.appendChild(prev);

    const maxVisible = 5;
    let startPage = Math.max(1, accCurrentPage - Math.floor(maxVisible / 2));
    let endPage   = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (i === accCurrentPage ? ' active' : '');
      btn.textContent = i;
      btn.onclick = () => { accCurrentPage = i; renderAccTable(); };
      container.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    next.disabled  = accCurrentPage === pages;
    next.onclick   = () => { accCurrentPage++; renderAccTable(); };
    container.appendChild(next);
  }

  /* ── Accountability Tabs ────────────────────────────── */
  window.setAccTab = function(btn) {
    document.querySelectorAll('#sectionAccountability .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    accCurrentTab  = btn.dataset.accTab;
    accCurrentPage = 1;
    renderAccTable();
  };

  /* ── Accountability Detail Modal ────────────────────── */
  window.openAccModal = function (accId) {
    const r = accAllRecords.find(x => x.id === accId);
    if (!r) return;

    const accStatusBadge = s => ({ active:'badge-pending', pending:'badge-pending', resolved:'badge-borrowed', overdue:'badge-conditional' }[s] || 'badge-pending');
    const accStatusLabel = s => ({ active:'Active', pending:'Pending', resolved:'Resolved', overdue:'Overdue' }[s] || s);

    setEl('modalTitle',    r.accId);
    setEl('modalSubtitle', r.name + ' · ' + r.subject);

    const personsHtml = r.persons.length > 0
      ? r.persons.map((p, i) => `<div style="display:flex;gap:8px;margin-bottom:4px;"><span style="color:#aaa;min-width:18px;font-size:12px;">${i + 1}.</span><span>${p}</span></div>`).join('')
      : '<span style="color:#9ca3af;">—</span>';

    const stageColors = {
      none:      { bg: '#f1f5f9', color: '#64748b' },
      student:   { bg: '#fef9c3', color: '#854d0e' },
      professor: { bg: '#dbeafe', color: '#1e40af' },
      dean:      { bg: '#ede9fe', color: '#5b21b6' },
      resolved:  { bg: '#dcfce7', color: '#166534' },
    };
    const stageStyle = stageColors[r.emailStage] || stageColors.none;
    const stageBadgeHtml = `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:${stageStyle.bg};color:${stageStyle.color};">${r.stageLabel}</span>`;

    const timeDisplay = r.timeStart
      ? r.timeStart + (r.timeEnd ? ' – ' + r.timeEnd : '')
      : '—';

    document.getElementById('modalBody').innerHTML = `
      <div class="modal-row">
        <div class="modal-field">
          <label>Record ID</label>
          <div class="value">${r.accId}</div>
        </div>
        <div class="modal-field">
          <label>Status</label>
          <div class="value"><span class="badge ${accStatusBadge(r.status)}">${accStatusLabel(r.status)}</span></div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Student Name</label>
          <div class="value">${r.name}</div>
        </div>
        <div class="modal-field">
          <label>Student ID</label>
          <div class="value">${r.sid}</div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Subject</label>
          <div class="value">${r.subject}</div>
        </div>
        <div class="modal-field">
          <label>Program / Course / Section</label>
          <div class="value">${r.programSection}</div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Professor</label>
          <div class="value">${r.profName}</div>
        </div>
        <div class="modal-field">
          <label>Linked Reservation</label>
          <div class="value">${r.reservationId
            ? `<a href="#" onclick="closeModal();switchSection('reservations');setTimeout(()=>openModal(${r.reservationId}),100);return false;" style="color:#205e38;">${r.reservationLabel}</a>`
            : '—'}</div>
        </div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Date Borrowed</label>
          <div class="value">${r.date ? formatDate(r.date) : '—'}</div>
        </div>
        <div class="modal-field">
          <label>Time</label>
          <div class="value">${timeDisplay}</div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Materials Broken</label>
          <div class="value">${r.materials}</div>
        </div>
        <div class="modal-field">
          <label>Deadline</label>
          <div class="value" style="${r.status === 'overdue' ? 'color:#dc2626;font-weight:600;' : ''}">${r.deadline ? formatDate(r.deadline) : '—'}</div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-field">
          <label>Date Replaced</label>
          <div class="value">${r.dateReplaced ? formatDate(r.dateReplaced) : '—'}</div>
        </div>
        <div class="modal-field">
          <label>Received By</label>
          <div class="value">${r.receivedBy}</div>
        </div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-field" style="margin-bottom:16px;">
        <label>Notification Stage</label>
        <div class="value">${stageBadgeHtml}</div>
      </div>
      <div class="modal-field" style="margin-bottom:16px;">
        <label>Remarks</label>
        <div class="value">${r.remarks}</div>
      </div>
      <div class="modal-divider"></div>
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px;">Persons Responsible</div>
      <div style="padding:0 4px;">${personsHtml}</div>`;

    document.getElementById('modalOverlay').classList.add('open');
  };

  /* ── Init ───────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    initSearch();
    initModalOverlay();
    loadTransactions();

    // Accountability search — safe to wire up here since DOM is ready
    const accInput = document.getElementById('accSearchInput');
    if (accInput) {
      accInput.addEventListener('input', e => {
        accSearch      = e.target.value.trim();
        accCurrentPage = 1;
        renderAccTable();
      });
    }
  });

})();