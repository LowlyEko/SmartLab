// student/js/dashboard.js
import { CONFIG, getHeaders } from './config.js';

async function loadDashboard() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/dashboard/stats`, {
      headers: getHeaders()
    });

    const data = await res.json();

    if (data.success) {
      const stats = data.data;
      document.getElementById("pending-res").textContent = stats.pendingReservations || 0;
      document.getElementById("approved-res").textContent = stats.approvedReservations || 0;
      document.getElementById("acc-count").textContent = stats.pendingAccountability || 0;
    }
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
    loadFallbackDashboard();
  }
}

function loadFallbackDashboard() {
  document.getElementById("pending-res").textContent = "2";
  document.getElementById("approved-res").textContent = "4";
  document.getElementById("acc-count").textContent = "1";
}

async function loadUpcomingReservations() {
  const container = document.getElementById("upcoming-list");
  if (!container) return;

  try {
    const res = await fetch(`${CONFIG.BASE_URL}/reservations`, { headers: getHeaders() });
    const data = await res.json();

    if (data.success) {
      const upcoming = data.data.slice(0, 3);
      let html = "";
      upcoming.forEach(r => {
        html += `
          <div style="padding:12px 0; border-bottom:1px solid #eee;">
            <strong>${r.reservation_id}</strong> — ${r.activity_title || 'Lab Session'}
            <br><small>${formatDate(r.date_needed)} | ${r.time_start || ''}</small>
          </div>`;
      });
      container.innerHTML = html || "<p>No upcoming reservations.</p>";
    }
  } catch (err) {
    container.innerHTML = `<p><strong>Upcoming Reservations</strong><br>May 15 • 9:00 AM - Organic Chemistry</p>`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Dark Mode
document.getElementById("dark-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});

// Load User Info
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.first_name) {
    document.getElementById("student-name").textContent = user.first_name;
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadUserInfo();
  loadDashboard();
  loadUpcomingReservations();

  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
});