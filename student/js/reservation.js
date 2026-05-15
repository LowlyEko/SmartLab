import { CONFIG, getHeaders } from './config.js';
import { guardPage } from './guard.js';

let reservations = [];
let inventoryItems = [];

/**
 * Initialization
 */
document.addEventListener("DOMContentLoaded", async () => {
  guardPage();
  renderEquipmentChecklist();
  loadInventoryData();
  loadReservations();

  // ── Dark mode (inline so sidebar.js is not needed) ──
  const toggleSwitch = document.querySelector('.toggle-switch');
  const modeText = document.querySelector('.mode-text');
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    if (modeText) modeText.textContent = 'Light Mode';
  }
  if (toggleSwitch) {
    toggleSwitch.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      if (modeText) modeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

  const form = document.getElementById("new-reservation-form");
  if (form) form.addEventListener("submit", submitReservation);

  // Auto-open modal if redirected from dashboard quick action
  if (new URLSearchParams(window.location.search).get("action") === "new") {
    window.openNewReservationModal();
    history.replaceState(null, '', 'reservations.html');
  }
});

/**
 * Fetch all inventory to populate both checklist and dropdowns
 */
async function loadInventoryData() {
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
        const data = await res.json();
        if (data.success) {
            inventoryItems = data.data;
            renderEquipmentChecklist(); // re-render to match item_ids from inventory
        }
    } catch (err) {
        console.error("Inventory Load Error:", err);
    }
}

/**
 * UI: Render Equipment Checklist (Monitoring Logsheet Style)
 * Always shows all items from the physical monitoring sheet.
 * If an item exists in inventory, its item_id is used as the value;
 * otherwise its name is used as a fallback value.
 */
function renderEquipmentChecklist() {
    const container = document.getElementById("equipment-checklist");
    if (!container) return;

    // All items from the physical equipment monitoring logsheet
    const logsheetItems = [
        "Autoclave",
        "Analytical Balance",
        "Oven",
        "Incubator",
        "Refrigerator",
        "Centrifuge",
        "Fume Hood",
        "Laminar Flow",
        "Circulating Water Vacuum Pump",
        "Rotary Evaporator",
        "Electric Waterbath"
    ];

    container.innerHTML = logsheetItems.map(name => {
        // Try to match against an inventory item by name
        const match = inventoryItems.find(i =>
            i.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(i.name.toLowerCase())
        );
        const value = match ? match.item_id : name;
        return `
        <label class="checklist-item">
            <input type="checkbox" class="equip-chk" value="${value}">
            <span>${name}</span>
        </label>`;
    }).join('');
}

/**
 * UI: Add Material Row — Searchable Combobox
 * Uses inventory items when available; falls back to plain text input.
 */
window.addItemRow = function() {
    const container = document.getElementById("materials-container");
    const div = document.createElement("div");
    div.className = "dynamic-row";

    // Equipment names that belong to the checklist — exclude from materials dropdown
    const equipmentNames = [
        "autoclave", "analytical balance", "oven", "incubator", "refrigerator",
        "centrifuge", "fume hood", "laminar flow", "circulating water vacuum pump",
        "rotary evaporator", "electric waterbath"
    ];

    const materialItems = inventoryItems.filter(item => {
        const nameLower = item.name.toLowerCase();
        return !equipmentNames.some(eq => nameLower.includes(eq) || eq.includes(nameLower));
    });

    if (materialItems.length > 0) {
        div.innerHTML = `
            <div class="mat-combobox" style="flex:2; position:relative;">
                <input type="text"
                       class="mat-search-input"
                       placeholder="Search material / glassware..."
                       autocomplete="off"
                       style="width:100%; box-sizing:border-box;">
                <ul class="mat-dropdown-list"></ul>
                <input type="hidden" class="mat-id-input" required>
                <input type="hidden" class="mat-name-hidden">
            </div>
            <input type="text" class="mat-specs-input" placeholder="Volume/Size (e.g. 250mL)" style="flex:1.5;">
            <input type="number" class="mat-qty-input" value="1" min="1" style="flex:0.7;" required>
            <button type="button" class="btn-remove" onclick="this.closest('.dynamic-row').remove()">x</button>
        `;
        container.appendChild(div);

        const searchInput = div.querySelector(".mat-search-input");
        const dropdownList = div.querySelector(".mat-dropdown-list");
        const hiddenId    = div.querySelector(".mat-id-input");
        const hiddenName  = div.querySelector(".mat-name-hidden");

        function renderList(query) {
            const q = query.toLowerCase().trim();
            const filtered = q
                ? materialItems.filter(i => i.name.toLowerCase().includes(q))
                : materialItems;

            dropdownList.innerHTML = filtered.length
                ? filtered.map(item =>
                    `<li data-id="${item.item_id}" data-name="${item.name}">${item.name}</li>`
                  ).join('')
                : `<li class="no-results" style="pointer-events:none; color:#999;">No matches found</li>`;

            dropdownList.style.display = "block";
        }

        searchInput.addEventListener("focus", () => renderList(searchInput.value));
        searchInput.addEventListener("input", () => {
            hiddenId.value = "";
            hiddenName.value = "";
            renderList(searchInput.value);
        });

        dropdownList.addEventListener("mousedown", e => {
            const li = e.target.closest("li[data-id]");
            if (!li) return;
            searchInput.value = li.dataset.name;
            hiddenId.value   = li.dataset.id;
            hiddenName.value = li.dataset.name;
            dropdownList.style.display = "none";
        });

        document.addEventListener("click", e => {
            if (!div.contains(e.target)) dropdownList.style.display = "none";
        }, { capture: true });

    } else {
        // Fallback: plain text if inventory not loaded
        div.innerHTML = `
            <input type="text" class="mat-id-input" placeholder="Material / Glassware name" style="flex:2;" required>
            <input type="text" class="mat-specs-input" placeholder="Volume/Size (e.g. 250mL)" style="flex:1.5;">
            <input type="number" class="mat-qty-input" value="1" min="1" style="flex:0.7;" required>
            <button type="button" class="btn-remove" onclick="this.closest('.dynamic-row').remove()">x</button>
        `;
        container.appendChild(div);
    }
};

/**
 * UI: Add Member Row
 */
window.addMemberRow = function() {
    const container = document.getElementById("members-container");
    const div = document.createElement("div");
    div.className = "dynamic-row";
    div.innerHTML = `
        <input type="text" class="member-id-input" placeholder="Enter Student ID#" style="flex:1;" required>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
};

/**
 * Fetch and Render Reservation Table
 */
async function loadReservations() {
    try {
        const res = await fetch(`${CONFIG.BASE_URL}/reservations`, { headers: getHeaders() });
        const data = await res.json();
        reservations = data.success ? data.data : [];
        renderTable();
    } catch (err) {
        console.error("Table Load Error:", err);
    }
}

function formatTime(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderTable(filtered = reservations) {
    const tbody = document.getElementById("reservations-tbody");
    const meta = document.getElementById("table-meta");
    if (!tbody) return;

    tbody.innerHTML = "";
    meta.textContent = `Total Records: ${filtered.length}`;

    filtered.forEach(r => {
        const statusLabel = r.status.replace('_', ' ');
        tbody.innerHTML += `
            <tr>
                <td><strong>RES-${String(r.reservation_id).padStart(3, '0')}</strong></td>
                <td>${formatDate(r.date_needed)}</td>
                <td>${formatTime(r.time_start)} &ndash; ${formatTime(r.time_end)}</td>
                <td>${r.activity_title}</td>
                <td>${r.items?.length || 0} items</td>
                <td><span class="status-badge ${r.status.toLowerCase()}">${statusLabel}</span></td>
                <td>
                    <button class="action-btn" onclick="viewReservation('${r.reservation_id}')">
                        <i class='bx bx-info-circle'></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

/**
 * Submit Form
 */
async function submitReservation(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    // 1. Collect Checked Equipment
    // value may be a numeric item_id (from inventory) or an equipment name (static fallback)
    const checkedItems = Array.from(document.querySelectorAll(".equip-chk:checked")).map(chk => ({
        item_id: isNaN(chk.value) ? null : chk.value,
        item_name: isNaN(chk.value) ? chk.value : null,
        quantity: 1,
        specs: "Standard Equipment Use"
    }));

    // 2. Collect Materials (combobox or free-text entry)
    const materialItems = Array.from(document.querySelectorAll("#materials-container .dynamic-row")).map(row => {
        const combobox = row.querySelector(".mat-combobox");
        if (combobox) {
            // Searchable combobox path
            const idVal  = row.querySelector(".mat-id-input").value;
            const nameVal = row.querySelector(".mat-name-hidden").value;
            return {
                item_id:   idVal && !isNaN(idVal) ? idVal : null,
                item_name: nameVal || row.querySelector(".mat-search-input").value.trim(),
                quantity:  row.querySelector(".mat-qty-input").value,
                specs:     row.querySelector(".mat-specs-input").value.trim()
            };
        } else {
            // Plain text fallback path
            const input = row.querySelector(".mat-id-input");
            return {
                item_id:   null,
                item_name: input.value.trim(),
                quantity:  row.querySelector(".mat-qty-input").value,
                specs:     row.querySelector(".mat-specs-input").value.trim()
            };
        }
    });

    const payload = {
        date_needed: document.getElementById("date-needed").value,
        time_start: document.getElementById("time-start").value,
        time_end: document.getElementById("time-end").value,
        activity_title: document.getElementById("activity-title").value,
        group_number: document.getElementById("group-number").value || null,
        conditions_note: document.getElementById("conditions-note").value || null,
        items: [...checkedItems, ...materialItems],
        member_ids: Array.from(document.querySelectorAll(".member-id-input")).map(i => i.value)
    };

    try {
        btn.disabled = true;
        const res = await fetch(`${CONFIG.BASE_URL}/reservations`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert("Reservation Submitted Successfully!");
            window.closeModal();
            location.reload(); // Refresh to show new data
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Server error. Please try again.");
    } finally {
        btn.disabled = false;
    }
}

/**
 * Modal Controls
 */
window.openNewReservationModal = () => document.getElementById("new-res-modal").classList.add("open");
window.closeModal = () => {
    document.getElementById("new-res-modal").classList.remove("open");
    document.getElementById("new-reservation-form").reset();
    document.getElementById("materials-container").innerHTML = "";
    document.getElementById("members-container").innerHTML = "";
};

// ── View Details Modal ──────────────────────────────────────────
let _viewingReservationId = null;

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

window.viewReservation = function(id) {
    const r = reservations.find(x => x.reservation_id == id);
    if (!r) return;

    _viewingReservationId = id;

    const statusLabel = r.status.replace(/_/g, ' ');
    const canCancel = ['to_review', 'pending', 'TO_REVIEW', 'PENDING'].includes(r.status);

    // Build items list
    const itemsHtml = r.items && r.items.length
        ? r.items.map(item => `
            <li>
              <i class='bx bx-cube'></i>
              <span>${item.item_name || item.name || 'Item #' + item.item_id}
                ${item.specs ? '<em style="color:#888;"> — ' + item.specs + '</em>' : ''}
                ${item.quantity > 1 ? ' <strong>x' + item.quantity + '</strong>' : ''}
              </span>
            </li>`).join('')
        : `<li style="color:#aaa;"><i class='bx bx-info-circle'></i> No items listed</li>`;

    // Build members list
    const membersHtml = r.members && r.members.length
        ? r.members.map(m => `
            <li><i class='bx bx-user'></i> <span>${m.student_id || m.name || m}</span></li>`).join('')
        : `<li style="color:#aaa;"><i class='bx bx-info-circle'></i> No members listed</li>`;

    document.getElementById('view-res-content').innerHTML = `
        <div class="detail-grid">
          <div class="detail-field">
            <label>Reservation ID</label>
            <span>RES-${String(r.reservation_id).padStart(3, '0')}</span>
          </div>
          <div class="detail-field">
            <label>Status</label>
            <span class="status-badge ${r.status.toLowerCase()}">${statusLabel}</span>
          </div>
          <div class="detail-field">
            <label>Date Needed</label>
            <span>${formatDate(r.date_needed)}</span>
          </div>
          <div class="detail-field">
            <label>Time</label>
            <span>${formatTime(r.time_start)} &ndash; ${formatTime(r.time_end)}</span>
          </div>
          <div class="detail-field" style="grid-column:1/-1;">
            <label>Activity / Experiment</label>
            <span>${r.activity_title}</span>
          </div>
          ${r.group_number ? `
          <div class="detail-field">
            <label>Group #</label>
            <span>${r.group_number}</span>
          </div>` : ''}
          <div class="detail-field">
            <label>Date Submitted</label>
            <span>${r.created_at ? formatDateTime(r.created_at) : '--'}</span>
          </div>
        </div>

        <div class="detail-section-title"><i class='bx bx-list-check'></i> Equipment & Materials</div>
        <ul class="detail-items-list">${itemsHtml}</ul>

        <div class="detail-section-title"><i class='bx bx-group'></i> Group Members</div>
        <ul class="detail-items-list">${membersHtml}</ul>

        ${r.conditions_note ? `
        <div class="detail-section-title"><i class='bx bx-note'></i> Special Notes</div>
        <div class="detail-notes">${r.conditions_note}</div>` : ''}

        ${r.admin_note ? `
        <div class="detail-section-title"><i class='bx bx-message-square-detail'></i> Admin Notes</div>
        <div class="detail-notes" style="border-left:3px solid #D4B84A; padding-left:14px;">${r.admin_note}</div>` : ''}
    `;

    const cancelBtn = document.getElementById('cancel-res-btn');
    cancelBtn.style.display = canCancel ? 'inline-flex' : 'none';

    document.getElementById('view-res-modal').classList.add('open');
};

window.closeViewModal = function() {
    document.getElementById('view-res-modal').classList.remove('open');
    _viewingReservationId = null;
};

window.confirmCancel = function() {
    document.getElementById('view-res-modal').classList.remove('open');
    document.getElementById('confirm-cancel-modal').classList.add('open');
};

window.closeConfirmModal = function() {
    document.getElementById('confirm-cancel-modal').classList.remove('open');
    document.getElementById('view-res-modal').classList.add('open');
};

window.executeCancelReservation = async function() {
    const id = _viewingReservationId;
    if (!id) return;

    const btn = document.getElementById('confirm-cancel-yes');
    btn.disabled = true;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Cancelling...';

    try {
        const res = await fetch(`${CONFIG.BASE_URL}/reservations/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        const data = await res.json();

        if (data.success || res.ok) {
            document.getElementById('confirm-cancel-modal').classList.remove('open');
            _viewingReservationId = null;
            await loadReservations();
        } else {
            alert(data.message || 'Could not cancel. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bx bx-check"></i> Yes, Cancel It';
        }
    } catch (err) {
        console.error(err);
        alert('Server error. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="bx bx-check"></i> Yes, Cancel It';
    }
};