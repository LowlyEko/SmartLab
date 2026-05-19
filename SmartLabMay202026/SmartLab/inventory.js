/* =============================================
   inventory.js — CAS Laboratory Inventory Logic
   ============================================= */
(function () {
  "use strict";

  const ROWS_PER_PAGE = 8;
  let currentTab  = "apparatus";
  let currentPage = 1;
  let editingId   = null;
  let deleteId    = null;
  let sortKey     = null;
  let sortDir     = 1; // 1 = asc, -1 = desc

  /* ────────────────────────────────────────────
     Sample Data
  ──────────────────────────────────────────── */
  const data = {
    apparatus: [
      { id:"AP001", name:"Bunsen Burner",         description:"Single nozzle gas burner for heating",        brand:"Velp",       location:"Room A / Cabinet 1",   remarks:"Functional" },
      { id:"AP002", name:"Ring Stand with Clamp", description:"Iron ring stand with adjustable clamp",       brand:"Generic",    location:"Room A / Cabinet 2",   remarks:"2 clamps missing" },
      { id:"AP003", name:"Tripod Stand",          description:"Three-legged support for beakers/flasks",     brand:"Generic",    location:"Room B / Cabinet 1",   remarks:"Functional" },
      { id:"AP004", name:"Wire Gauze",            description:"Steel wire mesh for heat distribution",       brand:"Generic",    location:"Room A / Cabinet 1",   remarks:"DEFECTIVE" },
      { id:"AP005", name:"Crucible with Cover",   description:"Porcelain crucible for high-temp reactions",  brand:"Coors",      location:"Room C / Cabinet 3",   remarks:"107 Crucible; 90 Cover" },
      { id:"AP006", name:"Evaporating Dish",      description:"Wide-mouth porcelain dish for evaporation",   brand:"Coors",      location:"Room C / Cabinet 3",   remarks:"Functional" },
      { id:"AP007", name:"Mortar and Pestle",     description:"Grinding tool for solid substances",          brand:"Coors",      location:"Room B / Cabinet 2",   remarks:"Functional" },
      { id:"AP008", name:"Funnel (Glass)",        description:"Conical funnel for liquid transfer",          brand:"Pyrex",      location:"Room A / Cabinet 2",   remarks:"1 damaged" },
      { id:"AP009", name:"Condenser (Liebig)",    description:"Water-cooled condenser for distillation",     brand:"Pyrex",      location:"Room D / Cabinet 1",   remarks:"Functional" },
      { id:"AP010", name:"Separatory Funnel",     description:"Pear-shaped funnel with stopcock",            brand:"Bomex",      location:"Room D / Cabinet 1",   remarks:"Stopcock leaking — for repair" },
      { id:"AP011", name:"Crucible Tongs",        description:"Metal tongs for handling hot crucibles",      brand:"Generic",    location:"Room C / Cabinet 3",   remarks:"Functional" },
      { id:"AP012", name:"Clay Triangle",         description:"Triangular clay support for crucibles",       brand:"Generic",    location:"Room A / Cabinet 1",   remarks:"3 damaged" },
    ],

    glassware: [
      { id:"GL001", name:"Beaker 50mL",              description:"Low-form borosilicate glass beaker",          brand:"Pyrex 18; Bomex 12",                  location:"Cabinet 1",   remarks:"Unused" },
      { id:"GL002", name:"Beaker 100mL",             description:"Low-form borosilicate glass beaker",          brand:"7 Uni-rex; 2 Schott; GG17-9; 4 Kimax", location:"Cabinet 1", remarks:"2 chipped" },
      { id:"GL003", name:"Beaker 250mL",             description:"Low-form borosilicate glass beaker",          brand:"18 Pyrex; 4 Bomex; 1 Boro3.3; 1 GG-17; 1 Sterglass", location:"Cabinet 1", remarks:"Unused" },
      { id:"GL004", name:"Erlenmeyer Flask 250mL",   description:"Conical flask for mixing and heating",        brand:"Pyrex",                               location:"Cabinet 2",   remarks:"Functional" },
      { id:"GL005", name:"Graduated Cylinder 100mL", description:"Glass cylinder for accurate volume measurement", brand:"Veegee 1; Boro 3.3 1",           location:"Cabinet 2",   remarks:"1 cracked — for disposal" },
      { id:"GL006", name:"Test Tubes",               description:"Cylindrical borosilicate tubes",               brand:"Bomex",                               location:"Cabinet 2",   remarks:"OUT OF STOCK" },
      { id:"GL007", name:"Petri Dish",               description:"Shallow glass dish for cultures",              brand:"Pyrex",                               location:"Cabinet 3",   remarks:"Unused" },
      { id:"GL008", name:"Watch Glass",              description:"Circular concave glass for small volumes",     brand:"Generic",                             location:"Cabinet 3",   remarks:"Functional" },
      { id:"GL009", name:"Volumetric Flask 100mL",   description:"Flask for precise volume preparation",         brand:"Pyrex",                               location:"Cabinet 4",   remarks:"Functional" },
      { id:"GL010", name:"Burette 50mL",             description:"Graduated tube with stopcock for titration",   brand:"Pyrex",                               location:"Cabinet 4",   remarks:"Functional" },
      { id:"GL011", name:"Pipette 10mL",             description:"Calibrated glass pipette for liquid transfer", brand:"Bomex",                               location:"Cabinet 3",   remarks:"2 broken tips" },
      { id:"GL012", name:"Reflux Condenser",         description:"Vertical condenser for reflux reactions",      brand:"Pyrex",                               location:"Cabinet 4",   remarks:"Functional" },
    ],

    equipment: [
      { id:"EQ001", name:"Analytical Balance",      brand:"Shimadzu AUX220",    serial:"SN-2024-001",  propertyNo:"CAS-EQ-001", code:"BAL-001", location:"Room A", calibrationDate:"2025-01-15", calibrationFreq:"Semi-annual", remarks:"FUNCTIONAL - Max. 220g" },
      { id:"EQ002", name:"Compound Microscope",     brand:"Olympus CX23",       serial:"SN-2023-045",  propertyNo:"CAS-EQ-002", code:"MIC-001", location:"Room B", calibrationDate:"2024-11-01", calibrationFreq:"Annual",       remarks:"FUNCTIONAL" },
      { id:"EQ003", name:"Centrifuge",              brand:"Eppendorf 5424",     serial:"SN-2022-312",  propertyNo:"CAS-EQ-003", code:"CEN-001", location:"Room B", calibrationDate:"2025-02-10", calibrationFreq:"Annual",       remarks:"For PMS (Preventive Maintenance Service)" },
      { id:"EQ004", name:"Hot Plate Stirrer",       brand:"Velp Scientifica",   serial:"SN-2021-088",  propertyNo:"CAS-EQ-004", code:"HPS-001", location:"Room A", calibrationDate:"–",           calibrationFreq:"N/A",          remarks:"FOR REPAIR - Heating element malfunction" },
      { id:"EQ005", name:"pH Meter",               brand:"Hanna HI2211",       serial:"SN-2023-200",  propertyNo:"CAS-EQ-005", code:"PHM-001", location:"Room A", calibrationDate:"2025-03-01", calibrationFreq:"Monthly",      remarks:"FUNCTIONAL" },
      { id:"EQ006", name:"Spectrophotometer",       brand:"Thermo GENESYS 30",  serial:"SN-2020-075",  propertyNo:"CAS-EQ-006", code:"SPC-001", location:"Room D", calibrationDate:"2025-01-20", calibrationFreq:"Semi-annual",  remarks:"FUNCTIONAL" },
      { id:"EQ007", name:"Autoclave",              brand:"Tuttnauer 2540M",    serial:"SN-2019-300",  propertyNo:"CAS-EQ-007", code:"AUT-001", location:"Room B", calibrationDate:"2024-12-01", calibrationFreq:"Annual",       remarks:"FUNCTIONAL" },
      { id:"EQ008", name:"Vortex Mixer",            brand:"IKA MS3",            serial:"SN-2022-411",  propertyNo:"CAS-EQ-008", code:"VTX-001", location:"Room A", calibrationDate:"–",           calibrationFreq:"N/A",          remarks:"NOT FUNCTIONAL" },
      { id:"EQ009", name:"Water Bath",             brand:"Memmert WNB 7",      serial:"SN-2021-190",  propertyNo:"CAS-EQ-009", code:"WBT-001", location:"Room C", calibrationDate:"2025-02-28", calibrationFreq:"Annual",       remarks:"FOR REPAIR - Thermostat issue" },
      { id:"EQ010", name:"Electric Oven",           brand:"Memmert UF55",       serial:"SN-2020-503",  propertyNo:"CAS-EQ-010", code:"OVN-001", location:"Room B", calibrationDate:"2025-01-10", calibrationFreq:"Annual",       remarks:"FUNCTIONAL" },
      { id:"EQ011", name:"Fume Hood",              brand:"Labconco 3970001",   serial:"SN-2018-002",  propertyNo:"CAS-EQ-011", code:"FHD-001", location:"Room D", calibrationDate:"2024-10-15", calibrationFreq:"Annual",       remarks:"For PMS (Preventive Maintenance Service)" },
      { id:"EQ012", name:"Compound Microscope #2", brand:"Olympus CX23",       serial:"SN-2023-046",  propertyNo:"CAS-EQ-012", code:"MIC-002", location:"Room B", calibrationDate:"2024-11-01", calibrationFreq:"Annual",       remarks:"FOR REPAIR - Coarse adjustment knob not working" },
    ],

    supplies: [
      { id:"IT001", name:"Latex Gloves (M)",        brand:"Medline",        location:"Supply Room" },
      { id:"IT002", name:"Safety Goggles",          brand:"3M",             location:"Supply Room" },
      { id:"IT003", name:"Lab Coat (M)",            brand:"Generic",        location:"Supply Room" },
      { id:"IT004", name:"Pipette Tips (10µL)",     brand:"Axygen",         location:"Cabinet 3" },
      { id:"IT005", name:"Filter Paper",            brand:"Whatman",        location:"Cabinet 3" },
      { id:"IT006", name:"Disposable Syringes 5mL", brand:"BD",             location:"Supply Room" },
      { id:"IT007", name:"Rubber Tubing",           brand:"Generic",        location:"Cabinet 4" },
      { id:"IT008", name:"Aluminum Foil",           brand:"Generic",        location:"Supply Room" },
      { id:"IT009", name:"Masking Tape",            brand:"3M",             location:"Supply Room" },
      { id:"IT010", name:"Marker (Permanent)",      brand:"Sharpie",        location:"Supply Room" },
      { id:"IT011", name:"Micropipette Tips 1mL",   brand:"Axygen",         location:"Cabinet 3" },
      { id:"IT012", name:"Bench Paper",             brand:"Kimberly-Clark", location:"Supply Room" },
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
  };

  /* ────────────────────────────────────────────
     Column Definitions per Tab
  ──────────────────────────────────────────── */
  const columns = {
    apparatus: [
      { key:"id",          label:"ID" },
      { key:"name",        label:"Name of Apparatus" },
      { key:"description", label:"Description" },
      { key:"brand",       label:"Brand" },
      { key:"location",    label:"Location / Storage" },
      { key:"remarks",     label:"Remarks" },
      { key:"_actions",    label:"Actions", type:"actions" },
    ],
    glassware: [
      { key:"id",          label:"ID" },
      { key:"name",        label:"Name of Glassware" },
      { key:"description", label:"Description" },
      { key:"brand",       label:"Brand" },
      { key:"location",    label:"Location / Storage" },
      { key:"remarks",     label:"Remarks" },
      { key:"_actions",    label:"Actions", type:"actions" },
    ],
    equipment: [
      { key:"id",               label:"ID" },
      { key:"name",             label:"Equipment Name" },
      { key:"brand",            label:"Brand / Model" },
      { key:"serial",           label:"Serial No." },
      { key:"propertyNo",       label:"Property No." },
      { key:"code",             label:"Equipment Code" },
      { key:"location",         label:"Area / Location of Use" },
      { key:"calibrationDate",  label:"Calibration Date" },
      { key:"calibrationFreq",  label:"Calibration Frequency" },
      { key:"remarks",          label:"Remarks" },
      { key:"_actions",         label:"Actions", type:"actions" },
    ],
    supplies: [
      { key:"id",       label:"ID" },
      { key:"name",     label:"Name of Supply" },
      { key:"brand",    label:"Brand" },
      { key:"location", label:"Location / Storage" },
      { key:"_actions", label:"Actions", type:"actions" },
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
  };

  /* ────────────────────────────────────────────
     Form Field Definitions per Tab
  ──────────────────────────────────────────── */
  const formFields = {
    apparatus: [
      { key:"id",          label:"Item ID",             type:"text",   placeholder:"AP001" },
      { key:"name",        label:"Name of Apparatus",   type:"text",   placeholder:"e.g. Bunsen Burner",  full:true },
      { key:"description", label:"Description",         type:"text",   placeholder:"Brief description",   full:true },
      { key:"brand",       label:"Brand",               type:"text",   placeholder:"e.g. Pyrex, Generic" },
      { key:"location",    label:"Location / Storage",  type:"text",   placeholder:"e.g. Room A / Cabinet 1" },
      { key:"remarks",     label:"Remarks",             type:"text",   placeholder:"e.g. Functional, Damaged, For Repair", full:true },
    ],
    glassware: [
      { key:"id",          label:"Item ID",             type:"text",   placeholder:"GL001" },
      { key:"name",        label:"Name of Glassware",   type:"text",   placeholder:"e.g. Beaker 250mL",   full:true },
      { key:"description", label:"Description",         type:"text",   placeholder:"Brief description",   full:true },
      { key:"brand",       label:"Brand",               type:"text",   placeholder:"e.g. 18 Pyrex; 4 Bomex; 1 GG-17" },
      { key:"location",    label:"Location / Storage",  type:"text",   placeholder:"e.g. Cabinet 1" },
      { key:"remarks",     label:"Remarks",             type:"text",   placeholder:"e.g. Unused, Chipped",  full:true },
    ],
    equipment: [
      { key:"id",              label:"ID",                     type:"text",   placeholder:"EQ001" },
      { key:"name",            label:"Equipment Name",          type:"text",   placeholder:"e.g. Analytical Balance", full:true },
      { key:"brand",           label:"Brand / Model",           type:"text",   placeholder:"e.g. Shimadzu AUX220" },
      { key:"serial",          label:"Serial No.",              type:"text",   placeholder:"SN-XXXX-XXX" },
      { key:"propertyNo",      label:"Property No.",            type:"text",   placeholder:"CAS-EQ-XXX" },
      { key:"code",            label:"Equipment Code",          type:"text",   placeholder:"e.g. BAL-001" },
      { key:"location",        label:"Area / Location of Use",  type:"text",   placeholder:"e.g. Room A" },
      { key:"calibrationDate", label:"Calibration Date",        type:"date" },
      { key:"calibrationFreq", label:"Calibration Frequency",   type:"select", options:["N/A","Monthly","Quarterly","Semi-annual","Annual"] },
      { key:"remarks",         label:"Remarks",                 type:"text",   placeholder:"e.g. FUNCTIONAL, NOT FUNCTIONAL, FOR REPAIR", full:true },
    ],
    supplies: [
      { key:"id",       label:"Item ID",            type:"text", placeholder:"IT001" },
      { key:"name",     label:"Name of Supply",     type:"text", placeholder:"e.g. Latex Gloves (M)", full:true },
      { key:"brand",    label:"Brand",              type:"text", placeholder:"e.g. Medline, 3M" },
      { key:"location", label:"Location / Storage", type:"text", placeholder:"e.g. Supply Room" },
    ],
    chemicals: [
      { key:"id",          label:"Item ID",       type:"text",   placeholder:"CH001" },
      { key:"name",        label:"Chemical Name", type:"text",   placeholder:"Chemical name", full:true },
      { key:"category",    label:"Category",      type:"select", options:["Acids","Bases","Solvents","Salts","Biological","Oxidizers","Other"] },
      { key:"quantity",    label:"Quantity",      type:"number", placeholder:"0" },
      { key:"unit",        label:"Unit",          type:"select", options:["L","mL","kg","g","mg"] },
      { key:"hazard",      label:"Hazard",        type:"select", options:["Low","Corrosive","Flammable","Toxic","Oxidizer","Explosive"] },
      { key:"location",    label:"Location",      type:"text",   placeholder:"Storage location" },
      { key:"expiry",      label:"Expiry Date",   type:"date" },
      { key:"status",      label:"Status",        type:"select", options:["Available","Low Stock","Out of Stock"] },
    ],
  };

  /* ────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────── */
  function badgeClass(s) { return s === "Available" ? "badge-ok" : s === "Low Stock" ? "badge-low" : "badge-empty"; }
  function badgeLabel(s) { return s || "–"; }

  function today() { return new Date().toISOString().split("T")[0]; }

  function generateId() {
    const prefix = { apparatus:"AP", glassware:"GL", equipment:"EQ", supplies:"IT", chemicals:"CH" }[currentTab];
    const nums   = data[currentTab].map(r => parseInt(r.id.replace(/\D/g,""), 10)).filter(Boolean);
    const next   = (nums.length ? Math.max(...nums) : 0) + 1;
    return prefix + String(next).padStart(3, "0");
  }

  /* ────────────────────────────────────────────
     Custom Dropdown Logic
  ──────────────────────────────────────────── */
  function getStatusValue() {
    const active = document.querySelector("#invStatusMenu .item.active");
    return active ? active.dataset.value : "";
  }

  function getBrandValue() {
    const active = document.querySelector("#invBrandMenu .item.active");
    return active ? active.dataset.value : "";
  }

  function resetDropdown(btnId, menuId, defaultLabel) {
    const btn  = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (btn)  btn.querySelector("span").textContent = defaultLabel;
    if (menu) {
      menu.querySelectorAll(".item").forEach((item, i) => {
        item.classList.toggle("active", i === 0);
      });
    }
  }

  function setupDropdown(dropId, btnId, menuId, onSelect) {
    const btn  = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      // Close all other inv dropdowns
      document.querySelectorAll(".inv-dropdown-menu").forEach(m => {
        if (m !== menu) {
          m.classList.remove("open");
          m.previousElementSibling && m.previousElementSibling.classList.remove("open");
        }
      });
      btn.classList.toggle("open");
      menu.classList.toggle("open");
    });

    menu.addEventListener("click", function (e) {
      const item = e.target.closest(".item");
      if (!item) return;
      menu.querySelectorAll(".item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      btn.querySelector("span").textContent = item.textContent.trim();
      btn.classList.remove("open");
      menu.classList.remove("open");
      onSelect(item.dataset.value);
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", function () {
    document.querySelectorAll(".inv-dropdown-btn").forEach(b => b.classList.remove("open"));
    document.querySelectorAll(".inv-dropdown-menu").forEach(m => m.classList.remove("open"));
  });

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

    // Reset dropdowns
    const brandLabel = tab === "equipment" ? "All Brands/Models" : "All Brands";
    resetDropdown("invStatusBtn", "invStatusMenu", "All Status");
    resetDropdown("invBrandBtn",  "invBrandMenu",  brandLabel);

    populateBrandFilter();
    renderStats();
    renderTable();
  };

  /* ────────────────────────────────────────────
     Brand Filter Population
  ──────────────────────────────────────────── */
  function populateBrandFilter() {
    const menu  = document.getElementById("invBrandMenu");
    const btn   = document.getElementById("invBrandBtn");
    const label = currentTab === "equipment" ? "All Brands/Models" : "All Brands";

    const brands = [...new Set(
      data[currentTab].flatMap(r => {
        if (!r.brand) return [];
        return r.brand
          .split(/\s*;\s*/)
          .map(s => s.replace(/^\d+\s+/, "").replace(/\s+\d+$/, "").trim())
          .filter(Boolean);
      })
    )].sort();

    if (btn) btn.querySelector("span").textContent = label;

    menu.innerHTML =
      `<div class="item active" data-value="">${label}</div>` +
      brands.map(b => `<div class="item" data-value="${b}">${b}</div>`).join("");
  }

  /* ────────────────────────────────────────────
     Stats
  ──────────────────────────────────────────── */
  function renderStats() {
    const rows     = data[currentTab];
    const total    = rows.length;
    const hasStatus = rows.some(r => r.status);
    const borrowed = hasStatus ? rows.filter(r => r.status === "Borrowed").length  : "–";
    const empty    = hasStatus ? rows.filter(r => r.status === "Out of Stock").length : "–";

    document.getElementById("statsRow").innerHTML = `
      <div class="stat-card">
        <div class="stat-icon blue "><i class='bx bx-list-ul'></i></div>
        <div class="stat-info"><div class="stat-val">${total}</div><div class="stat-lbl">Total Items</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon gold"><i class='bx bx-package'></i></div>
        <div class="stat-info"><div class="stat-val">${borrowed}</div><div class="stat-lbl">Borrowed Items</div></div>
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
    const q  = document.getElementById("searchInput").value.toLowerCase();
    const st = getStatusValue();
    const br = getBrandValue();

    return data[currentTab].filter(row => {
      const matchQ  = !q  || Object.values(row).some(v => String(v).toLowerCase().includes(q));
      const matchSt = !st || row.status === st;
      const matchBr = !br || (row.brand || "")
        .split(/\s*;\s*/)
        .map(s => s.replace(/^\d+\s+/, "").replace(/\s+\d+$/, "").trim())
        .includes(br);
      return matchQ && matchSt && matchBr;
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
        const an = parseFloat(av);  const bn = parseFloat(bv);
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
            return `<td>${row[col.key] !== undefined && row[col.key] !== "" ? row[col.key] : "–"}</td>`;
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
    populateBrandFilter();
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
    populateBrandFilter();
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
  setupDropdown("invStatusDrop", "invStatusBtn", "invStatusMenu", function () {
    currentPage = 1;
    renderTable();
  });

  setupDropdown("invBrandDrop", "invBrandBtn", "invBrandMenu", function () {
    currentPage = 1;
    renderTable();
  });

  populateBrandFilter();
  renderStats();
  renderTable();

})();