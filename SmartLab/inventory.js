/* =============================================
   inventory.js — CAS Laboratory Inventory Logic
   ============================================= */
(function () {
  "use strict";

  const ROWS_PER_PAGE = 8;
  let currentTab  = "equipment";
  let currentPage = 1;
  let editingId   = null;
  let deleteId    = null;
  let sortKey     = null;
  let sortDir     = 1; // 1 = asc, -1 = desc

  /* ────────────────────────────────────────────
     Sample Data
  ──────────────────────────────────────────── */
  const data = {
    equipment: [
      { id:"EQ001", name:"Microscope (Compound)",  category:"Optics",       quantity:12, unit:"pcs", condition:"Good",  status:"Available",    location:"Room A",  lastUpdated:"2025-04-20" },
      { id:"EQ002", name:"Centrifuge",             category:"Separation",   quantity:4,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room B",  lastUpdated:"2025-04-18" },
      { id:"EQ003", name:"Hot Plate Stirrer",      category:"Heating",      quantity:2,  unit:"pcs", condition:"Fair",  status:"Low Stock",    location:"Room A",  lastUpdated:"2025-04-15" },
      { id:"EQ004", name:"Analytical Balance",     category:"Measurement",  quantity:6,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room C",  lastUpdated:"2025-04-22" },
      { id:"EQ005", name:"Autoclave",              category:"Sterilization",quantity:1,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room B",  lastUpdated:"2025-04-10" },
      { id:"EQ006", name:"pH Meter",               category:"Measurement",  quantity:3,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room A",  lastUpdated:"2025-04-21" },
      { id:"EQ007", name:"Spectrophotometer",      category:"Optics",       quantity:1,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room D",  lastUpdated:"2025-04-11" },
      { id:"EQ008", name:"Vortex Mixer",           category:"Mixing",       quantity:0,  unit:"pcs", condition:"–",     status:"Out of Stock",  location:"Room A",  lastUpdated:"2025-03-30" },
      { id:"EQ009", name:"Water Bath",             category:"Heating",      quantity:2,  unit:"pcs", condition:"Fair",  status:"Low Stock",    location:"Room C",  lastUpdated:"2025-04-14" },
      { id:"EQ010", name:"Electric Oven",          category:"Heating",      quantity:3,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room B",  lastUpdated:"2025-04-19" },
      { id:"EQ011", name:"Fume Hood",              category:"Safety",       quantity:2,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room D",  lastUpdated:"2025-04-08" },
      { id:"EQ012", name:"Refrigerator (Lab)",     category:"Storage",      quantity:3,  unit:"pcs", condition:"Good",  status:"Available",    location:"Room B",  lastUpdated:"2025-04-17" },
    ],
    chemicals: [
      { id:"CH001", name:"Hydrochloric Acid (HCl)",  category:"Acids",      quantity:5,   unit:"L",  hazard:"Corrosive", status:"Available",    location:"Chem Storage",  expiry:"2026-06-01",  lastUpdated:"2025-04-20" },
      { id:"CH002", name:"Sodium Hydroxide (NaOH)",  category:"Bases",      quantity:2,   unit:"kg", hazard:"Corrosive", status:"Low Stock",    location:"Chem Storage",  expiry:"2026-12-01",  lastUpdated:"2025-04-18" },
      { id:"CH003", name:"Ethanol (95%)",            category:"Solvents",   quantity:10,  unit:"L",  hazard:"Flammable", status:"Available",    location:"Flammable Cab", expiry:"2027-01-01",  lastUpdated:"2025-04-15" },
      { id:"CH004", name:"Acetone",                  category:"Solvents",   quantity:0,   unit:"L",  hazard:"Flammable", status:"Out of Stock",  location:"Flammable Cab", expiry:"–",           lastUpdated:"2025-03-10" },
      { id:"CH005", name:"Sulfuric Acid (H₂SO₄)",   category:"Acids",      quantity:3,   unit:"L",  hazard:"Corrosive", status:"Available",    location:"Acid Cabinet",  expiry:"2026-08-01",  lastUpdated:"2025-04-22" },
      { id:"CH006", name:"Sodium Chloride (NaCl)",   category:"Salts",      quantity:500, unit:"g",  hazard:"Low",       status:"Available",    location:"Chem Storage",  expiry:"2028-01-01",  lastUpdated:"2025-04-01" },
      { id:"CH007", name:"Agar Powder",              category:"Biological", quantity:200, unit:"g",  hazard:"Low",       status:"Low Stock",    location:"Cold Storage",  expiry:"2025-11-01",  lastUpdated:"2025-04-12" },
      { id:"CH008", name:"Methanol",                 category:"Solvents",   quantity:4,   unit:"L",  hazard:"Toxic",     status:"Available",    location:"Flammable Cab", expiry:"2026-10-01",  lastUpdated:"2025-04-19" },
      { id:"CH009", name:"Potassium Permanganate",   category:"Oxidizers",  quantity:100, unit:"g",  hazard:"Oxidizer",  status:"Available",    location:"Oxidizer Cab",  expiry:"2027-06-01",  lastUpdated:"2025-04-05" },
      { id:"CH010", name:"Glacial Acetic Acid",      category:"Acids",      quantity:1,   unit:"L",  hazard:"Corrosive", status:"Low Stock",    location:"Acid Cabinet",  expiry:"2026-04-01",  lastUpdated:"2025-04-20" },
    ],
    items: [
      { id:"IT001", name:"Latex Gloves (M)",         category:"PPE",         quantity:300, unit:"pcs", status:"Available",    location:"Supply Room", lastUpdated:"2025-04-22" },
      { id:"IT002", name:"Safety Goggles",           category:"PPE",         quantity:25,  unit:"pcs", status:"Available",    location:"Supply Room", lastUpdated:"2025-04-20" },
      { id:"IT003", name:"Lab Coat (M)",             category:"PPE",         quantity:10,  unit:"pcs", status:"Low Stock",    location:"Supply Room", lastUpdated:"2025-04-18" },
      { id:"IT004", name:"Beaker 100mL",             category:"Glassware",   quantity:40,  unit:"pcs", status:"Available",    location:"Cabinet 1",   lastUpdated:"2025-04-10" },
      { id:"IT005", name:"Erlenmeyer Flask 250mL",   category:"Glassware",   quantity:20,  unit:"pcs", status:"Available",    location:"Cabinet 1",   lastUpdated:"2025-04-09" },
      { id:"IT006", name:"Test Tubes",               category:"Glassware",   quantity:0,   unit:"pcs", status:"Out of Stock",  location:"Cabinet 2",   lastUpdated:"2025-03-15" },
      { id:"IT007", name:"Petri Dishes",             category:"Glassware",   quantity:60,  unit:"pcs", status:"Available",    location:"Cabinet 2",   lastUpdated:"2025-04-21" },
      { id:"IT008", name:"Pipette Tips (10µL)",      category:"Consumables", quantity:500, unit:"pcs", status:"Available",    location:"Cabinet 3",   lastUpdated:"2025-04-22" },
      { id:"IT009", name:"Micropipette (1000µL)",    category:"Consumables", quantity:3,   unit:"pcs", status:"Low Stock",    location:"Room A",      lastUpdated:"2025-04-16" },
      { id:"IT010", name:"Filter Paper",             category:"Consumables", quantity:200, unit:"pcs", status:"Available",    location:"Cabinet 3",   lastUpdated:"2025-04-11" },
      { id:"IT011", name:"Disposable Syringes 5mL",  category:"Consumables", quantity:100, unit:"pcs", status:"Available",    location:"Supply Room", lastUpdated:"2025-04-20" },
      { id:"IT012", name:"Rubber Tubing",            category:"Accessories", quantity:0,   unit:"m",   status:"Out of Stock",  location:"Cabinet 4",   lastUpdated:"2025-03-20" },
    ]
  };

  /* ────────────────────────────────────────────
     Column Definitions per Tab
  ──────────────────────────────────────────── */
  const columns = {
    equipment: [
      { key:"id",          label:"ID" },
      { key:"name",        label:"Name" },
      { key:"category",    label:"Category",  type:"chip" },
      { key:"quantity",    label:"Qty" },
      { key:"unit",        label:"Unit" },
      { key:"condition",   label:"Condition" },
      { key:"location",    label:"Location" },
      { key:"status",      label:"Status",    type:"badge" },
      { key:"lastUpdated", label:"Updated" },
      { key:"_actions",    label:"Actions",   type:"actions" },
    ],
    chemicals: [
      { key:"id",          label:"ID" },
      { key:"name",        label:"Chemical Name" },
      { key:"category",    label:"Category",  type:"chip" },
      { key:"quantity",    label:"Qty" },
      { key:"unit",        label:"Unit" },
      { key:"hazard",      label:"Hazard" },
      { key:"location",    label:"Location" },
      { key:"expiry",      label:"Expiry" },
      { key:"status",      label:"Status",    type:"badge" },
      { key:"_actions",    label:"Actions",   type:"actions" },
    ],
    items: [
      { key:"id",          label:"ID" },
      { key:"name",        label:"Item Name" },
      { key:"category",    label:"Category",  type:"chip" },
      { key:"quantity",    label:"Qty" },
      { key:"unit",        label:"Unit" },
      { key:"location",    label:"Location" },
      { key:"status",      label:"Status",    type:"badge" },
      { key:"lastUpdated", label:"Updated" },
      { key:"_actions",    label:"Actions",   type:"actions" },
    ]
  };

  /* ────────────────────────────────────────────
     Form Field Definitions per Tab
  ──────────────────────────────────────────── */
  const formFields = {
    equipment: [
      { key:"id",          label:"Item ID",    type:"text",   placeholder:"EQ001", full:false },
      { key:"name",        label:"Name",       type:"text",   placeholder:"Equipment name", full:true },
      { key:"category",    label:"Category",   type:"select", options:["Optics","Separation","Heating","Measurement","Sterilization","Mixing","Safety","Storage","Other"] },
      { key:"quantity",    label:"Quantity",   type:"number", placeholder:"0" },
      { key:"unit",        label:"Unit",       type:"text",   placeholder:"pcs" },
      { key:"condition",   label:"Condition",  type:"select", options:["Good","Fair","Poor","For Repair"] },
      { key:"location",    label:"Location",   type:"text",   placeholder:"Room A" },
      { key:"status",      label:"Status",     type:"select", options:["Available","Low Stock","Out of Stock"] },
      { key:"lastUpdated", label:"Last Updated", type:"date" },
    ],
    chemicals: [
      { key:"id",          label:"Item ID",    type:"text",   placeholder:"CH001", full:false },
      { key:"name",        label:"Chemical Name", type:"text", placeholder:"Chemical name", full:true },
      { key:"category",    label:"Category",   type:"select", options:["Acids","Bases","Solvents","Salts","Biological","Oxidizers","Other"] },
      { key:"quantity",    label:"Quantity",   type:"number", placeholder:"0" },
      { key:"unit",        label:"Unit",       type:"select", options:["L","mL","kg","g","mg"] },
      { key:"hazard",      label:"Hazard",     type:"select", options:["Low","Corrosive","Flammable","Toxic","Oxidizer","Explosive"] },
      { key:"location",    label:"Location",   type:"text",   placeholder:"Storage location" },
      { key:"expiry",      label:"Expiry Date", type:"date" },
      { key:"status",      label:"Status",     type:"select", options:["Available","Low Stock","Out of Stock"] },
    ],
    items: [
      { key:"id",          label:"Item ID",    type:"text",   placeholder:"IT001", full:false },
      { key:"name",        label:"Item Name",  type:"text",   placeholder:"Item name", full:true },
      { key:"category",    label:"Category",   type:"select", options:["PPE","Glassware","Consumables","Accessories","Other"] },
      { key:"quantity",    label:"Quantity",   type:"number", placeholder:"0" },
      { key:"unit",        label:"Unit",       type:"text",   placeholder:"pcs" },
      { key:"location",    label:"Location",   type:"text",   placeholder:"Storage location" },
      { key:"status",      label:"Status",     type:"select", options:["Available","Low Stock","Out of Stock"] },
      { key:"lastUpdated", label:"Last Updated", type:"date" },
    ]
  };

  /* ────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────── */
  function badgeClass(s) { return s === "Available" ? "badge-ok" : s === "Low Stock" ? "badge-low" : "badge-empty"; }
  function badgeLabel(s) { return s || "–"; }

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function generateId() {
    const prefix = { equipment:"EQ", chemicals:"CH", items:"IT" }[currentTab];
    const nums   = data[currentTab].map(r => parseInt(r.id.replace(/\D/g,""), 10)).filter(Boolean);
    const next   = (nums.length ? Math.max(...nums) : 0) + 1;
    return prefix + String(next).padStart(3, "0");
  }

  /* ────────────────────────────────────────────
     Tab Switching
  ──────────────────────────────────────────── */
  window.switchTab = function (tab) {
    currentTab  = tab;
    currentPage = 1;
    sortKey     = null;
    sortDir     = 1;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("searchInput").value = "";
    document.getElementById("statusFilter").value = "";
    populateCategoryFilter();
    renderStats();
    renderTable();
  };

  /* ────────────────────────────────────────────
     Category Filter
  ──────────────────────────────────────────── */
  function populateCategoryFilter() {
    const sel  = document.getElementById("categoryFilter");
    const cats = [...new Set(data[currentTab].map(r => r.category))].sort();
    sel.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  /* ────────────────────────────────────────────
     Stats
  ──────────────────────────────────────────── */
  function renderStats() {
    const rows  = data[currentTab];
    const total = rows.length;
    const ok    = rows.filter(r => r.status === "Available").length;
    const low   = rows.filter(r => r.status === "Low Stock").length;
    const empty = rows.filter(r => r.status === "Out of Stock").length;
    document.getElementById("statsRow").innerHTML = `
      <div class="stat-card">
        <div class="stat-icon blue"><i class='bx bx-list-ul'></i></div>
        <div class="stat-info"><div class="stat-val">${total}</div><div class="stat-lbl">Total Items</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class='bx bx-check-circle'></i></div>
        <div class="stat-info"><div class="stat-val">${ok}</div><div class="stat-lbl">Available</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon gold"><i class='bx bx-error-circle'></i></div>
        <div class="stat-info"><div class="stat-val">${low}</div><div class="stat-lbl">Low Stock</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class='bx bx-x-circle'></i></div>
        <div class="stat-info"><div class="stat-val">${empty}</div><div class="stat-lbl">Out of Stock</div></div>
      </div>
    `;
  }

  /* ────────────────────────────────────────────
     Filter + Render Table
  ──────────────────────────────────────────── */
  function getFiltered() {
    const q   = document.getElementById("searchInput").value.toLowerCase();
    const st  = document.getElementById("statusFilter").value;
    const cat = document.getElementById("categoryFilter").value;
    return data[currentTab].filter(row => {
      const matchQ   = !q   || Object.values(row).some(v => String(v).toLowerCase().includes(q));
      const matchSt  = !st  || row.status   === st;
      const matchCat = !cat || row.category === cat;
      return matchQ && matchSt && matchCat;
    });
  }

  window.renderTable = function () {
    const cols       = columns[currentTab];
    const filtered   = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    // Sort
    if (sortKey) {
      filtered.sort((a, b) => {
        const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
        const an = parseFloat(av); const bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }

    const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    /* Head */
    document.getElementById("tableHead").innerHTML =
      "<tr>" + cols.map(c => {
        if (c.key === "_actions") return `<th>${c.label}</th>`;
        const isActive = sortKey === c.key;
        const icon = isActive ? (sortDir === 1 ? "↑" : "↓") : "⇅";
        return `<th onclick="sortBy('${c.key}')" style="cursor:pointer">${c.label} <span class="sort-icon" style="opacity:${isActive ? 1 : 0.55}">${icon}</span></th>`;
      }).join("") + "</tr>";

    /* Body */
    if (paged.length === 0) {
      document.getElementById("tableBody").innerHTML =
        `<tr><td colspan="${cols.length}">
          <div class="empty-state">
            <i class='bx bx-search-alt'></i>
            <p>No items found.</p>
          </div>
        </td></tr>`;
    } else {
      document.getElementById("tableBody").innerHTML = paged.map(row => `
        <tr>
          ${cols.map(col => {
            if (col.type === "badge")   return `<td><span class="badge ${badgeClass(row[col.key])}">${badgeLabel(row[col.key])}</span></td>`;
            if (col.type === "chip")    return `<td><span class="chip">${row[col.key]}</span></td>`;
            if (col.type === "actions") return `
              <td>
                <div class="action-btns">
                  <button class="btn-icon btn-edit" title="Edit"   onclick="openEditModal('${row.id}')"><i class='bx bx-edit'></i></button>
                  <button class="btn-icon btn-del"  title="Delete" onclick="openDeleteModal('${row.id}')"><i class='bx bx-trash'></i></button>
                </div>
              </td>`;
            return `<td>${row[col.key] !== undefined ? row[col.key] : "–"}</td>`;
          }).join("")}
        </tr>
      `).join("");
    }

    /* Pagination */
    document.getElementById("paginationRow").innerHTML = `
      <div class="page-btns">
        <button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""} style="opacity:${currentPage === 1 ? 0.4 : 1}">
          <i class='bx bx-chevron-left'></i>
        </button>
        <button class="page-btn active">${currentPage}</button>
        <button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""} style="opacity:${currentPage === totalPages ? 0.4 : 1}">
          <i class='bx bx-chevron-right'></i>
        </button>
      </div>
    `;
  };

  window.sortBy = function (key) {
    if (sortKey === key) { sortDir *= -1; } else { sortKey = key; sortDir = 1; }
    currentPage = 1;
    renderTable();
  };

  window.goPage = function (p) {
    const totalPages = Math.max(1, Math.ceil(getFiltered().length / ROWS_PER_PAGE));
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderTable();
  };

  /* ────────────────────────────────────────────
     Modal – Add / Edit
  ──────────────────────────────────────────── */
  function buildForm(values) {
    const fields = formFields[currentTab];
    return `<div class="form-grid">${
      fields.map(f => {
        const val = values ? (values[f.key] || "") : "";
        const cls = f.full ? "form-group full" : "form-group";
        let input;
        if (f.type === "select") {
          input = `<select id="ff_${f.key}">${
            f.options.map(o => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")
          }</select>`;
        } else {
          input = `<input type="${f.type}" id="ff_${f.key}" value="${val}" placeholder="${f.placeholder || ""}">`;
        }
        return `<div class="${cls}"><label>${f.label}</label>${input}</div>`;
      }).join("")
    }</div>`;
  }

  window.openAddModal = function () {
    editingId = null;
    document.getElementById("modalTitle").textContent = "Add Item";
    document.getElementById("modalBody").innerHTML = buildForm(null);
    // Pre-fill ID and date
    const idField = document.getElementById("ff_id");
    if (idField) idField.value = generateId();
    const dateField = document.getElementById("ff_lastUpdated");
    if (dateField) dateField.value = today();
    document.getElementById("modalOverlay").classList.add("open");
  };

  window.openEditModal = function (id) {
    editingId    = id;
    const record = data[currentTab].find(r => r.id === id);
    if (!record) return;
    document.getElementById("modalTitle").textContent = "Edit Item";
    document.getElementById("modalBody").innerHTML = buildForm(record);
    document.getElementById("modalOverlay").classList.add("open");
  };

  window.saveItem = function () {
    const fields = formFields[currentTab];
    const obj    = {};
    fields.forEach(f => {
      const el = document.getElementById("ff_" + f.key);
      obj[f.key] = el ? el.value.trim() : "";
    });

    if (!obj.name) { alert("Name is required."); return; }

    // Auto-set status by quantity if user didn't change it
    if (obj.quantity !== undefined) {
      const qty = parseInt(obj.quantity, 10);
      if (!isNaN(qty) && qty === 0 && obj.status === "Available") obj.status = "Out of Stock";
    }

    if (editingId) {
      const idx = data[currentTab].findIndex(r => r.id === editingId);
      if (idx !== -1) data[currentTab][idx] = { ...data[currentTab][idx], ...obj };
    } else {
      if (!obj.id) obj.id = generateId();
      data[currentTab].push(obj);
    }

    closeModal();
    populateCategoryFilter();
    renderStats();
    renderTable();
  };

  window.closeModal = function (e) {
    if (e && e.target !== document.getElementById("modalOverlay")) return;
    document.getElementById("modalOverlay").classList.remove("open");
  };

  /* ────────────────────────────────────────────
     Modal – Delete
  ──────────────────────────────────────────── */
  window.openDeleteModal = function (id) {
    deleteId = id;
    const record = data[currentTab].find(r => r.id === id);
    document.getElementById("deleteItemName").textContent = record ? record.name : id;
    document.getElementById("deleteOverlay").classList.add("open");
  };

  window.confirmDelete = function () {
    data[currentTab] = data[currentTab].filter(r => r.id !== deleteId);
    closeDelete();
    populateCategoryFilter();
    renderStats();
    renderTable();
  };

  window.closeDelete = function (e) {
    if (e && e.target !== document.getElementById("deleteOverlay")) return;
    document.getElementById("deleteOverlay").classList.remove("open");
    deleteId = null;
  };

  /* ────────────────────────────────────────────
     Init
  ──────────────────────────────────────────── */
  populateCategoryFilter();
  renderStats();
  renderTable();

})();