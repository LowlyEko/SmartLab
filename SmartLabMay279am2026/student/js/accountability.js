(function () {
  "use strict";

  /* ============================
     API CONFIG
  ============================ */
  const API_BASE = "http://localhost:5000/api";

  function getAuthHeaders() {
    // Students store their token under "token"; fall back to admin key just in case
    const token = localStorage.getItem("token") || localStorage.getItem("smartlab_admin_token") || "";
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
      profEmail:        r.prof_email   || '',
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
      case "pending":  return "Pending";
      default:         return "Pending";
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
      // Students use /accountability/mine — only their own records
      const data = await apiFetch("/accountability/mine");
      records = (data.data || []).map(mapRecord);
      renderSummary();
      renderTable();
    } catch (err) {
      showToast("Failed to load records: " + err.message, true);
    } finally {
      showLoading(false);
    }
    // Load student's own reservations for the dropdown (non-blocking)
    try {
      const resData = await apiFetch("/reservations");
      reservations = resData.data || resData || [];
      populateReservationDropdown();
    } catch (err) {
      // silently fail — dropdown just stays empty
    }
    // Materials Broken items are now scoped to the selected reservation —
    // no need to fetch all inventory up front.
  }

  // No dropdowns need populating on the student report form.

  /* Custom searchable dropdown for Materials Broken */
  (function initMatDropdown() {
    let allItems = [];
    let selectedValue = '';

    function highlight(text, query) {
      if (!query) return document.createTextNode(text);
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return document.createTextNode(text);
      const mark = document.createElement('mark');
      mark.textContent = text.slice(idx, idx + query.length);
      const frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode(text.slice(0, idx)));
      frag.appendChild(mark);
      frag.appendChild(document.createTextNode(text.slice(idx + query.length)));
      return frag;
    }

    function renderList(query) {
      const list  = document.getElementById('mat-list');
      const noRes = document.getElementById('mat-no-results');
      if (!list || !noRes) return;
      list.innerHTML = '';
      const filtered = allItems.filter(n => !query || n.toLowerCase().includes(query.toLowerCase()));
      noRes.style.display = filtered.length === 0 ? 'block' : 'none';
      filtered.forEach(name => {
        const li = document.createElement('li');
        li.appendChild(highlight(name, query));
        if (name === selectedValue) li.classList.add('mat-selected');
        li.addEventListener('mousedown', e => { e.preventDefault(); selectItem(name); });
        list.appendChild(li);
      });
    }

    function selectItem(name) {
      selectedValue = name;
      const hidden  = document.getElementById('form-materials-broken');
      const display = document.getElementById('mat-selected-text');
      if (hidden)  hidden.value = name;
      if (display) {
        display.textContent = name || 'Select or search a material...';
        display.classList.toggle('has-value', !!name);
      }
      closePanel();
    }

    function openPanel() {
      const wrap = document.getElementById('mat-dropdown-wrap');
      const inp  = document.getElementById('mat-search-input');
      if (!wrap) return;
      wrap.classList.add('open');
      if (inp) { inp.value = ''; inp.focus(); }
      renderList('');
    }

    function closePanel() {
      const wrap = document.getElementById('mat-dropdown-wrap');
      if (wrap) wrap.classList.remove('open');
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('mat-dropdown-trigger')?.addEventListener('click', () => {
        const wrap = document.getElementById('mat-dropdown-wrap');
        if (wrap?.classList.contains('open')) closePanel(); else openPanel();
      });
      document.getElementById('mat-dropdown-trigger')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); }
      });
      document.getElementById('mat-search-input')?.addEventListener('input', e => {
        renderList(e.target.value.trim());
      });
      document.addEventListener('mousedown', e => {
        const wrap = document.getElementById('mat-dropdown-wrap');
        if (wrap && !wrap.contains(e.target)) closePanel();
      });
    });

    window._matDropdown = {
      setItems(names) {
        allItems = names;
        renderList(document.getElementById('mat-search-input')?.value || '');
      },
      getValue() { return selectedValue; },
      setValue(name) { selectItem(name); },
      setPlaceholder(text) {
        const display = document.getElementById('mat-selected-text');
        if (display && !selectedValue) {
          display.textContent = text || 'Select or search a material…';
        }
      }
    };
  })();

  function populateInventoryDatalist() {
    // Items are now scoped to the selected reservation — not all inventory.
    // This is intentionally a no-op; call updateMatDropdownForReservation() instead.
  }

  /**
   * Extracts the item names from a reservation object (all 5 item types)
   * and feeds them into the Materials Broken dropdown.
   * If reservationId is falsy, clears the dropdown and resets the field.
   */
  function updateMatDropdownForReservation(reservationId) {
    // Clear current selection whenever the reservation changes
    if (window._matDropdown) window._matDropdown.setValue('');

    if (!reservationId) {
      window._matDropdown?.setItems([]);
      window._matDropdown?.setPlaceholder('Select a reservation first…');
      return;
    }

    const res = reservations.find(r => String(r.reservation_id) === String(reservationId));
    if (!res) {
      window._matDropdown?.setItems([]);
      window._matDropdown?.setPlaceholder('No items found for this reservation');
      return;
    }

    const names = [];

    (res.reservation_apparatus || []).forEach(a => {
      const n = a.inventory_apparatus?.apparatus_name;
      if (n && !names.includes(n)) names.push(n);
    });
    (res.reservation_equipment || []).forEach(e => {
      const n = e.inventory_equipment?.equipment_name;
      if (n && !names.includes(n)) names.push(n);
    });
    (res.reservation_glassware || []).forEach(g => {
      const n = g.inventory_glassware?.glassware;
      if (n && !names.includes(n)) names.push(n);
    });
    (res.reservation_supplies || []).forEach(s => {
      const n = s.inventory_supplies?.supplies_name;
      if (n && !names.includes(n)) names.push(n);
    });
    (res.chemical_items || []).forEach(c => {
      const n = c.chemical?.chemical_name;
      if (n && !names.includes(n)) names.push(n);
    });

    if (names.length === 0) {
      window._matDropdown?.setItems([]);
      window._matDropdown?.setPlaceholder('No items found for this reservation');
    } else {
      window._matDropdown?.setItems(names);
      window._matDropdown?.setPlaceholder('Select or search a material…');
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
    sel.innerHTML = '<option value="">— Select a Reservation —</option>';
    reservations.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.reservation_id;
      const date  = r.date_borrowed ? new Date(r.date_borrowed).toLocaleDateString() : "";
      const title = r.subject || "Untitled";
      opt.textContent = `RES-${String(r.reservation_id).padStart(3, "0")} — ${title}${date ? " (" + date + ")" : ""}`;
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
        const stageIcons = {
          none:      'bx-minus-circle',
          student:   'bx-user',
          professor: 'bx-chalkboard',
          dean:      'bx-building',
          resolved:  'bx-check-double',
        };
        const stageBadge = document.createElement("span");
        stageBadge.className = `stage-badge stage-${r.emailStage}`;
        stageBadge.innerHTML = `<i class='bx ${stageIcons[r.emailStage] || "bx-minus-circle"}'></i>${r.stageLabel}`;
        row.querySelector(".col-email-stage").appendChild(stageBadge);

        // Persons cell (primary member_name + accountability_members rows)
        const personsCell = row.querySelector(".col-persons");
        personsCell.appendChild(renderPersonsCell(r.persons));

        // Action buttons
        const viewBtn    = row.querySelector(".action-btn.view");
        const editBtn    = row.querySelector(".action-btn.edit");
        const resolveBtn = row.querySelector(".action-btn.resolve");
        const deleteBtn  = row.querySelector(".action-btn.delete");

        viewBtn.addEventListener("click",   () => window.viewRecord(r.id));
        editBtn.remove();
        deleteBtn.remove();

        resolveBtn.remove();

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
    document.getElementById("modal-title-text").textContent = "Report Incident";
    document.getElementById("acc-form").reset();
    if (window._matDropdown) window._matDropdown.setValue("");
    updateMatDropdownForReservation(null);   // clear — no reservation chosen yet
    buildPersonsField([""]);
    openModal("acc-modal");
  };

  window.openEditModal = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    document.getElementById("modal-title-text").textContent    = "Edit Incident Report";
    document.getElementById("form-reservation-id").value       = r.reservationId || "";
    document.getElementById("form-date-borrowed").value        = r.dateBorrowed;
    document.getElementById("form-time-start").value           = r.time    || "";
    document.getElementById("form-time-end").value             = r.timeEnd || "";
    document.getElementById("form-teacher").value              = r.teacher;
    document.getElementById("form-subject").value              = r.subject;
    document.getElementById("form-prof-email").value           = r.profEmail || "";
    document.getElementById("form-program-section").value      = r.programSection;
    updateMatDropdownForReservation(r.reservationId);   // load items for this reservation
    if (window._matDropdown) window._matDropdown.setValue(r.materialsBroken || "");
    buildPersonsField(r.persons && r.persons.length > 0 ? r.persons : [""]);
    openModal("acc-modal");
  };

  async function saveRecord() {
    const dateBorrowed    = document.getElementById("form-date-borrowed").value;
    const persons         = getPersonsFromForm();
    const materialsBroken = document.getElementById("form-materials-broken").value.trim();
    const profName        = document.getElementById("form-teacher").value.trim();
    const subject         = document.getElementById("form-subject").value.trim();
    const profEmail       = document.getElementById("form-prof-email").value.trim();
    const time            = document.getElementById("form-time-start").value;
    const timeEnd         = document.getElementById("form-time-end").value;
    const programSection  = document.getElementById("form-program-section").value.trim();

    const reservationId   = document.getElementById("form-reservation-id").value || null;

    // Required field validation (matches backend requirements)
    if (!dateBorrowed)        { showToast("Date Borrowed is required.", true); return; }
    if (persons.length === 0) { showToast("At least one name is required.", true); return; }
    if (!materialsBroken)     { showToast("Materials Broken is required.", true); return; }
    if (!profName)            { showToast("Teacher / Professor is required.", true); return; }
    if (!subject)             { showToast("Subject is required.", true); return; }
    if (!profEmail)           { showToast("Professor Email is required.", true); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profEmail)) { showToast("Please enter a valid professor email address.", true); return; }
    if (!programSection)      { showToast("Program/Course/Section is required.", true); return; }

    function isValidYear(dateStr) {
      if (!dateStr) return true;
      const y = new Date(dateStr).getFullYear();
      return y >= 2000 && y <= 2099;
    }
    if (!isValidYear(dateBorrowed)) { showToast("Date Borrowed has an invalid year.", true); return; }

    // member_name = first person (required by DB); rest go into members[]
    const [primaryPerson, ...additionalPersons] = persons;

    // Students don't send student_id, remarks, date_replaced, or received_by —
    // the backend sets student_id from the JWT token, and remarks defaults to "Pending"
    const payload = {
      reservation_id:         reservationId ? Number(reservationId) : undefined,
      date_borrowed:          dateBorrowed,
      member_name:            primaryPerson,
      materials_broken:       materialsBroken,
      prof_name:              profName,
      prof_email:             profEmail,
      subject,
      time_start:             time    || undefined,
      time_end:               timeEnd || undefined,
      program_course_section: programSection,
      remarks:                "Pending",
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
    btn.textContent = on ? "Submitting…" : "Submit Report";
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

    // Animate sign-off progress tracker
    const stageOrder = ['student', 'professor', 'dean', 'resolved'];
    const currentIdx = stageOrder.indexOf(r.emailStage);
    const steps = resFrag.querySelectorAll(".signoff-step");
    const lines = resFrag.querySelectorAll(".signoff-line");
    steps.forEach((step, i) => {
      if (i < currentIdx)      step.classList.add("done");
      else if (i === currentIdx) step.classList.add("active");
    });
    lines.forEach((line, i) => {
      if (i < currentIdx) line.classList.add("done");
    });
    resFrag.querySelector(".signoff-status-msg").textContent = r.stageLabel;

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
      // FIX: endpoint is PATCH /accountability/:id/resolve (not PUT)
      const data = await apiFetch(`/accountability/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: "Resolved", received_by: "" })
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

  // When a reservation is chosen in the Report Incident form,
  // refresh the Materials Broken dropdown to only show items from that reservation.
  document.getElementById("form-reservation-id")?.addEventListener("change", e => {
    updateMatDropdownForReservation(e.target.value || null);
  });

  /* ============================
     INIT
  ============================ */
  loadRecords();

})();