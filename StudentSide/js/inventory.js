// student/js/inventory.js
import { CONFIG, getHeaders } from './config.js';

let inventoryItems = [];
let currentCategory = 'all';
let searchDebounce  = null;

async function loadInventory() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      inventoryItems = data.data;
    } else {
      inventoryItems = getFallback();
    }
  } catch {
    inventoryItems = getFallback();
  }
  renderInventory(inventoryItems);
  updateSummaryCards();
}

// function getFallback() {
//   return [
//     { item_id:1, name:"Erlenmeyer Flask 250ml",     category:"GLASSWARE",  location:"Cabinet A-3",      amount:45,   unit:"pcs" },
//     { item_id:2, name:"Digital Analytical Balance",  category:"EQUIPMENT",  location:"Main Lab Bench",   amount:8,    unit:"units" },
//     { item_id:3, name:"Test Tube Rack (24 holes)",   category:"APPARATUS",  location:"Drawer B-2",       amount:22,   unit:"pcs" },
//     { item_id:4, name:"Sodium Chloride (NaCl)",      category:"CHEMICAL",   location:"Chemical Storage", amount:1200, unit:"g" },
//   ];
// }

// Single DOM write — avoids repeated reflow from innerHTML +=
function renderInventory(items) {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  tbody.innerHTML = items.length
    ? items.map(item => `
      <tr>
        <td><strong>#${item.item_id}</strong></td>
        <td>${item.name}</td>
        <td><span class="category-chip">${item.category}</span></td>
        <td>${item.location || '—'}</td>
        <td><strong>${item.amount} ${item.unit || ''}</strong></td>
        <td>
          <button class="btn-primary" onclick="requestItem(${item.item_id})" style="padding:6px 14px;font-size:13px;">
            Request
          </button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px;">No items found.</td></tr>`;

  document.getElementById("table-meta").textContent = `Showing ${items.length} item(s)`;
}

function updateSummaryCards() {
  const total    = inventoryItems.length;
  const available = inventoryItems.filter(i => (i.amount ?? 0) > 5).length;
  const lowStock  = inventoryItems.filter(i => (i.amount ?? 0) > 0 && (i.amount ?? 0) <= 5).length;
  document.getElementById("total-items").textContent     = total;
  document.getElementById("available-count").textContent = available;
  document.getElementById("low-stock-count").textContent = lowStock;
}

// Debounced search — avoids filtering on every keystroke
function filterInventory() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q    = document.getElementById("search-input").value.toLowerCase().trim();
    const base = currentCategory === 'all'
      ? inventoryItems
      : inventoryItems.filter(i => i.category === currentCategory);
    const result = q
      ? base.filter(i => i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q))
      : base;
    renderInventory(result);
  }, 200);
}

window.requestItem = function(id) {
  const item = inventoryItems.find(i => i.item_id === id);
  if (!item) return;
  const qty = prompt(`How many ${item.name} would you like to request?`, "1");
  if (qty && parseInt(qty) > 0) alert(`✅ Request for ${qty} × ${item.name} has been submitted!`);
};

// Category tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category || 'all';
    const filtered = currentCategory === 'all'
      ? inventoryItems
      : inventoryItems.filter(i => i.category === currentCategory);
    renderInventory(filtered);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadInventory();
  document.getElementById("search-input")?.addEventListener("input", filterInventory);
});