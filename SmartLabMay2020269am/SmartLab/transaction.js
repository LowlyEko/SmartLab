/* ===== TRANSACTION DATA ===== */
const transactions = [
  {
    id: "TX-001",
    name: "Maria Santos",
    studentId: "2021-00123",
    course: "BS Chemistry",
    year: "3rd Year",
    section: "A",
    subject: "Chem 301 - Analytical Chemistry",
    items: [
      { name: "Bunsen Burner", category: "equipment", qty: 1 },
      { name: "Beaker 250ml", category: "glassware", qty: 4 },
      { name: "Glass Stirring Rod", category: "apparatus", qty: 2 }
    ],
    dateBorrowed: "2026-04-22",
    dueDate: "2026-04-30",
    returnedDate: null,
    status: "borrowed"
  },
  {
    id: "TX-002",
    name: "Carlos Reyes",
    studentId: "2022-00456",
    course: "BS Biology",
    year: "2nd Year",
    section: "B",
    subject: "Bio 201 - Microbiology",
    items: [
      { name: "Compound Microscope", category: "equipment", qty: 1 },
      { name: "Microscope Slides", category: "supply", qty: 20 },
      { name: "Cover Slips", category: "supply", qty: 20 }
    ],
    dateBorrowed: "2026-04-25",
    dueDate: "2026-04-28",
    returnedDate: null,
    status: "borrowed"
  },
  {
    id: "TX-003",
    name: "Ana Lim",
    studentId: "2021-00789",
    course: "BS Physics",
    year: "3rd Year",
    section: "C",
    subject: "Phys 310 - Electronics",
    items: [
      { name: "Oscilloscope", category: "equipment", qty: 1 },
      { name: "Connecting Wires", category: "apparatus", qty: 10 }
    ],
    dateBorrowed: "2026-04-24",
    dueDate: "2026-05-02",
    returnedDate: null,
    status: "borrowed"
  },
  {
    id: "TX-004",
    name: "Jose Dela Cruz",
    studentId: "2020-00321",
    course: "BS Chemistry",
    year: "4th Year",
    section: "A",
    subject: "Chem 401 - Biochemistry",
    items: [
      { name: "Centrifuge", category: "equipment", qty: 1 },
      { name: "Test Tubes", category: "glassware", qty: 10 },
      { name: "Test Tube Rack", category: "apparatus", qty: 1 }
    ],
    dateBorrowed: "2026-04-20",
    dueDate: "2026-04-27",
    returnedDate: "2026-04-27",
    status: "returned"
  },
  {
    id: "TX-005",
    name: "Rina Flores",
    studentId: "2023-00654",
    course: "MS Biology",
    year: "1st Year",
    section: "A",
    subject: "Bio 501 - Advanced Microbiology",
    items: [
      { name: "Micropipette", category: "apparatus", qty: 5 },
      { name: "Erlenmeyer Flask 500ml", category: "glassware", qty: 2 },
      { name: "Pipette Tips", category: "supply", qty: 100 }
    ],
    dateBorrowed: "2026-04-18",
    dueDate: "2026-04-24",
    returnedDate: "2026-04-23",
    status: "returned"
  },
  {
    id: "TX-006",
    name: "Ben Aquino",
    studentId: "2022-00987",
    course: "BS Chemistry",
    year: "2nd Year",
    section: "B",
    subject: "Chem 201 - General Chemistry",
    items: [
      { name: "Electronic Balance", category: "equipment", qty: 1 },
      { name: "Weighing Boat", category: "supply", qty: 5 }
    ],
    dateBorrowed: "2026-04-26",
    dueDate: "2026-05-05",
    returnedDate: null,
    status: "borrowed"
  },
  {
    id: "TX-007",
    name: "Grace Tan",
    studentId: "2021-00111",
    course: "BS Biology",
    year: "3rd Year",
    section: "A",
    subject: "Bio 301 - Cell Biology",
    items: [
      { name: "Compound Microscope", category: "equipment", qty: 1 },
      { name: "Cover Slips", category: "supply", qty: 10 },
      { name: "Staining Kit", category: "chemical", qty: 1 }
    ],
    dateBorrowed: "2026-04-23",
    dueDate: "2026-04-29",
    returnedDate: "2026-04-29",
    status: "returned"
  },
  {
    id: "TX-008",
    name: "Mark Villanueva",
    studentId: "2022-00222",
    course: "BS Physics",
    year: "2nd Year",
    section: "C",
    subject: "Phys 201 - Circuits",
    items: [
      { name: "Digital Multimeter", category: "equipment", qty: 1 },
      { name: "Resistor Set", category: "apparatus", qty: 1 }
    ],
    dateBorrowed: "2026-04-21",
    dueDate: "2026-04-25",
    returnedDate: "2026-04-26",
    status: "returned"
  },
  {
    id: "TX-009",
    name: "Lea Garcia",
    studentId: "2023-00333",
    course: "BS Chemistry",
    year: "1st Year",
    section: "B",
    subject: "Chem 101 - Intro to Chemistry",
    items: [
      { name: "Erlenmeyer Flask 250ml", category: "glassware", qty: 3 },
      { name: "Glass Stirring Rod", category: "apparatus", qty: 1 }
    ],
    dateBorrowed: "2026-04-30",
    dueDate: "2026-05-07",
    returnedDate: null,
    status: "borrowed"
  },
  {
    id: "TX-010",
    name: "Rico Mendoza",
    studentId: "2021-00444",
    course: "BS Biology",
    year: "3rd Year",
    section: "B",
    subject: "Bio 302 - Zoology",
    items: [
      { name: "Dissection Kit", category: "apparatus", qty: 1 },
      { name: "Dissection Tray", category: "apparatus", qty: 2 },
      { name: "Latex Gloves", category: "supply", qty: 4 }
    ],
    dateBorrowed: "2026-04-30",
    dueDate: "2026-05-05",
    returnedDate: "2026-05-04",
    status: "returned"
  },
  {
    id: "TX-011",
    name: "Sofia Cruz",
    studentId: "2020-00555",
    course: "MS Chemistry",
    year: "2nd Year",
    section: "A",
    subject: "Chem 502 - Spectroscopy",
    items: [
      { name: "Spectrophotometer", category: "equipment", qty: 1 },
      { name: "Cuvettes", category: "glassware", qty: 10 }
    ],
    dateBorrowed: "2026-04-29",
    dueDate: "2026-05-10",
    returnedDate: null,
    status: "borrowed"
  },
  {
    id: "TX-012",
    name: "Juan Bautista",
    studentId: "2022-00666",
    course: "BS Physics",
    year: "2nd Year",
    section: "A",
    subject: "Phys 202 - Electromagnetism",
    items: [
      { name: "DC Power Supply", category: "equipment", qty: 1 },
      { name: "Resistors Assorted", category: "apparatus", qty: 10 },
      { name: "Breadboard", category: "apparatus", qty: 1 }
    ],
    dateBorrowed: "2026-04-28",
    dueDate: "2026-05-06",
    returnedDate: "2026-05-06",
    status: "returned"
  }
];

/* ===== STATE ===== */
let currentTab    = "all";
let currentFilter = "";
let currentSearch = "";
let currentPage   = 1;
const PAGE_SIZE   = 8;

/* ===== HELPERS ===== */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function chipClass(category) {
  const map = {
    apparatus: "chip-apparatus",
    equipment: "chip-equipment",
    supply:    "chip-supply",
    glassware: "chip-glassware",
    chemical:  "chip-chemical"
  };
  return map[category] || "chip-apparatus";
}

function badgeClass(status) {
  const map = {
    borrowed: "badge-borrowed",
    returned: "badge-returned",
    overdue:  "badge-overdue"
  };
  return map[status] || "badge-borrowed";
}

function badgeLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ===== FILTER ===== */
function getFiltered() {
  return transactions.filter(tx => {
    const matchTab    = currentTab === "all" || tx.status === currentTab;
    const matchFilter = !currentFilter || tx.status === currentFilter;
    const q           = currentSearch.toLowerCase();
    const matchSearch = !q
      || tx.name.toLowerCase().includes(q)
      || tx.id.toLowerCase().includes(q)
      || tx.studentId.toLowerCase().includes(q)
      || tx.course.toLowerCase().includes(q)
      || tx.subject.toLowerCase().includes(q)
      || tx.items.some(i => i.name.toLowerCase().includes(q));
    return matchTab && matchFilter && matchSearch;
  });
}

/* ===== RENDER TABLE ===== */
function renderTable() {
  const filtered = getFiltered();
  const total    = filtered.length;
  const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > pages) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  const tbody      = document.getElementById("txTableBody");
  const emptyState = document.getElementById("emptyState");
  const tableMeta  = document.getElementById("tableMeta");
  const pageInfo   = document.getElementById("pageInfo");

  tableMeta.textContent = `${total} record${total !== 1 ? "s" : ""} found`;
  pageInfo.textContent  = total === 0
    ? "Showing 0–0 of 0"
    : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`;

  if (slice.length === 0) {
    tbody.innerHTML          = "";
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    tbody.innerHTML = slice.map(tx => {
      const itemChips = tx.items.map(i =>
        `<span class="item-chip ${chipClass(i.category)}">${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}</span>`
      ).join("");

      const dueDateCell = tx.status === "returned"
        ? `<div class="date-cell"><div class="date-main">${formatDate(tx.returnedDate)}</div><div class="date-sub">Returned</div></div>`
        : `<div class="date-cell"><div class="date-main">${formatDate(tx.dueDate)}</div><div class="date-sub">Due</div></div>`;

      return `
        <tr>
          <td><span class="tx-id">${tx.id}</span></td>
          <td><span class="tx-name">${tx.name}</span></td>
          <td><span class="tx-id-num">${tx.studentId}</span></td>
          <td><span class="tx-course">${tx.course} · ${tx.year} ${tx.section}</span></td>
          <td><span class="tx-course">${tx.subject}</span></td>
          <td>${itemChips}</td>
          <td><div class="date-cell"><div class="date-main">${formatDate(tx.dateBorrowed)}</div></div></td>
          <td>${dueDateCell}</td>
          <td><span class="badge ${badgeClass(tx.status)}">${badgeLabel(tx.status)}</span></td>
          <td>
            <button class="action-btn view" title="View details" onclick="openModal('${tx.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
          </td>
        </tr>`;
    }).join("");
  }

  renderPagination(pages);
  updateCounts();
}

/* ===== PAGINATION ===== */
function renderPagination(pages) {
  const container = document.getElementById("pageBtns");
  container.innerHTML = "";

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prev.disabled  = currentPage === 1;
  prev.onclick   = () => { currentPage--; renderTable(); };
  container.appendChild(prev);

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; renderTable(); };
    container.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  next.disabled  = currentPage === pages;
  next.onclick   = () => { currentPage++; renderTable(); };
  container.appendChild(next);
}

/* ===== SUMMARY COUNTS ===== */
function updateCounts() {
  const total    = transactions.length;
  const borrowed = transactions.filter(t => t.status === "borrowed").length;
  const returned = transactions.filter(t => t.status === "returned").length;

  document.getElementById("totalCount").textContent    = total;
  document.getElementById("borrowedCount").textContent = borrowed;
  document.getElementById("returnedCount").textContent = returned;

  document.getElementById("tab-all-count").textContent      = total;
  document.getElementById("tab-borrowed-count").textContent = borrowed;
  document.getElementById("tab-returned-count").textContent = returned;
}

/* ===== TABS ===== */
function setTab(btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentTab  = btn.dataset.tab;
  currentPage = 1;

  // Sync the native select to match the tab
  currentFilter = currentTab === "all" ? "" : currentTab;
  const select = document.getElementById("statusFilter");
  if (select) select.value = currentFilter;

  renderTable();
}

/* ===== SELECT FILTER ===== */
function initFilter() {
  const select = document.getElementById("statusFilter");
  if (!select) return;

  select.addEventListener("change", () => {
    currentFilter = select.value;
    currentPage   = 1;

    // Sync tab to match select
    currentTab = currentFilter === "" ? "all" : currentFilter;
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === currentTab);
    });

    renderTable();
  });
}

/* ===== SEARCH ===== */
function initSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("input", () => {
    currentSearch = input.value.trim();
    currentPage   = 1;
    renderTable();
  });
}

/* ===== MODAL ===== */
function openModal(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById("modalTitle").textContent    = `Transaction ${tx.id}`;
  document.getElementById("modalSubtitle").textContent = `${tx.name} · ${tx.course}`;

  const itemRows = tx.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td><span class="item-chip ${chipClass(i.category)}">${i.category}</span></td>
      <td style="text-align:center;">${i.qty}</td>
    </tr>`).join("");

  document.getElementById("modalBody").innerHTML = `
    <div class="modal-row">
      <div class="modal-field">
        <label>Transaction ID</label>
        <div class="value">${tx.id}</div>
      </div>
      <div class="modal-field">
        <label>Status</label>
        <div class="value"><span class="badge ${badgeClass(tx.status)}">${badgeLabel(tx.status)}</span></div>
      </div>
    </div>
    <div class="modal-row">
      <div class="modal-field">
        <label>Student Name</label>
        <div class="value">${tx.name}</div>
      </div>
      <div class="modal-field">
        <label>Student ID</label>
        <div class="value">${tx.studentId}</div>
      </div>
    </div>
    <div class="modal-row">
      <div class="modal-field">
        <label>Course</label>
        <div class="value">${tx.course}</div>
      </div>
      <div class="modal-field">
        <label>Year & Section</label>
        <div class="value">${tx.year} — Section ${tx.section}</div>
      </div>
    </div>
    <div class="modal-field" style="margin-bottom:16px;">
      <label>Subject</label>
      <div class="value">${tx.subject}</div>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-row">
      <div class="modal-field">
        <label>Date Borrowed</label>
        <div class="value">${formatDate(tx.dateBorrowed)}</div>
      </div>
      <div class="modal-field">
        <label>${tx.status === "returned" ? "Date Returned" : "Due Date"}</label>
        <div class="value">${tx.status === "returned" ? formatDate(tx.returnedDate) : formatDate(tx.dueDate)}</div>
      </div>
    </div>
    <div class="modal-divider"></div>
    <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px;">Items Borrowed</div>
    <table class="items-table">
      <thead><tr><th>Item</th><th>Category</th><th style="text-align:center;">Qty</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>`;

  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

document.getElementById("modalOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});


/* ===== SIDEBAR TOGGLE ===== */
function initSidebar() {
  const toggle  = document.querySelector(".toggle");
  const sidebar = document.querySelector(".sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("close"));
  }
}

/* ===== DARK MODE ===== */
function initDarkMode() {
  const toggleSwitch = document.querySelector(".toggle-switch");
  const modeText     = document.querySelector(".mode-text");
  if (!toggleSwitch) return;

  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    if (modeText) modeText.textContent = "Light Mode";
  }

  toggleSwitch.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDark);
    if (modeText) modeText.textContent = isDark ? "Light Mode" : "Dark Mode";
  });
}

/* ===== PROFILE PANEL ===== */
function initProfilePanel() {
  const profile = document.querySelector(".profile");
  const panel   = document.getElementById("profilePanel");
  if (!profile || !panel) return;

  profile.addEventListener("click", e => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });

  document.addEventListener("click", () => panel.classList.remove("open"));
  panel.addEventListener("click", e => e.stopPropagation());
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initDarkMode();
  initProfilePanel();
  initFilter();
  initSearch();
  renderTable();
});