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

const profileToggle   = document.getElementById("profile-toggle");
const profileDropdown = document.getElementById("profile-dropdown");

profileToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle("open");
});

document.addEventListener("click", () => {
  profileDropdown?.classList.remove("open");
});

document.getElementById("logout-btn")?.addEventListener("click", logout);

// ── New Reservation shortcut ──────────────────────────────────
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
      // New DB uses plain-string statuses: 'Pending', 'Approved', 'Rejected'
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

  // New schema: plain-string statuses
  const statusMap = {
    'Pending':     { label: 'Pending',     cls: 'to_review' },
    'Approved':    { label: 'Approved',    cls: 'allowed' },
    'Rejected':    { label: 'Rejected',    cls: 'rejected' },
    // Legacy enum fallbacks
    'TO_REVIEW':   { label: 'Pending',     cls: 'to_review' },
    'ALLOWED':     { label: 'Approved',    cls: 'allowed' },
    'REJECTED':    { label: 'Rejected',    cls: 'rejected' },
    'CONDITIONAL': { label: 'Conditional', cls: 'conditional' },
  };

  container.innerHTML = reservations.map(r => {
    const s = statusMap[r.status] || { label: r.status, cls: '' };
    // New schema: subject replaces activity_title; date_borrowed (DATE) + time_of_activity (TIME)
    const label   = r.subject || 'Lab Session';
    const dateStr = r.date_borrowed    ? formatDate(r.date_borrowed)     : '';
    const timeStr = r.time_of_activity ? formatTime(r.time_of_activity)  : '';
    return `
      <div class="upcoming-item" onclick="window.location.href='reservations.html'">
        <div>
          <strong>RES-${String(r.reservation_id).padStart(3,'0')}</strong>
          <span style="color:#888; margin:0 6px;">—</span>${label}
          ${r.prof_name ? `<span style="color:#888;"> · ${r.prof_name}</span>` : ''}
          <br>
          <small style="color:#999;">${dateStr}${timeStr ? ' • ' + timeStr : ''}</small>
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

// time_of_activity may arrive as "HH:MM:SS" (TIME column) or ISO datetime string
function formatTime(timeVal) {
  if (!timeVal) return '';
  if (timeVal.includes('T')) {
    return new Date(timeVal).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const [h, m] = timeVal.split(':');
  const hour = parseInt(h);
  return ((hour % 12) || 12) + ':' + m + (hour >= 12 ? ' PM' : ' AM');
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