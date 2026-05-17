import { CONFIG, getHeaders } from './config.js';
import { guardPage } from './guard.js';

let reservations = [];
let equipmentItems = [];  // from /api/inventory?type=equipment
let chemicalItems  = [];  // from /api/inventory?type=chemical

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
// Shows the Student ID input at the top of the form only when the logged-in
// student has not yet been assigned one.
function syncStudentIdField() {
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const section = document.getElementById('student-id-section');
  if (!section) return;
  // Show only when student_id is missing
  section.style.display = (!user.student_id) ? 'block' : 'none';
}

/**
 * Fetch all inventory — new schema has separate equipment & chemical tables.
 * GET /api/inventory returns a combined array with a `type` field.
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
 * Equipment checklist — driven by actual equipment table rows.
 * Falls back to a static list if inventory hasn't loaded yet.
 */
function renderEquipmentChecklist() {
  const container = document.getElementById("equipment-checklist");
  if (!container) return;

  const staticLogsheet = [
    "Autoclave","Analytical Balance","Oven","Incubator","Refrigerator",
    "Centrifuge","Fume Hood","Laminar Flow","Circulating Water Vacuum Pump",
    "Rotary Evaporator","Electric Waterbath"
  ];

  // Always use static list — checklist is not DB-driven
  container.innerHTML = staticLogsheet.map(name => `
      <label class="checklist-item">
        <input type="checkbox" class="equip-chk" value="${name}">
        <span>${name}</span>
      </label>`
  ).join('');
}

/**
 * Materials row — now targets chemicals from the new chemicals table.
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

  // All inventory items: chemicals + all equipment types
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
 * Member row — new schema stores member names as plain strings (no student FK).
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

// Map new plain-string statuses to badge classes
const STATUS_CLASS = {
  'Pending':  'to_review',
  'Approved': 'allowed',
  'Rejected': 'rejected',
  // legacy fallbacks
  'TO_REVIEW':   'to_review',
  'ALLOWED':     'allowed',
  'REJECTED':    'rejected',
  'CONDITIONAL': 'conditional',
};

function renderTable(filtered = reservations) {
  const tbody = document.getElementById("reservations-tbody");
  const meta  = document.getElementById("table-meta");
  if (!tbody) return;

  tbody.innerHTML = "";
  meta.textContent = `Total Records: ${filtered.length}`;

  filtered.forEach(r => {
    const cls        = STATUS_CLASS[r.status] || r.status.toLowerCase();
    const statusLabel = r.status;

    // New schema: subject + prof_name; date_borrowed (DATE); time_of_activity (TIME)
    // Combined items count = equipment_items + chemical_items
    const itemCount = (r.equipment_items?.length || 0) + (r.chemical_items?.length || 0);

    tbody.innerHTML += `
      <tr>
        <td><strong>RES-${String(r.reservation_id).padStart(3,'0')}</strong></td>
        <td>${formatDate(r.date_borrowed)}</td>
        <td>${formatTime(r.time_of_activity)}</td>
        <td>${r.subject || '—'}</td>
        <td>${itemCount} items</td>
        <td><span class="status-badge ${cls}">${statusLabel}</span></td>
        <td>
          <button class="action-btn" onclick="viewReservation(${r.reservation_id})">
            <i class='bx bx-info-circle'></i>
          </button>
        </td>
      </tr>
    `;
  });
}

/**
 * Save student ID to the backend and update localStorage.
 * Called automatically on first reservation submit when student_id is null.
 * Returns true on success, false on failure (submit is blocked on failure).
 */
async function saveStudentId(studentId) {
  const res  = await fetch(`${CONFIG.BASE_URL}/students/me`, {
    method:  'PATCH',
    headers: getHeaders(),
    body:    JSON.stringify({ student_id: studentId, year_level: 1 }),
  });
  const data = await res.json();

  if (data.success) {
    // Persist the updated student_id into localStorage so the field hides on next open
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, student_id: data.data.student_id }));
    return true;
  }

  // Surface the server's error message (e.g. "ID already taken")
  alert(data.message || 'Could not save Student ID. Please try again.');
  return false;
}

/**
 * Submit Reservation — new schema payload.
 * If the student has no student_id yet, validates and saves it first,
 * then proceeds with the reservation create.
 */
async function submitReservation(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');

  // ── Step 0: Handle Student ID if not yet set ──────────────────────────────
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

    // Save to backend before proceeding — abort if it fails
    btn.disabled = true;
    btn.textContent = 'Saving ID…';
    const saved = await saveStudentId(sidValue);
    if (!saved) {
      btn.disabled = false;
      btn.textContent = 'Submit Request';
      return;
    }

    // Hide the student ID section now that it's saved
    document.getElementById('student-id-section').style.display = 'none';

    // ── FIX: Reset button after ID save so submission phase controls it cleanly ──
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }

  // ── Step 1: Equipment from checklist ──────────────────────────────────────
  const equipmentPayload = Array.from(document.querySelectorAll(".equip-chk:checked"))
    .filter(chk => chk.dataset.equipId) // only DB-linked items
    .map(chk => ({
      equipment_id: parseInt(chk.dataset.equipId),
      quantity:     1,
      remarks:      null,
    }));

  // ── Step 2: Chemicals / materials from dynamic rows ───────────────────────
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

  // ── Step 3: Members ───────────────────────────────────────────────────────
  const membersPayload = Array.from(document.querySelectorAll(".member-name-input"))
    .map(i => i.value.trim())
    .filter(Boolean)
    .map(name => ({ name }));

  // ── Step 4: Required fields ───────────────────────────────────────────────
  const subject        = document.getElementById("activity-title")?.value?.trim()
                      || document.getElementById("subject")?.value?.trim();
  const profName       = document.getElementById("prof-name")?.value?.trim() || null;
  const dateBorrowed   = document.getElementById("date-needed")?.value
                      || document.getElementById("date-borrowed")?.value;
  const timeOfActivity = document.getElementById("time-start")?.value
                      || document.getElementById("time-of-activity")?.value;
  const courseSection  = document.getElementById("course-year-section")?.value?.trim()
                      || document.getElementById("conditions-note")?.value?.trim() || null;
  const groupNumber    = document.getElementById("group-number")?.value || null;
  const type           = document.getElementById("reservation-type")?.value?.trim() || "Laboratory";

  if (!subject)        { alert("Please enter a subject / experiment title."); return; }
  if (!dateBorrowed)   { alert("Please select a date."); return; }
  if (!timeOfActivity) { alert("Please enter the time of activity."); return; }

  // ── Step 5: Date range sanity check ──────────────────────────────────────
  const parsedDate = new Date(dateBorrowed);
  if (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 2000 || parsedDate.getFullYear() > 2100) {
    alert("Please enter a valid date (year must be between 2000 and 2100).");
    return;
  }

  // ── Step 6: Submit reservation ────────────────────────────────────────────
  const payload = {
    subject,
    prof_name:           profName,
    date_borrowed:       dateBorrowed,
    time_of_activity:    timeOfActivity,
    course_year_section: courseSection,
    group_number:        groupNumber ? parseInt(groupNumber) : null,
    type,
    members:   membersPayload,
    equipment: equipmentPayload,
    chemicals: chemicalsPayload,
  };

  try {
    btn.disabled    = true;
    btn.textContent = 'Submitting…';

    const res  = await fetch(`${CONFIG.BASE_URL}/reservations`, {
      method:  "POST",
      headers: getHeaders(),
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      alert("Reservation Submitted Successfully!");
      window.closeModal();
      location.reload();
    } else {
      alert(data.message || "Submission failed.");
    }
  } catch (err) {
    alert("Server error. Please try again.");
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Submit Request';
  }
}

/**
 * Modal Controls
 */
window.openNewReservationModal = () => {
  syncStudentIdField(); // show/hide student ID section based on current user
  document.getElementById("new-res-modal").classList.add("open");
};

window.closeModal = () => {
  document.getElementById("new-res-modal").classList.remove("open");
  document.getElementById("new-reservation-form").reset();
  document.getElementById("materials-container").innerHTML = "";
  document.getElementById("members-container").innerHTML   = "";
  // Clear any error state on the student ID input
  document.getElementById("student-id-input")?.classList.remove('sid-error');
};

// ── View Details Modal ──────────────────────────────────────
let _viewingReservationId = null;

window.viewReservation = function(id) {
  const r = reservations.find(x => x.reservation_id == id);
  if (!r) return;

  _viewingReservationId = id;

  const cls       = STATUS_CLASS[r.status] || r.status.toLowerCase();
  const canCancel = ['Pending', 'TO_REVIEW', 'pending', 'to_review'].includes(r.status);

  // Equipment items (polymorphic — no nested name, use item_type + item_id)
  const equipHtml = r.equipment_items?.length
    ? r.equipment_items.map(ei => `
        <li>
          <i class='bx bx-wrench'></i>
          <span>${ei.item_type || 'Equipment'} #${ei.item_id}
            ${ei.quantity > 1 ? ' <strong>×' + ei.quantity + '</strong>' : ''}
            ${ei.remarks ? '<em style="color:#888;"> — ' + ei.remarks + '</em>' : ''}
          </span>
        </li>`).join('')
    : '';

  // Chemical items
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

  // Members — new schema stores plain name strings
  const membersHtml = r.members?.length
    ? r.members.map(m => `<li><i class='bx bx-user'></i> <span>${m.name || m}</span></li>`).join('')
    : `<li style="color:#aaa;"><i class='bx bx-info-circle'></i> No members listed</li>`;

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
        <label>Date</label>
        <span>${formatDate(r.date_borrowed)}</span>
      </div>
      <div class="detail-field">
        <label>Time</label>
        <span>${formatTime(r.time_of_activity)}</span>
      </div>
      <div class="detail-field" style="grid-column:1/-1;">
        <label>Subject / Experiment</label>
        <span>${r.subject || '—'}</span>
      </div>
      ${r.prof_name ? `
      <div class="detail-field">
        <label>Professor</label>
        <span>${r.prof_name}</span>
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

// Cancel uses PATCH /:id/status with { status: 'Rejected' } (student self-cancel)
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