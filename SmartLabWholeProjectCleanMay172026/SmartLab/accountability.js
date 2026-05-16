(function () {
  "use strict";

  /* ============================
     API CONFIG
  ============================ */
  const API_BASE = "http://localhost:5000/api";

  function getAuthHeaders() {
    const token = localStorage.getItem("smartlab_admin_token");
    return {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : ""
    };
  }

  /* ============================
     STATE
  ============================ */
  let records      = [];
  let students     = [];      // list for responsible_student dropdown
  let reservations = [];      // list for reservation_id dropdown
  let inventoryItems = [];    // list for item_id dropdown (loaded from /inventory)
  let currentPage  = 1;
  const perPage    = 6;
  let filterStatus = "all";
  let searchQuery  = "";
  let editingId    = null;

  /* ============================
     API HELPERS
  ============================ */

  function mapRecord(r) {
    // Student name from the joined responsibleStudent relation
    const studentName = r.responsibleStudent
      ? `${r.responsibleStudent.first_name} ${r.responsibleStudent.last_name}`
      : (r.responsible_student ? `User #${r.responsible_student}` : "—");

    // Item name from the joined item relation
    const itemName = r.item ? r.item.name : (r.item_description || "—");

    // Reservation label from the joined reservation relation
    const resLabel = r.reservation
      ? `RES-${String(r.reservation.reservation_id).padStart(3, "0")}${r.reservation.activity_title ? " — " + r.reservation.activity_title : ""}`
      : (r.reservation_id ? `RES-${String(r.reservation_id).padStart(3, "0")}` : "—");

    return {
      id:              r.accountability_id,
      reservationId:   r.reservation_id    || null,
      reservationLabel: resLabel,
      itemId:          r.item_id           || null,
      itemName,
      studentId:       r.responsible_student || null,
      studentName,
      studentNumber:   r.responsibleStudent ? r.responsibleStudent.student_number : null,
      dateBorrowed:    r.date_time_broken
                         ? r.date_time_broken.split("T")[0]
                         : "",
      time:            r.time_start  || "",
      timeEnd:         r.time_end    || "",
      persons:         r.persons     || [],
      materialsBroken: r.item_description || "",
      teacher:         r.teacher     || "",
      subject:         r.subject     || "",
      programSection:  r.program_section || "",
      deadline:        r.deadline    ? r.deadline.split("T")[0] : "",
      remarks:         mapStatus(r.resolution_status),
      dateReplaced:    r.date_replaced ? r.date_replaced.split("T")[0] : "",
      receivedBy:      r.received_by  || "",
      _raw: r
    };
  }

  function mapStatus(status) {
    if (!status) return "active";
    switch (status.toUpperCase()) {
      case "RESOLVED": return "resolved";
      case "OVERDUE":  return "overdue";
      case "PENDING":  return "pending";
      default:         return "active";
    }
  }

  function mapRemarks(remarks) {
    switch (remarks) {
      case "resolved": return "RESOLVED";
      case "overdue":  return "OVERDUE";
      case "pending":  return "PENDING";
      default:         return "PENDING";
    }
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  /* ============================
     LOAD DATA
  ============================ */
  async function loadRecords() {
    try {
      showLoading(true);
      const data = await apiFetch("/accountability");
      records = (data.data || []).map(mapRecord);
      renderSummary();
      renderTable();
    } catch (err) {
      showToast("Failed to load records: " + err.message, true);
    } finally {
      showLoading(false);
    }
  }

  async function loadDropdownData() {
    try {
      const [studentsData, reservationsData, inventoryData] = await Promise.all([
        apiFetch("/accountability/students"),
        apiFetch("/accountability/reservations"),
        apiFetch("/inventory")
      ]);

      students     = studentsData.data     || [];
      reservations = reservationsData.data || [];
      inventoryItems = inventoryData.data  || [];

      populateStudentDropdown();
      populateReservationDropdown();
      populateItemDropdown();
    } catch (err) {
      console.warn("Could not load dropdown data:", err.message);
    }
  }

  function populateStudentDropdown() {
    const sel = document.getElementById("form-responsible-student");
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Student —</option>';
    students.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.user_id;
      opt.textContent = `${s.last_name}, ${s.first_name}${s.student_number ? " (" + s.student_number + ")" : ""}`;
      sel.appendChild(opt);
    });
  }

  function populateReservationDropdown() {
    const sel = document.getElementById("form-reservation-id");
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Reservation —</option>';
    reservations.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.reservation_id;
      const date = r.date_needed ? new Date(r.date_needed).toLocaleDateString() : "";
      const title = r.activity_title || "Untitled";
      const who   = r.reservingStudent
        ? ` · ${r.reservingStudent.first_name} ${r.reservingStudent.last_name}`
        : "";
      opt.textContent = `RES-${String(r.reservation_id).padStart(3, "0")} — ${title} (${date})${who}`;
      sel.appendChild(opt);
    });
  }

  function populateItemDropdown() {
    const sel = document.getElementById("form-item-id");
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Item —</option>';
    inventoryItems.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.item_id;
      opt.textContent = `[${item.category}] ${item.name}`;
      opt.dataset.name = item.name;
      sel.appendChild(opt);
    });
  }

  // Auto-fill Materials Broken when item is selected
  window.onItemSelected = function () {
    const sel  = document.getElementById("form-item-id");
    const desc = document.getElementById("form-materials-broken");
    if (!sel || !desc) return;
    const selected = sel.options[sel.selectedIndex];
    if (selected && selected.dataset.name) {
      desc.value = selected.dataset.name;
    }
  };

  /* ============================
     HELPERS
  ============================ */
  function formatDate(str) {
    if (!str) return "—";
    const d = new Date(str + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(str) {
    if (!str) return "—";
    const [h, m] = str.split(":");
    const hour = parseInt(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    return ((hour % 12) || 12) + ":" + m + " " + suffix;
  }

  function formatTimeRange(start, end) {
    if (!start && !end) return "—";
    if (!end) return formatTime(start);
    return formatTime(start) + " - " + formatTime(end);
  }

  function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  function getFilteredRecords() {
    return records.filter(r => {
      const matchStatus = filterStatus === "all" || r.remarks === filterStatus;
      const q = searchQuery.toLowerCase();
      const namesStr = (r.persons || []).join(" ").toLowerCase();
      const matchSearch = !q
        || namesStr.includes(q)
        || String(r.id).toLowerCase().includes(q)
        || r.materialsBroken.toLowerCase().includes(q)
        || (r.teacher || "").toLowerCase().includes(q)
        || (r.subject || "").toLowerCase().includes(q)
        || (r.programSection || "").toLowerCase().includes(q)
        || (r.studentName || "").toLowerCase().includes(q)
        || (r.studentNumber || "").toLowerCase().includes(q)
        || (r.itemName || "").toLowerCase().includes(q)
        || (r.reservationLabel || "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }

  function showLoading(on) {
    const tbody = document.getElementById("accountability-tbody");
    if (on) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:32px;color:#888;">
        <i class='bx bx-loader-alt bx-spin' style="font-size:22px;"></i> Loading records…
      </td></tr>`;
    }
  }

  /* ============================
     SUMMARY CARDS
  ============================ */
  function renderSummary() {
    document.getElementById("cnt-total").textContent    = records.length;
    document.getElementById("cnt-active").textContent   = records.filter(r => r.remarks === "active" || r.remarks === "pending").length;
    document.getElementById("cnt-resolved").textContent = records.filter(r => r.remarks === "resolved").length;
    document.getElementById("cnt-overdue").textContent  = records.filter(r => r.remarks === "overdue").length;
  }

  /* ============================
     RENDER PERSONS CELL
  ============================ */
  function renderPersonsCell(persons) {
    if (!persons || persons.length === 0) {
      const span = document.createElement("span");
      span.style.color = "#aaa";
      span.textContent = "—";
      return span;
    }
    const frag = document.createDocumentFragment();
    persons.forEach(p => {
      const node = cloneTemplate("tmpl-person-name");
      node.querySelector(".person-name-plain").textContent = p;
      frag.appendChild(node);
    });
    return frag;
  }

  /* ============================
     TABLE
  ============================ */
  function renderTable() {
    const filtered   = getFilteredRecords();
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const slice = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
    const tbody = document.getElementById("accountability-tbody");
    tbody.innerHTML = "";

    if (slice.length === 0) {
      tbody.appendChild(cloneTemplate("tmpl-empty-state"));
    } else {
      slice.forEach(r => {
        const remarksLabel = r.remarks.charAt(0).toUpperCase() + r.remarks.slice(1);
        const rowFrag = cloneTemplate("tmpl-table-row");
        const row     = rowFrag.querySelector("tr");

        row.dataset.id = r.id;

        row.querySelector(".col-date-borrowed").textContent    = formatDate(r.dateBorrowed);
        row.querySelector(".col-materials-broken").textContent = r.materialsBroken;
        row.querySelector(".col-teacher").textContent          = r.teacher || "—";
        row.querySelector(".col-subject").textContent          = r.subject || "—";
        row.querySelector(".col-time").textContent             = formatTimeRange(r.time, r.timeEnd);
        row.querySelector(".col-program-section").textContent  = r.programSection || "—";
        row.querySelector(".col-deadline").textContent         = formatDate(r.deadline);
        row.querySelector(".col-date-replaced").textContent    = formatDate(r.dateReplaced);
        row.querySelector(".col-received-by").textContent      = r.receivedBy || "—";

        // Student name column (FK-resolved)
        const studentCell = row.querySelector(".col-student-name");
        if (studentCell) {
          studentCell.textContent = r.studentName;
          if (r.studentNumber) {
            const small = document.createElement("small");
            small.style.cssText = "display:block;color:#888;font-size:0.75em;";
            small.textContent = r.studentNumber;
            studentCell.appendChild(small);
          }
        }

        // Item name column (FK-resolved)
        const itemCell = row.querySelector(".col-item-name");
        if (itemCell) itemCell.textContent = r.itemName;

        // Reservation column (FK-resolved)
        const resCell = row.querySelector(".col-reservation-id");
        if (resCell) resCell.textContent = r.reservationLabel;

        // Remarks badge
        const badge = document.createElement("span");
        badge.className  = "status-badge " + r.remarks;
        badge.textContent = remarksLabel;
        row.querySelector(".col-remarks").appendChild(badge);

        // Persons cell
        const personsCell = row.querySelector(".col-persons");
        personsCell.appendChild(renderPersonsCell(r.persons));

        // Action buttons
        const viewBtn    = row.querySelector(".action-btn.view");
        const editBtn    = row.querySelector(".action-btn.edit");
        const resolveBtn = row.querySelector(".action-btn.resolve");
        const deleteBtn  = row.querySelector(".action-btn.delete");

        viewBtn.addEventListener("click",   () => window.viewRecord(r.id));
        editBtn.addEventListener("click",   () => window.openEditModal(r.id));
        deleteBtn.addEventListener("click", () => window.deleteRecord(r.id));

        if (r.remarks === "resolved") {
          resolveBtn.remove();
        } else {
          resolveBtn.addEventListener("click", () => window.resolveRecord(r.id));
        }

        tbody.appendChild(rowFrag);
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
    prev.disabled  = currentPage === 1;
    prev.style.opacity = currentPage === 1 ? "0.4" : "1";
    prev.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTable(); } });
    container.appendChild(prev);

    const cur = document.createElement("button");
    cur.className  = "page-btn active";
    cur.textContent = currentPage;
    container.appendChild(cur);

    const next = document.createElement("button");
    next.className = "page-btn";
    next.innerHTML = "<i class='bx bx-chevron-right'></i>";
    next.disabled  = currentPage === totalPages;
    next.style.opacity = currentPage === totalPages ? "0.4" : "1";
    next.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderTable(); } });
    container.appendChild(next);
  }

  /* ============================
     MULTI-PERSON FIELD BUILDER
  ============================ */
  function getPersonsContainer() {
    return document.getElementById("persons-container");
  }

  function buildPersonsField(persons) {
    const container = getPersonsContainer();
    container.innerHTML = "";
    const list = (persons && persons.length > 0) ? persons : [""];
    list.forEach(name => _appendPersonRow(name));
    _syncPersonUI();
  }

  function _appendPersonRow(value = "") {
    const container = getPersonsContainer();
    const frag = cloneTemplate("tmpl-person-row");
    const row  = frag.querySelector(".person-input-row");

    row.querySelector(".person-num").textContent       = container.children.length + 1;
    row.querySelector(".person-input").value           = value;
    row.querySelector(".person-remove-btn").addEventListener("click", function () {
      window._removePerson(this);
    });

    container.appendChild(frag);
  }

  window._removePerson = function(btn) {
    const container = getPersonsContainer();
    if (container.children.length <= 1) return;
    btn.closest(".person-input-row").remove();
    _syncPersonUI();
  };

  function _syncPersonUI() {
    const rows = getPersonsContainer().querySelectorAll(".person-input-row");
    rows.forEach((row, i) => {
      row.querySelector(".person-num").textContent = i + 1;
      row.querySelector(".person-remove-btn").style.visibility = rows.length > 1 ? "visible" : "hidden";
    });
  }

  window.addPersonRow = function() {
    _appendPersonRow("");
    _syncPersonUI();
    const inputs = getPersonsContainer().querySelectorAll(".person-input");
    inputs[inputs.length - 1].focus();
  };

  function getPersonsFromForm() {
    return Array.from(getPersonsContainer().querySelectorAll(".person-input"))
      .map(i => i.value.trim())
      .filter(v => v.length > 0);
  }

  /* ============================
     MODAL: ADD / EDIT
  ============================ */
  window.openAddModal = function () {
    editingId = null;
    document.getElementById("modal-title-text").textContent = "Add Accountability Record";
    document.getElementById("acc-form").reset();
    document.getElementById("form-remarks").value = "pending";
    buildPersonsField([""]);
    openModal("acc-modal");
  };

  window.openEditModal = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    document.getElementById("modal-title-text").textContent  = "Edit Record";

    // FK dropdowns — set selected values
    const resSel = document.getElementById("form-reservation-id");
    if (resSel) resSel.value = r.reservationId || "";

    const studSel = document.getElementById("form-responsible-student");
    if (studSel) studSel.value = r.studentId || "";

    const itemSel = document.getElementById("form-item-id");
    if (itemSel) itemSel.value = r.itemId || "";

    // Regular fields
    document.getElementById("form-date-borrowed").value      = r.dateBorrowed;
    document.getElementById("form-materials-broken").value   = r.materialsBroken;
    document.getElementById("form-teacher").value            = r.teacher;
    document.getElementById("form-subject").value            = r.subject;
    document.getElementById("form-time-start").value         = r.time    || "";
    document.getElementById("form-time-end").value           = r.timeEnd || "";
    document.getElementById("form-program-section").value    = r.programSection;
    document.getElementById("form-deadline").value           = r.deadline;
    document.getElementById("form-remarks").value            = r.remarks;
    document.getElementById("form-date-replaced").value      = r.dateReplaced || "";
    document.getElementById("form-received-by").value        = r.receivedBy || "";
    buildPersonsField(r.persons && r.persons.length > 0 ? r.persons : [""]);
    openModal("acc-modal");
  };

  async function saveRecord() {
    const reservationId   = document.getElementById("form-reservation-id")?.value;
    const responsibleStudent = document.getElementById("form-responsible-student")?.value;
    const itemId          = document.getElementById("form-item-id")?.value;
    const dateBorrowed    = document.getElementById("form-date-borrowed").value;
    const persons         = getPersonsFromForm();
    const materialsBroken = document.getElementById("form-materials-broken").value.trim();
    const teacher         = document.getElementById("form-teacher").value.trim();
    const subject         = document.getElementById("form-subject").value.trim();
    const time            = document.getElementById("form-time-start").value;
    const timeEnd         = document.getElementById("form-time-end").value;
    const programSection  = document.getElementById("form-program-section").value.trim();
    const deadline        = document.getElementById("form-deadline").value;
    const remarks         = document.getElementById("form-remarks").value;
    const dateReplaced    = document.getElementById("form-date-replaced").value;
    const receivedBy      = document.getElementById("form-received-by").value.trim();

    // Required FK fields for new records
    if (!editingId) {
      if (!reservationId) {
        showToast("Please select a Reservation.", true);
        return;
      }
      if (!responsibleStudent) {
        showToast("Please select a Responsible Student.", true);
        return;
      }
      if (!itemId) {
        showToast("Please select an Item.", true);
        return;
      }
    }

    if (!materialsBroken || !dateBorrowed) {
      showToast("Please fill in required fields.", true);
      return;
    }

    const payload = {
      reservation_id:       reservationId       || undefined,
      responsible_student:  responsibleStudent  || undefined,
      item_id:              itemId              || undefined,
      date_time_broken:     dateBorrowed,
      item_description:     materialsBroken,
      persons,
      teacher,
      subject,
      program_section:      programSection,
      time_start:           time,
      time_end:             timeEnd,
      deadline:             deadline || null,
      resolution_status:    mapRemarks(remarks),
      date_replaced:        dateReplaced || null,
      received_by:          receivedBy  || null
    };

    setBtnLoading(true);
    try {
      if (editingId) {
        const data = await apiFetch(`/accountability/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const idx = records.findIndex(x => x.id === editingId);
        if (idx > -1) records[idx] = mapRecord(data.data);
        showToast("Record updated successfully.");
      } else {
        const data = await apiFetch("/accountability", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        records.unshift(mapRecord(data.data));
        showToast("Record added successfully.");
      }
      closeModal("acc-modal");
      renderSummary();
      renderTable();
    } catch (err) {
      showToast("Save failed: " + err.message, true);
    } finally {
      setBtnLoading(false);
    }
  }

  function setBtnLoading(on) {
    const btn = document.getElementById("btn-save-record");
    btn.disabled     = on;
    btn.textContent  = on ? "Saving…" : "Save Record";
  }

  /* ============================
     VIEW DETAIL MODAL
  ============================ */
  window.viewRecord = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;

    const remarksLabel  = r.remarks.charAt(0).toUpperCase() + r.remarks.slice(1);
    const detailContent = document.getElementById("detail-content");
    detailContent.innerHTML = "";

    // Persons block
    const personsFrag  = cloneTemplate("tmpl-detail-persons-block");
    const personsBlock = personsFrag.querySelector(".detail-persons-block");

    personsBlock.querySelector(".detail-persons-label").textContent =
      r.persons && r.persons.length > 1
        ? "Persons Responsible (" + r.persons.length + ")"
        : "Person Responsible";

    const remarksBadge = personsBlock.querySelector(".detail-remarks-badge");
    remarksBadge.classList.add(r.remarks);
    remarksBadge.textContent = remarksLabel;

    const personsList = personsBlock.querySelector(".detail-persons-list");
    (r.persons || []).forEach((p, i) => {
      const entryFrag = cloneTemplate("tmpl-detail-person-entry");
      entryFrag.querySelector(".person-index").textContent = (i + 1) + ".";
      entryFrag.querySelector(".person-name").textContent  = p;
      personsList.appendChild(entryFrag);
    });

    personsBlock.querySelector(".detail-record-id").textContent = "Record #" + r.id;
    detailContent.appendChild(personsFrag);

    // FK-resolved info block
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = "background:#f8f9fa;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:0.9rem;";
    infoDiv.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><span style="color:#718096;">Student:</span> <strong>${r.studentName}</strong>${r.studentNumber ? `<br><small style="color:#888;">${r.studentNumber}</small>` : ""}</div>
        <div><span style="color:#718096;">Reservation:</span> <strong>${r.reservationLabel}</strong></div>
        <div><span style="color:#718096;">Item:</span> <strong>${r.itemName}</strong></div>
      </div>
    `;
    detailContent.appendChild(infoDiv);

    // Incident details
    const incidentFrag = cloneTemplate("tmpl-detail-incident");
    incidentFrag.querySelector(".col-date-borrowed").textContent    = formatDate(r.dateBorrowed);
    incidentFrag.querySelector(".col-time").textContent             = formatTimeRange(r.time, r.timeEnd);
    incidentFrag.querySelector(".col-materials-broken").textContent = r.materialsBroken;
    incidentFrag.querySelector(".col-teacher").textContent          = r.teacher || "—";
    incidentFrag.querySelector(".col-subject").textContent          = r.subject || "—";
    incidentFrag.querySelector(".col-program-section").textContent  = r.programSection || "—";
    detailContent.appendChild(incidentFrag);

    // Resolution
    const resFrag = cloneTemplate("tmpl-detail-resolution");
    resFrag.querySelector("li.tl-deadline .time-label").textContent = formatDate(r.deadline);

    const timeline = resFrag.querySelector(".timeline");

    if (r.dateReplaced) {
      const itemFrag = cloneTemplate("tmpl-timeline-item");
      itemFrag.querySelector(".tl-label").textContent    = "Date Replaced";
      itemFrag.querySelector(".time-label").textContent  = formatDate(r.dateReplaced);
      timeline.appendChild(itemFrag);
    }

    if (r.receivedBy) {
      const itemFrag = cloneTemplate("tmpl-timeline-item");
      itemFrag.querySelector(".tl-label").textContent    = "Received By";
      itemFrag.querySelector(".time-label").textContent  = r.receivedBy;
      timeline.appendChild(itemFrag);
    }

    detailContent.appendChild(resFrag);
    openModal("detail-modal");
  };

  /* ============================
     RESOLVE
  ============================ */
  window.resolveRecord = async function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    try {
      const data = await apiFetch(`/accountability/${id}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ resolution_notes: "", received_by: "" })
      });
      const idx = records.findIndex(x => x.id === id);
      if (idx > -1) records[idx] = mapRecord(data.data);
      renderSummary();
      renderTable();
      showToast("Record marked as resolved.");
    } catch (err) {
      showToast("Resolve failed: " + err.message, true);
    }
  };

  /* ============================
     DELETE
  ============================ */
  window.deleteRecord = async function (id) {
    if (!confirm("Delete this accountability record? This cannot be undone.")) return;
    try {
      await apiFetch(`/accountability/${id}`, { method: "DELETE" });
      records = records.filter(x => x.id !== id);
      renderSummary();
      renderTable();
      showToast("Record deleted.");
    } catch (err) {
      showToast("Delete failed: " + err.message, true);
    }
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
    const t    = document.getElementById("toast");
    const icon = document.createElement("i");
    icon.className = "bx " + (isError ? "bx-error-circle" : "bx-check-circle");
    t.innerHTML = "";
    t.appendChild(icon);
    t.appendChild(document.createTextNode(" " + msg));
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
    currentPage  = 1;
    renderTable();
  });

  document.getElementById("btn-save-record").addEventListener("click", saveRecord);

  /* ============================
     INIT
  ============================ */
  Promise.all([loadRecords(), loadDropdownData()]);

})();
