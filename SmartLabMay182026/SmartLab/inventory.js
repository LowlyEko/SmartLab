/* =============================================
   inventory.js — CAS Laboratory Inventory Logic
   API-driven rewrite (no hardcoded data)
   ============================================= */
(function () {
  "use strict";

  // ─── Constants ───────────────────────────────
  const ROWS_PER_PAGE = 8;
  const API_BASE      = CONFIG.BASE_URL + "/inventory";

  // ─── State ───────────────────────────────────
  let currentTab  = "apparatus";
  let currentPage = 1;
  let editingId   = null;   // item_id (number) when editing, null when adding
  let deleteId    = null;
  let sortKey     = null;
  let sortDir     = 1;       // 1 = asc, -1 = desc

  // Locations for the Add/Edit dropdowns (fetched once on load)
  let locations = [];

  // Cache: keyed by tab name
  let cache = {
    apparatus: null,
    glassware: null,
    equipment: null,
    supplies:  null,
    chemicals: null,
  };

  // Map tab → backend ?type= param (equipment table or chemical table)
  const TAB_TO_TYPE = {
    apparatus: "equipment",
    glassware: "equipment",
    equipment: "equipment",
    supplies:  "equipment",
    chemicals: "chemical",
  };

  // Map tab → category value stored in equipment.category column
  // null = chemicals (separate table, no category filter needed)
  const TAB_TO_CATEGORY = {
    apparatus: "Apparatus",
    glassware: "Glassware",
    equipment: "Equipment",
    supplies:  "Supply",
    chemicals: null,
  };

  // ─── Column Definitions per Tab ──────────────
  const columns = {
    apparatus: [
      { key: "id",          label: "ID" },
      { key: "name",        label: "Name of Apparatus" },
      { key: "volume_size", label: "Volume / Size" },
      { key: "total_quantity",     label: "Total Qty" },
      { key: "available_quantity", label: "Available Qty" },
      { key: "_actions",    label: "Actions", type: "actions" },
    ],
    glassware: [
      { key: "id",          label: "ID" },
      { key: "name",        label: "Name of Glassware" },
      { key: "volume_size", label: "Volume / Size" },
      { key: "total_quantity",     label: "Total Qty" },
      { key: "available_quantity", label: "Available Qty" },
      { key: "_actions",    label: "Actions", type: "actions" },
    ],
    equipment: [
      { key: "id",                 label: "ID" },
      { key: "name",               label: "Equipment Name" },
      { key: "volume_size",        label: "Model / Size" },
      { key: "total_quantity",     label: "Total Qty" },
      { key: "available_quantity", label: "Available Qty" },
      { key: "_actions",           label: "Actions", type: "actions" },
    ],
    supplies: [
      { key: "id",                 label: "ID" },
      { key: "name",               label: "Name of Supply" },
      { key: "volume_size",        label: "Size / Unit" },
      { key: "total_quantity",     label: "Total Qty" },
      { key: "available_quantity", label: "Available Qty" },
      { key: "_actions",           label: "Actions", type: "actions" },
    ],
    chemicals: [
      { key: "id",                 label: "ID" },
      { key: "name",               label: "Chemical Name" },
      { key: "unit",               label: "Unit" },
      { key: "available_quantity", label: "Available Qty" },
      { key: "remarks",            label: "Remarks" },
      { key: "_actions",           label: "Actions", type: "actions" },
    ],
  };

  // ─── Form Field Definitions per Tab ──────────
  const formFields = {
    apparatus: [
      { key: "name",               label: "Name of Apparatus",  type: "text",   placeholder: "e.g. Bunsen Burner",       full: true },
      { key: "volume_size",        label: "Volume / Size",       type: "text",   placeholder: "e.g. 250mL" },
      { key: "total_quantity",     label: "Total Quantity",      type: "number", placeholder: "0" },
      { key: "available_quantity", label: "Available Quantity",  type: "number", placeholder: "0" },
      { key: "location_id",        label: "Location",            type: "location-select",                                 full: true },
    ],
    glassware: [
      { key: "name",               label: "Name of Glassware",  type: "text",   placeholder: "e.g. Beaker 250mL",        full: true },
      { key: "volume_size",        label: "Volume / Size",       type: "text",   placeholder: "e.g. 250mL" },
      { key: "total_quantity",     label: "Total Quantity",      type: "number", placeholder: "0" },
      { key: "available_quantity", label: "Available Quantity",  type: "number", placeholder: "0" },
      { key: "location_id",        label: "Location",            type: "location-select",                                 full: true },
    ],
    equipment: [
      { key: "name",               label: "Equipment Name",      type: "text",   placeholder: "e.g. Analytical Balance",  full: true },
      { key: "volume_size",        label: "Model / Size",        type: "text",   placeholder: "e.g. Shimadzu AUX220" },
      { key: "total_quantity",     label: "Total Quantity",      type: "number", placeholder: "0" },
      { key: "available_quantity", label: "Available Quantity",  type: "number", placeholder: "0" },
      { key: "location_id",        label: "Location",            type: "location-select",                                 full: true },
    ],
    supplies: [
      { key: "name",               label: "Name of Supply",      type: "text",   placeholder: "e.g. Latex Gloves (M)",    full: true },
      { key: "volume_size",        label: "Size / Unit",         type: "text",   placeholder: "e.g. Medium, 100pcs/box" },
      { key: "total_quantity",     label: "Total Quantity",      type: "number", placeholder: "0" },
      { key: "available_quantity", label: "Available Quantity",  type: "number", placeholder: "0" },
      { key: "location_id",        label: "Location",            type: "location-select",                                 full: true },
    ],
    chemicals: [
      { key: "name",               label: "Chemical Name",       type: "text",   placeholder: "Chemical name",            full: true },
      { key: "unit",               label: "Unit",                type: "select", options: ["L", "mL", "kg", "g", "mg"] },
      { key: "available_quantity", label: "Available Quantity",  type: "number", placeholder: "0" },
      { key: "remarks",            label: "Remarks",             type: "text",   placeholder: "e.g. Keep refrigerated",   full: true },
      { key: "location_id",        label: "Location",            type: "location-select",                                 full: true },
    ],
  };

  // ─── Helpers ──────────────────────────────────
  function badgeClass(s) {
    if (!s) return "";
    const l = s.toLowerCase();
    if (l === "available")    return "badge-ok";
    if (l === "low stock")    return "badge-low";
    if (l === "out of stock") return "badge-empty";
    if (l === "defective")    return "badge-empty";
    if (l === "for repair")   return "badge-low";
    return "";
  }

  function showToast(msg, type = "success") {
    if (typeof window.showToast === "function") {
      window.showToast(msg, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${msg}`);
    }
  }

  // Returns the correct backend sub-path for the current tab
  function getEndpoint() {
    return currentTab === "chemicals" ? "/chemical" : "/equipment";
  }

  // ─── API Calls ───────────────────────────────
  async function apiFetch(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "API error");
    }
    return json.data;
  }

  async function loadTab(tab) {
    const type  = TAB_TO_TYPE[tab];
    // GET /api/inventory?type=equipment  OR  /api/inventory?type=chemical
    const items = await apiFetch(`?type=${type}`);

    // Equipment sub-tabs are all fetched from the same endpoint and
    // filtered client-side using the equipment.category column
    const cat = TAB_TO_CATEGORY[tab];
    cache[tab] = cat
      ? items.filter(i => (i.category || "").toLowerCase() === cat.toLowerCase())
      : items;

    return cache[tab];
  }

  // ─── Tab Switching ────────────────────────────
  window.switchTab = async function (tab) {
    currentTab  = tab;
    currentPage = 1;
    sortKey     = null;
    sortDir     = 1;

    document.querySelectorAll(".tab-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === tab)
    );
    document.getElementById("searchInput").value = "";
    resetDropdowns();

    await refreshCurrentTab();
  };

  async function refreshCurrentTab() {
    renderTableLoading();
    try {
      await loadTab(currentTab);
    } catch (e) {
      renderTableError(e.message);
      return;
    }
    populateBrandFilter();
    renderStats();
    renderTable();
  }

  // ─── Custom Dropdown Helpers ─────────────────
  function getStatusValue() {
    const active = document.querySelector("#invStatusMenu .item.active");
    return active ? active.dataset.value : "";
  }

  function getBrandValue() {
    const active = document.querySelector("#invBrandMenu .item.active");
    return active ? active.dataset.value : "";
  }

  function resetDropdowns() {
    const statusBtn  = document.getElementById("invStatusBtn");
    const statusMenu = document.getElementById("invStatusMenu");
    if (statusBtn)  statusBtn.querySelector("span").textContent = "All Status";
    if (statusMenu) statusMenu.querySelectorAll(".item").forEach((item, i) => item.classList.toggle("active", i === 0));
    const brandLabel = currentTab === "equipment" ? "All Brands/Models" : "All Brands";
    const brandBtn   = document.getElementById("invBrandBtn");
    const brandMenu  = document.getElementById("invBrandMenu");
    if (brandBtn)  brandBtn.querySelector("span").textContent = brandLabel;
    if (brandMenu) brandMenu.querySelectorAll(".item").forEach((item, i) => item.classList.toggle("active", i === 0));
  }

  function initDropdowns() {
    function wire(btnId, menuId, onSelect) {
      const btn  = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (!btn || !menu) return;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".inv-dropdown-menu").forEach(m => {
          if (m !== menu) { m.classList.remove("open"); m.previousElementSibling && m.previousElementSibling.classList.remove("open"); }
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
    wire("invStatusBtn", "invStatusMenu", () => { currentPage = 1; renderTable(); });
    wire("invBrandBtn",  "invBrandMenu",  () => { currentPage = 1; renderTable(); });
    document.addEventListener("click", function () {
      document.querySelectorAll(".inv-dropdown-btn").forEach(b => b.classList.remove("open"));
      document.querySelectorAll(".inv-dropdown-menu").forEach(m => m.classList.remove("open"));
    });
  }

  // ─── Brand Filter ─────────────────────────────
  function populateBrandFilter() {
    const menu  = document.getElementById("invBrandMenu");
    const btn   = document.getElementById("invBrandBtn");
    if (!menu) return;
    const rows  = cache[currentTab] || [];
    const label = currentTab === "equipment" ? "All Brands/Models" : "All Brands";

    const brands = [...new Set(
      rows.flatMap(r => {
        if (!r.brand) return [];
        return r.brand
          .split(/\s*;\s*/)
          .map(s => s.replace(/^\d+\s+/, "").replace(/\s+\d+$/, "").trim())
          .filter(Boolean);
      })
    )].sort();

    if (btn) btn.querySelector("span").textContent = label;
    menu.innerHTML = `<div class="item active" data-value="">${label}</div>` +
      brands.map(b => `<div class="item" data-value="${b}">${b}</div>`).join("");
  }

  // ─── Stats ───────────────────────────────────
  function renderStats() {
    const rows  = cache[currentTab] || [];
    const total = rows.length;

    // For equipment tabs: use available_quantity vs total_quantity
    // For chemicals: use available_quantity directly
    let available = 0;
    let lowStock  = 0;
    let outStock  = 0;

    if (currentTab === "chemicals") {
      available = rows.filter(r => (r.available_quantity || 0) > 0).length;
      outStock  = rows.filter(r => (r.available_quantity || 0) === 0).length;
      lowStock  = "–";
    } else {
      available = rows.filter(r => (r.available_quantity || 0) > 0).length;
      lowStock  = rows.filter(r => (r.available_quantity || 0) > 0 && r.available_quantity < r.total_quantity).length;
      outStock  = rows.filter(r => (r.available_quantity || 0) === 0).length;
    }

    document.getElementById("statsRow").innerHTML = `
      <div class="stat-card">
        <div class="stat-icon blue"><i class='bx bx-list-ul'></i></div>
        <div class="stat-info"><div class="stat-val">${total}</div><div class="stat-lbl">Total Items</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class='bx bx-check-circle'></i></div>
        <div class="stat-info"><div class="stat-val">${available}</div><div class="stat-lbl">Available</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon gold"><i class='bx bx-error-circle'></i></div>
        <div class="stat-info"><div class="stat-val">${lowStock}</div><div class="stat-lbl">Low Stock</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class='bx bx-x-circle'></i></div>
        <div class="stat-info"><div class="stat-val">${outStock}</div><div class="stat-lbl">Out of Stock</div></div>
      </div>
    `;
  }

  // ─── Filter ───────────────────────────────────
  function getFiltered() {
    const q   = document.getElementById("searchInput").value.toLowerCase();
    const st  = getStatusValue();
    const br  = getBrandValue();
    const rows = cache[currentTab] || [];

    return rows.filter(row => {
      const matchQ  = !q  || Object.values(row).some(v => String(v).toLowerCase().includes(q));
      const matchSt = !st || row.status === st;
      const matchBr = !br || (row.brand || "")
        .split(/\s*;\s*/)
        .map(s => s.replace(/^\d+\s+/, "").replace(/\s+\d+$/, "").trim())
        .includes(br);
      return matchQ && matchSt && matchBr;
    });
  }

  // ─── Table Render ─────────────────────────────
  function renderTableLoading() {
    const cols = columns[currentTab];
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="${cols.length}" style="text-align:center;padding:2rem;color:#888;">
         <i class='bx bx-loader-alt bx-spin' style="font-size:1.5rem"></i> Loading…
       </td></tr>`;
  }

  function renderTableError(msg) {
    const cols = columns[currentTab];
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="${cols.length}">
         <div class="empty-state">
           <i class='bx bx-error-circle' style="color:#e74c3c"></i>
           <p style="color:#e74c3c">${msg || "Failed to load inventory."}</p>
           <button class="btn-add" style="margin-top:.5rem" onclick="refreshCurrentTab()">Retry</button>
         </div>
       </td></tr>`;
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
        const an = parseFloat(av);   const bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }

    const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    // Head
    document.getElementById("tableHead").innerHTML =
      "<tr>" + cols.map(c => {
        if (c.key === "_actions") return `<th>${c.label}</th>`;
        const isActive = sortKey === c.key;
        const icon = isActive ? (sortDir === 1 ? "↑" : "↓") : "⇅";
        return `<th onclick="sortBy('${c.key}')" style="cursor:pointer">${c.label} <span class="sort-icon" style="opacity:${isActive ? 1 : 0.55}">${icon}</span></th>`;
      }).join("") + "</tr>";

    // Body
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
            if (col.type === "badge")
              return `<td><span class="badge ${badgeClass(row[col.key])}">${row[col.key] || "–"}</span></td>`;
            if (col.type === "chip")
              return `<td><span class="chip">${row[col.key]}</span></td>`;
            if (col.type === "actions")
              return `
                <td>
                  <div class="action-btns">
                    <button class="btn-icon btn-edit" title="Edit"   onclick="openEditModal(${row.id})"><i class='bx bx-edit'></i></button>
                    <button class="btn-icon btn-del"  title="Delete" onclick="openDeleteModal(${row.id}, '${(row.name || "").replace(/'/g, "\\'")}')"><i class='bx bx-trash'></i></button>
                  </div>
                </td>`;
            const val = row[col.key];
            return `<td>${val !== undefined && val !== "" && val !== null ? val : "–"}</td>`;
          }).join("")}
        </tr>
      `).join("");
    }

    // Pagination
    document.getElementById("paginationRow").innerHTML = `
      <div class="page-btns">
        <button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""} style="opacity:${currentPage === 1 ? 0.4 : 1}">
          <i class='bx bx-chevron-left'></i>
        </button>
        <button class="page-btn active">${currentPage} / ${totalPages}</button>
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

  // ─── Modal – Add / Edit ───────────────────────
  function buildForm(values) {
    const fields = formFields[currentTab];
    return `<div class="form-grid">${
      fields.map(f => {
        const val = values ? (values[f.key] ?? "") : "";
        const cls = f.full ? "form-group full" : "form-group";
        let input;
        if (f.type === "select") {
          input = `<select id="ff_${f.key}">${
            f.options.map(o => `<option value="${o}" ${String(val) === o ? "selected" : ""}>${o}</option>`).join("")
          }</select>`;
        } else if (f.type === "location-select") {
          // Populated from the locations list fetched at init
          const opts = locations.length
            ? locations.map(l =>
                `<option value="${l.location_id}" ${String(val) === String(l.location_id) ? "selected" : ""}>${l.location_name}</option>`
              ).join("")
            : `<option value="">— No locations found —</option>`;
          input = `<select id="ff_${f.key}"><option value="">— Select Location —</option>${opts}</select>`;
        } else {
          input = `<input type="${f.type}" id="ff_${f.key}" value="${String(val).replace(/"/g, "&quot;")}" placeholder="${f.placeholder || ""}">`;
        }
        return `<div class="${cls}"><label>${f.label}</label>${input}</div>`;
      }).join("")
    }</div>`;
  }

  window.openAddModal = function () {
    editingId = null;
    document.getElementById("modalTitle").textContent = "Add Item";
    document.getElementById("modalBody").innerHTML = buildForm(null);
    document.getElementById("modalOverlay").classList.add("open");
  };

  window.openEditModal = async function (id) {
    editingId = id;
    document.getElementById("modalTitle").textContent = "Edit Item";
    document.getElementById("modalBody").innerHTML =
      `<div style="text-align:center;padding:1.5rem;color:#888"><i class='bx bx-loader-alt bx-spin'></i> Loading…</div>`;
    document.getElementById("modalOverlay").classList.add("open");

    try {
      // Use the correct endpoint: /equipment/:id or /chemical/:id
      const endpoint = getEndpoint();
      const item = await apiFetch(`${endpoint}/${id}`);
      document.getElementById("modalBody").innerHTML = buildForm(item);
    } catch (e) {
      document.getElementById("modalBody").innerHTML =
        `<p style="color:#e74c3c;padding:1rem">Failed to load item: ${e.message}</p>`;
    }
  };

  window.saveItem = async function () {
    const fields = formFields[currentTab];
    const obj    = {};
    fields.forEach(f => {
      const el = document.getElementById("ff_" + f.key);
      obj[f.key] = el ? el.value.trim() : "";
    });

    if (!obj.name) { alert("Name is required."); return; }
    if (!obj.location_id) { alert("Please select a Location."); return; }

    // For equipment tabs, attach the category so the backend can store it
    if (currentTab !== "chemicals") {
      obj.category = TAB_TO_CATEGORY[currentTab];
    }

    const endpoint = getEndpoint();
    const saveBtn  = document.querySelector(".btn-save");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

    try {
      if (editingId) {
        // PUT /api/inventory/equipment/:id  OR  /api/inventory/chemical/:id
        await apiFetch(`${endpoint}/${editingId}`, {
          method: "PUT",
          body:   JSON.stringify(obj),
        });
        showToast("Item updated successfully.");
      } else {
        // POST /api/inventory/equipment  OR  /api/inventory/chemical
        await apiFetch(endpoint, {
          method: "POST",
          body:   JSON.stringify(obj),
        });
        showToast("Item added successfully.");
      }

      cache[currentTab] = null;
      closeModal();
      await refreshCurrentTab();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; }
    }
  };

  window.closeModal = function (e) {
    if (e && e.target !== document.getElementById("modalOverlay")) return;
    document.getElementById("modalOverlay").classList.remove("open");
    editingId = null;
  };

  // ─── Modal – Delete ───────────────────────────
  window.openDeleteModal = function (id, name) {
    deleteId = id;
    document.getElementById("deleteItemName").textContent = name || id;
    document.getElementById("deleteOverlay").classList.add("open");
  };

  window.confirmDelete = async function () {
    if (!deleteId) return;
    const btn = document.querySelector("#deleteBox .btn-danger");
    if (btn) { btn.disabled = true; btn.textContent = "Deleting…"; }

    try {
      // DELETE /api/inventory/equipment/:id  OR  /api/inventory/chemical/:id
      const endpoint = getEndpoint();
      await apiFetch(`${endpoint}/${deleteId}`, { method: "DELETE" });
      showToast("Item deleted.");
      cache[currentTab] = null;
      closeDelete();
      await refreshCurrentTab();
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Delete"; }
    }
  };

  window.closeDelete = function (e) {
    if (e && e.target !== document.getElementById("deleteOverlay")) return;
    document.getElementById("deleteOverlay").classList.remove("open");
    deleteId = null;
  };

  // Expose for retry button in error state
  window.refreshCurrentTab = refreshCurrentTab;

  // ─── Locations loader ────────────────────────
  async function loadLocations() {
    try {
      const data = await apiFetch("/locations");
      locations = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Could not load locations:", e.message);
      locations = [];
    }
  }

  // ─── Init ────────────────────────────────────
  (async () => {
    initDropdowns();
    renderStats();       // Show zeroed stats while loading
    renderTableLoading();
    try {
      await Promise.all([loadTab(currentTab), loadLocations()]);
      populateBrandFilter();
      renderStats();
      renderTable();
    } catch (e) {
      renderTableError(e.message);
    }
  })();

})();