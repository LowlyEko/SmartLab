// student/js/accountability.js
import { CONFIG, getHeaders } from './config.js';

let accountabilityRecords = [];
let myReservations        = [];
let inventoryItems        = [];

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadAccountability(), loadMyReservations(), loadInventoryItems()]);

  const form = document.getElementById("report-form");
  if (form) form.addEventListener("submit", submitReport);
});

// ============================================================
//  LOAD DATA
// ============================================================
async function loadAccountability() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/accountability/mine`, { headers: getHeaders() });
    const data = await res.json();
    accountabilityRecords = data.success ? data.data : [];
  } catch (err) {
    console.error("Error fetching accountability:", err);
    accountabilityRecords = [];
  }
  renderTable();
}

async function loadMyReservations() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/reservations`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      myReservations = data.data;
      populateReservationDropdown();
    }
  } catch (err) {
    console.error("Error fetching reservations:", err);
  }
}

async function loadInventoryItems() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      inventoryItems = data.data;
      populateItemDropdown();
    }
  } catch (err) {
    console.error("Error fetching inventory:", err);
  }
}

// ============================================================
//  POPULATE DROPDOWNS
// ============================================================
function populateReservationDropdown() {
  const select = document.getElementById("report-reservation-id");
  if (!select) return;
  while (select.options.length > 1) select.remove(1);

  myReservations.forEach(r => {
    const opt  = document.createElement("option");
    opt.value  = r.reservation_id;
    const date = r.date_borrowed ? new Date(r.date_borrowed).toLocaleDateString() : '—';
    opt.textContent = `RES-${String(r.reservation_id).padStart(3,'0')} — ${r.subject || 'Untitled'} (${date})`;
    opt.dataset.timeOfActivity = r.time_of_activity || "";
    select.appendChild(opt);
  });
}

function populateItemDropdown() {
  const select = document.getElementById("report-item-id");
  if (!select) return;
  while (select.options.length > 1) select.remove(1);

  if (inventoryItems.length === 0) {
    const opt = document.createElement("option");
    opt.disabled = true;
    opt.textContent = "No items found";
    select.appendChild(opt);
    return;
  }

  const equipment = inventoryItems.filter(i => i.type === 'equipment');
  const chemicals = inventoryItems.filter(i => i.type === 'chemical');

  function appendGroup(label, items) {
    if (!items.length) return;
    const group = document.createElement("optgroup");
    group.label = label;
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      opt.dataset.type = item.type;
      group.appendChild(opt);
    });
    select.appendChild(group);
  }

  appendGroup("Equipment", equipment);
  appendGroup("Chemicals & Glassware", chemicals);
}

// ============================================================
//  RENDER TABLE
// ============================================================
function renderTable() {
  const tbody = document.getElementById("accountability-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  let pending = 0, resolved = 0;

  if (accountabilityRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#718096; padding:30px;">No accountability records found.</td></tr>`;
  }

  accountabilityRecords.forEach(record => {
    const isResolved = !!record.date_replaced;
    if (isResolved) resolved++; else pending++;

    const statusHTML = isResolved
      ? `<span class="status-badge resolved">Resolved</span>`
      : `<span class="status-badge pending">Pending</span>`;

    const resId = record.reservation_id
      ? `RES-${String(record.reservation_id).padStart(3,'0')}`
      : "—";

    tbody.innerHTML += `
      <tr>
        <td>${formatDate(record.date_borrowed || record.created_at)}</td>
        <td>${resId}</td>
        <td><strong>${record.materials_broken || '—'}</strong></td>
        <td>${record.subject || '—'}</td>
        <td>${record.remarks || '—'}</td>
        <td>${statusHTML}</td>
        <td>
          <button class="action-btn" onclick="viewRecord(${record.accountability_id})">
            <i class='bx bx-info-circle'></i>
          </button>
        </td>
      </tr>
    `;
  });

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("pending-count",  pending);
  set("resolved-count", resolved);
  set("table-meta",     `Total Records: ${accountabilityRecords.length}`);
}

// ============================================================
//  SUBMIT REPORT
// ============================================================
async function submitReport(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const reservationId  = document.getElementById("report-reservation-id")?.value || null;
  const incidentType   = document.getElementById("report-incident-type")?.value?.trim() || null;

  // datetime-local gives "YYYY-MM-DDTHH:mm" — split to get just the date
  const rawDate      = document.getElementById("report-date")?.value || "";
  const dateBorrowed = rawDate ? rawDate.split("T")[0] : "";

  const timeStart = document.getElementById("report-time-start")?.value || null;
  const timeEnd   = document.getElementById("report-time-end")?.value   || null;

  // Item dropdown
  const itemSelect       = document.getElementById("report-item-id");
  const selectedItemId   = itemSelect?.value || null;
  const selectedItemName = selectedItemId
    ? itemSelect.options[itemSelect.selectedIndex]?.textContent?.trim()
    : "";

  const itemDescription = document.getElementById("report-item-description")?.value?.trim() || "";
  const materialsBroken = selectedItemName || itemDescription;

  const quantity       = parseInt(document.getElementById("report-quantity")?.value) || 1;
  const profName       = document.getElementById("report-teacher")?.value?.trim() || null;
  const subject        = document.getElementById("report-subject")?.value?.trim() || null;
  const programSection = document.getElementById("report-program-section")?.value?.trim() || null;
  const remarks        = document.getElementById("report-specifics")?.value?.trim() || null;

  const memberName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || "Student";

  // Validation
  if (!selectedItemId)  { alert("Please select an item / equipment."); return; }
  if (!materialsBroken) { alert("Please describe the item."); return; }
  if (!dateBorrowed)    { alert("Please select a date of incident."); return; }
  if (!profName)        { alert("Please enter the professor's name."); return; }
  if (!subject)         { alert("Please enter the subject."); return; }
  if (!programSection)  { alert("Please enter your program/course/section."); return; }
  if (!remarks)         { alert("Please describe how it happened."); return; }

  const payload = {
    reservation_id:         reservationId ? parseInt(reservationId) : null,
    date_borrowed:          dateBorrowed,
    time_start:             timeStart || null,
    time_end:               timeEnd   || null,
    incident_type:          incidentType,
    member_name:            memberName,
    materials_broken:       materialsBroken,
    prof_name:              profName,
    subject,
    program_course_section: programSection,
    quantity,
    remarks,
  };

  try {
    btn.disabled    = true;
    btn.textContent = "Submitting...";

    const res = await fetch(`${CONFIG.BASE_URL}/accountability`, {
      method:  "POST",
      headers: getHeaders(),
      body:    JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      alert("Incident reported successfully. The lab staff will review your report.");
      closeReportModal();
      await loadAccountability();
    } else {
      alert("Error: " + (data.message || "Failed to submit report."));
    }
  } catch (err) {
    alert("Server error. Please try again.");
    console.error(err);
  } finally {
    btn.disabled    = false;
    btn.textContent = "Submit Report";
  }
}

// ============================================================
//  VIEW RECORD DETAIL
// ============================================================
window.viewRecord = function(id) {
  const record = accountabilityRecords.find(r => r.accountability_id === id);
  if (!record) return;

  const isResolved  = !!record.date_replaced;
  const statusColor = isResolved ? "#2e7d32" : "#856404";
  const statusBg    = isResolved ? "#d4edda"  : "#fff3cd";
  const statusLabel = isResolved ? "RESOLVED"  : "PENDING";

  const resId = record.reservation_id
    ? `RES-${String(record.reservation_id).padStart(3,'0')}`
    : "None";

  const membersRows = record.members?.length
    ? record.members.map(m => `<tr><td style="padding:8px; color:#718096;">Group Member ${m.member_order + 1}</td><td style="padding:8px;">${m.member_name}</td></tr>`).join('')
    : '';

  document.getElementById("detail-content").innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
      <tr><td style="padding:8px; color:#718096; width:40%;">Record ID</td><td style="padding:8px; font-weight:600;">ACC-${String(record.accountability_id).padStart(3,'0')}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Linked Reservation</td><td style="padding:8px;">${resId}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Primary Responsible</td><td style="padding:8px; font-weight:600;">${record.member_name || '—'}</td></tr>
      ${membersRows}
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Materials Broken / Lost</td><td style="padding:8px; font-weight:600;">${record.materials_broken || '—'}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Date of Incident</td><td style="padding:8px;">${formatDate(record.date_borrowed)}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Time</td><td style="padding:8px;">${formatTimeRange(record.time_start, record.time_end)}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Professor</td><td style="padding:8px;">${record.prof_name || '—'}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Subject</td><td style="padding:8px;">${record.subject || '—'}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Program / Section</td><td style="padding:8px;">${record.program_course_section || '—'}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Deadline</td><td style="padding:8px;">${record.deadline ? formatDate(record.deadline) : '—'}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Remarks</td><td style="padding:8px;">${record.remarks || '—'}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Date Replaced</td><td style="padding:8px;">${record.date_replaced ? formatDate(record.date_replaced) : 'Not yet replaced'}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Status</td>
        <td style="padding:8px;">
          <span style="background:${statusBg}; color:${statusColor}; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">${statusLabel}</span>
        </td>
      </tr>
    </table>
  `;

  document.getElementById("detail-modal").classList.add("open");
};

// ============================================================
//  MODAL CONTROLS
// ============================================================
window.openReportModal = () => {
  document.getElementById("report-modal")?.classList.add("open");
};

window.closeReportModal = () => {
  document.getElementById("report-modal")?.classList.remove("open");
  document.getElementById("report-form")?.reset();
};

window.closeDetailModal = () => {
  document.getElementById("detail-modal")?.classList.remove("open");
};

// Called by onchange="onReservationSelected()" in HTML
window.onReservationSelected = function() {
  const select = document.getElementById("report-reservation-id");
  if (!select) return;
  const selected = select.options[select.selectedIndex];
  if (!selected?.value) return;
  const toa = selected.dataset.timeOfActivity;
  if (toa) {
    const timeStart = document.getElementById("report-time-start");
    if (timeStart) timeStart.value = toa.slice(0, 5);
  }
};

// Called by onchange="onItemSelected()" in HTML — auto-fills description
window.onItemSelected = function() {
  const select    = document.getElementById("report-item-id");
  const descInput = document.getElementById("report-item-description");
  if (!select || !descInput) return;
  const selected = select.options[select.selectedIndex];
  if (selected?.value) {
    descInput.value = selected.textContent.trim();
  }
};

// ============================================================
//  HELPERS
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeRange(start, end) {
  if (!start && !end) return "—";
  const fmt = t => {
    if (!t) return "";
    const str = t.includes("T") ? new Date(t).toTimeString().slice(0,5) : t.slice(0,5);
    const [h, m] = str.split(":");
    const hour = parseInt(h);
    return ((hour % 12) || 12) + ":" + m + (hour >= 12 ? " PM" : " AM");
  };
  return end ? fmt(start) + " – " + fmt(end) : fmt(start);
}