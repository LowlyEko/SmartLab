// student/js/accountability.js
import { CONFIG, getHeaders } from './config.js';

let accountabilityRecords = [];
let myReservations = [];
let inventoryItems = [];

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadAccountability(), loadMyReservations(), loadInventoryItems()]);

  const form = document.getElementById("report-form");
  if (form) form.addEventListener("submit", submitReport);

  // Default date to now
  const dateInput = document.getElementById("report-date");
  if (dateInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.value = now.toISOString().slice(0, 16);
  }
});

// ============================================================
//  LOAD DATA
// ============================================================
async function loadAccountability() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/accountability/my`, { headers: getHeaders() });
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
    const res = await fetch(`${CONFIG.BASE_URL}/reservations`, { headers: getHeaders() });
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
    const res = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      inventoryItems = data.data;
      populateItemDropdown();
    }
  } catch (err) {
    console.error("Error fetching inventory:", err);
  }
}

function populateReservationDropdown() {
  const select = document.getElementById("report-reservation-id");
  if (!select) return;
  while (select.options.length > 1) select.remove(1);
  myReservations.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.reservation_id;
    const date = new Date(r.date_needed).toLocaleDateString();
    opt.textContent = `RES-${String(r.reservation_id).padStart(3,'0')} — ${r.activity_title || 'Untitled'} (${date})`;
    // Cache time data for auto-fill
    opt.dataset.timeStart = r.time_start ? new Date(r.time_start).toTimeString().slice(0,5) : "";
    opt.dataset.timeEnd   = r.time_end   ? new Date(r.time_end).toTimeString().slice(0,5)   : "";
    select.appendChild(opt);
  });
}

function populateItemDropdown() {
  const select = document.getElementById("report-item-id");
  if (!select) return;
  while (select.options.length > 1) select.remove(1);
  inventoryItems.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.id ?? item.item_id;  // API returns "id"; fall back to item_id
    opt.textContent = `[${item.category}] ${item.name}`;
    opt.dataset.name = item.name;
    select.appendChild(opt);
  });
}

// Auto-fill description when item is selected
window.onItemSelected = function() {
  const select    = document.getElementById("report-item-id");
  const descInput = document.getElementById("report-item-description");
  if (!select || !descInput) return;
  const selected = select.options[select.selectedIndex];
  if (selected && selected.dataset.name) {
    descInput.value = selected.dataset.name;
  }
};

// Auto-fill time fields when reservation is selected
window.onReservationSelected = function() {
  const select = document.getElementById("report-reservation-id");
  if (!select) return;
  const selected = select.options[select.selectedIndex];
  if (!selected || !selected.value) return;
  const timeStart = document.getElementById("report-time-start");
  const timeEnd   = document.getElementById("report-time-end");
  if (timeStart && selected.dataset.timeStart) timeStart.value = selected.dataset.timeStart;
  if (timeEnd   && selected.dataset.timeEnd)   timeEnd.value   = selected.dataset.timeEnd;
};

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
    const status = record.resolution_status?.toUpperCase();
    if (status === "PENDING") pending++;
    else resolved++;

    const statusHTML = status === "PENDING"
      ? `<span class="status-badge pending">Pending</span>`
      : `<span class="status-badge resolved">Resolved</span>`;

    // Resolve incident type and note from enriched record (new) or legacy plain-text
    const incidentType = record.incident_type || (record.specifics?.startsWith("LOST:") ? "LOST" : "DAMAGED");
    const note = record.note
      || record.specifics?.replace(/^(LOST|DAMAGED):\s*/, '')
      || "—";

    const typeHTML = incidentType === "LOST"
      ? `<span class="incident-type-badge lost">Lost</span>`
      : `<span class="incident-type-badge damaged">Damaged</span>`;

    const resId = record.reservation_id
      ? `RES-${String(record.reservation_id).padStart(3,'0')}`
      : "—";

    tbody.innerHTML += `
      <tr>
        <td>${formatDate(record.created_at)}</td>
        <td>${resId}</td>
        <td><strong>${record.item_description}</strong></td>
        <td>${typeHTML}</td>
        <td>${record.quantity_broken || 1}</td>
        <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${note}">${note}</td>
        <td>${statusHTML}</td>
        <td>
          <button class="action-btn" onclick="viewRecord(${record.accountability_id})">
            <i class='bx bx-info-circle'></i>
          </button>
        </td>
      </tr>
    `;
  });

  document.getElementById("pending-count").textContent  = pending;
  document.getElementById("resolved-count").textContent = resolved;
  document.getElementById("table-meta").textContent     = `Total Records: ${accountabilityRecords.length}`;
}

// ============================================================
//  SUBMIT REPORT
// ============================================================
async function submitReport(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');

  const reservationId  = document.getElementById("report-reservation-id").value;
  const incidentType   = document.getElementById("report-incident-type").value;
  const item_id        = document.getElementById("report-item-id").value;
  const itemDescription = document.getElementById("report-item-description").value.trim();
  const note           = document.getElementById("report-specifics").value.trim();
  const teacher        = document.getElementById("report-teacher").value.trim();
  const subject        = document.getElementById("report-subject").value.trim();
  const programSection = document.getElementById("report-program-section").value.trim();
  const timeStart      = document.getElementById("report-time-start").value;
  const timeEnd        = document.getElementById("report-time-end").value;

  const parsedItemId = parseInt(item_id);

  if (!reservationId || isNaN(parseInt(reservationId))) {
    alert("Please link this incident to one of your reservations.");
    return;
  }
  if (!item_id || isNaN(parsedItemId) || parsedItemId <= 0) {
    alert("Please select the item that was damaged or lost.");
    return;
  }
  if (!incidentType) {
    alert("Please select an incident type (Damaged or Lost).");
    return;
  }
  if (!itemDescription) {
    alert("Please provide an item description.");
    return;
  }

  // All fields are sent top-level; controller's buildSpecifics folds them into JSON
  const payload = {
    reservation_id:   reservationId,
    item_id:          parsedItemId,
    item_description: itemDescription,
    quantity_broken:  parseInt(document.getElementById("report-quantity").value) || 1,
    date_time_broken: document.getElementById("report-date").value,
    // Structured fields — consumed by buildSpecifics() in the controller
    persons:          [],          // student reports don't use the persons field
    teacher:          teacher      || null,
    subject:          subject      || null,
    program_section:  programSection || null,
    time_start:       timeStart    || null,
    time_end:         timeEnd      || null,
    incident_type:    incidentType,
    note:             note         || null
  };

  try {
    btn.disabled = true;
    btn.textContent = "Submitting...";

    const res = await fetch(`${CONFIG.BASE_URL}/accountability`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
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
    btn.disabled = false;
    btn.textContent = "Submit Report";
  }
}

// ============================================================
//  VIEW RECORD DETAIL
// ============================================================
window.viewRecord = function(id) {
  const record = accountabilityRecords.find(r => r.accountability_id === id);
  if (!record) return;

  const status = record.resolution_status?.toUpperCase();
  const resId  = record.reservation_id
    ? `RES-${String(record.reservation_id).padStart(3,'0')}`
    : "None";

  const incidentType   = record.incident_type || (record.specifics?.startsWith("LOST:") ? "Lost" : "Damaged");
  const note           = record.note || record.specifics?.replace(/^(LOST|DAMAGED):\s*/, '') || "—";
  const teacher        = record.teacher        || "—";
  const subject        = record.subject        || "—";
  const programSection = record.program_section || "—";

  const statusColor = status === "PENDING" ? "#856404" : "#2e7d32";
  const statusBg    = status === "PENDING" ? "#fff3cd" : "#d4edda";

  document.getElementById("detail-content").innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
      <tr><td style="padding:8px; color:#718096; width:40%;">Record ID</td><td style="padding:8px; font-weight:600;">ACC-${String(record.accountability_id).padStart(3,'0')}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Linked Reservation</td><td style="padding:8px;">${resId}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Incident Type</td><td style="padding:8px;">${incidentType}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Item / Equipment</td><td style="padding:8px; font-weight:600;">${record.item_description}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Quantity</td><td style="padding:8px;">${record.quantity_broken || 1}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Date of Incident</td><td style="padding:8px;">${formatDate(record.date_time_broken)}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Time</td><td style="padding:8px;">${formatTimeRange(record.time_start, record.time_end)}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Teacher</td><td style="padding:8px;">${teacher}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Subject</td><td style="padding:8px;">${subject}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Program / Section</td><td style="padding:8px;">${programSection}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Date Reported</td><td style="padding:8px;">${formatDate(record.created_at)}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Details</td><td style="padding:8px;">${note}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Status</td>
        <td style="padding:8px;">
          <span style="background:${statusBg}; color:${statusColor}; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">${status}</span>
        </td>
      </tr>
      ${record.resolution_notes ? `<tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Resolution Notes</td><td style="padding:8px;">${record.resolution_notes}</td></tr>` : ''}
    </table>
  `;

  document.getElementById("detail-modal").classList.add("open");
};

// ============================================================
//  MODAL CONTROLS
// ============================================================
window.openReportModal = () => {
  document.getElementById("report-modal").classList.add("open");
};

window.closeReportModal = () => {
  document.getElementById("report-modal").classList.remove("open");
  document.getElementById("report-form").reset();
  const dateInput = document.getElementById("report-date");
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  dateInput.value = now.toISOString().slice(0, 16);
};

window.closeDetailModal = () => {
  document.getElementById("detail-modal").classList.remove("open");
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
    const str = t.includes("T") ? new Date(t).toTimeString().slice(0,5) : t;
    const [h, m] = str.split(":");
    const hour = parseInt(h);
    return ((hour % 12) || 12) + ":" + m + (hour >= 12 ? " PM" : " AM");
  };
  return end ? fmt(start) + " – " + fmt(end) : fmt(start);
}