import { CONFIG, getHeaders } from './config.js';

let reservations = [];
let inventoryItems = [];

/**
 * Initialization
 */
document.addEventListener("DOMContentLoaded", async () => {
    // Render checklist immediately so checkboxes always appear
    renderEquipmentChecklist();

    // Then load inventory in background (updates item_id values if matched)
    loadInventoryData();
    loadReservations();

    const form = document.getElementById("new-reservation-form");
    if (form) form.addEventListener("submit", submitReservation);
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
 * UI: Add Material Row (Manual/Written Entry)
 */
window.addItemRow = function() {
    const container = document.getElementById("materials-container");
    const div = document.createElement("div");
    div.className = "dynamic-row";

    div.innerHTML = `
        <input type="text" class="mat-id-input" placeholder="Material / Glassware name" style="flex:2;" required>
        <input type="text" class="mat-specs-input" placeholder="Volume/Size (e.g. 250mL)" style="flex:1.5;">
        <input type="number" class="mat-qty-input" value="1" min="1" style="flex:0.7;" required>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
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

    // 2. Collect Written Materials (free-text name entry)
    const materialItems = Array.from(document.querySelectorAll("#materials-container .dynamic-row")).map(row => ({
        item_id: null,
        item_name: row.querySelector(".mat-id-input").value.trim(),
        quantity: row.querySelector(".mat-qty-input").value,
        specs: row.querySelector(".mat-specs-input").value.trim()
    }));

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

window.viewReservation = (id) => alert("Details for RES-" + id);