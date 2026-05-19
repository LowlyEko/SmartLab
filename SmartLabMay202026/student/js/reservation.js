import { CONFIG, getHeaders } from './config.js';
import { guardPage } from './guard.js';

let reservations = [];
let equipmentItems = [];  // from /api/inventory?type=equipment
let chemicalItems  = [];  // from /api/inventory?type=chemical
let _sortCol = 'reservation_id';
let _sortDir = 'desc'; // newest first by default
let _filterStatus = '';
let _searchQuery = '';

// Track edit mode
let _editingReservationId = null;

/**
 * Initialization
 */
document.addEventListener("DOMContentLoaded", async () => {
  guardPage();
  loadInventoryData();
  loadReservations();

  // ── Dark mode ──
  const toggleSwitch = document.querySelector('.toggle-switch');
  const modeText     = document.querySelector('.mode-text');
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    if (modeText) modeText.textContent = 'Light Mode';
  }
  if (toggleSwitch) {
    toggleSwitch.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      if (modeText) modeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

  const form = document.getElementById("new-reservation-form");
  if (form) form.addEventListener("submit", submitReservation);

  if (new URLSearchParams(window.location.search).get("action") === "new") {
    window.openNewReservationModal();
    history.replaceState(null, '', 'reservations.html');
  }
});

// ── Student ID field visibility ───────────────────────────────────────────────
function syncStudentIdField() {
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const section = document.getElementById('student-id-section');
  if (!section) return;
  section.style.display = (!user.student_id) ? 'block' : 'none';
}

/**
 * Fetch all inventory — separate equipment & chemical tables.
 */
async function loadInventoryData() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      equipmentItems = data.data.filter(i => i.type === 'equipment');
      chemicalItems  = data.data.filter(i => i.type === 'chemical');
      renderEquipmentChecklist();
    }
  } catch (err) {
    console.error("Inventory Load Error:", err);
  }
}

/**
 * Equipment checklist — static list.
 */
function renderEquipmentChecklist() {
  const container = document.getElementById("equipment-checklist");
  if (!container) return;

  const staticLogsheet = [
    "Autoclave","Analytical Balance","Oven","Incubator","Refrigerator",
    "Centrifuge","Fume Hood","Laminar Flow","Circulating Water Vacuum Pump",
    "Rotary Evaporator","Electric Waterbath"
  ];

  container.innerHTML = staticLogsheet.map(name => `
      <label class="checklist-item">
        <input type="checkbox" class="equip-chk" value="${name}">
        <span>${name}</span>
      </label>`
  ).join('');
}

/**
 * Materials row — targets chemicals from the chemicals table.
 */
window.addItemRow = function() {
  const container = document.getElementById("materials-container");
  const div       = document.createElement("div");
  div.className   = "dynamic-row";

  div.innerHTML = `
    <div class="mat-combobox" style="flex:2; position:relative;">
      <input type="text" class="mat-search-input" placeholder="Search material / glassware..."
             autocomplete="off" style="width:100%; box-sizing:border-box;">
      <ul class="mat-dropdown-list" style="display:none; position:absolute; z-index:999; background:#fff; border:1px solid #ddd; border-radius:6px; max-height:180px; overflow-y:auto; width:100%; margin:0; padding:0; list-style:none;"></ul>
      <input type="hidden" class="mat-id-input">
      <input type="hidden" class="mat-name-hidden">
      <input type="hidden" class="mat-type-hidden">
    </div>
    <input type="text" class="mat-volume-input" placeholder="Volume/Size (e.g. 250mL)" style="flex:1;">
    <input type="number" class="mat-qty-input" value="1" min="1" placeholder="Amount" style="flex:0.7;" required>
    <button type="button" class="btn-remove" onclick="this.closest('.dynamic-row').remove()">×</button>
  `;
  container.appendChild(div);

  const searchInput  = div.querySelector(".mat-search-input");
  const dropdownList = div.querySelector(".mat-dropdown-list");
  const hiddenId     = div.querySelector(".mat-id-input");
  const hiddenName   = div.querySelector(".mat-name-hidden");
  const hiddenType   = div.querySelector(".mat-type-hidden");

  const allSearchable = [
    ...chemicalItems.map(i => ({ ...i, _kind: 'chemical' })),
    ...equipmentItems.map(i => ({ ...i, _kind: i.item_type || 'equipment' })),
  ];

  function renderList(query) {
    const q        = query.toLowerCase().trim();
    const filtered = q
      ? allSearchable.filter(i => i.name.toLowerCase().includes(q))
      : allSearchable;
    dropdownList.innerHTML = filtered.length
      ? filtered.map(item =>
          `<li data-id="${item.id}" data-name="${item.name}" data-type="${item._kind}"
               style="padding:8px 12px; cursor:pointer; font-size:13px;">
            ${item.name}
            <span style="color:#aaa; font-size:11px;"> [${item._kind}]</span>
          </li>`
        ).join('')
      : `<li style="padding:8px 12px; color:#999; font-size:13px; pointer-events:none;">No matches found</li>`;
    dropdownList.style.display = "block";
  }

  searchInput.addEventListener("focus", () => renderList(searchInput.value));
  searchInput.addEventListener("input", () => {
    hiddenId.value   = "";
    hiddenName.value = "";
    renderList(searchInput.value);
  });

  dropdownList.addEventListener("mousedown", e => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    searchInput.value = li.dataset.name;
    hiddenId.value    = li.dataset.id;
    hiddenName.value  = li.dataset.name;
    hiddenType.value  = li.dataset.type;
    dropdownList.style.display = "none";
  });

  document.addEventListener("click", e => {
    if (!div.contains(e.target)) dropdownList.style.display = "none";
  }, { capture: true });
};

/**
 * Member row — plain name strings.
 */
window.addMemberRow = function() {
  const container = document.getElementById("members-container");
  const div       = document.createElement("div");
  div.className   = "dynamic-row";
  div.innerHTML   = `
    <input type="text" class="member-name-input" placeholder="Enter member name" style="flex:1;" required>
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(div);
};

/**
 * Fetch and Render Reservation Table
 */
async function loadReservations() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/reservations`, { headers: getHeaders() });
    const data = await res.json();
    reservations = data.success ? data.data : [];
    renderTable();
  } catch (err) {
    console.error("Table Load Error:", err);
  }
}

function formatTime(timeVal) {
  if (!timeVal) return '--';
  if (timeVal.includes('T')) {
    return new Date(timeVal).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const [h, m] = timeVal.split(':');
  const hour = parseInt(h);
  return ((hour % 12) || 12) + ':' + m + (hour >= 12 ? ' PM' : ' AM');
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CLASS = {
  'Pending':  'to_review',
  'Approved': 'allowed',
  'Rejected': 'rejected',
  'TO_REVIEW':   'to_review',
  'ALLOWED':     'allowed',
  'REJECTED':    'rejected',
  'CONDITIONAL': 'conditional',
};

/**
 * Render the reservation table.
 * Columns: Reservation ID | Subject | Date Reserved | Date Borrowed | Time | Status | Actions
 * Actions: View (info) + Edit (pencil, only for Pending)
 */
function renderTable(filtered = reservations) {
  const tbody = document.getElementById("reservations-tbody");
  const meta  = document.getElementById("table-meta");
  if (!tbody) return;

  // Apply search
  const q = _searchQuery.toLowerCase().trim();
  if (q) {
    filtered = filtered.filter(r =>
      (r.subject || '').toLowerCase().includes(q) ||
      `res-${String(r.reservation_id).padStart(3,'0')}`.includes(q) ||
      String(r.reservation_id).includes(q)
    );
  }

  // Apply status filter
  if (_filterStatus) {
    filtered = filtered.filter(r =>
      (r.status || '').toLowerCase() === _filterStatus.toLowerCase()
    );
  }

  // Apply sort
  filtered = [...filtered].sort((a, b) => {
    let valA, valB;
    if (_sortCol === 'reservation_id') {
      valA = a.reservation_id;
      valB = b.reservation_id;
    } else if (_sortCol === 'date_borrowed') {
      valA = new Date(a.date_borrowed || 0).getTime();
      valB = new Date(b.date_borrowed || 0).getTime();
    }
    return _sortDir === 'asc' ? valA - valB : valB - valA;
  });

  tbody.innerHTML = "";
  meta.textContent = `Total Records: ${filtered.length}`;

  filtered.forEach(r => {
    const cls         = STATUS_CLASS[r.status] || r.status.toLowerCase();
    const statusLabel = r.status;
    const isPending   = ['Pending', 'TO_REVIEW', 'pending', 'to_review'].includes(r.status);
    const timeDisplay = buildTimeDisplay(r);

    tbody.innerHTML += `
      <tr>
        <td><strong>RES-${String(r.reservation_id).padStart(3,'0')}</strong></td>
        <td>${r.subject || '—'}</td>
        <td>${formatDate(r.date_reserved)}</td>
        <td>${formatDate(r.date_borrowed)}</td>
        <td>${timeDisplay}</td>
        <td><span class="status-badge ${cls}">${statusLabel}</span></td>
        <td style="display:flex; gap:6px; align-items:center;">
          <button class="action-btn" title="View Details" onclick="viewReservation(${r.reservation_id})">
            <i class='bx bx-info-circle'></i>
          </button>
          ${isPending ? `
          <button class="action-btn edit-btn" title="Edit Reservation" onclick="openEditReservationModal(${r.reservation_id})">
            <i class='bx bx-edit'></i>
          </button>` : ''}
        </td>
      </tr>
    `;
  });

  // Update sort icons on headers
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';
    if (th.dataset.col === _sortCol) {
      th.classList.add(_sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      if (icon) icon.textContent = _sortDir === 'asc' ? '↑' : '↓';
    }
  });
}
// Sort toggle
window.sortTable = function(col) {
  if (_sortCol === col) {
    _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _sortCol = col;
    _sortDir = col === 'reservation_id' ? 'desc' : 'asc';
  }
  renderTable();
};

// Status dropdown toggle
window.toggleResDropdown = function(dropId) {
  const menu = document.getElementById(dropId).querySelector('.res-dropdown-menu');
  const btn  = document.getElementById(dropId).querySelector('.res-dropdown-btn');
  const isOpen = menu.classList.contains('open');
  // Close all first
  document.querySelectorAll('.res-dropdown-menu.open').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.res-dropdown-btn.open').forEach(b => b.classList.remove('open'));
  if (!isOpen) { menu.classList.add('open'); btn.classList.add('open'); }
};

// Status selection
window.selectResStatus = function(el, value) {
  _filterStatus = value;
  // Update active state
  document.querySelectorAll('#resStatusMenu .item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  // Update button label
  document.getElementById('resStatusLabel').textContent = el.textContent.trim();
  // Close dropdown
  document.getElementById('resStatusMenu').classList.remove('open');
  document.getElementById('resStatusBtn').classList.remove('open');
  renderTable();
};

// Search
window.applyFilters = function() {
  _searchQuery = document.getElementById('res-search')?.value || '';
  renderTable();
};

// Close dropdowns on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.res-dropdown')) {
    document.querySelectorAll('.res-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.res-dropdown-btn.open').forEach(b => b.classList.remove('open'));
  }
});
/**
 * Build time display string: "HH:MM AM – HH:MM PM" or just the single time.
 */
function buildTimeDisplay(r) {
  const start = r.time_start || r.time_of_activity;
  const end   = r.time_end;
  if (start && end) {
    return `${formatTime(start)} – ${formatTime(end)}`;
  }
  if (start) return formatTime(start);
  return '--';
}

/**
 * Save student ID to the backend and update localStorage.
 */
async function saveStudentId(studentId) {
  const res  = await fetch(`${CONFIG.BASE_URL}/students/me`, {
    method:  'PATCH',
    headers: getHeaders(),
    body:    JSON.stringify({ student_id: studentId, year_level: 1 }),
  });
  const data = await res.json();

  if (data.success) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, student_id: data.data.student_id }));
    return true;
  }

  alert(data.message || 'Could not save Student ID. Please try again.');
  return false;
}

/**
 * Collect form data into a payload object.
 */
function collectFormPayload() {
  // Equipment from checklist
  const equipmentPayload = Array.from(document.querySelectorAll(".equip-chk:checked"))
    .filter(chk => chk.dataset.equipId)
    .map(chk => ({
      equipment_id: parseInt(chk.dataset.equipId),
      quantity:     1,
      remarks:      null,
    }));

  // Chemicals / materials from dynamic rows
  const chemicalsPayload = Array.from(document.querySelectorAll("#materials-container .dynamic-row"))
    .map(row => {
      const combobox = row.querySelector(".mat-combobox");
      if (combobox) {
        const idVal     = row.querySelector(".mat-id-input")?.value;
        const nameVal   = row.querySelector(".mat-name-hidden")?.value || row.querySelector(".mat-search-input")?.value?.trim();
        const typeVal   = row.querySelector(".mat-type-hidden")?.value || 'chemical';
        const volumeVal = row.querySelector(".mat-volume-input")?.value?.trim() || null;
        const qty       = parseInt(row.querySelector(".mat-qty-input")?.value) || 1;
        if (!idVal) return null;
        return {
          item_id:     parseInt(idVal),
          item_type:   typeVal,
          name:        nameVal,
          volume_size: volumeVal,
          quantity:    qty,
        };
      }
      return null;
    })
    .filter(Boolean);

  // Members
  const membersPayload = Array.from(document.querySelectorAll(".member-name-input"))
    .map(i => i.value.trim())
    .filter(Boolean)
    .map(name => ({ name }));

  const subject           = document.getElementById("subject")?.value?.trim();
  const profName          = document.getElementById("prof-name")?.value?.trim() || null;
  const profEmail         = document.getElementById("prof-email")?.value?.trim() || null;
  const dateBorrowed      = document.getElementById("date-needed")?.value;
  const timeStart         = document.getElementById("time-start")?.value;
  const timeEnd           = document.getElementById("time-end")?.value;
  const courseYearSection = document.getElementById("course-year-section")?.value?.trim() || null;
  const groupNumber       = document.getElementById("group-number")?.value || null;
  const type              = document.getElementById("reservation-type")?.value?.trim() || "";
  const notes             = document.getElementById("conditions-note")?.value?.trim() || null;

  return {
    subject,
    prof_name:           profName,
    prof_email:          profEmail,
    date_borrowed:       dateBorrowed,
    time_start:          timeStart,
    time_end:            timeEnd,
    course_year_section: courseYearSection,
    group_number:        groupNumber ? parseInt(groupNumber.toString().replace(/[^0-9]/g, '')) || null : null,
    type,
    notes,
    members:   membersPayload,
    equipment: equipmentPayload,
    chemicals: chemicalsPayload,
  };
}

/**
 * Submit Reservation — create or update (edit) depending on _editingReservationId.
 */
async function submitReservation(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');

  // ── Step 0: Handle Student ID if not yet set (new reservations only) ──────
  if (!_editingReservationId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.student_id) {
      const sidInput = document.getElementById('student-id-input');
      const sidValue = sidInput?.value?.trim();

      if (!sidValue) {
        alert("Please enter your Student ID before submitting.");
        sidInput?.focus();
        sidInput?.classList.add('sid-error');
        return;
      }
      if (!/^[\w\-]+$/.test(sidValue) || sidValue.length > 30) {
        alert("Student ID can only contain letters, numbers, and hyphens (max 30 characters).");
        sidInput?.focus();
        sidInput?.classList.add('sid-error');
        return;
      }

      sidInput?.classList.remove('sid-error');

      btn.disabled = true;
      btn.textContent = 'Saving ID…';
      const saved = await saveStudentId(sidValue);
      if (!saved) {
        btn.disabled = false;
        btn.textContent = 'Submit Request';
        return;
      }

      document.getElementById('student-id-section').style.display = 'none';
      btn.disabled = false;
      btn.textContent = _editingReservationId ? 'Save Changes' : 'Submit Request';
    }
  }

  // ── Step 1: Collect payload ───────────────────────────────────────────────
  const payload = collectFormPayload();

  // ── Step 2: Required field validation ────────────────────────────────────
  if (!payload.subject)        { alert("Please enter a subject."); return; }
  if (!payload.date_borrowed)  { alert("Please select a date."); return; }
  if (!payload.time_start) { alert("Please enter the start time."); return; }
  if (!payload.time_end)       { alert("Please enter the end time."); return; }
  if (!payload.course_year_section) { alert("Please enter the Course / Year / Section."); return; }
  if (!payload.type)           { alert("Please select a reservation type."); return; }
  if (!payload.prof_name)      { alert("Please enter the professor's name."); return; }
  if (!payload.prof_email)     { alert("Please enter the professor's email."); return; }

  // ── Step 3: Date sanity check ─────────────────────────────────────────────
  const parsedDate = new Date(payload.date_borrowed);
  if (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 2000 || parsedDate.getFullYear() > 2100) {
    alert("Please enter a valid date (year must be between 2000 and 2100).");
    return;
  }

  // ── Step 4: Submit ────────────────────────────────────────────────────────
  const isEdit = !!_editingReservationId;
  const url    = isEdit
    ? `${CONFIG.BASE_URL}/reservations/${_editingReservationId}`
    : `${CONFIG.BASE_URL}/reservations`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    btn.disabled    = true;
    btn.textContent = isEdit ? 'Saving…' : 'Submitting…';

    const res  = await fetch(url, {
      method,
      headers: getHeaders(),
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      alert(isEdit ? "Reservation Updated Successfully!" : "Reservation Submitted Successfully!");
      window.closeModal();
      location.reload();
    } else {
      alert(data.message || (isEdit ? "Update failed." : "Submission failed."));
    }
  } catch (err) {
    alert("Server error. Please try again.");
  } finally {
    btn.disabled    = false;
    btn.textContent = isEdit ? 'Save Changes' : 'Submit Request';
  }
}

/**
 * Modal Controls — New Reservation
 */
window.openNewReservationModal = () => {
  _editingReservationId = null;
  syncStudentIdField();
  document.getElementById("modal-title").textContent = "Lab Reservation Form";
  document.getElementById("submit-btn").textContent  = "Submit Request";
  document.getElementById("new-reservation-form").reset();
  document.getElementById("materials-container").innerHTML = "";
  document.getElementById("members-container").innerHTML   = "";
  renderEquipmentChecklist();
  document.getElementById("new-res-modal").classList.add("open");
};

/**
 * Open the modal pre-filled with an existing reservation for editing.
 * Only allowed for Pending reservations.
 */
window.openEditReservationModal = function(id) {
  const r = reservations.find(x => x.reservation_id == id);
  if (!r) return;

  const isPending = ['Pending', 'TO_REVIEW', 'pending', 'to_review'].includes(r.status);
  if (!isPending) {
    alert("Only pending reservations can be edited.");
    return;
  }

  _editingReservationId = id;

  // Reset and populate form
  document.getElementById("new-reservation-form").reset();
  document.getElementById("materials-container").innerHTML = "";
  document.getElementById("members-container").innerHTML   = "";
  renderEquipmentChecklist();

  // Hide student ID section for edits
  document.getElementById('student-id-section').style.display = 'none';

  // Update modal header
  document.getElementById("modal-title").textContent = `Edit Reservation — RES-${String(id).padStart(3,'0')}`;
  document.getElementById("submit-btn").textContent  = "Save Changes";

  // Fill fields
  if (document.getElementById("subject"))
    document.getElementById("subject").value = r.subject || '';
  if (document.getElementById("date-needed"))
    document.getElementById("date-needed").value = r.date_borrowed
      ? r.date_borrowed.split('T')[0]
      : '';
  if (document.getElementById("group-number"))
    document.getElementById("group-number").value = r.group_number || '';

  // Time
  const startTime = r.time_start || r.time_of_activity;
  const endTime   = r.time_end;
  if (document.getElementById("time-start") && startTime) {
    // Extract HH:MM from "1970-01-01T08:00:00.000Z" or "08:00:00" or "08:00"
    const tStart = startTime.includes('T')
      ? new Date(startTime).toTimeString().slice(0,5)
      : startTime.slice(0,5);
    document.getElementById("time-start").value = tStart;
  }
  if (document.getElementById("time-end") && endTime) {
    const tEnd = endTime.includes('T')
      ? new Date(endTime).toTimeString().slice(0,5)
      : endTime.slice(0,5);
    document.getElementById("time-end").value = tEnd;
  }

  if (document.getElementById("course-year-section"))
    document.getElementById("course-year-section").value = r.course_year_section || '';
  if (document.getElementById("reservation-type"))
    document.getElementById("reservation-type").value = r.type || '';
  if (document.getElementById("prof-name"))
    document.getElementById("prof-name").value = r.prof_name || '';
  if (document.getElementById("prof-email"))
    document.getElementById("prof-email").value = r.prof_email || '';

  // Members
  if (r.members?.length) {
    r.members.forEach(m => {
      const name = m.name || m;
      if (!name) return;
      const container = document.getElementById("members-container");
      const div       = document.createElement("div");
      div.className   = "dynamic-row";
      div.innerHTML   = `
        <input type="text" class="member-name-input" placeholder="Enter member name" style="flex:1;" value="${name}">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
      `;
      container.appendChild(div);
    });
  }

  document.getElementById("new-res-modal").classList.add("open");
};

window.closeModal = () => {
  document.getElementById("new-res-modal").classList.remove("open");
  document.getElementById("new-reservation-form").reset();
  document.getElementById("materials-container").innerHTML = "";
  document.getElementById("members-container").innerHTML   = "";
  document.getElementById("student-id-input")?.classList.remove('sid-error');
  _editingReservationId = null;
};

// ── View Details Modal ──────────────────────────────────────
let _viewingReservationId = null;

window.viewReservation = function(id) {
  const r = reservations.find(x => x.reservation_id == id);
  if (!r) return;

  _viewingReservationId = id;

  const cls       = STATUS_CLASS[r.status] || r.status.toLowerCase();
  const canCancel = ['Pending', 'TO_REVIEW', 'pending', 'to_review'].includes(r.status);

  const equipHtml = r.reservation_equipment?.length
  ? r.reservation_equipment.map(ei => `
      <li>
        <i class='bx bx-wrench'></i>
        <span>Equipment #${ei.equipment_id}
          ${ei.quantity > 1 ? ' <strong>×' + ei.quantity + '</strong>' : ''}
          ${ei.remarks ? '<em style="color:#888;"> — ' + ei.remarks + '</em>' : ''}
        </span>
      </li>`).join('')
  : '';

  const chemHtml = r.chemical_items?.length
    ? r.chemical_items.map(ci => `
        <li>
          <i class='bx bx-test-tube'></i>
          <span>${ci.chemical?.chemical_name || 'Chemical #' + ci.chemical_id}
            ${ci.chemical?.amount ? ' (' + ci.chemical.amount + ')' : ''}
            ${ci.quantity > 1 ? ' <strong>×' + ci.quantity + '</strong>' : ''}
            ${ci.remarks ? '<em style="color:#888;"> — ' + ci.remarks + '</em>' : ''}
          </span>
        </li>`).join('')
    : '';

  const itemsHtml = (equipHtml + chemHtml) ||
    `<li style="color:#aaa;"><i class='bx bx-info-circle'></i> No items listed</li>`;

  const membersHtml = r.members?.length
    ? r.members.map(m => `<li><i class='bx bx-user'></i> <span>${m.name || m}</span></li>`).join('')
    : `<li style="color:#aaa;"><i class='bx bx-info-circle'></i> No members listed</li>`;

  const timeDisplay = buildTimeDisplay(r);

  document.getElementById('view-res-content').innerHTML = `
    <div class="detail-grid">
      <div class="detail-field">
        <label>Reservation ID</label>
        <span>RES-${String(r.reservation_id).padStart(3,'0')}</span>
      </div>
      <div class="detail-field">
        <label>Status</label>
        <span class="status-badge ${cls}">${r.status}</span>
      </div>
      <div class="detail-field">
        <label>Date Reserved</label>
        <span>${formatDate(r.date_reserved)}</span>
      </div>
      <div class="detail-field">
        <label>Date Borrowed</label>
        <span>${formatDate(r.date_borrowed)}</span>
      </div>
      <div class="detail-field">
        <label>Time</label>
        <span>${timeDisplay}</span>
      </div>
      <div class="detail-field">
        <label>Type</label>
        <span style="text-transform:capitalize;">${r.type || '—'}</span>
      </div>
      <div class="detail-field" style="grid-column:1/-1;">
        <label>Subject</label>
        <span>${r.subject || '—'}</span>
      </div>
      ${r.prof_name ? `
      <div class="detail-field">
        <label>Professor</label>
        <span>${r.prof_name}</span>
      </div>` : ''}
      ${r.prof_email ? `
      <div class="detail-field">
        <label>Professor Email</label>
        <span>${r.prof_email}</span>
      </div>` : ''}
      ${r.course_year_section ? `
      <div class="detail-field">
        <label>Course / Year / Section</label>
        <span>${r.course_year_section}</span>
      </div>` : ''}
      ${r.group_number != null ? `
      <div class="detail-field">
        <label>Group #</label>
        <span>${r.group_number}</span>
      </div>` : ''}
      <div class="detail-field">
        <label>Date Submitted</label>
        <span>${r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) : '--'}</span>
      </div>
    </div>

    <div class="detail-section-title"><i class='bx bx-list-check'></i> Equipment &amp; Materials</div>
    <ul class="detail-items-list">${itemsHtml}</ul>

    <div class="detail-section-title"><i class='bx bx-group'></i> Group Members</div>
    <ul class="detail-items-list">${membersHtml}</ul>
  `;

  const cancelBtn = document.getElementById('cancel-res-btn');
  if (cancelBtn) cancelBtn.style.display = canCancel ? 'inline-flex' : 'none';

  document.getElementById('view-res-modal').classList.add('open');
};

window.closeViewModal = function() {
  document.getElementById('view-res-modal').classList.remove('open');
  _viewingReservationId = null;
};

window.confirmCancel = function() {
  document.getElementById('view-res-modal').classList.remove('open');
  document.getElementById('confirm-cancel-modal').classList.add('open');
};

window.closeConfirmModal = function() {
  document.getElementById('confirm-cancel-modal').classList.remove('open');
  document.getElementById('view-res-modal').classList.add('open');
};

window.executeCancelReservation = async function() {
  const id = _viewingReservationId;
  if (!id) return;

  const btn = document.getElementById('confirm-cancel-yes');
  btn.disabled  = true;
  btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Cancelling...';

  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/reservations/${id}/status`, {
      method:  'PATCH',
      headers: getHeaders(),
      body:    JSON.stringify({ status: 'Rejected' }),
    });
    const data = await res.json();

    if (data.success || res.ok) {
      document.getElementById('confirm-cancel-modal').classList.remove('open');
      _viewingReservationId = null;
      await loadReservations();
    } else {
      alert(data.message || 'Could not cancel. Please try again.');
      btn.disabled  = false;
      btn.innerHTML = '<i class="bx bx-check"></i> Yes, Cancel It';
    }
  } catch (err) {
    console.error(err);
    alert('Server error. Please try again.');
    btn.disabled  = false;
    btn.innerHTML = '<i class="bx bx-check"></i> Yes, Cancel It';
  }
};