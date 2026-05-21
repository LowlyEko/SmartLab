/* =============================================
   inventory.js — CAS Laboratory Inventory Logic
   Connected to Smartlab Backend API
   ============================================= */
(function () {
  "use strict";

  const ROWS_PER_PAGE = 8;
  let currentTab  = "apparatus";
  let currentPage = 1;
  let editingId   = null;
  let editingItemType = null;
  let deleteId    = null;
  let deleteItemType = null;
  let sortKey     = null;
  let sortDir     = 1; // 1 = asc, -1 = desc
  let locations   = []; // cached from API

  /* ────────────────────────────────────────────
     Live data store — populated from API
  ──────────────────────────────────────────── */
  const data = {
    apparatus:  [],
    glassware:  [],
    equipment:  [],
    supplies:   [],
    chemicals:  [],
  };

  /* ────────────────────────────────────────────
     API Helpers
  ──────────────────────────────────────────── */
  function apiUrl(path) {
    return CONFIG.BASE_URL + path;
  }

  function apiFetch(path, options = {}) {
    return fetch(apiUrl(path), {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
    }).then(async res => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      return json;
    });
  }

  /* ────────────────────────────────────────────
     Load all inventory from the API
  ──────────────────────────────────────────── */
  async function loadInventory() {
    showTableLoading();
    try {
      const [equipRes, chemRes, locRes] = await Promise.all([
        apiFetch("/inventory?type=equipment"),
        apiFetch("/inventory?type=chemical"),
        apiFetch("/inventory/locations"),
      ]);

      // Clear existing
      data.apparatus = [];
      data.glassware = [];
      data.equipment = [];
      data.supplies  = [];
      data.chemicals = [];

      const equipItems = equipRes.data || equipRes || [];
      equipItems.forEach(item => {
        const tab = item.item_type; // apparatus | glassware | equipment | supplies
        if (data[tab]) data[tab].push(normalizeForUI(item));
      });

      const chemItems = chemRes.data || chemRes || [];
      chemItems.forEach(item => {
        data.chemicals.push(normalizeForUI(item));
      });

      locations = (locRes.data || locRes || []);

      populateBrandFilter();
      renderStats();
      renderTable();
    } catch (err) {
      console.error("Failed to load inventory:", err);
      showTableError("Failed to load inventory. Make sure the backend server is running.");
    }
  }

  /* ────────────────────────────────────────────
     Normalize API response → flat UI row shape
  ──────────────────────────────────────────── */
  function normalizeForUI(item) {
    const tab = item.item_type;

    if (tab === "apparatus" || tab === "glassware") {
      return {
        _id:         item.id,
        _item_type:  tab,
        id:          formatId(item.id, tab),
        name:        item.name        || "",
        description: item.volume_size || "",
        brand:       item.brand       || "",
        location:    item.location    || "",
        location_id: item.location_id,
        remarks:     item.remarks     || "",
      };
    }

    if (tab === "equipment") {
      return {
        _id:              item.id,
        _item_type:       "equipment",
        id:               formatId(item.id, "equipment"),
        name:             item.name              || "",
        brand:            item.brand             || "",
        serial:           item.serial_no         || "",
        propertyNo:       item.property_number   || "",
        code:             item.equipment_code    || "",
        location:         item.location          || "",
        location_id:      item.location_id,
        calibrationDate:  item.calibration_date  ? item.calibration_date.split("T")[0] : "",
        calibrationFreq:  item.calibration_frequency || "",
        remarks:          item.remarks           || "",
        status:           item.status            || "",
      };
    }

    if (tab === "supplies") {
      return {
        _id:         item.id,
        _item_type:  "supplies",
        id:          formatId(item.id, "supplies"),
        name:        item.name        || "",
        brand:       item.brand       || "",
        location:    item.location    || "",
        location_id: item.location_id,
      };
    }

    if (tab === "chemicals") {
      return {
        _id:         item.id,
        _item_type:  "chemicals",
        id:          formatId(item.id, "chemicals"),
        name:        item.name        || "",
        category:    item.category    || "",
        quantity:    item.available_quantity || 0,
        unit:        item.unit        || item.volume_size || "",
        hazard:      item.hazard      || "",
        location:    item.location    || "",
        location_id: item.location_id,
        expiry:      item.expiry      || "",
        status:      item.status      || "Available",
        remarks:     item.remarks     || "",
      };
    }

    return item;
  }

  function formatId(numId, tab) {
    const prefixes = { apparatus:"AP", glassware:"GL", equipment:"EQ", supplies:"IT", chemicals:"CH" };
    return (prefixes[tab] || "XX") + String(numId).padStart(3, "0");
  }

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
      { key:"name",        label:"Name of Apparatus",   type:"text",   placeholder:"e.g. Bunsen Burner",  full:true },
      { key:"description", label:"Description",         type:"text",   placeholder:"Brief description",   full:true },
      { key:"brand",       label:"Brand",               type:"text",   placeholder:"e.g. Pyrex, Generic" },
      { key:"location_id", label:"Location / Storage",  type:"location" },
      { key:"remarks",     label:"Remarks",             type:"text",   placeholder:"e.g. Functional, Damaged, For Repair", full:true },
    ],
    glassware: [
      { key:"name",        label:"Name of Glassware",   type:"text",   placeholder:"e.g. Beaker 250mL",   full:true },
      { key:"description", label:"Description",         type:"text",   placeholder:"Brief description",   full:true },
      { key:"brand",       label:"Brand",               type:"text",   placeholder:"e.g. 18 Pyrex; 4 Bomex; 1 GG-17" },
      { key:"location_id", label:"Location / Storage",  type:"location" },
      { key:"remarks",     label:"Remarks",             type:"text",   placeholder:"e.g. Unused, Chipped",  full:true },
    ],
    equipment: [
      { key:"name",            label:"Equipment Name",          type:"text",   placeholder:"e.g. Analytical Balance", full:true },
      { key:"brand",           label:"Brand / Model",           type:"text",   placeholder:"e.g. Shimadzu AUX220" },
      { key:"serial",          label:"Serial No.",              type:"text",   placeholder:"SN-XXXX-XXX" },
      { key:"propertyNo",      label:"Property No.",            type:"text",   placeholder:"CAS-EQ-XXX" },
      { key:"code",            label:"Equipment Code",          type:"text",   placeholder:"e.g. BAL-001" },
      { key:"location_id",     label:"Area / Location of Use",  type:"location" },
      { key:"calibrationDate", label:"Calibration Date",        type:"date" },
      { key:"calibrationFreq", label:"Calibration Frequency",   type:"select", options:["N/A","Monthly","Quarterly","Semi-annual","Annual"] },
      { key:"remarks",         label:"Remarks",                 type:"text",   placeholder:"e.g. FUNCTIONAL, NOT FUNCTIONAL, FOR REPAIR", full:true },
    ],
    supplies: [
      { key:"name",     label:"Name of Supply",     type:"text", placeholder:"e.g. Latex Gloves (M)", full:true },
      { key:"brand",    label:"Brand",              type:"text", placeholder:"e.g. Medline, 3M" },
      { key:"location_id", label:"Location / Storage", type:"location" },
    ],
    chemicals: [
      { key:"name",     label:"Chemical Name", type:"text",   placeholder:"Chemical name", full:true },
      { key:"category", label:"Category",      type:"select", options:["Acids","Bases","Solvents","Salts","Biological","Oxidizers","Other"] },
      { key:"quantity", label:"Quantity",      type:"number", placeholder:"0" },
      { key:"unit",     label:"Unit",          type:"select", options:["L","mL","kg","g","mg"] },
      { key:"hazard",   label:"Hazard",        type:"select", options:["Low","Corrosive","Flammable","Toxic","Oxidizer","Explosive"] },
      { key:"location_id", label:"Location",   type:"location" },
      { key:"expiry",   label:"Expiry Date",   type:"date" },
      { key:"status",   label:"Status",        type:"select", options:["Available","Low Stock","Out of Stock"] },
      { key:"remarks",  label:"Remarks",       type:"text",   placeholder:"Notes", full:true },
    ],
  };

  /* ────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────── */
  function badgeClass(s) { return s === "Available" ? "badge-ok" : s === "Low Stock" ? "badge-low" : "badge-empty"; }
  function badgeLabel(s) { return s || "–"; }

  function showTableLoading() {
    const cols = columns[currentTab] || [];
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="${cols.length}" style="text-align:center;padding:32px;color:#888;">
        <i class='bx bx-loader-alt bx-spin' style="font-size:24px;margin-bottom:8px;display:block;"></i>
        Loading…
      </td></tr>`;
  }

  function showTableError(msg) {
    const cols = columns[currentTab] || [];
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="${cols.length}" style="text-align:center;padding:32px;color:#e74c3c;">
        <i class='bx bx-error-circle' style="font-size:24px;margin-bottom:8px;display:block;"></i>
        ${msg}
      </td></tr>`;
  }

  function showToast(msg, type = "success") {
    let toast = document.getElementById("inv-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "inv-toast";
      toast.style.cssText = "position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s;";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = type === "error" ? "#e74c3c" : "#27ae60";
    toast.style.opacity = "1";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = "0"; }, 3000);
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
    const rows      = data[currentTab];
    const total     = rows.length;
    const hasStatus = rows.some(r => r.status);
    const borrowed  = hasStatus ? rows.filter(r => r.status === "Borrowed").length  : "–";
    const empty     = hasStatus ? rows.filter(r => r.status === "Out of Stock").length : "–";

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
                  <button class="btn-icon btn-edit" title="Edit"   onclick="openEditModal('${row._id}', '${row._item_type}')"><i class='bx bx-edit'></i></button>
                  <button class="btn-icon btn-del"  title="Delete" onclick="openDeleteModal('${row._id}', '${row._item_type}', '${row.name}')"><i class='bx bx-trash'></i></button>
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
     Build location <select>
  ──────────────────────────────────────────── */
  function locationSelect(selectedId) {
    const opts = locations.map(loc =>
      `<option value="${loc.location_id}" ${Number(selectedId) === Number(loc.location_id) ? "selected" : ""}>${loc.location_name}</option>`
    ).join("");
    return `<select id="ff_location_id"><option value="">-- Select Location --</option>${opts}</select>`;
  }

  /* ────────────────────────────────────────────
     Modal – Add / Edit
  ──────────────────────────────────────────── */
  function buildForm(values) {
    const fields = formFields[currentTab];
    return `<div class="form-grid">${
      fields.map(f => {
        const val = values ? (values[f.key] !== undefined ? values[f.key] : "") : "";
        const cls = f.full ? "form-group full" : "form-group";
        let input;
        if (f.type === "location") {
          input = locationSelect(val);
        } else if (f.type === "select") {
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
    editingId       = null;
    editingItemType = null;
    document.getElementById("modalTitle").textContent = "Add Item";
    document.getElementById("modalBody").innerHTML = buildForm(null);
    document.getElementById("modalOverlay").classList.add("open");
  };

  window.openEditModal = function (id, itemType) {
    editingId       = Number(id);
    editingItemType = itemType;
    const record = data[currentTab].find(r => r._id === Number(id));
    if (!record) return;
    document.getElementById("modalTitle").textContent = "Edit Item";
    document.getElementById("modalBody").innerHTML = buildForm(record);
    document.getElementById("modalOverlay").classList.add("open");
  };

  window.saveItem = async function () {
    const fields = formFields[currentTab];
    const form   = {};
    fields.forEach(f => {
      const el = document.getElementById("ff_" + f.key);
      form[f.key] = el ? el.value.trim() : "";
    });

    if (!form.name) { alert("Name is required."); return; }
    if (!form.location_id) { alert("Location is required."); return; }

    // Map UI form keys → API body keys
    const isChemical = currentTab === "chemicals";
    const body = isChemical ? buildChemicalBody(form) : buildEquipmentBody(form);

    const saveBtn = document.querySelector(".btn-save");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

    try {
      if (editingId) {
        // UPDATE
        if (isChemical) {
          await apiFetch(`/inventory/chemical/${editingId}`, { method:"PUT", body:JSON.stringify(body) });
        } else {
          body.item_type = editingItemType;
          await apiFetch(`/inventory/equipment/${editingId}`, { method:"PUT", body:JSON.stringify(body) });
        }
        showToast("Item updated successfully.");
      } else {
        // CREATE
        if (isChemical) {
          await apiFetch("/inventory/chemical", { method:"POST", body:JSON.stringify(body) });
        } else {
          body.category = categoryForTab(currentTab);
          await apiFetch("/inventory/equipment", { method:"POST", body:JSON.stringify(body) });
        }
        showToast("Item added successfully.");
      }

      closeModal();
      await loadInventory();
    } catch (err) {
      showToast(err.message || "Save failed.", "error");
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; }
    }
  };

  function buildEquipmentBody(form) {
    return {
      name:             form.name,
      volume_size:      form.description || form.volume_size || "",
      brand:            form.brand       || "",
      location_id:      form.location_id,
      remarks:          form.remarks     || "",
      // equipment-specific
      model:            form.brand       || "",
      serial_no:        form.serial      || "",
      property_number:  form.propertyNo  || "",
      equipment_code:   form.code        || "",
      calibration_date: form.calibrationDate || null,
      calibration_frequency: form.calibrationFreq || "",
      status:           form.status      || "",
    };
  }

  function buildChemicalBody(form) {
    return {
      name:        form.name,
      amount:      form.unit   || "",
      location_id: form.location_id,
      remarks:     form.remarks || "",
    };
  }

  function categoryForTab(tab) {
    return { apparatus:"Apparatus", glassware:"Glassware", equipment:"Equipment", supplies:"Supply" }[tab] || "Equipment";
  }

  window.closeModal = function (e) {
    if (e && e.target !== document.getElementById("modalOverlay")) return;
    document.getElementById("modalOverlay").classList.remove("open");
  };

  /* ────────────────────────────────────────────
     Modal – Delete
  ──────────────────────────────────────────── */
  window.openDeleteModal = function (id, itemType, name) {
    deleteId       = Number(id);
    deleteItemType = itemType;
    document.getElementById("deleteItemName").textContent = name || id;
    document.getElementById("deleteOverlay").classList.add("open");
  };

  window.confirmDelete = async function () {
    const delBtn = document.querySelector("#deleteBox .btn-danger");
    if (delBtn) { delBtn.disabled = true; delBtn.textContent = "Deleting…"; }

    try {
      const isChemical = deleteItemType === "chemicals";
      if (isChemical) {
        await apiFetch(`/inventory/chemical/${deleteId}`, { method:"DELETE" });
      } else {
        await apiFetch(`/inventory/equipment/${deleteId}?item_type=${deleteItemType}`, { method:"DELETE" });
      }
      showToast("Item deleted successfully.");
      closeDelete();
      await loadInventory();
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
      if (delBtn) { delBtn.disabled = false; delBtn.textContent = "Delete"; }
    }
  };

  window.closeDelete = function (e) {
    if (e && e.target !== document.getElementById("deleteOverlay")) return;
    document.getElementById("deleteOverlay").classList.remove("open");
    deleteId       = null;
    deleteItemType = null;
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

  loadInventory();

})();