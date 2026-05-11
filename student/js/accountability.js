// student/js/accountability.js
import { CONFIG, getHeaders } from './config.js';

let accountabilityRecords = [];

async function loadAccountability() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/accountability/my`, {
      headers: getHeaders()
    });

    const data = await res.json();

    if (data.success) {
      accountabilityRecords = data.data;
    } else {
      console.error("Failed to load accountability:", data.message);
      accountabilityRecords = getFallbackData();
    }
  } catch (err) {
    console.error("Error fetching accountability:", err);
    accountabilityRecords = getFallbackData();
  }
  renderAccountability();
}

function getFallbackData() {
  return [
    {
      accountability_id: 1,
      item_description: "Erlenmeyer Flask 500ml",
      quantity_broken: 2,
      specifics: "Broke during titration",
      created_at: "2026-05-08",
      resolution_status: "PENDING"
    }
  ];
}

function renderAccountability() {
  const tbody = document.getElementById("accountability-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let pending = 0, resolved = 0;

  accountabilityRecords.forEach(record => {
    if (record.resolution_status === "PENDING") pending++;
    else resolved++;

    const statusHTML = record.resolution_status === "PENDING" 
      ? `<span class="status-badge pending">Pending</span>`
      : `<span class="status-badge resolved">Resolved</span>`;

    const row = `
      <tr>
        <td>${formatDate(record.created_at)}</td>
        <td><strong>${record.item_description}</strong></td>
        <td>${record.quantity_broken || 1}</td>
        <td>${record.specifics || '—'}</td>
        <td>${formatDate(record.date_time_broken)}</td>
        <td>${statusHTML}</td>
        <td>
          <button class="action-btn" onclick="viewRecord(${record.accountability_id})">
            <i class='bx bx-info-circle'></i>
          </button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  document.getElementById("pending-count").textContent = pending;
  document.getElementById("resolved-count").textContent = resolved;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

window.viewRecord = function(id) {
  const record = accountabilityRecords.find(r => r.accountability_id === id);
  if (!record) return;
  alert(`Record ID: ${record.accountability_id}\nItem: ${record.item_description}\nStatus: ${record.resolution_status}`);
};

// Initialize
document.addEventListener("DOMContentLoaded", loadAccountability);