(function initCalendarPage() {
  const todayDate = new Date();
  let calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  let modalDate = null;
  let activeFilter = 'all';

  // Live data fetched from API
  let reservations = [];
  let accountabilityRecords = [];
  // Manual events — loaded from API (calendar_events table)
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
    // Handle "YYYY-MM-DD" strings directly to avoid timezone shift
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    const d = new Date(dateVal);
    return isNaN(d) ? null : fmtD(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function fmtTime(val) {
    if (!val) return '—';
    // Backend returns Time as "1970-01-01THH:MM:SS.000Z" or "HH:MM:SS"
    const d = new Date(val);
    if (!isNaN(d)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Fallback: raw "HH:MM" string
    return String(val).substring(0, 5);
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

  // ---- Build combined event list ----
  function buildEvents() {
    const list = [];

    // ── RESERVATIONS ──────────────────────────────────────────────
    // New schema: date_borrowed (Date), subject, student relation,
    //             time_start / time_end (Time), status, conditional_remarks
    reservations.forEach(r => {
      const dateStr = toDateStr(r.date_borrowed);   // FIX: was r.date_needed
      if (!dateStr) return;

      // FIX: was r.reservingStudent — new schema uses r.student
      const student = r.student
        ? `${r.student.first_name} ${r.student.last_name}`
        : 'Unknown';

      const statusLabel = r.status ? ` [${r.status.replace(/_/g, ' ')}]` : '';
      // FIX: was r.activity_title — new schema uses r.subject
      const title = r.subject || `RES-${String(r.reservation_id).padStart(3, '0')}`;

      // Build a readable item list from all joined tables
      const mapItems = (arr, nameFn) =>
        (arr || []).map(i => {
          const n = nameFn(i);
          return n ? (i.quantity > 1 ? `${n} ×${i.quantity}` : n) : null;
        }).filter(Boolean);

      const items = [
        ...mapItems(r.reservation_apparatus, i => i.inventory_apparatus?.apparatus_name),
        ...mapItems(r.reservation_equipment, i => i.inventory_equipment?.equipment_name),
        ...mapItems(r.reservation_glassware, i => i.inventory_glassware?.glassware),
        ...mapItems(r.reservation_supplies,  i => i.inventory_supplies?.supplies_name),
        ...(r.chemical_items || []).map(ci => ci.chemical?.chemical_name).filter(Boolean),
      ];

      list.push({
        date:  dateStr,
        type:  'res',
        label: `${title}${statusLabel}`,
        detail: {
          id:               `RES-${String(r.reservation_id).padStart(3, '0')}`,
          rawId:            r.reservation_id,
          title,
          student,
          studentId:        r.student?.student_id || '—',
          section:          r.course_year_section || r.student?.section || '—',
          status:           r.status || '—',
          timeStart:        fmtTime(r.time_start),
          timeEnd:          fmtTime(r.time_end),
          conditions:       r.conditional_remarks || null,
          items:            items.length ? items : null,
          groupNumber:      r.group_number || null,
          // Link to accountability: accountabilities[] joined on reservation_id
          accountabilityIds: (r.accountabilities || []).map(a => a.accountability_id),
        },
        source: 'api'
      });
    });

    // ── ACCOUNTABILITY ────────────────────────────────────────────
    // New schema: date_borrowed (Date), materials_broken, member_name,
    //             prof_name, subject, program_course_section,
    //             remarks, student relation, reservation relation
    accountabilityRecords.forEach(a => {
      // FIX: was a.date_time_broken — new schema uses a.date_borrowed
      const dateStr = toDateStr(a.date_borrowed || a.created_at);
      if (!dateStr) return;

      // FIX: was parseSpecifics(a.specifics) / a.item_description — new schema
      //      stores plain varchar materials_broken and structured relations
      const itemName = a.materials_broken || 'Item';
      const status   = a.resolved ? 'RESOLVED' : (a.remarks || 'PENDING');

      // Linked reservation label
      const resLabel = a.reservation
        ? `RES-${String(a.reservation.reservation_id).padStart(3, '0')}` +
          (a.reservation.subject ? ` — ${a.reservation.subject}` : '')
        : (a.reservation_id ? `RES-${String(a.reservation_id).padStart(3, '0')}` : null);

      // All responsible persons
      const persons = [];
      if (a.member_name) persons.push(a.member_name);
      (a.members || []).forEach(m => {
        if (m.member_name && m.member_name !== a.member_name) persons.push(m.member_name);
      });

      list.push({
        date:  dateStr,
        type:  'acc',
        label: `BROKEN/LOST: ${itemName}`,
        detail: {
          id:           `ACC-${String(a.accountability_id).padStart(3, '0')}`,
          rawId:        a.accountability_id,
          item:         itemName,
          status,
          resolved:     a.resolved,
          persons:      persons.length ? persons.join(', ') : '—',
          teacher:      a.prof_name  || '—',
          subject:      a.subject    || '—',
          section:      a.program_course_section || '—',
          timeStart:    fmtTime(a.time_start),
          timeEnd:      fmtTime(a.time_end),
          deadline:     a.deadline   ? toDateStr(a.deadline) : null,
          note:         a.remarks    || '—',
          emailStage:   a.email_stage || 'none',
          // Linked reservation (FK)
          reservationId:    a.reservation_id || null,
          reservationLabel: resLabel,
        },
        source: 'api'
      });
    });

    manualEvents.forEach(e => list.push(e));
    return list;
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

      const [resRes, accRes, calRes] = await Promise.all([
        fetch(`${BASE}/reservations`,      { headers }),
        fetch(`${BASE}/accountability`,    { headers }),
        fetch(`${BASE}/calendar/events`,   { headers }),
      ]);

      if (resRes.ok) {
        const d = await resRes.json();
        reservations = d.success ? d.data : (Array.isArray(d) ? d : []);
      }
      if (accRes.ok) {
        const d = await accRes.json();
        accountabilityRecords = d.success ? d.data : (Array.isArray(d) ? d : []);
      }
      if (calRes.ok) {
        const d = await calRes.json();
        const raw = d.success ? d.data : (Array.isArray(d) ? d : []);
        // Map DB rows to the internal event shape
        manualEvents = raw.map(ev => ({
          event_id: ev.event_id,
          date:     toDateStr(ev.date),
          label:    ev.label,
          type:     ev.type || 'man',
          source:   'manual',
        }));
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

  // ---- Render event detail cards ----
  function renderEventList(dateStr) {
    const el = document.getElementById('cal-event-list');
    el.innerHTML = '';
    const evs = buildEvents().filter(e => e.date === dateStr);

    if (!evs.length) {
      el.innerHTML = `<p class="cal-no-events">No events on this day.</p>`;
      return;
    }

    const isDark = document.body.classList.contains('dark');
    const detailBg    = isDark ? '#2a2a2a' : 'var(--body-color,#f9fafb)';
    const detailColor = isDark ? '#9E9E9E' : 'inherit';

    evs.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'cal-event-row';
      row.style.cssText = 'flex-direction:column;align-items:flex-start;gap:4px;';

      // Header: coloured dot + label + delete (manual only)
      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%';

      const dot = document.createElement('div');
      dot.className = 'cal-event-type-dot';
      dot.style.cssText = `background:${TYPE_DOT[ev.type] || '#888'};flex-shrink:0;`;

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
        del.addEventListener('click', async () => {
          try {
            const headers = typeof getHeaders === 'function' ? getHeaders() : {};
            const BASE = (typeof CONFIG !== 'undefined' && CONFIG.BASE_URL) ? CONFIG.BASE_URL : 'http://localhost:5000/api';
            if (ev.event_id) {
              await fetch(`${BASE}/calendar/events/${ev.event_id}`, {
                method: 'DELETE',
                headers,
              });
            }
            const idx = manualEvents.findIndex(m => m.event_id === ev.event_id);
            if (idx !== -1) manualEvents.splice(idx, 1);
          } catch (err) {
            console.error('Delete event error:', err);
            const idx = manualEvents.findIndex(m => m.event_id === ev.event_id);
            if (idx !== -1) manualEvents.splice(idx, 1);
          }
          renderCalendar();
          renderEventList(dateStr);
        });
        headerRow.appendChild(del);
      }

      row.appendChild(headerRow);

      // Detail block for API events
      if (ev.source === 'api' && ev.detail) {
        const detail = document.createElement('div');
        detail.style.cssText = `font-size:11px;color:${detailColor};padding:8px 10px;background:${detailBg};border-radius:6px;width:100%;box-sizing:border-box;line-height:1.85;`;

        if (ev.type === 'res') {
          const d = ev.detail;
          const statusColor = {
            Approved:    '#166534',
            Pending:     '#854d0e',
            Rejected:    '#991b1b',
            Conditional: '#1d4ed8',
            Completed:   '#374151',
            Returned:    '#374151',
          }[d.status] || '#6b7280';

          // Build accountability badges if this reservation has linked records
          const accBadges = d.accountabilityIds && d.accountabilityIds.length
            ? `<div style="margin-top:4px;">
                🔗 Linked accountability:
                ${d.accountabilityIds.map(aid =>
                  `<a href="accountability.html#acc-${aid}"
                      style="margin-left:4px;font-size:11px;color:#ef4444;font-weight:600;
                             text-decoration:none;border:1px solid #ef4444;border-radius:4px;padding:1px 6px;"
                      title="Go to ACC-${String(aid).padStart(3,'0')}">
                    ACC-${String(aid).padStart(3,'0')}
                  </a>`).join('')}
               </div>`
            : '';

          const itemsHtml = d.items && d.items.length
            ? `<div>🧪 ${d.items.slice(0,4).join(', ')}${d.items.length > 4 ? ` +${d.items.length - 4} more` : ''}</div>`
            : '';

          detail.innerHTML = `
            <div>
              <b style="color:#374151">${d.id}</b> &nbsp;
              <span style="color:${statusColor};font-weight:600;">${d.status.replace(/_/g,' ')}</span>
            </div>
            <div>📋 ${d.title}</div>
            <div>👤 ${d.student} &nbsp;·&nbsp; <span style="color:#6b7280">${d.studentId}</span></div>
            <div>🏫 ${d.section}${d.groupNumber ? ` &nbsp;·&nbsp; Group ${d.groupNumber}` : ''}</div>
            <div>⏰ ${d.timeStart} – ${d.timeEnd}</div>
            ${itemsHtml}
            ${d.conditions ? `<div>⚠️ ${d.conditions}</div>` : ''}
            ${accBadges}
            <div style="margin-top:6px;">
              <a href="reservation.html#res-${d.rawId}"
                 style="font-size:11px;color:#205e38;font-weight:600;text-decoration:none;
                        border:1px solid #205e38;border-radius:4px;padding:2px 8px;">
                View Reservation →
              </a>
            </div>
          `;

        } else if (ev.type === 'acc') {
          const d = ev.detail;
          const statusColor = d.resolved ? '#166534' : '#854d0e';
          const stageMap = {
            none: '—', student: 'Notified student', professor: 'Notified professor',
            dean: 'Escalated to dean', resolved: 'Resolved'
          };

          // Linked reservation badge
          const resLink = d.reservationLabel
            ? `<div>🔗 Linked reservation:
                <a href="reservation.html#res-${d.reservationId}"
                   style="margin-left:4px;font-size:11px;color:#3b82f6;font-weight:600;
                          text-decoration:none;border:1px solid #3b82f6;border-radius:4px;padding:1px 6px;">
                  ${d.reservationLabel}
                </a>
               </div>`
            : '';

          detail.innerHTML = `
            <div>
              <b style="color:#374151">${d.id}</b> &nbsp;
              <span style="color:${statusColor};font-weight:600;">${d.resolved ? 'RESOLVED' : 'PENDING'}</span>
            </div>
            <div>🧪 ${d.item}</div>
            <div>👤 ${d.persons}</div>
            <div>👨‍🏫 ${d.teacher} &nbsp;·&nbsp; ${d.subject}</div>
            <div>🏫 ${d.section}</div>
            <div>⏰ ${d.timeStart} – ${d.timeEnd}</div>
            ${d.deadline ? `<div>📅 Deadline: <b>${d.deadline}</b></div>` : ''}
            <div>📧 Email stage: ${stageMap[d.emailStage] || d.emailStage}</div>
            ${d.note && d.note !== '—' ? `<div>📝 ${d.note}</div>` : ''}
            ${resLink}
            <div style="margin-top:6px;">
              <a href="accountability.html#acc-${d.rawId}"
                 style="font-size:11px;color:#205e38;font-weight:600;text-decoration:none;
                        border:1px solid #205e38;border-radius:4px;padding:2px 8px;">
                View Accountability →
              </a>
            </div>
          `;
        }

        row.appendChild(detail);
      }

      el.appendChild(row);
    });
  }

  // ---- Save Manual Event (persisted to backend) ----
  document.getElementById('cal-btn-save').addEventListener('click', async () => {
    const label = document.getElementById('cal-ev-label').value.trim();
    const type  = document.getElementById('cal-ev-type').value;
    const date  = document.getElementById('cal-ev-date').value;
    if (!label || !date) return;

    try {
      const headers = typeof getHeaders === 'function' ? getHeaders() : {};
      const BASE = (typeof CONFIG !== 'undefined' && CONFIG.BASE_URL) ? CONFIG.BASE_URL : 'http://localhost:5000/api';

      const res = await fetch(`${BASE}/calendar/events`, {
        method:  'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ label, date, type }),
      });

      if (res.ok) {
        const d = await res.json();
        const saved = d.success ? d.data : d;
        manualEvents.push({
          event_id: saved.event_id,
          date:     toDateStr(saved.date),
          label:    saved.label,
          type:     saved.type || 'man',
          source:   'manual',
        });
        manualEvents.sort((a, b) => a.date.localeCompare(b.date));
      } else {
        // Fallback: add optimistically if auth/network issue
        manualEvents.push({ date, label, type, source: 'manual' });
        manualEvents.sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (err) {
      console.error('Save event error:', err);
      manualEvents.push({ date, label, type, source: 'manual' });
      manualEvents.sort((a, b) => a.date.localeCompare(b.date));
    }

    renderCalendar();
    document.getElementById('cal-ev-date').value = date;
    renderEventList(date);
    document.getElementById('cal-ev-label').value = '';
  });

  // ---- Refresh button ----
  const refreshBtn = document.getElementById('cal-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => fetchAll());

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