(function initCalendarPage() {
  const todayDate = new Date();
  let calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  let modalDate = null;
  let activeFilter = 'all';

  // Live data fetched from API
  let reservations = [];
  let accountabilityRecords = [];
  // Manual events added by admin (in-memory only)
  let manualEvents = [];

  let isLoading = false;

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtD(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
  function fmtFull(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('default', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  function toDateStr(dateVal) {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d) ? null : fmtD(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const ty = todayDate.getFullYear(), tm = todayDate.getMonth();
  const todayStr = fmtD(ty, tm, todayDate.getDate());

  // ---- colour/type map ----
  const TYPE_DOT = {
    res: '#3b82f6',
    acc: '#ef4444',
    mai: '#eab308',
    man: '#a855f7'
  };

  // ---- Build combined event list for a date ----
  function buildEvents() {
    const list = [];

    reservations.forEach(r => {
      const dateStr = toDateStr(r.date_needed);
      if (!dateStr) return;
      const student = r.reservingStudent
        ? `${r.reservingStudent.first_name} ${r.reservingStudent.last_name}`
        : 'Unknown';
      const statusLabel = r.status ? ` [${r.status.replace(/_/g,' ')}]` : '';
      list.push({
        date: dateStr,
        type: 'res',
        label: `${r.activity_title || `RES-${String(r.reservation_id).padStart(3,'0')}`}${statusLabel}`,
        detail: {
          id: `RES-${String(r.reservation_id).padStart(3,'0')}`,
          title: r.activity_title || '—',
          student,
          status: r.status || '—',
          timeStart: r.time_start ? new Date(r.time_start).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—',
          timeEnd:   r.time_end   ? new Date(r.time_end).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—',
          conditions: r.conditions_note || null,
          rejection:  r.rejection_reason || null
        },
        source: 'api'
      });
    });

    accountabilityRecords.forEach(a => {
      const dateStr = toDateStr(a.date_time_broken || a.created_at);
      if (!dateStr) return;
      const extras = parseSpecifics(a.specifics);
      const incidentType = extras.incident_type || (a.specifics?.startsWith('LOST:') ? 'LOST' : 'DAMAGED');
      list.push({
        date: dateStr,
        type: 'acc',
        label: `${incidentType}: ${a.item_description || 'Item'}`,
        detail: {
          id: `ACC-${String(a.accountability_id).padStart(3,'0')}`,
          item: a.item_description || '—',
          incidentType,
          quantity: a.quantity_broken || 1,
          status: a.resolution_status || '—',
          note: extras.note || '—',
          teacher: extras.teacher || '—',
          subject: extras.subject || '—',
          section: extras.program_section || '—'
        },
        source: 'api'
      });
    });

    manualEvents.forEach(e => list.push(e));
    return list;
  }

  function parseSpecifics(s) {
    if (!s) return {};
    try { return JSON.parse(s); } catch { return {}; }
  }

  function eventsFor(dateStr) {
    const all = buildEvents();
    return all.filter(e => e.date === dateStr && (activeFilter === 'all' || e.type === activeFilter));
  }

  // ---- API Fetching ----
  async function fetchAll() {
    if (isLoading) return;
    isLoading = true;
    showLoadingOverlay(true);
    try {
      const headers = typeof getHeaders === 'function' ? getHeaders() : {};
      const BASE = (typeof CONFIG !== 'undefined' && CONFIG.BASE_URL) ? CONFIG.BASE_URL : 'http://localhost:5000/api';

      const [resRes, accRes] = await Promise.all([
        fetch(`${BASE}/reservations`, { headers }),
        fetch(`${BASE}/accountability`, { headers })
      ]);

      if (resRes.ok) {
        const d = await resRes.json();
        reservations = d.success ? d.data : (Array.isArray(d) ? d : []);
      }
      if (accRes.ok) {
        const d = await accRes.json();
        accountabilityRecords = d.success ? d.data : (Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      isLoading = false;
      showLoadingOverlay(false);
      renderCalendar();
    }
  }

  function showLoadingOverlay(show) {
    let el = document.getElementById('cal-loading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cal-loading';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;font-size:14px;color:#205e38;font-family:Poppins,sans-serif;gap:8px;';
      el.innerHTML = `<i class='bx bx-loader-alt bx-spin' style="font-size:22px"></i> Loading calendar data…`;
      document.body.appendChild(el);
    }
    el.style.display = show ? 'flex' : 'none';
  }

  // ---- Render Calendar ----
  function renderCalendar() {
    const grid = document.getElementById('cal-grid');
    grid.querySelectorAll('.cal-cell').forEach(c => c.remove());

    const cy = calCur.getFullYear(), cm = calCur.getMonth();
    document.getElementById('cal-month-label').textContent =
      calCur.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDow    = new Date(cy, cm, 1).getDay();
    const daysInMonth = new Date(cy, cm + 1, 0).getDate();
    const daysInPrev  = new Date(cy, cm, 0).getDate();
    const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';

      let day, dateStr, otherMonth = false;
      if (i < firstDow) {
        day = daysInPrev - firstDow + 1 + i;
        dateStr = fmtD(cy, cm - 1, day);
        otherMonth = true;
      } else if (i >= firstDow + daysInMonth) {
        day = i - firstDow - daysInMonth + 1;
        dateStr = fmtD(cy, cm + 1, day);
        otherMonth = true;
      } else {
        day = i - firstDow + 1;
        dateStr = fmtD(cy, cm, day);
      }

      if (otherMonth) cell.classList.add('cal-other-month');
      if (dateStr === todayStr) cell.classList.add('cal-today');

      const dn = document.createElement('div');
      dn.className = 'cal-day-num';
      dn.textContent = day;
      cell.appendChild(dn);

      const dayEvents = eventsFor(dateStr);

      dayEvents.slice(0, 2).forEach(ev => {
        const pill = document.createElement('div');
        pill.className = `cal-pill ${ev.type}`;
        const dot = document.createElement('span');
        dot.className = 'cal-pill-dot';
        pill.appendChild(dot);
        pill.appendChild(document.createTextNode(ev.label));
        pill.title = ev.label;
        pill.addEventListener('click', e => { e.stopPropagation(); openModal(dateStr); });
        cell.appendChild(pill);
      });

      if (dayEvents.length > 2) {
        const more = document.createElement('div');
        more.className = 'cal-more';
        more.textContent = `+${dayEvents.length - 2} more`;
        more.addEventListener('click', e => { e.stopPropagation(); openModal(dateStr); });
        cell.appendChild(more);
      }

      cell.addEventListener('click', () => openModal(dateStr));
      grid.appendChild(cell);
    }
  }

  // ---- Modal ----
  function openModal(dateStr) {
    modalDate = dateStr;
    document.getElementById('cal-modal-title').textContent = 'Events';
    document.getElementById('cal-modal-date-label').textContent = fmtFull(dateStr);
    document.getElementById('cal-ev-date').value = dateStr;
    document.getElementById('cal-ev-label').value = '';
    renderEventList(dateStr);
    document.getElementById('cal-overlay').classList.add('active');
  }

  function closeModal() {
    document.getElementById('cal-overlay').classList.remove('active');
    modalDate = null;
  }

  function renderEventList(dateStr) {
    const el = document.getElementById('cal-event-list');
    el.innerHTML = '';
    // Show all types in modal regardless of active filter
    const evs = buildEvents().filter(e => e.date === dateStr);

    if (!evs.length) {
      el.innerHTML = `<p class="cal-no-events">No events on this day.</p>`;
      return;
    }

    evs.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'cal-event-row';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'flex-start';
      row.style.gap = '4px';

      // Header row: dot + label + delete (manual only)
      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%';

      const dot = document.createElement('div');
      dot.className = 'cal-event-type-dot';
      dot.style.background = TYPE_DOT[ev.type] || '#888';
      dot.style.flexShrink = '0';

      const lbl = document.createElement('div');
      lbl.className = 'cal-event-name';
      lbl.style.flex = '1';
      lbl.textContent = ev.label;

      headerRow.appendChild(dot);
      headerRow.appendChild(lbl);

      if (ev.source === 'manual') {
        const del = document.createElement('button');
        del.className = 'cal-event-del';
        del.innerHTML = '&#x2715;';
        del.title = 'Delete event';
        del.addEventListener('click', () => {
          const idx = manualEvents.indexOf(ev);
          if (idx !== -1) manualEvents.splice(idx, 1);
          renderCalendar();
          renderEventList(dateStr);
        });
        headerRow.appendChild(del);
      }

      row.appendChild(headerRow);

      // Detail block for API events
      if (ev.source === 'api' && ev.detail) {
        const detail = document.createElement('div');
        detail.style.cssText = 'font-size:11px;color:#6b7280;padding:6px 10px;background:var(--body-color,#f9fafb);border-radius:6px;width:100%;box-sizing:border-box;line-height:1.7;';

        if (ev.type === 'res') {
          const d = ev.detail;
          const statusColor = {
            APPROVED: '#166534', TO_REVIEW: '#854d0e', REJECTED: '#991b1b',
            CONDITIONAL: '#1d4ed8', COMPLETED: '#374151'
          }[d.status] || '#6b7280';
          detail.innerHTML = `
            <div><b style="color:#374151">${d.id}</b> &nbsp;
              <span style="color:${statusColor};font-weight:600;">${d.status.replace(/_/g,' ')}</span>
            </div>
            <div>📋 ${d.title}</div>
            <div>👤 ${d.student}</div>
            <div>⏰ ${d.timeStart} – ${d.timeEnd}</div>
            ${d.conditions ? `<div>⚠️ ${d.conditions}</div>` : ''}
            ${d.rejection  ? `<div style="color:#991b1b">❌ ${d.rejection}</div>` : ''}
          `;
        } else if (ev.type === 'acc') {
          const d = ev.detail;
          const statusColor = d.status === 'PENDING' ? '#854d0e' : '#166534';
          detail.innerHTML = `
            <div><b style="color:#374151">${d.id}</b> &nbsp;
              <span style="color:${statusColor};font-weight:600;">${d.status}</span>
            </div>
            <div>🧪 ${d.item} (×${d.quantity})</div>
            <div>📌 ${d.incidentType}</div>
            <div>👨‍🏫 ${d.teacher} &nbsp;|&nbsp; ${d.subject}</div>
            <div>🏫 ${d.section}</div>
            <div>📝 ${d.note}</div>
          `;
        }

        // dark mode override for detail box
        detail.setAttribute('data-cal-detail', '1');
        row.appendChild(detail);
      }

      el.appendChild(row);
    });

    // Apply dark mode to detail boxes
    if (document.body.classList.contains('dark')) {
      el.querySelectorAll('[data-cal-detail]').forEach(d => {
        d.style.background = '#2a2a2a';
        d.style.color = '#9E9E9E';
      });
    }
  }

  // ---- Save Manual Event ----
  document.getElementById('cal-btn-save').addEventListener('click', () => {
    const label = document.getElementById('cal-ev-label').value.trim();
    const type  = document.getElementById('cal-ev-type').value;
    const date  = document.getElementById('cal-ev-date').value;
    if (!label || !date) return;

    manualEvents.push({ date, label, type, source: 'manual' });
    manualEvents.sort((a, b) => a.date.localeCompare(b.date));

    renderCalendar();
    document.getElementById('cal-ev-date').value = date;
    renderEventList(date);
    document.getElementById('cal-ev-label').value = '';
  });

  // ---- Refresh button ----
  const refreshBtn = document.getElementById('cal-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => fetchAll());
  }

  // ---- Toolbar Nav ----
  document.getElementById('cal-prev').addEventListener('click', () => {
    calCur = new Date(calCur.getFullYear(), calCur.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calCur = new Date(calCur.getFullYear(), calCur.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    renderCalendar();
  });
  document.getElementById('cal-add-btn').addEventListener('click', () => {
    openModal(todayStr);
  });

  // ---- Close modal ----
  document.getElementById('cal-modal-close').addEventListener('click', closeModal);
  document.getElementById('cal-btn-cancel').addEventListener('click', closeModal);
  document.getElementById('cal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('cal-overlay')) closeModal();
  });

  // ---- View Dropdown ----
  const viewDropdown = document.getElementById('cal-view-dropdown');
  const viewBtn      = document.getElementById('cal-view-btn');
  const viewMenu     = document.getElementById('cal-view-menu');
  const viewLabel    = document.getElementById('cal-view-label');

  viewBtn.addEventListener('click', e => {
    e.stopPropagation();
    viewDropdown.classList.toggle('open');
    document.getElementById('cal-custom-select').classList.remove('open');
  });

  viewMenu.querySelectorAll('.cal-view-option').forEach(opt => {
    opt.addEventListener('click', () => {
      viewMenu.querySelectorAll('.cal-view-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      viewLabel.textContent = opt.textContent.trim();
      viewDropdown.classList.remove('open');
      renderCalendar();
    });
  });

  // ---- Category Select ----
  const customSelect = document.getElementById('cal-custom-select');
  const selectBtn    = document.getElementById('cal-select-btn');
  const selectMenu   = document.getElementById('cal-select-menu');
  const selectLabel  = document.getElementById('cal-select-label');

  selectBtn.addEventListener('click', e => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
    viewDropdown.classList.remove('open');
  });

  selectMenu.querySelectorAll('.cal-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectMenu.querySelectorAll('.cal-select-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      activeFilter = opt.dataset.filter;
      selectLabel.textContent = opt.textContent.trim();
      customSelect.classList.remove('open');
      renderCalendar();
    });
  });

  // ---- Close dropdowns on outside click ----
  document.addEventListener('click', () => {
    viewDropdown.classList.remove('open');
    customSelect.classList.remove('open');
  });

  // ---- Init ----
  renderCalendar();   // render with empty data first (fast)
  fetchAll();         // then populate from API
})();