(function () {
  "use strict";

  /* ============================
     DATA STORE
  ============================ */
  const COLORS = ["#205e38","#D4B84A","#1976d2","#7b1fa2","#e53935","#00897b","#f57c00"];

  let records = [
    { id: "ACC-001", borrower: "Maria Santos",    studentId: "2021-00142", item: "Chemistry Flask Set",      quantity: 3,  dateIssued: "2025-04-10", dueDate: "2025-04-24", returnDate: "",           status: "overdue",  priority: "high",   condition: "Good",  notes: "Student borrowed for lab experiment." },
    { id: "ACC-002", borrower: "Juan dela Cruz",  studentId: "2022-00311", item: "Digital Microscope",       quantity: 1,  dateIssued: "2025-04-20", dueDate: "2025-05-04", returnDate: "",           status: "active",   priority: "medium", condition: "Good",  notes: "Handle with care." },
    { id: "ACC-003", borrower: "Ana Reyes",        studentId: "2020-00089", item: "Bunsen Burner",            quantity: 2,  dateIssued: "2025-03-15", dueDate: "2025-03-29", returnDate: "2025-03-28", status: "resolved", priority: "low",    condition: "Good",  notes: "" },
    { id: "ACC-004", borrower: "Carlos Mendoza",  studentId: "2023-00451", item: "Vernier Caliper",          quantity: 1,  dateIssued: "2025-04-22", dueDate: "2025-05-06", returnDate: "",           status: "pending",  priority: "low",    condition: "Fair",  notes: "Waiting for approval." },
    { id: "ACC-005", borrower: "Liza Flores",     studentId: "2021-00209", item: "Centrifuge Machine",       quantity: 1,  dateIssued: "2025-04-01", dueDate: "2025-04-15", returnDate: "",           status: "overdue",  priority: "high",   condition: "Good",  notes: "Faculty use." },
    { id: "ACC-006", borrower: "Rodel Castillo",  studentId: "2022-00178", item: "Oscilloscope",             quantity: 1,  dateIssued: "2025-04-25", dueDate: "2025-05-09", returnDate: "",           status: "active",   priority: "medium", condition: "Good",  notes: "" },
    { id: "ACC-007", borrower: "Nina Cruz",        studentId: "2020-00334", item: "Beaker Set (500ml x5)",   quantity: 5,  dateIssued: "2025-03-20", dueDate: "2025-04-03", returnDate: "2025-04-02", status: "resolved", priority: "low",    condition: "Good",  notes: "Returned early." },
    { id: "ACC-008", borrower: "Paolo Reyes",     studentId: "2023-00560", item: "Power Supply Unit",        quantity: 2,  dateIssued: "2025-04-28", dueDate: "2025-05-12", returnDate: "",           status: "active",   priority: "high",   condition: "Good",  notes: "Thesis use." },
  ];

  let nextIdNum = 9;
  let currentPage = 1;
  const perPage = 6;
  let filterStatus = "all";
  let searchQuery = "";
  let editingId = null;

  /* ============================
     HELPERS
  ============================ */
  function avatarColor(name) {
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  function initials(name) {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }

  function formatDate(str) {
    if (!str) return "—";
    const d = new Date(str + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function isOverdue(r) {
    if (r.status === "resolved") return false;
    return new Date(r.dueDate) < new Date();
  }

  function getFilteredRecords() {
    return records.filter(r => {
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q
        || r.borrower.toLowerCase().includes(q)
        || r.id.toLowerCase().includes(q)
        || r.item.toLowerCase().includes(q)
        || r.studentId.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }

  /* ============================
     SUMMARY CARDS
  ============================ */
  function renderSummary() {
    document.getElementById("cnt-total").textContent    = records.length;
    document.getElementById("cnt-active").textContent   = records.filter(r => r.status === "active").length;
    document.getElementById("cnt-resolved").textContent = records.filter(r => r.status === "resolved").length;
    document.getElementById("cnt-overdue").textContent  = records.filter(r => r.status === "overdue").length;
  }

  /* ============================
     TABLE
  ============================ */
  function renderTable() {
    const filtered = getFilteredRecords();
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const slice = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
    const tbody = document.getElementById("accountability-tbody");
    tbody.innerHTML = "";

    if (slice.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="empty-state">
          <i class='bx bx-shield-x'></i>
          <p>No accountability records found.</p>
        </div>
      </td></tr>`;
    } else {
      slice.forEach(r => {
        const color = avatarColor(r.borrower);
        const statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);
        tbody.innerHTML += `
          <tr data-id="${r.id}">
            <td>
              <div class="borrower-cell">
                <div class="borrower-avatar" style="background:${color}">${initials(r.borrower)}</div>
                <div>
                  <div class="borrower-name">${r.borrower}</div>
                  <div class="borrower-id">${r.studentId}</div>
                </div>
              </div>
            </td>
            <td><span style="font-weight:600;color:#205e38;font-size:12px;">${r.id}</span></td>
            <td>${r.item}</td>
            <td style="text-align:center;">${r.quantity}</td>
            <td>${formatDate(r.dueDate)}</td>
            <td><span class="status-badge ${r.status}">${statusLabel}</span></td>
            <td><span class="priority-badge ${r.priority}">${r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}</span></td>
            <td>
              <div class="action-btns">
                <button class="action-btn view" title="View Details" onclick="window.viewRecord('${r.id}')"><i class='bx bx-show'></i></button>
                <button class="action-btn edit" title="Edit" onclick="window.openEditModal('${r.id}')"><i class='bx bx-edit'></i></button>
                ${r.status !== "resolved" ? `<button class="action-btn resolve" title="Mark Resolved" onclick="window.resolveRecord('${r.id}')"><i class='bx bx-check-circle'></i></button>` : ""}
                <button class="action-btn delete" title="Delete" onclick="window.deleteRecord('${r.id}')"><i class='bx bx-trash'></i></button>
              </div>
            </td>
          </tr>`;
      });
    }

    document.getElementById("table-meta").textContent =
      `Showing ${slice.length} of ${filtered.length} record${filtered.length !== 1 ? "s" : ""}`;

    renderPagination(totalPages);
  }

  /* ============================
     PAGINATION
  ============================ */
  function renderPagination(totalPages) {
    const container = document.getElementById("pagination-btns");
    container.innerHTML = "";

    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.innerHTML = "<i class='bx bx-chevron-left'></i>";
    prev.disabled = currentPage === 1;
    prev.style.opacity = currentPage === 1 ? "0.4" : "1";
    prev.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
    container.appendChild(prev);

    const current = document.createElement("button");
    current.className = "page-btn active";
    current.textContent = currentPage;
    container.appendChild(current);

    const next = document.createElement("button");
    next.className = "page-btn";
    next.innerHTML = "<i class='bx bx-chevron-right'></i>";
    next.disabled = currentPage === totalPages;
    next.style.opacity = currentPage === totalPages ? "0.4" : "1";
    next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
    container.appendChild(next);
  }

  /* ============================
     MODAL: ADD / EDIT
  ============================ */
  window.openAddModal = function () {
    editingId = null;
    document.getElementById("modal-title-text").textContent = "Add Accountability Record";
    document.getElementById("acc-form").reset();
    document.getElementById("form-return-date").value = "";
    document.getElementById("form-status").value = "active";
    openModal("acc-modal");
  };

  window.openEditModal = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    document.getElementById("modal-title-text").textContent = "Edit Record";
    document.getElementById("form-borrower").value   = r.borrower;
    document.getElementById("form-student-id").value = r.studentId;
    document.getElementById("form-item").value       = r.item;
    document.getElementById("form-quantity").value   = r.quantity;
    document.getElementById("form-issued").value     = r.dateIssued;
    document.getElementById("form-due").value        = r.dueDate;
    document.getElementById("form-return-date").value = r.returnDate || "";
    document.getElementById("form-status").value     = r.status;
    document.getElementById("form-priority").value   = r.priority;
    document.getElementById("form-condition").value  = r.condition;
    document.getElementById("form-notes").value      = r.notes;
    openModal("acc-modal");
  };

  function saveRecord() {
    const borrower   = document.getElementById("form-borrower").value.trim();
    const studentId  = document.getElementById("form-student-id").value.trim();
    const item       = document.getElementById("form-item").value.trim();
    const quantity   = parseInt(document.getElementById("form-quantity").value) || 1;
    const dateIssued = document.getElementById("form-issued").value;
    const dueDate    = document.getElementById("form-due").value;
    const returnDate = document.getElementById("form-return-date").value;
    const status     = document.getElementById("form-status").value;
    const priority   = document.getElementById("form-priority").value;
    const condition  = document.getElementById("form-condition").value;
    const notes      = document.getElementById("form-notes").value.trim();

    if (!borrower || !item || !dueDate) {
      showToast("Please fill in required fields.", true);
      return;
    }

    if (editingId) {
      const idx = records.findIndex(x => x.id === editingId);
      records[idx] = { ...records[idx], borrower, studentId, item, quantity, dateIssued, dueDate, returnDate, status, priority, condition, notes };
      showToast("Record updated successfully.");
    } else {
      const id = "ACC-" + String(nextIdNum++).padStart(3, "0");
      records.push({ id, borrower, studentId, item, quantity, dateIssued, dueDate, returnDate, status, priority, condition, notes });
      showToast("Record added successfully.");
    }

    closeModal("acc-modal");
    renderSummary();
    renderTable();
  }

  /* ============================
     VIEW DETAIL MODAL
  ============================ */
  window.viewRecord = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;

    const color = avatarColor(r.borrower);
    const statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);

    document.getElementById("detail-content").innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;">
        <div style="width:52px;height:52px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;flex-shrink:0;">${initials(r.borrower)}</div>
        <div>
          <div style="font-size:16px;font-weight:700;color:#1a1a1a;">${r.borrower}</div>
          <div style="font-size:12.5px;color:#999;">${r.studentId} &nbsp;•&nbsp; <span class="status-badge ${r.status}" style="vertical-align:middle;">${statusLabel}</span></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Item Details</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Record ID</div><div class="detail-value">${r.id}</div></div>
          <div class="detail-item"><div class="detail-label">Item</div><div class="detail-value">${r.item}</div></div>
          <div class="detail-item"><div class="detail-label">Quantity</div><div class="detail-value">${r.quantity}</div></div>
          <div class="detail-item"><div class="detail-label">Condition</div><div class="detail-value">${r.condition}</div></div>
          <div class="detail-item"><div class="detail-label">Priority</div><div class="detail-value"><span class="priority-badge ${r.priority}">${r.priority.charAt(0).toUpperCase()+r.priority.slice(1)}</span></div></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Timeline</div>
        <ul class="timeline">
          <li><strong>Issued</strong><span class="time-label">${formatDate(r.dateIssued)}</span></li>
          <li><strong>Due Date</strong><span class="time-label">${formatDate(r.dueDate)}</span></li>
          ${r.returnDate ? `<li><strong>Returned</strong><span class="time-label">${formatDate(r.returnDate)}</span></li>` : ""}
        </ul>
      </div>

      ${r.notes ? `<div class="detail-section">
        <div class="detail-section-title">Notes</div>
        <p style="font-size:13.5px;color:#555;line-height:1.6;">${r.notes}</p>
      </div>` : ""}
    `;

    openModal("detail-modal");
  };

  /* ============================
     RESOLVE / DELETE
  ============================ */
  window.resolveRecord = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    r.status = "resolved";
    r.returnDate = new Date().toISOString().split("T")[0];
    renderSummary();
    renderTable();
    showToast("Record marked as resolved.");
  };

  window.deleteRecord = function (id) {
    if (!confirm("Delete this accountability record?")) return;
    records = records.filter(x => x.id !== id);
    renderSummary();
    renderTable();
    showToast("Record deleted.");
  };

  /* ============================
     MODAL HELPERS
  ============================ */
  function openModal(id) {
    document.getElementById(id).classList.add("open");
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
  }

  document.querySelectorAll(".modal-close, .btn-cancel-modal").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", e => {
      if (e.target === m) m.classList.remove("open");
    });
  });

  /* ============================
     TOAST
  ============================ */
  function showToast(msg, isError = false) {
    const t = document.getElementById("toast");
    t.innerHTML = `<i class='bx ${isError ? "bx-error-circle" : "bx-check-circle"}'></i> ${msg}`;
    t.className = "toast" + (isError ? " error" : "");
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }

  /* ============================
     CONTROLS
  ============================ */
  document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById("filter-status").addEventListener("change", e => {
    filterStatus = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById("btn-save-record").addEventListener("click", saveRecord);

  /* ============================
     INIT
  ============================ */
  renderSummary();
  renderTable();

})();