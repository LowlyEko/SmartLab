/* ============================================================
   reservation.js  –  Admin Reservation Page
   Connects to Node/Express backend at /api/reservations
   ============================================================ */

/* ----------------------------------------------------------
   0. CONFIG & AUTH HELPERS
   ---------------------------------------------------------- */
const BASE_URL = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('smartlab_admin_token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

/* ----------------------------------------------------------
   1. API LAYER
   ---------------------------------------------------------- */

/**
 * Fetch all reservations from the backend.
 * Returns the raw array from the API or [] on failure.
 */
async function fetchReservations() {
  try {
    const res = await fetch(`${BASE_URL}/reservations`, {
      headers: authHeaders()
    });
    if (res.status === 401) { adminLogout(); return []; }
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.error('fetchReservations:', err);
    showToast('Could not reach the server. Check your connection.', 'error');
    return [];
  }
}

/**
 * Approve or reject a pending reservation.
 * @param {number} id         – reservation_id
 * @param {'ALLOWED'|'REJECTED'|'CONDITIONAL'} status
 * @param {string}  [note]    – rejection_reason or conditions_note
 */
async function patchReservationStatus(id, status, note = '') {
  const body = { status };
  if (status === 'REJECTED'    && note) body.rejection_reason = note;
  if (status === 'CONDITIONAL' && note) body.conditions_note  = note;

  const res = await fetch(`${BASE_URL}/reservations/${id}/status`, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update status');
  return json.data;
}

/* ----------------------------------------------------------
   2. DATA STATE
   All UI reads from these arrays; only loadData() writes to them.
   ---------------------------------------------------------- */
let allReservations = []; // raw from API
let activeRows      = []; // DOM-like data objects for active section
let pendingRows     = []; // DOM-like data objects for pending section

/* ----------------------------------------------------------
   3. DATA NORMALISATION
   Transforms API response into flat display objects.
   ---------------------------------------------------------- */
function normaliseReservation(r) {
  const student   = r.reservingStudent || {};
  const firstName = student.first_name || '';
  const lastName  = student.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim() || 'Unknown';
  const college   = student.college || '';
  const resId     = `RES-${String(r.reservation_id).padStart(3, '0')}`;

  // Items as display strings
  const itemTags = (r.items || []).map(ri => {
    const name = ri.item?.name || 'Item';
    return ri.quantity > 1 ? `${name} (x${ri.quantity})` : name;
  });

  // Dates
  const dateRequested = r.date_requested ? new Date(r.date_requested) : null;
  const dateNeeded    = r.date_needed    ? new Date(r.date_needed)    : null;
  const timeStart     = r.time_start     ? new Date(r.time_start)     : null;

  const fmtDate = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtTime = d => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  // Map DB status → UI label
  const statusMap = {
    TO_REVIEW:   'pending',
    ALLOWED:     'active',
    REJECTED:    'rejected',
    CONDITIONAL: 'conditional'
  };
  const uiStatus = statusMap[r.status] || r.status?.toLowerCase() || 'unknown';

  // Initials for avatar
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??';
  const avatarColors = ['green', 'blue', 'purple', 'teal'];
  const avatarColor  = avatarColors[r.reservation_id % avatarColors.length];

  return {
    id:           r.reservation_id,
    resId,
    fullName,
    college,
    initials,
    avatarColor,
    itemTags,
    dateRequested: fmtDate(dateRequested),
    dateNeeded:    fmtDate(dateNeeded),
    timeStart:     fmtTime(timeStart),
    activityTitle: r.activity_title || '—',
    status:        uiStatus,
    dbStatus:      r.status,
    conditionsNote: r.conditions_note || '',
    rejectionReason: r.rejection_reason || '',
    raw:           r   // keep original for detail modal
  };
}

/* ----------------------------------------------------------
   4. LOAD & SPLIT DATA
   ---------------------------------------------------------- */
async function loadData() {
  showLoadingState(true);
  allReservations = await fetchReservations();

  const normalised = allReservations.map(normaliseReservation);

  // Pending = TO_REVIEW
  pendingRows = normalised.filter(r => r.dbStatus === 'TO_REVIEW');

  // Active = everything that is not TO_REVIEW and not REJECTED
  activeRows  = normalised.filter(r => r.dbStatus !== 'TO_REVIEW' && r.dbStatus !== 'REJECTED');

  showLoadingState(false);

  applyActiveTable();
  applyPendingTable();
}

function showLoadingState(loading) {
  const activeTbody  = document.getElementById('active-tbody');
  const pendingTbody = document.getElementById('pending-tbody');

  if (loading) {
    const placeholder = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted,#888);">Loading…</td></tr>`;
    if (activeTbody)  activeTbody.innerHTML  = placeholder;
    if (pendingTbody) pendingTbody.innerHTML = placeholder;
  }
}

/* ----------------------------------------------------------
   5. TOOLBAR STATE
   ---------------------------------------------------------- */
let currentFilter   = 'all status';
let currentSort     = 'name';
let searchQuery     = '';
let activePage      = 1;
let activePageSize  = 5;
let pendingPage     = 1;
let pendingPageSize = 5;

/* ----------------------------------------------------------
   6. RENDER HELPERS
   ---------------------------------------------------------- */
function avatarHtml(row) {
  return `<div class="avatar ${row.avatarColor}">${row.initials}</div>`;
}

function tagsHtml(tags) {
  return tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ----------------------------------------------------------
   7. ACTIVE TABLE
   ---------------------------------------------------------- */
function applyActiveTable() {
  let rows = [...activeRows];

  // Filter by status
  if (currentFilter !== 'all status') {
    rows = rows.filter(r => r.status === currentFilter);
  }

  // Search
  if (searchQuery) {
    rows = rows.filter(r => {
      const hay = `${r.fullName} ${r.college} ${r.itemTags.join(' ')} ${r.dateRequested} ${r.dateNeeded} ${r.status}`.toLowerCase();
      return hay.includes(searchQuery);
    });
  }

  // Sort
  rows.sort((a, b) => {
    switch (currentSort) {
      case 'name':         return a.fullName.localeCompare(b.fullName);
      case 'date_request': return new Date(a.dateRequested) - new Date(b.dateRequested);
      case 'due_return':   return new Date(a.dateNeeded)    - new Date(b.dateNeeded);
      case 'status':       return a.status.localeCompare(b.status);
      default:             return 0;
    }
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(rows.length / activePageSize));
  if (activePage > totalPages) activePage = totalPages;

  const slice = rows.slice((activePage - 1) * activePageSize, activePage * activePageSize);

  const tbody = document.getElementById('active-tbody');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted,#888);">No records found.</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(r => buildActiveRow(r)).join('');
    attachActiveRowHandlers();
  }

  updateCount('active-count', rows.length);
  renderPagination(
    'active-pagination', rows.length, activePage, activePageSize,
    p => { activePage = p; applyActiveTable(); },
    s => { activePageSize = s; activePage = 1; applyActiveTable(); }
  );

  // Sync card view
  const actSection = document.getElementById('active-section');
  const cardView   = actSection?.querySelector('.res-card-view');
  if (cardView && cardView.style.display !== 'none') buildCardView(actSection, slice, 'active');
}

function buildActiveRow(r) {
  const isDanger = r.dbStatus === 'ALLOWED' && isOverdue(r.dateNeeded);
  return `
    <tr data-id="${r.id}" data-name="${escHtml(r.fullName)}" data-date="${escHtml(r.dateRequested)}" data-due="${escHtml(r.dateNeeded)}" data-status="${r.status}">
      <td>
        <div class="user">
          ${avatarHtml(r)}
          <div>
            <div class="name">${escHtml(r.fullName)}</div>
            <div class="sub">${escHtml(r.college)} &bull; ${escHtml(r.resId)}</div>
          </div>
        </div>
      </td>
      <td>${tagsHtml(r.itemTags)}</td>
      <td>${escHtml(r.dateRequested)}</td>
      <td class="${isDanger ? 'danger' : ''}">${escHtml(r.dateNeeded)}</td>
      <td><span class="status ${r.status}">${capitalise(r.status)}</span></td>
      <td><i class="fa-solid fa-ellipsis action-menu-btn"></i></td>
    </tr>`;
}

function isOverdue(dateStr) {
  return dateStr && new Date(dateStr) < new Date();
}

function capitalise(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function attachActiveRowHandlers() {
  document.querySelectorAll('#active-tbody tr').forEach(tr => {
    tr.addEventListener('click', e => {
      if (e.target.classList.contains('action-menu-btn')) return;
      const id = parseInt(tr.dataset.id);
      const row = activeRows.find(r => r.id === id);
      if (row) openDetailModal(row, 'active');
    });
  });
}

/* ----------------------------------------------------------
   8. PENDING TABLE
   ---------------------------------------------------------- */
function applyPendingTable() {
  let rows = [...pendingRows];

  // Search
  if (searchQuery) {
    rows = rows.filter(r => {
      const hay = `${r.fullName} ${r.college} ${r.itemTags.join(' ')} ${r.dateRequested} ${r.dateNeeded}`.toLowerCase();
      return hay.includes(searchQuery);
    });
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(rows.length / pendingPageSize));
  if (pendingPage > totalPages) pendingPage = totalPages;

  const slice = rows.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize);

  const tbody = document.getElementById('pending-tbody');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted,#888);">No pending approvals.</td></tr>`;
  } else {
    tbody.innerHTML = slice.map((r, idx) => buildPendingRow(r, idx)).join('');
    attachPendingRowHandlers();
  }

  updateCount('pending-count', rows.length);
  renderPagination(
    'pending-pagination', rows.length, pendingPage, pendingPageSize,
    p => { pendingPage = p; applyPendingTable(); },
    s => { pendingPageSize = s; pendingPage = 1; applyPendingTable(); }
  );

  // Sync card view
  const pendSection = document.getElementById('pending-section');
  const cardView    = pendSection?.querySelector('.res-card-view');
  if (cardView && cardView.style.display !== 'none') buildCardView(pendSection, slice, 'pending');
}

function buildPendingRow(r, idx) {
  const reqId = `REQ-${String(idx + 1).padStart(3, '0')}`;
  return `
    <tr data-id="${r.id}">
      <td><span class="id">${reqId}</span></td>
      <td>
        <div class="user">
          ${avatarHtml(r)}
          <div>
            <div class="name">${escHtml(r.fullName)}</div>
            <div class="sub">${escHtml(r.college)}</div>
          </div>
        </div>
      </td>
      <td>${tagsHtml(r.itemTags)}</td>
      <td>${escHtml(r.dateNeeded)}${r.timeStart ? ' &middot; ' + escHtml(r.timeStart) : ''}</td>
      <td>${escHtml(r.dateNeeded)}</td>
      <td style="text-align:center;">
        <div class="action-btns">
          <button class="pending-btn accept" data-id="${r.id}">Accept</button>
          <button class="pending-btn reject" data-id="${r.id}">Reject</button>
        </div>
      </td>
    </tr>`;
}

function attachPendingRowHandlers() {
  // Row click → detail modal
  document.querySelectorAll('#pending-tbody tr').forEach(tr => {
    tr.addEventListener('click', e => {
      if (e.target.classList.contains('pending-btn')) return;
      const id  = parseInt(tr.dataset.id);
      const row = pendingRows.find(r => r.id === id);
      if (row) openDetailModal(row, 'pending');
    });
  });

  // Accept / Reject inline buttons
  document.querySelectorAll('#pending-tbody .pending-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id     = parseInt(btn.dataset.id);
      const action = btn.classList.contains('accept') ? 'ALLOWED' : 'REJECTED';
      await handleStatusChange(id, action);
    });
  });
}

/* ----------------------------------------------------------
   9. STATUS CHANGE (shared by inline buttons & modal)
   ---------------------------------------------------------- */
async function handleStatusChange(id, newStatus, note = '') {
  try {
    await patchReservationStatus(id, newStatus, note);
    showToast(`Reservation ${newStatus.toLowerCase()} successfully.`, 'success');
    await loadData(); // re-fetch & re-render
  } catch (err) {
    console.error('Status change error:', err);
    showToast(err.message || 'Failed to update reservation.', 'error');
  }
}

/* ----------------------------------------------------------
   10. DETAIL MODAL
   ---------------------------------------------------------- */
function openDetailModal(row, type) {
  document.getElementById('res-detail-modal')?.remove();

  const location = getLabLocation(row.college);

  let footerBtns = '';
  if (type === 'active') {
    if (row.dbStatus !== 'REJECTED') {
      footerBtns = `<button class="detail-btn-action" id="detail-action-btn">Mark Returned</button>`;
    }
  } else {
    footerBtns = `
      <button class="detail-btn-reject" id="detail-reject-btn">Reject</button>
      <button class="detail-btn-action" id="detail-accept-btn">Accept</button>`;
  }

  const statusNote = getStatusNote(row.dbStatus, row.conditionsNote, row.rejectionReason);

  const modalHTML = `
    <div class="detail-modal-overlay" id="res-detail-modal">
      <div class="detail-modal">
        <div class="detail-modal-header">
          <h2>${type === 'pending' ? 'Request Details' : 'Reservation Details'}</h2>
          <button class="detail-modal-close" id="detail-close-btn">&times;</button>
        </div>
        <div class="detail-modal-body">
          <div class="detail-row">
            <span class="detail-label">Requestor</span>
            <span class="detail-value">
              <div class="user">
                ${avatarHtml(row)}
                <div><div class="name">${escHtml(row.fullName)}</div><div class="sub">${escHtml(row.college)}</div></div>
              </div>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">${type === 'pending' ? 'Request ID' : 'Reservation ID'}</span>
            <span class="detail-value"><span class="id">${escHtml(row.resId)}</span></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Activity</span>
            <span class="detail-value">${escHtml(row.activityTitle)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Equipment / Items</span>
            <span class="detail-value"><div class="detail-tags">${tagsHtml(row.itemTags)}</div></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date Requested</span>
            <span class="detail-value">${escHtml(row.dateRequested)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date Needed</span>
            <span class="detail-value">${escHtml(row.dateNeeded)}${row.timeStart ? ' &middot; ' + escHtml(row.timeStart) : ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location</span>
            <span class="detail-value">${escHtml(location)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value"><span class="status ${row.status}">${capitalise(row.status)}</span></span>
          </div>
          ${statusNote ? `
          <div class="detail-row">
            <span class="detail-label">Note</span>
            <span class="detail-value detail-note">${escHtml(statusNote)}</span>
          </div>` : ''}
        </div>
        <div class="detail-modal-footer">
          <button class="detail-btn-close" id="detail-close-btn2">Close</button>
          ${footerBtns}
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const overlay = document.getElementById('res-detail-modal');

  const close = () => overlay.remove();
  document.getElementById('detail-close-btn')?.addEventListener('click', close);
  document.getElementById('detail-close-btn2')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Active: Mark Returned → set ALLOWED but handled visually (no dedicated "RETURNED" status in DB)
  // We keep it visual-only (update local state) to match existing schema — no RETURNED status in enum.
  document.getElementById('detail-action-btn')?.addEventListener('click', async () => {
    if (type === 'active') {
      // "Mark Returned" = archive the reservation visually; update local row status
      const idx = activeRows.findIndex(r => r.id === row.id);
      if (idx !== -1) {
        activeRows[idx].status   = 'returned';
        activeRows[idx].dbStatus = 'RETURNED_LOCAL'; // local-only flag
      }
      applyActiveTable();
      close();
      showToast('Reservation marked as returned.', 'success');
    } else {
      close();
      await handleStatusChange(row.id, 'ALLOWED');
    }
  });

  document.getElementById('detail-accept-btn')?.addEventListener('click', async () => {
    close();
    await handleStatusChange(row.id, 'ALLOWED');
  });

  document.getElementById('detail-reject-btn')?.addEventListener('click', async () => {
    close();
    await handleStatusChange(row.id, 'REJECTED');
  });

  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function getLabLocation(college) {
  const c = (college || '').toLowerCase();
  if (c.includes('chem'))    return 'Room 201 — Laboratory A';
  if (c.includes('bio'))     return 'Room 105 — Biology Lab';
  if (c.includes('phys'))    return 'Room 302 — Physics Lab';
  return 'Room 101 — General Lab';
}

function getStatusNote(dbStatus, conditionsNote, rejectionReason) {
  if (dbStatus === 'CONDITIONAL') return conditionsNote || 'Requires coordination with department.';
  if (dbStatus === 'REJECTED')    return rejectionReason || 'Reservation was rejected.';
  return '';
}

/* ----------------------------------------------------------
   11. CARD VIEW BUILDER
   ---------------------------------------------------------- */
function buildCardView(section, rows, type) {
  const cardContainer = section.querySelector('.res-card-view');
  if (!cardContainer) return;

  cardContainer.innerHTML = '';

  if (!rows || rows.length === 0) {
    cardContainer.innerHTML = `<div class="empty-state">No records found.</div>`;
    return;
  }

  rows.forEach(row => {
    const card = document.createElement('div');
    card.className = 'res-card';

    if (type === 'active') {
      const isDanger = row.dbStatus === 'ALLOWED' && isOverdue(row.dateNeeded);
      card.innerHTML = `
        <div class="res-card-header">
          ${avatarHtml(row)}
          <div>
            <div class="res-card-name">${escHtml(row.fullName)}</div>
            <div class="res-card-sub">${escHtml(row.college)} &bull; ${escHtml(row.resId)}</div>
          </div>
        </div>
        <div class="res-card-tags">${tagsHtml(row.itemTags)}</div>
        <div class="res-card-meta">
          <span>📅 Requested: ${escHtml(row.dateRequested)}</span>
          <span style="${isDanger ? 'color:#e73535;font-weight:500;' : ''}">⏰ Due: ${escHtml(row.dateNeeded)}</span>
        </div>
        <div class="res-card-footer"><span class="status ${row.status}">${capitalise(row.status)}</span></div>`;
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => openDetailModal(row, 'active'));
    }

    if (type === 'pending') {
      card.innerHTML = `
        <div class="res-card-header">
          ${avatarHtml(row)}
          <div>
            <div class="res-card-name">${escHtml(row.fullName)}</div>
            <div class="res-card-sub">${escHtml(row.college)}</div>
          </div>
          <span class="id" style="margin-left:auto;">${escHtml(row.resId)}</span>
        </div>
        <div class="res-card-tags">${tagsHtml(row.itemTags)}</div>
        <div class="res-card-meta">
          <span>📅 ${escHtml(row.dateNeeded)}${row.timeStart ? ' · ' + escHtml(row.timeStart) : ''}</span>
          <span>⏰ Until: ${escHtml(row.dateNeeded)}</span>
        </div>
        <div class="res-card-actions">
          <button class="pending-btn accept card-accept">Accept</button>
          <button class="pending-btn reject card-reject">Reject</button>
        </div>`;
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.classList.contains('card-accept') || e.target.classList.contains('card-reject')) return;
        openDetailModal(row, 'pending');
      });
      card.querySelector('.card-accept').addEventListener('click', async e => {
        e.stopPropagation();
        await handleStatusChange(row.id, 'ALLOWED');
      });
      card.querySelector('.card-reject').addEventListener('click', async e => {
        e.stopPropagation();
        await handleStatusChange(row.id, 'REJECTED');
      });
    }

    cardContainer.appendChild(card);
  });
}

/* ----------------------------------------------------------
   12. PAGINATION
   ---------------------------------------------------------- */
function renderPagination(containerId, totalItems, currentPage, pageSize, onPageChange, onSizeChange) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  wrap.innerHTML = `
    <div class="rows-per-page">
      <span>Rows per page:</span>
      <select class="page-size-select">
        ${[5, 10, 20].map(n => `<option value="${n}"${n === pageSize ? ' selected' : ''}>${n}</option>`).join('')}
      </select>
    </div>
    <div class="pagination-controls">
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} title="Previous">
        <i class="fa-solid fa-chevron-left" style="font-size:11px;"></i>
      </button>
      <button class="page-btn active">${currentPage}</button>
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} title="Next">
        <i class="fa-solid fa-chevron-right" style="font-size:11px;"></i>
      </button>
    </div>`;

  wrap.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p >= 1 && p <= totalPages) onPageChange(p);
    });
  });

  wrap.querySelector('.page-size-select').addEventListener('change', e => {
    onSizeChange(parseInt(e.target.value));
  });
}

/* ----------------------------------------------------------
   13. TOAST NOTIFICATIONS
   ---------------------------------------------------------- */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const colors = { success: '#22c55e', error: '#e73535', info: '#3b82f6' };
  const toast  = document.createElement('div');
  toast.style.cssText = `
    background:${colors[type] || colors.info};
    color:#fff;padding:12px 18px;border-radius:8px;
    font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.15);
    animation:slideIn .25s ease;max-width:320px;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ----------------------------------------------------------
   14. HELPERS
   ---------------------------------------------------------- */
function updateCount(id, count) {
  const el = document.getElementById(id);
  if (el) el.textContent = `${count} record${count !== 1 ? 's' : ''}`;
}

/* ----------------------------------------------------------
   15. TOOLBAR DROPDOWNS
   ---------------------------------------------------------- */
document.querySelectorAll('.toolbar .dropdown').forEach(dropdown => {
  const btn   = dropdown.querySelector('.dropdown-btn');
  const menu  = dropdown.querySelector('.dropdown-menu');
  const items = dropdown.querySelectorAll('.item');
  const label = btn.querySelector('span');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.toolbar .dropdown-menu').forEach(m => {
      if (m !== menu) m.style.display = 'none';
    });
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });

  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      label.textContent = item.textContent.trim();
      menu.style.display = 'none';

      const menuId = menu.id;
      if (menuId === 'filterMenu') {
        currentFilter = item.dataset.value || item.textContent.trim().toLowerCase();
        activePage    = 1;
        applyActiveTable();
      } else if (menuId === 'sortMenu') {
        currentSort = item.dataset.value || 'name';
        activePage  = 1;
        applyActiveTable();
      } else if (menuId === 'viewMenu') {
        const view = item.dataset.value || 'table';
        setViewForSection('active-section',  view);
        setViewForSection('pending-section', view);
      }
    });
  });
});

window.addEventListener('click', () => {
  document.querySelectorAll('.toolbar .dropdown-menu').forEach(m => {
    m.style.display = 'none';
  });
});

/* ----------------------------------------------------------
   16. SECTION VIEW TOGGLE (table / card)
   ---------------------------------------------------------- */
function setViewForSection(sectionId, view) {
  const section   = document.getElementById(sectionId);
  if (!section) return;

  const tableView = section.querySelector('.res-table-view');
  const cardView  = section.querySelector('.res-card-view');
  const viewBtns  = section.querySelectorAll('.view-toggle-btn');

  viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === view));

  const isActive  = sectionId === 'active-section';
  const isPending = sectionId === 'pending-section';

  if (view === 'card') {
    if (tableView) tableView.style.display = 'none';
    if (cardView)  cardView.style.display  = '';

    // determine current slice to pass to card builder
    let rows = isActive  ? [...activeRows]  : [...pendingRows];
    if (isActive && currentFilter !== 'all status') rows = rows.filter(r => r.status === currentFilter);
    if (searchQuery) {
      rows = rows.filter(r => {
        const hay = `${r.fullName} ${r.college} ${r.itemTags.join(' ')}`.toLowerCase();
        return hay.includes(searchQuery);
      });
    }
    const pg   = isActive ? activePage  : pendingPage;
    const pgSz = isActive ? activePageSize : pendingPageSize;
    const slice = rows.slice((pg - 1) * pgSz, pg * pgSz);
    buildCardView(section, slice, isActive ? 'active' : 'pending');
  } else {
    if (tableView) tableView.style.display = '';
    if (cardView)  cardView.style.display  = 'none';
  }
}

document.querySelectorAll('.reservation-table-card').forEach(card => {
  card.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setViewForSection(card.id, view);
      document.querySelectorAll('#viewMenu .item').forEach(i => {
        const match = (i.dataset.value || i.textContent.trim().toLowerCase()) === view;
        i.classList.toggle('active', match);
        if (match) {
          const lbl = document.querySelector('#viewDropdown .dropdown-btn span');
          if (lbl) lbl.textContent = i.textContent.trim();
        }
      });
    });
  });
});

/* ----------------------------------------------------------
   17. SHOW TOGGLE (Active Reservations / Pending Approval)
   ---------------------------------------------------------- */
const activeSection  = document.getElementById('active-section');
const pendingSection = document.getElementById('pending-section');
const showToggleBtns = document.querySelectorAll('.show-toggle-btn');

function showSection(which) {
  activeSection.style.display  = which === 'all'              ? '' : 'none';
  pendingSection.style.display = which === 'pending-approval' ? '' : 'none';
  showToggleBtns.forEach(b => b.classList.toggle('active', b.dataset.show === which));
}

showToggleBtns.forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.show));
});

/* ----------------------------------------------------------
   18. SEARCH BOX
   ---------------------------------------------------------- */
document.getElementById('searchBox')?.addEventListener('input', e => {
  searchQuery  = e.target.value.trim().toLowerCase();
  activePage   = 1;
  pendingPage  = 1;
  applyActiveTable();
  applyPendingTable();
});

/* ----------------------------------------------------------
   19. INIT
   ---------------------------------------------------------- */
showSection('all');
loadData();
