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
  let students       = [];    // for responsible student dropdown
  let reservations   = [];    // for reservation_id dropdown
  let inventoryItems = [];    // for item / equipment dropdown
  let currentPage  = 1;
  const perPage    = 6;
  let filterStatus = "all";
  let searchQuery  = "";
  let editingId    = null;

  /* ============================
     API HELPERS
  ============================ */

  /**
   * Maps a raw API record from the new DB schema into a flat display object.
   *
   * New DB fields (accountability table):
   *   accountability_id, student_id (varchar FK), student_name, reservation_id,
   *   date_borrowed (DATE), member_name, materials_broken, prof_name, subject,
   *   time_start (TIME), time_end (TIME), program_course_section,
   *   deadline (DATE), remarks (varchar), date_replaced (DATE),
   *   received_by (int FK → admin.admin_id), created_at, updated_at
   *
   * Backend FULL_INCLUDE relations:
   *   student    → { user_id, student_id, first_name, last_name, section, college }
   *   reservation → { reservation_id, subject, date_borrowed, group_number }
   *   receiver   → { admin_id, first_name, last_name }
   *   members    → [{ id, member_name, member_order }]
   */
  function mapRecord(r) {
    // FIX: new DB uses 'student' relation (not 'responsibleStudent')
    const studentRel  = r.student || {};
    const studentName = studentRel.first_name
      ? `${studentRel.first_name} ${studentRel.last_name}`
      : (r.student_name || `Student ${r.student_id || "—"}`);
    const studentNumber = studentRel.student_id || r.student_id || null;

    // FIX: new DB uses 'reservation' relation — subject replaces activity_title,
    //      date_borrowed replaces date_needed, no reservingStudent sub-relation
    const resLabel = r.reservation
      ? `RES-${String(r.reservation.reservation_id).padStart(3, "0")}${r.reservation.subject ? " — " + r.reservation.subject : ""}`
      : (r.reservation_id ? `RES-${String(r.reservation_id).padStart(3, "0")}` : "—");

    // FIX: new DB has no item FK on accountability — materials_broken is a plain varchar
    const itemName = r.materials_broken || "—";

    // FIX: new DB uses 'receiver' relation for received_by (admin), not a raw string
    const receivedByName = r.receiver
      ? `${r.receiver.first_name} ${r.receiver.last_name}`
      : (r.received_by ? `Admin #${r.received_by}` : "");

    // FIX: new DB stores members in accountability_members table via 'members' relation
    //      Each member has { id, member_name, member_order }
    //      Primary responsible is r.member_name (direct field on accountability)
    const allPersons = [];
    if (r.member_name) allPersons.push(r.member_name);
    (r.members || []).forEach(m => {
      if (m.member_name && m.member_name !== r.member_name) {
        allPersons.push(m.member_name);
      }
    });

    // FIX: new DB uses 'remarks' as a plain varchar status (no resolution_status enum)
    //      and 'date_borrowed' DATE (not 'date_time_broken' DATETIME)
    return {
      id:               r.accountability_id,
      reservationId:    r.reservation_id    || null,
      reservationLabel: resLabel,
      // No item FK in new DB — materials_broken is the item description
      itemId:           null,
      itemName,
      studentId:        r.student_id        || null,
      studentName,
      studentNumber,
      // FIX: date field is now 'date_borrowed' (DATE), not 'date_time_broken' (DATETIME)
      dateBorrowed:     r.date_borrowed
                          ? (typeof r.date_borrowed === "string"
                              ? r.date_borrowed.split("T")[0]
                              : new Date(r.date_borrowed).toISOString().split("T")[0])
                          : "",
      // FIX: time_start / time_end come back as TIME strings e.g. "08:30:00"
      time:             r.time_start  ? extractTime(r.time_start)  : "",
      timeEnd:          r.time_end    ? extractTime(r.time_end)    : "",
      persons:          allPersons,
      materialsBroken:  r.materials_broken || "",
      // FIX: field is now 'prof_name' (not 'teacher')
      teacher:          r.prof_name   || "",
      subject:          r.subject     || "",
      // FIX: field is now 'program_course_section' (not 'program_section')
      programSection:   r.program_course_section || "",
      deadline:         r.deadline
                          ? (typeof r.deadline === "string"
                              ? r.deadline.split("T")[0]
                              : new Date(r.deadline).toISOString().split("T")[0])
                          : "",
      // FIX: new DB uses 'remarks' as the status field (plain varchar, not resolution_status enum)
      remarks:          mapStatus(r.remarks),
      dateReplaced:     r.date_replaced
                          ? (typeof r.date_replaced === "string"
                              ? r.date_replaced.split("T")[0]
                              : new Date(r.date_replaced).toISOString().split("T")[0])
                          : "",
      // FIX: received_by is now resolved via 'receiver' admin relation
      receivedBy:       receivedByName,
      emailStage:       r.email_stage  || 'none',
      stageLabel:       r.stage_label  || 'Not yet notified',
      _raw: r
    };
  }

  /**
   * Safely extract HH:mm from a TIME string that may come back as
   * "08:30:00", "1970-01-01T08:30:00.000Z", or a Date object.
   */
  function extractTime(val) {
    if (!val) return "";
    if (typeof val === "string") {
      // "HH:mm:ss" — just take first 5 chars
      if (/^\d{2}:\d{2}/.test(val)) return val.slice(0, 5);
      // ISO string from MySQL DATETIME padding
      const m = val.match(/T(\d{2}:\d{2})/);
      if (m) return m[1];
    }
    if (val instanceof Date) {
      return val.toTimeString().slice(0, 5);
    }
    return String(val).slice(0, 5);
  }

  /**
   * Maps the new DB 'remarks' varchar → internal UI status key.
   * New DB stores plain strings; we normalise case.
   */
  function mapStatus(status) {
    if (!status) return "active";
    switch (status.toLowerCase()) {
      case "resolved": return "resolved";
      case "overdue":  return "overdue";
      case "pending":  return "pending";
      default:         return "active";
    }
  }

  /**
   * Maps UI status key → new DB 'remarks' varchar value.
   */
  function mapRemarks(remarks) {
    switch (remarks) {
      case "resolved": return "Resolved";
      case "overdue":  return "Overdue";
      case "active":   return "Active";
      case "pending":  return "Pending";
      default:         return "Active";
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
        apiFetch("/inventory"),
      ]);

      students       = studentsData.data     || [];
      reservations   = reservationsData.data || [];
      inventoryItems = inventoryData.data    || [];

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
      // FIX: new student table uses varchar student_id as the FK, not integer user_id
      opt.value = s.student_id;
      opt.textContent = `${s.last_name}, ${s.first_name}${s.student_id ? " (" + s.student_id + ")" : ""}`;
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
      // FIX: new DB uses date_borrowed (not date_needed) and subject (not activity_title)
      //      student relation comes back as r.student (not r.reservingStudent)
      const date  = r.date_borrowed ? new Date(r.date_borrowed).toLocaleDateString() : "";
      const title = r.subject || "Untitled";
      const who   = r.student
        ? ` · ${r.student.first_name} ${r.student.last_name}`
        : "";
      opt.textContent = `RES-${String(r.reservation_id).padStart(3, "0")} — ${title} (${date})${who}`;
      sel.appendChild(opt);
    });
  }

  function populateItemDropdown() {
    const sel = document.getElementById("form-item-id");
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Item —</option>';

    // Group items by category for readability
    const groups = {};
    inventoryItems.forEach(item => {
      const cat = item.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    Object.keys(groups).sort().forEach(cat => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = cat;
      groups[cat].forEach(item => {
        const opt = document.createElement("option");
        // Store item_type in the value so onItemSelected can read it
        opt.value = `${item.item_type}::${item.id}`;
        opt.dataset.name     = item.name;
        opt.dataset.itemType = item.item_type;
        const detail = item.volume_size || item.unit || "";
        opt.textContent = item.name + (detail ? ` (${detail})` : "");
        optgroup.appendChild(opt);
      });
      sel.appendChild(optgroup);
    });
  }

  window.onItemSelected = function () {
    const sel = document.getElementById("form-item-id");
    if (!sel) return;
    const selectedOpt = sel.options[sel.selectedIndex];
    const materialsFld = document.getElementById("form-materials-broken");
    if (!materialsFld) return;
    // Auto-fill Materials Broken with the item name; user can still edit it
    if (selectedOpt && selectedOpt.dataset.name) {
      materialsFld.value = selectedOpt.dataset.name;
    } else {
      materialsFld.value = "";
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
    const hour   = parseInt(h);
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
        // FIX: column maps to prof_name (stored as r.teacher after mapRecord)
        row.querySelector(".col-teacher").textContent          = r.teacher || "—";
        row.querySelector(".col-subject").textContent          = r.subject || "—";
        row.querySelector(".col-time").textContent             = formatTimeRange(r.time, r.timeEnd);
        // FIX: column maps to program_course_section (stored as r.programSection)
        row.querySelector(".col-program-section").textContent  = r.programSection || "—";
        row.querySelector(".col-deadline").textContent         = formatDate(r.deadline);
        row.querySelector(".col-date-replaced").textContent    = formatDate(r.dateReplaced);
        // FIX: receivedBy is now the resolved admin name from 'receiver' relation
        row.querySelector(".col-received-by").textContent      = r.receivedBy || "—";

        // Student name column (FK-resolved via 'student' relation)
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

        // FIX: no item FK — materials_broken doubles as item name display
        const itemCell = row.querySelector(".col-item-name");
        if (itemCell) itemCell.textContent = r.itemName;

        // Reservation column (FK-resolved)
        const resCell = row.querySelector(".col-reservation-id");
        if (resCell) resCell.textContent = r.reservationLabel;

        // Remarks badge
        const badge = document.createElement("span");
        badge.className   = "status-badge " + r.remarks;
        badge.textContent = remarksLabel;
        row.querySelector(".col-remarks").appendChild(badge);

        // Sign-off stage badge
        const stageColors = {
          none:      { bg: '#f1f5f9', color: '#64748b' },
          student:   { bg: '#fef9c3', color: '#854d0e' },
          professor: { bg: '#dbeafe', color: '#1e40af' },
          dean:      { bg: '#ede9fe', color: '#5b21b6' },
          resolved:  { bg: '#dcfce7', color: '#166534' },
        };
        const stageStyle = stageColors[r.emailStage] || stageColors.none;
        const progressCell = row.querySelector(".col-progress");
        if (progressCell) {
          const stageBadge = document.createElement("span");
          stageBadge.style.cssText = `display:inline-block;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:${stageStyle.bg};color:${stageStyle.color};white-space:nowrap;`;
          stageBadge.textContent = r.stageLabel;
          progressCell.appendChild(stageBadge);
        }

        // Persons cell (primary member_name + accountability_members rows)
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
    cur.className   = "page-btn active";
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
    document.getElementById("form-remarks").value = "active";
    buildPersonsField([""]);
    openModal("acc-modal");
  };

  window.openEditModal = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    document.getElementById("modal-title-text").textContent = "Edit Record";

    // FK dropdowns
    const resSel = document.getElementById("form-reservation-id");
    if (resSel) resSel.value = r.reservationId || "";

    // FIX: student dropdown value is now varchar student_id (not integer user_id)
    const studSel = document.getElementById("form-responsible-student");
    if (studSel) studSel.value = r.studentId || "";

    // Clear item dropdown selection on reset (re-populated from inventory)
    const itemSel = document.getElementById("form-item-id");
    if (itemSel) itemSel.value = "";

    // Regular fields
    document.getElementById("form-date-borrowed").value     = r.dateBorrowed;
    document.getElementById("form-materials-broken").value  = r.materialsBroken;
    // FIX: field label is prof_name in new DB (stored as r.teacher after mapRecord)
    document.getElementById("form-teacher").value           = r.teacher;
    document.getElementById("form-subject").value           = r.subject;
    document.getElementById("form-time-start").value        = r.time    || "";
    document.getElementById("form-time-end").value          = r.timeEnd || "";
    // FIX: field is program_course_section in new DB (stored as r.programSection)
    document.getElementById("form-program-section").value   = r.programSection;
    document.getElementById("form-deadline").value          = r.deadline;
    document.getElementById("form-remarks").value           = r.remarks;
    document.getElementById("form-date-replaced").value     = r.dateReplaced || "";
    document.getElementById("form-received-by").value       = r._raw?.received_by || "";
    buildPersonsField(r.persons && r.persons.length > 0 ? r.persons : [""]);
    openModal("acc-modal");
  };

  async function saveRecord() {
    const reservationId = document.getElementById("form-reservation-id")?.value;
    // FIX: student dropdown now stores varchar student_id
    const studentId     = document.getElementById("form-responsible-student")?.value;
    const dateBorrowed  = document.getElementById("form-date-borrowed").value;
    const persons       = getPersonsFromForm();
    const materialsBroken = document.getElementById("form-materials-broken").value.trim();
    // FIX: form field still labelled "teacher" in HTML but maps to prof_name in new DB
    const profName      = document.getElementById("form-teacher").value.trim();
    const subject       = document.getElementById("form-subject").value.trim();
    const time          = document.getElementById("form-time-start").value;
    const timeEnd       = document.getElementById("form-time-end").value;
    // FIX: form field maps to program_course_section in new DB
    const programSection = document.getElementById("form-program-section").value.trim();
    const deadline      = document.getElementById("form-deadline").value;
    const remarks       = document.getElementById("form-remarks").value;
    const dateReplaced  = document.getElementById("form-date-replaced").value;
    const receivedBy    = document.getElementById("form-received-by").value;

    if (!editingId) {
      if (!studentId) {
        showToast("Please select a Responsible Student.", true);
        return;
      }
    }

    if (!materialsBroken || !dateBorrowed) {
      showToast("Please fill in required fields.", true);
      return;
    }

    // Validate date years are sensible before hitting the server
    function isValidYear(dateStr) {
      if (!dateStr) return true; // optional fields are fine when empty
      const y = new Date(dateStr).getFullYear();
      return y >= 2000 && y <= 2099;
    }
    if (!isValidYear(dateBorrowed)) {
      showToast("Date Borrowed has an invalid year. Please enter a real date.", true);
      return;
    }
    if (!isValidYear(deadline)) {
      showToast("Deadline has an invalid year. Please enter a real date.", true);
      return;
    }
    if (!isValidYear(dateReplaced)) {
      showToast("Date Replaced has an invalid year. Please enter a real date.", true);
      return;
    }

    // FIX: payload uses new DB field names
    //   - student_id (varchar), not responsible_student (int)
    //   - prof_name (not teacher)
    //   - program_course_section (not program_section)
    //   - date_borrowed DATE (not date_time_broken DATETIME)
    //   - remarks varchar (not resolution_status enum)
    //   - member_name = first person; additional persons → members array
    //   - no item_id (no item FK in new accountability table)
    const [primaryPerson, ...additionalPersons] = persons;

    const payload = {
      student_id:             studentId             || undefined,
      reservation_id:         reservationId         || undefined,
      date_borrowed:          dateBorrowed,
      member_name:            primaryPerson         || materialsBroken,
      materials_broken:       materialsBroken,
      prof_name:              profName,
      subject,
      time_start:             time     || undefined,
      time_end:               timeEnd  || undefined,
      program_course_section: programSection,
      deadline:               deadline  || null,
      remarks:                mapRemarks(remarks),
      date_replaced:          dateReplaced || null,
      // received_by expects an integer admin_id — only pass it if the field contains a valid number
      received_by:            (receivedBy && /^\d+$/.test(receivedBy)) ? parseInt(receivedBy) : null,
      // Additional members beyond the first person
      members: additionalPersons.map((name, i) => ({ name, order: i + 1 }))
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
    btn.disabled    = on;
    btn.textContent = on ? "Saving…" : "Save Record";
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
        <div><span style="color:#718096;">Materials Broken:</span> <strong>${r.itemName}</strong></div>
      </div>
    `;
    detailContent.appendChild(infoDiv);

    // Incident details
    const incidentFrag = cloneTemplate("tmpl-detail-incident");
    incidentFrag.querySelector(".col-date-borrowed").textContent    = formatDate(r.dateBorrowed);
    incidentFrag.querySelector(".col-time").textContent             = formatTimeRange(r.time, r.timeEnd);
    incidentFrag.querySelector(".col-materials-broken").textContent = r.materialsBroken;
    // FIX: maps to prof_name (displayed in the "teacher" slot in the detail template)
    incidentFrag.querySelector(".col-teacher").textContent          = r.teacher || "—";
    incidentFrag.querySelector(".col-subject").textContent          = r.subject || "—";
    // FIX: maps to program_course_section
    incidentFrag.querySelector(".col-program-section").textContent  = r.programSection || "—";
    detailContent.appendChild(incidentFrag);

    // Resolution timeline
    const resFrag = cloneTemplate("tmpl-detail-resolution");
    resFrag.querySelector("li.tl-deadline .time-label").textContent = formatDate(r.deadline);

    const timeline = resFrag.querySelector(".timeline");

    if (r.dateReplaced) {
      const itemFrag = cloneTemplate("tmpl-timeline-item");
      itemFrag.querySelector(".tl-label").textContent   = "Date Replaced";
      itemFrag.querySelector(".time-label").textContent = formatDate(r.dateReplaced);
      timeline.appendChild(itemFrag);
    }

    if (r.receivedBy) {
      const itemFrag = cloneTemplate("tmpl-timeline-item");
      itemFrag.querySelector(".tl-label").textContent   = "Received By";
      // FIX: receivedBy is now the resolved admin name string
      itemFrag.querySelector(".time-label").textContent = r.receivedBy;
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
      // PATCH /accountability/:id/resolve — omit received_by so the backend uses the logged-in admin's own admin_id
      const data = await apiFetch(`/accountability/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: "Resolved" })
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