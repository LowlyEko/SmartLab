// ============================================================
//  CAS Laboratory — dashboard.js
// ============================================================

(function () {
  "use strict";

  /* ─────────────────────────────────────────
     1.  SIDEBAR TOGGLE
  ───────────────────────────────────────── */
  const sidebar = document.querySelector(".sidebar");
  const toggle  = document.querySelector(".toggle");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("close");
    });
  }

  /* ─────────────────────────────────────────
     2.  DARK MODE
  ───────────────────────────────────────── */
  const toggleSwitch = document.querySelector(".toggle-switch");
  const modeText     = document.querySelector(".mode-text");

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    if (modeText) modeText.textContent = "Light Mode";
  }

  if (toggleSwitch) {
    toggleSwitch.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      if (modeText) modeText.textContent = isDark ? "Light Mode" : "Dark Mode";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  /* ─────────────────────────────────────────
     3.  PAGE NAVIGATION
  ───────────────────────────────────────── */
  const navLinks = document.querySelectorAll(".nav-link a[data-page]");

  // FIX 1: Clean PAGE_MAP — no duplicate keys, no workaround needed
  // because dashboard.html data-page values are now correct directly
  const PAGE_MAP = {
    dashboard:      "page-dashboard",
    reservation:    "page-reservation",
    calendar:       "page-calendar",
    accountability: "page-accountability",
    inventory:      "page-inventory",
    transaction:    "page-transaction",
  };

  // FIX 1 cont: Removed the allNavAs[5] workaround — no longer needed
  // since data-page="transaction" is correct in the HTML

  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => {
      p.classList.remove("active", "visible");
    });

    const target = document.getElementById(pageId);
    if (!target) return;

    target.classList.add("active");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => target.classList.add("visible"));
    });
  }

  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      const page = link.getAttribute("data-page");
      const pageId = PAGE_MAP[page] || "page-dashboard";
      showPage(pageId);
    });
  });

  // Activate first page on load
  showPage("page-dashboard");

  /* ─────────────────────────────────────────
     4.  PROFILE DROPDOWN
  ───────────────────────────────────────── */
  const profileBtn = document.querySelector(".profile");

  if (profileBtn) {
    profileBtn.addEventListener("click", e => {
      e.stopPropagation();
      profileBtn.classList.toggle("active");
    });

    document.addEventListener("click", () => {
      profileBtn.classList.remove("active");
    });
  }

  /* ─────────────────────────────────────────
     5.  DASHBOARD — animated counters
  ───────────────────────────────────────── */
  function animateCounter(el, target, duration = 1200) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();

    function step(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counters = [
    { id: "dash-total-equipments",  target: 150 },
    { id: "dash-pending-requests",  target: 5   },
    { id: "dash-in-use",            target: 24  },
    { id: "dash-damages",           target: 3   },
  ];

  let countersRun = false;
  function runCounters() {
    if (countersRun) return;
    countersRun = true;
    counters.forEach(c => {
      animateCounter(document.getElementById(c.id), c.target);
    });
  }

  const dashboardPage = document.getElementById("page-dashboard");
  if (dashboardPage) {
    const obs = new MutationObserver(() => {
      if (dashboardPage.classList.contains("visible")) runCounters();
    });
    obs.observe(dashboardPage, { attributes: true, attributeFilter: ["class"] });
  }

  /* ─────────────────────────────────────────
     6.  STAT-CARD CLICK → navigate to page
  ───────────────────────────────────────── */
  const CARD_PAGE_MAP = {
    inventory:      "page-inventory",
    reservation:    "page-reservation",
    accountability: "page-accountability",
  };

  document.querySelectorAll(".stat-card[data-page]").forEach(card => {
    card.addEventListener("click", () => {
      const target = card.getAttribute("data-page");
      const pageId = CARD_PAGE_MAP[target];
      if (!pageId) return;

      // FIX 1 cont: Sync nav using the corrected data-page values
      navLinks.forEach(l => {
        l.classList.remove("active");
        const lPage = l.getAttribute("data-page");
        if (
          (pageId === "page-reservation"    && lPage === "reservation")    ||
          (pageId === "page-inventory"      && lPage === "inventory")      ||
          (pageId === "page-accountability" && lPage === "accountability")
        ) {
          l.classList.add("active");
        }
      });

      showPage(pageId);
    });
  });

  // FIX 2: REMOVED duplicate nav active listener (was section 8)
  // The navLinks.forEach above in section 3 already handles active state correctly.

})();

/* ─────────────────────────────────────────
   9.  EVENT CALENDAR
───────────────────────────────────────── */
(function initCalendar() {
  const todayDate = new Date();
  let calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

  function fmtD(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const t = todayDate, y = t.getFullYear(), mo = t.getMonth();
  const EVENTS = [
    { date: fmtD(y, mo, 3),           label: "Lab Reservation – Chem Dept",   type: "ec-reservation" },
    { date: fmtD(y, mo, 3),           label: "Equipment Return",               type: "ec-transaction"  },
    { date: fmtD(y, mo, 7),           label: "Microscope Maintenance",         type: "ec-maintenance"  },
    { date: fmtD(y, mo, 10),          label: "Reservation – Biology Lab",      type: "ec-reservation" },
    { date: fmtD(y, mo, 10),          label: "Beaker Damage Report",           type: "ec-damage"       },
    { date: fmtD(y, mo, 14),          label: "Reservation – Physics Group",    type: "ec-reservation" },
    { date: fmtD(y, mo, 17),          label: "Chemical Supply Delivery",       type: "ec-transaction"  },
    { date: fmtD(y, mo, 20),          label: "Centrifuge Maintenance",         type: "ec-maintenance"  },
    { date: fmtD(y, mo, 22),          label: "Reservation – Thesis Defense",   type: "ec-reservation" },
    { date: fmtD(y, mo, 24),          label: "Glassware Transaction",          type: "ec-transaction"  },
    { date: fmtD(y, mo, t.getDate()), label: "Today – Lab Reservation",        type: "ec-reservation" },
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
    if (label) {
      label.textContent = calCur.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

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
        pill.textContent = ev.label;
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

  const prevBtn  = document.getElementById('ec-prev');
  const nextBtn  = document.getElementById('ec-next');
  const todayBtn = document.getElementById('ec-today');

  if (prevBtn)  prevBtn.addEventListener('click',  () => { calCur = new Date(calCur.getFullYear(), calCur.getMonth() - 1, 1); renderCalendar(); });
  if (nextBtn)  nextBtn.addEventListener('click',  () => { calCur = new Date(calCur.getFullYear(), calCur.getMonth() + 1, 1); renderCalendar(); });
  if (todayBtn) todayBtn.addEventListener('click', () => { calCur = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1); renderCalendar(); });

  renderCalendar();
})();

/* ─────────────────────────────────────────
   10. RESERVATION DROPDOWNS
───────────────────────────────────────── */
const dropdowns = document.querySelectorAll(".dropdown");

dropdowns.forEach(dropdown => {
  const btn   = dropdown.querySelector(".dropdown-btn");
  const menu  = dropdown.querySelector(".dropdown-menu");
  const items = dropdown.querySelectorAll(".item");
  const label = btn.querySelector("span");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".dropdown-menu").forEach(m => {
      if (m !== menu) m.style.display = "none";
    });
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  });

  // FIX 3: Active class managed per-dropdown only — no cross-dropdown interference
  items.forEach(item => {
    item.addEventListener("click", () => {
      items.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      label.textContent = item.textContent;
      menu.style.display = "none";
    });
  });
});

// FIX 3 cont: REMOVED the duplicate standalone item listener that was
// clearing active across ALL dropdowns globally.

// Close dropdowns when clicking outside
window.addEventListener("click", () => {
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    menu.style.display = "none";
  });
});

/* ─────────────────────────────────────────
   11. RESERVATION: FILTER + SEARCH + SORT
───────────────────────────────────────── */
const filterItems = document.querySelectorAll("#filterMenu .item");
const sortItems   = document.querySelectorAll("#sortMenu .item");
const recordCount = document.querySelector(".record-count");
const searchBox   = document.querySelector(".search-box");

let currentFilter = "all";
let currentSort   = "name";
let searchQuery   = "";

// FIX 4: Use a function instead of a static const so rows are always fresh
function getTableRows() {
  return document.querySelectorAll(".reservation-table tbody tr");
}

function getCellText(row, index) {
  return row.children[index]?.textContent.trim().toLowerCase() || "";
}

function parseDate(text) {
  return new Date(text);
}

function applyTable() {
  const rows = Array.from(getTableRows()); // FIX 4: always fresh

  rows.forEach(row => {
    const status = row.querySelector(".status")?.textContent.trim().toLowerCase() || "";
    const name   = row.querySelector(".name")?.textContent.toLowerCase() || "";
    const dateRequested = getCellText(row, 2);
    const dueReturn     = getCellText(row, 3);

    const matchFilter = currentFilter === "all" || status === currentFilter;
    const matchSearch =
      name.includes(searchQuery) ||
      dateRequested.includes(searchQuery) ||
      dueReturn.includes(searchQuery) ||
      status.includes(searchQuery);

    row.style.display = (matchFilter && matchSearch) ? "" : "none";
  });

  const visibleRows = rows.filter(r => r.style.display !== "none");

  visibleRows.sort((a, b) => {
    if (currentSort === "name") {
      return a.querySelector(".name").textContent.localeCompare(
        b.querySelector(".name").textContent
      );
    }
    if (currentSort === "date_request") {
      return parseDate(getCellText(a, 2)) - parseDate(getCellText(b, 2));
    }
    if (currentSort === "due_return") {
      return parseDate(getCellText(a, 3)) - parseDate(getCellText(b, 3));
    }
    if (currentSort === "status") {
      return getCellText(a, 4).localeCompare(getCellText(b, 4));
    }
    return 0;
  });

  const tbody = document.querySelector(".reservation-table tbody");
  visibleRows.forEach(row => tbody.appendChild(row));

  updateRecordCount();
}

filterItems.forEach(item => {
  item.addEventListener("click", () => {
    filterItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    currentFilter = item.textContent.trim().toLowerCase();
    applyTable();
  });
});

sortItems.forEach(item => {
  item.addEventListener("click", () => {
    sortItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    const text = item.textContent.trim().toLowerCase();
    if (text.includes("borrower name"))  currentSort = "name";
    else if (text.includes("date request")) currentSort = "date_request";
    else if (text.includes("due return"))   currentSort = "due_return";
    else if (text.includes("status"))       currentSort = "status";
    applyTable();
  });
});

searchBox.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  applyTable();
});

function updateRecordCount() {
  let visible = 0;
  getTableRows().forEach(row => { // FIX 4: always fresh
    if (row.style.display !== "none") visible++;
  });
  if (recordCount) {
    recordCount.textContent = `${visible} record${visible !== 1 ? "s" : ""}`;
  }
}

applyTable();