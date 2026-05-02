function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const startTime = performance.now();
  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

window.addEventListener("DOMContentLoaded", () => {
  const counters = [
    { id: "dash-total-equipments", target: 150 },
    { id: "dash-pending-requests", target: 5   },
    { id: "dash-damages",          target: 3   },
  ];
  counters.forEach(c => animateCounter(document.getElementById(c.id), c.target));
});

(function initCalendar() {
  const todayDate = new Date();
  let calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

  function fmtD(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const t = todayDate, y = t.getFullYear(), mo = t.getMonth();
  const EVENTS = [
    { date: fmtD(y, mo, 3),           label: "Lab Reservation – Chem Dept",  type: "ec-reservation" },
    { date: fmtD(y, mo, 3),           label: "Equipment Return",              type: "ec-transaction"  },
    { date: fmtD(y, mo, 7),           label: "Microscope Maintenance",        type: "ec-maintenance"  },
    { date: fmtD(y, mo, 10),          label: "Reservation – Biology Lab",     type: "ec-reservation" },
    { date: fmtD(y, mo, 10),          label: "Beaker Damage Report",          type: "ec-damage"       },
    { date: fmtD(y, mo, 14),          label: "Reservation – Physics Group",   type: "ec-reservation" },
    { date: fmtD(y, mo, 17),          label: "Chemical Supply Delivery",      type: "ec-transaction"  },
    { date: fmtD(y, mo, 20),          label: "Centrifuge Maintenance",        type: "ec-maintenance"  },
    { date: fmtD(y, mo, 22),          label: "Reservation – Thesis Defense",  type: "ec-reservation" },
    { date: fmtD(y, mo, 24),          label: "Glassware Transaction",         type: "ec-transaction"  },
    { date: fmtD(y, mo, t.getDate()), label: "Today – Lab Reservation",       type: "ec-reservation" },
  ];

  function eventsFor(dateStr) {
    return EVENTS.filter(e => e.date === dateStr);
  }

  function renderCalendar() {
    const grid = document.getElementById('ec-grid');
    if (!grid) return;

    Array.from(grid.querySelectorAll('.ec-cell')).forEach(c => c.remove());

    const cy = calCur.getFullYear(), cm = calCur.getMonth();
    const label = document.getElementById('ec-month-label');
    if (label) label.textContent = calCur.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDow    = new Date(cy, cm, 1).getDay();
    const daysInMonth = new Date(cy, cm + 1, 0).getDate();
    const daysInPrev  = new Date(cy, cm, 0).getDate();
    const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;
    const todayStr    = fmtD(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'ec-cell';

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

      if (otherMonth) cell.classList.add('ec-other-month');
      if (dateStr === todayStr) cell.classList.add('ec-today');

      const dn = document.createElement('div');
      dn.className = 'ec-day-num';
      dn.textContent = day;
      cell.appendChild(dn);

      const dayEvents = eventsFor(dateStr);
      dayEvents.slice(0, 2).forEach(ev => {
        const pill = document.createElement('span');
        pill.className = `ec-pill ${ev.type}`;
        const dot = document.createElement('span');
        dot.className = 'ec-pill-dot';
        pill.appendChild(dot);
        pill.appendChild(document.createTextNode(ev.label));
        pill.title = ev.label;
        cell.appendChild(pill);
      });

      if (dayEvents.length > 2) {
        const more = document.createElement('div');
        more.className = 'ec-more';
        more.textContent = `+${dayEvents.length - 2} more`;
        cell.appendChild(more);
      }

      grid.appendChild(cell);
    }
  }

  document.getElementById('ec-prev')?.addEventListener('click', () => {
    calCur = new Date(calCur.getFullYear(), calCur.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('ec-next')?.addEventListener('click', () => {
    calCur = new Date(calCur.getFullYear(), calCur.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('ec-today')?.addEventListener('click', () => {
    calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    renderCalendar();
  });

  renderCalendar();
})();