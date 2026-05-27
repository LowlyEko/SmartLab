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

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/dashboard/stats`, {
      headers: getHeaders()
    });
    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;
      const counters = [
        { id: "dash-total-equipments", target: data.totalEquipment   ?? 0 },
        { id: "dash-pending-requests", target: data.pendingRequests  ?? 0 },
        { id: "dash-damages",          target: data.damages          ?? 0 },
      ];
      counters.forEach(c => animateCounter(document.getElementById(c.id), c.target));
    } else {
      // Fallback to zeros if unauthenticated/error
      ["dash-total-equipments","dash-pending-requests","dash-damages"]
        .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = 0; });
    }
  } catch (err) {
    console.warn("Dashboard stats fetch failed:", err);
    ["dash-total-equipments","dash-pending-requests","dash-damages"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = 0; });
  }
});

(function initCalendar() {
  const todayDate = new Date();
  let calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

  let reservations = [];
  let accountabilityRecords = [];

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtD(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }
  function toDateStr(dateVal) {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d) ? null : fmtD(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const todayStr = fmtD(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

  function buildEvents() {
    const list = [];

    reservations.forEach(r => {
      // new schema: date_borrowed (not date_needed), subject (not activity_title)
      const dateStr = toDateStr(r.date_borrowed);
      if (!dateStr) return;
      list.push({
        date: dateStr,
        label: r.subject || `RES-${String(r.reservation_id).padStart(3,'0')}`,
        type: 'ec-reservation'
      });
    });

    accountabilityRecords.forEach(a => {
      // new schema: date_borrowed (not date_time_broken), materials_broken (not item_description)
      const dateStr = toDateStr(a.date_borrowed || a.created_at);
      if (!dateStr) return;
      list.push({
        date: dateStr,
        label: `Damage: ${a.materials_broken || 'Item'}`,
        type: 'ec-damage'
      });
    });

    return list;
  }

  function eventsFor(dateStr) {
    return buildEvents().filter(e => e.date === dateStr);
  }

  async function fetchAll() {
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
      console.warn('Dashboard calendar fetch error:', err);
    }
    renderCalendar();
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
        // Clicking a pill navigates to the full calendar page
        pill.style.cursor = 'pointer';
        pill.addEventListener('click', e => {
          e.stopPropagation();
          window.location.href = 'calendar.html';
        });
        cell.appendChild(pill);
      });

      if (dayEvents.length > 2) {
        const more = document.createElement('div');
        more.className = 'ec-more';
        more.textContent = `+${dayEvents.length - 2} more`;
        more.style.cursor = 'pointer';
        more.addEventListener('click', e => {
          e.stopPropagation();
          window.location.href = 'calendar.html';
        });
        cell.appendChild(more);
      }

      // Clicking any day cell navigates to calendar
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        window.location.href = 'calendar.html';
      });

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

  renderCalendar();  // render empty grid immediately
  fetchAll();        // then populate from API
})();