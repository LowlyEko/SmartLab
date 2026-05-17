(function initCalendarPage() {
  const todayDate = new Date();
  let calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  let modalDate = null;
  let activeFilter = 'all';
  let activeView = 'month';

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtD(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
  function fmtFull(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(+y, +m - 1, +d);
    return dt.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  const ty = todayDate.getFullYear(), tm = todayDate.getMonth();
  const todayStr = fmtD(ty, tm, todayDate.getDate());

  let events = [
    { date: fmtD(ty, tm, 3),                label: "Lab Reservation – Chem Dept",  type: "res" },
    { date: fmtD(ty, tm, 3),                label: "Equipment Return",              type: "tra" },
    { date: fmtD(ty, tm, 7),                label: "Microscope Maintenance",        type: "mai" },
    { date: fmtD(ty, tm, 10),               label: "Reservation – Biology Lab",     type: "res" },
    { date: fmtD(ty, tm, 10),               label: "Beaker Damage Report",          type: "dam" },
    { date: fmtD(ty, tm, 14),               label: "Reservation – Physics Group",   type: "res" },
    { date: fmtD(ty, tm, 17),               label: "Chemical Supply Delivery",      type: "tra" },
    { date: fmtD(ty, tm, 20),               label: "Centrifuge Maintenance",        type: "mai" },
    { date: fmtD(ty, tm, 22),               label: "Reservation – Thesis Defense",  type: "res" },
    { date: fmtD(ty, tm, 24),               label: "Glassware Transaction",         type: "tra" },
    { date: fmtD(ty, tm, todayDate.getDate()), label: "Today – Lab Reservation",   type: "res" },
  ];

  const TYPE_DOT = { res: '#3b82f6', tra: '#22c55e', mai: '#eab308', dam: '#ef4444' };

  function eventsFor(dateStr) {
    return events.filter(e => e.date === dateStr && (activeFilter === 'all' || e.type === activeFilter));
  }

  /* ---- Render Calendar ---- */
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
        cell.appendChild(more);
      }

      cell.addEventListener('click', () => openModal(dateStr));
      grid.appendChild(cell);
    }
  }

  /* ---- Modal ---- */
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
    // Show all events for the date in the modal (ignore filter)
    const evs = events.filter(e => e.date === dateStr);

    if (!evs.length) {
      const p = document.createElement('p');
      p.className = 'cal-no-events';
      p.textContent = 'No events on this day.';
      el.appendChild(p);
      return;
    }

    evs.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'cal-event-row';

      const dot = document.createElement('div');
      dot.className = 'cal-event-type-dot';
      dot.style.background = TYPE_DOT[ev.type] || '#888';

      const lbl = document.createElement('div');
      lbl.className = 'cal-event-name';
      lbl.textContent = ev.label;

      const del = document.createElement('button');
      del.className = 'cal-event-del';
      del.innerHTML = '&#x2715;';
      del.title = 'Delete event';
      del.addEventListener('click', () => {
        events.splice(events.indexOf(ev), 1);
        renderCalendar();
        renderEventList(dateStr);
      });

      row.appendChild(dot);
      row.appendChild(lbl);
      row.appendChild(del);
      el.appendChild(row);
    });
  }

  /* ---- Save Event ---- */
  document.getElementById('cal-btn-save').addEventListener('click', () => {
    const label = document.getElementById('cal-ev-label').value.trim();
    const type  = document.getElementById('cal-ev-type').value;
    const date  = document.getElementById('cal-ev-date').value;
    if (!label || !date) return;

    events.push({ date, label, type });
    events.sort((a, b) => a.date.localeCompare(b.date));

    renderCalendar();
    document.getElementById('cal-ev-date').value = date;
    renderEventList(date);
    document.getElementById('cal-ev-label').value = '';
  });

  /* ---- Toolbar Nav ---- */
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

  /* ---- Close modal ---- */
  document.getElementById('cal-modal-close').addEventListener('click', closeModal);
  document.getElementById('cal-btn-cancel').addEventListener('click', closeModal);
  document.getElementById('cal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('cal-overlay')) closeModal();
  });

  /* ---- View Dropdown ---- */
  const viewDropdown = document.getElementById('cal-view-dropdown');
  const viewBtn = document.getElementById('cal-view-btn');
  const viewMenu = document.getElementById('cal-view-menu');
  const viewLabel = document.getElementById('cal-view-label');

  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewDropdown.classList.toggle('open');
    // Close the other dropdown
    document.getElementById('cal-custom-select').classList.remove('open');
  });

  viewMenu.querySelectorAll('.cal-view-option').forEach(opt => {
    opt.addEventListener('click', () => {
      viewMenu.querySelectorAll('.cal-view-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      activeView = opt.dataset.view;
      viewLabel.textContent = opt.textContent.trim();
      viewDropdown.classList.remove('open');
      // For now, month view only; alert for week/day
      if (activeView !== 'month') {
        // Future: implement week/day view
        // For now just re-render month
        renderCalendar();
      } else {
        renderCalendar();
      }
    });
  });

  /* ---- Category Select ---- */
  const customSelect = document.getElementById('cal-custom-select');
  const selectBtn = document.getElementById('cal-select-btn');
  const selectMenu = document.getElementById('cal-select-menu');
  const selectLabel = document.getElementById('cal-select-label');

  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
    // Close the other dropdown
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

  /* ---- Close dropdowns on outside click ---- */
  document.addEventListener('click', () => {
    viewDropdown.classList.remove('open');
    customSelect.classList.remove('open');
  });

  renderCalendar();
})();