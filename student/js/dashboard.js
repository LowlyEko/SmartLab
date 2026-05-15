import { CONFIG, getHeaders } from './config.js';
import { guardPage, logout } from './guard.js';

// ── Auth guard ──────────────────────────────────────────────
guardPage();

// ── Profile dropdown ────────────────────────────────────────
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.first_name) {
    const el = document.getElementById("student-name");
    if (el) el.textContent = user.first_name;

    const nameEl = document.getElementById("profile-name");
    if (nameEl) nameEl.textContent = `${user.first_name} ${user.last_name || ''}`.trim();

    const avatarEl = document.getElementById("profile-avatar");
    if (avatarEl) avatarEl.textContent = user.first_name[0].toUpperCase();
  }
}

const profileToggle  = document.getElementById("profile-toggle");
const profileDropdown = document.getElementById("profile-dropdown");

profileToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle("open");
});

document.addEventListener("click", () => {
  profileDropdown?.classList.remove("open");
});

document.getElementById("logout-btn")?.addEventListener("click", logout);

// ── New Reservation shortcut — opens modal on reservations page ──
document.getElementById("new-reservation-shortcut")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "reservations.html?action=new";
});

// ── Dashboard stats ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/dashboard/stats`, { headers: getHeaders() });
    const data = await res.json();

    if (data.success) {
      const s = data.data;
      document.getElementById("pending-res").textContent  = s.pendingReservations  ?? 0;
      document.getElementById("approved-res").textContent = s.approvedReservations ?? 0;
      document.getElementById("acc-count").textContent    = s.pendingAccountability ?? 0;
      renderUpcoming(s.recentReservations || []);
    }
  } catch (err) {
    console.error("Dashboard load error:", err);
    showError();
  }
}

function renderUpcoming(reservations) {
  const container = document.getElementById("upcoming-list");
  if (!container) return;

  if (!reservations.length) {
    container.innerHTML = `
      <div style="text-align:center; padding:28px 0; color:#aaa;">
        <i class='bx bx-calendar-x' style="font-size:36px; display:block; margin-bottom:8px;"></i>
        No upcoming reservations.
        <br><a href="reservations.html" style="color:var(--primary); font-weight:600; margin-top:8px; display:inline-block;">Make one →</a>
      </div>`;
    return;
  }

  const statusMap = {
    TO_REVIEW:   { label: 'To Review',   cls: 'to_review' },
    ALLOWED:     { label: 'Approved',    cls: 'allowed' },
    REJECTED:    { label: 'Rejected',    cls: 'rejected' },
    CONDITIONAL: { label: 'Conditional', cls: 'conditional' },
  };

  container.innerHTML = reservations.map(r => {
    const s = statusMap[r.status] || { label: r.status, cls: '' };
    return `
      <div class="upcoming-item" onclick="window.location.href='reservations.html'">
        <div>
          <strong>RES-${String(r.reservation_id).padStart(3,'0')}</strong>
          <span style="color:#888; margin:0 6px;">—</span>${r.activity_title || 'Lab Session'}
          <br>
          <small style="color:#999;">${formatDate(r.date_needed)}${r.time_start ? ' • ' + formatTime(r.time_start) : ''}</small>
        </div>
        <span class="status-badge ${s.cls}">${s.label}</span>
      </div>`;
  }).join('');
}

function showError() {
  ["pending-res","approved-res","acc-count"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });
  const c = document.getElementById("upcoming-list");
  if (c) c.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:20px;">Could not connect to server.</p>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Dark mode ────────────────────────────────────────────────
if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark");

document.getElementById("dark-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});

// ── Init ─────────────────────────────────────────────────────
loadUserInfo();
loadDashboard();
