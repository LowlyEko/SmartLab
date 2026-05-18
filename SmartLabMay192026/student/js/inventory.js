// student/js/inventory.js
import { CONFIG, getHeaders } from './config.js';

let inventoryItems = [];   // combined equipment + chemicals from new schema
let currentCategory = 'all';
let searchDebounce  = null;

async function loadInventory() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      // New schema: combined array with `type` field ('equipment' | 'chemical')
      // Normalize to a unified shape for the table
      inventoryItems = data.data.map(item => ({
        id:       item.id,
        name:     item.name,
        type:     item.type,           // 'equipment' | 'chemical'
        // Equipment-specific
        category:           item.category           || item.type || '—',
        volume_size:        item.volume_size         || null,
        total_quantity:     item.total_quantity      ?? null,
        available_quantity: item.available_quantity  ?? 0,
        // Chemical-specific
        unit:    item.unit    || null,
        remarks: item.remarks || null,
        // Unified status derived from available_quantity
        status:  deriveStatus(item),
        // Unified display fields
        amount:  item.available_quantity ?? 0,
        location: item.volume_size || null,   // equipment uses volume_size as descriptor
      }));
    } else {
      inventoryItems = [];
    }
  } catch {
    inventoryItems = [];
  }
  renderInventory(inventoryItems);
  updateSummaryCards();
}

function deriveStatus(item) {
  const qty = item.available_quantity ?? 0;
  if (qty === 0)  return 'Out of Stock';
  if (qty <= 5)   return 'Low Stock';
  return 'Available';
}

function renderInventory(items) {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  tbody.innerHTML = items.length
    ? items.map(item => `
      <tr>
        <td><strong>#${item.id}</strong></td>
        <td>${item.name}</td>
        <td>
          <span class="category-chip">${item.category}</span>
          <span class="category-chip" style="background:#eee; color:#555;">${item.type}</span>
        </td>
        <td>${item.volume_size || item.unit || '—'}</td>
        <td>
          <strong>${item.available_quantity}</strong>
          ${item.total_quantity != null ? `<span style="color:#aaa;">/${item.total_quantity}</span>` : ''}
          ${item.unit ? ' ' + item.unit : ''}
        </td>
        <td>
          <span class="status-chip ${item.status.toLowerCase().replace(/ /g,'-')}">${item.status}</span>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px;">No items found.</td></tr>`;

  document.getElementById("table-meta").textContent = `Showing ${items.length} item(s)`;
}

function updateSummaryCards() {
  const total     = inventoryItems.length;
  const available = inventoryItems.filter(i => i.status === 'Available').length;
  const lowStock  = inventoryItems.filter(i => i.status === 'Low Stock').length;
  const equipment = inventoryItems.filter(i => i.type === 'equipment').length;
  const chemicals  = inventoryItems.filter(i => i.type === 'chemical').length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("total-items",      total);
  set("available-count",  available);
  set("low-stock-count",  lowStock);
  set("equipment-count",  equipment);
  set("chemicals-count",  chemicals);
}

function filterInventory() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q    = document.getElementById("search-input")?.value?.toLowerCase().trim() || '';
    let base   = inventoryItems;

    // Category filter: 'all', 'equipment', 'chemical', or a category string
    if (currentCategory !== 'all') {
      base = currentCategory === 'equipment' || currentCategory === 'chemical'
        ? base.filter(i => i.type === currentCategory)
        : base.filter(i => i.category?.toLowerCase() === currentCategory.toLowerCase());
    }

    const result = q
      ? base.filter(i => i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q))
      : base;

    renderInventory(result);
  }, 200);
}

// Category tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category || 'all';
    filterInventory();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadInventory();
  document.getElementById("search-input")?.addEventListener("input", filterInventory);
});