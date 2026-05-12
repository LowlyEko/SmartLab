// student/js/accountability.js
import { CONFIG, getHeaders } from './config.js';

let accountabilityRecords = [];
let myReservations = [];

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadAccountability(), loadMyReservations()]);

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

function populateReservationDropdown() {
  const select = document.getElementById("report-reservation-id");
  if (!select) return;
  myReservations.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.reservation_id;
    const date = new Date(r.date_needed).toLocaleDateString();
    opt.textContent = `RES-${String(r.reservation_id).padStart(3,'0')} — ${r.activity_title} (${date})`;
    select.appendChild(opt);
  });
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
    const status = record.resolution_status?.toUpperCase();
    if (status === "PENDING") pending++;
    else resolved++;

    const statusHTML = status === "PENDING"
      ? `<span class="status-badge pending">Pending</span>`
      : `<span class="status-badge resolved">Resolved</span>`;

    const incidentType = record.specifics?.startsWith("LOST:") ? "LOST" : "DAMAGED";
    const typeHTML = incidentType === "LOST"
      ? `<span class="incident-type-badge lost">Lost</span>`
      : `<span class="incident-type-badge damaged">Damaged</span>`;

    const resId = record.reservation_id
      ? `RES-${String(record.reservation_id).padStart(3,'0')}`
      : "—";

    const specifics = record.specifics?.replace(/^(LOST|DAMAGED):\s*/, '') || "—";

    tbody.innerHTML += `
      <tr>
        <td>${formatDate(record.created_at)}</td>
        <td>${resId}</td>
        <td><strong>${record.item_description}</strong></td>
        <td>${typeHTML}</td>
        <td>${record.quantity_broken || 1}</td>
        <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${specifics}">${specifics}</td>
        <td>${statusHTML}</td>
        <td>
          <button class="action-btn" onclick="viewRecord(${record.accountability_id})">
            <i class='bx bx-info-circle'></i>
          </button>
        </td>
      </tr>
    `;
  });

  document.getElementById("pending-count").textContent = pending;
  document.getElementById("resolved-count").textContent = resolved;
  document.getElementById("table-meta").textContent = `Total Records: ${accountabilityRecords.length}`;
}

// ============================================================
//  SUBMIT REPORT
// ============================================================
async function submitReport(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');

  const incidentType = document.getElementById("report-incident-type").value;
  const specifics = document.getElementById("report-specifics").value.trim();

  const payload = {
    reservation_id: document.getElementById("report-reservation-id").value || null,
    item_description: document.getElementById("report-item-description").value.trim(),
    quantity_broken: parseInt(document.getElementById("report-quantity").value) || 1,
    date_time_broken: document.getElementById("report-date").value,
    // Prefix specifics with incident type so it's stored and readable
    specifics: `${incidentType}: ${specifics}`
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
  const incidentType = record.specifics?.startsWith("LOST:") ? "Lost" : "Damaged";
  const specifics = record.specifics?.replace(/^(LOST|DAMAGED):\s*/, '') || "—";
  const resId = record.reservation_id
    ? `RES-${String(record.reservation_id).padStart(3,'0')}`
    : "None";

  const statusColor = status === "PENDING" ? "#856404" : "#2e7d32";
  const statusBg = status === "PENDING" ? "#fff3cd" : "#d4edda";

  document.getElementById("detail-content").innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
      <tr><td style="padding:8px; color:#718096; width:40%;">Record ID</td><td style="padding:8px; font-weight:600;">ACC-${String(record.accountability_id).padStart(3,'0')}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Linked Reservation</td><td style="padding:8px;">${resId}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Incident Type</td><td style="padding:8px;">${incidentType}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Item / Equipment</td><td style="padding:8px; font-weight:600;">${record.item_description}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Quantity</td><td style="padding:8px;">${record.quantity_broken || 1}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Date of Incident</td><td style="padding:8px;">${formatDate(record.date_time_broken)}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Date Reported</td><td style="padding:8px;">${formatDate(record.created_at)}</td></tr>
      <tr style="background:#f8f9fa;"><td style="padding:8px; color:#718096;">Details</td><td style="padding:8px;">${specifics}</td></tr>
      <tr><td style="padding:8px; color:#718096;">Status</td><td style="padding:8px;"><span style="background:${statusBg}; color:${statusColor}; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">${status}</span></td></tr>
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
  // Reset date to now
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