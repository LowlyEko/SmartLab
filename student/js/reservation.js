// student/js/reservation.js
import { CONFIG, getHeaders } from './config.js';

let reservations = [];

async function loadReservations() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/reservations`, {
      headers: getHeaders()
    });

    const data = await res.json();

    if (data.success) {
      reservations = data.data;
      renderReservations();
    } else {
      console.error("Failed to load reservations:", data.message);
      reservations = getFallbackData();
      renderReservations();
    }
  } catch (err) {
    console.error("Error fetching reservations:", err);
    reservations = getFallbackData();
    renderReservations();
  }
}

function getFallbackData() {
  return [
    {
      reservation_id: "RES-001",
      date_needed: "2026-05-15",
      time_start: "09:00",
      time_end: "12:00",
      activity_title: "Organic Chemistry Synthesis",
      status: "ALLOWED"
    },
    {
      reservation_id: "RES-002",
      date_needed: "2026-05-18",
      time_start: "13:00",
      time_end: "16:00",
      activity_title: "Physics Circuit Experiment",
      status: "TO_REVIEW"
    }
  ];
}

function renderReservations(filtered = reservations) {
  const tbody = document.getElementById("reservations-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  filtered.forEach(res => {
    const statusHTML = getStatusBadge(res.status || res.reservation_status);
    
    const row = `
      <tr>
        <td><strong>${res.reservation_id}</strong></td>
        <td>${formatDate(res.date_needed)}</td>
        <td>${res.time_start || ''} - ${res.time_end || ''}</td>
        <td>${res.activity_title || 'Lab Session'}</td>
        <td>Multiple Items</td>
        <td>${statusHTML}</td>
        <td>
          <button class="action-btn" onclick="viewReservation('${res.reservation_id}')">
            <i class='bx bx-info-circle'></i>
          </button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  document.getElementById("table-meta").textContent = `Showing ${filtered.length} reservation(s)`;
}

function getStatusBadge(status) {
  if (status === "ALLOWED") return `<span class="status-badge resolved">Approved</span>`;
  if (status === "TO_REVIEW") return `<span class="status-badge pending">Pending</span>`;
  if (status === "REJECTED") return `<span class="status-badge overdue">Rejected</span>`;
  return `<span class="status-badge pending">Pending</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function filterReservations() {
  const search = document.getElementById("search-input").value.toLowerCase();
  const statusFilter = document.getElementById("status-filter").value;

  const filtered = reservations.filter(r => {
    const matchSearch = (r.activity_title || "").toLowerCase().includes(search) || 
                       String(r.reservation_id).toLowerCase().includes(search);
    const matchStatus = statusFilter === "all" || (r.status || r.reservation_status) === statusFilter;
    return matchSearch && matchStatus;
  });

  renderReservations(filtered);
}

window.openNewReservationModal = function() {
  document.getElementById("new-res-modal").classList.add("open");
};

window.closeModal = function() {
  document.getElementById("new-res-modal").classList.remove("open");
};

window.submitReservation = async function(e) {
  e.preventDefault();
  
  const formData = {
    date_needed: document.getElementById("date-needed").value,
    time_start: document.getElementById("time-start").value,
    time_end: document.getElementById("time-end").value,
    activity_title: document.getElementById("activity-title").value,
    items: [] // You can enhance this later
  };

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/reservations`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (data.success) {
      alert("✅ Reservation submitted successfully!");
      closeModal();
      loadReservations();
    } else {
      alert(data.message || "Failed to submit reservation");
    }
  } catch (err) {
    alert("✅ Request submitted (Demo Mode)");
    closeModal();
    loadReservations();
  }
};

window.viewReservation = function(id) {
  alert(`Viewing details for reservation ${id}`);
};

// Initialize
document.addEventListener("DOMContentLoaded", loadReservations);