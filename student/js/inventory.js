// student/js/inventory.js
import { CONFIG, getHeaders } from './config.js';

let inventoryItems = [];
let currentCategory = 'all';

async function loadInventory() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/inventory`, {
      headers: getHeaders()
    });

    const data = await res.json();

    if (data.success) {
      inventoryItems = data.data;
      renderInventory(inventoryItems);
      updateSummaryCards();
    } else {
      console.error("Failed to load inventory");
      loadFallbackData();
    }
  } catch (err) {
    console.error("Error fetching inventory:", err);
    loadFallbackData();
  }
}

function loadFallbackData() {
  inventoryItems = [
    { 
      item_id: 1, 
      name: "Erlenmeyer Flask 250ml", 
      category: "GLASSWARE", 
      location: "Cabinet A-3", 
      amount: 45, 
      unit: "pcs" 
    },
    { 
      item_id: 2, 
      name: "Digital Analytical Balance", 
      category: "EQUIPMENT", 
      location: "Main Lab Bench", 
      amount: 8, 
      unit: "units" 
    },
    { 
      item_id: 3, 
      name: "Test Tube Rack (24 holes)", 
      category: "APPARATUS", 
      location: "Drawer B-2", 
      amount: 22, 
      unit: "pcs" 
    },
    { 
      item_id: 4, 
      name: "Sodium Chloride (NaCl)", 
      category: "CHEMICAL", 
      location: "Chemical Storage", 
      amount: 1200, 
      unit: "g" 
    }
  ];
  renderInventory(inventoryItems);
  updateSummaryCards();
}

function renderInventory(items) {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  items.forEach(item => {
    const row = `
      <tr>
        <td><strong>#${item.item_id}</strong></td>
        <td>${item.name}</td>
        <td><span class="category-chip">${item.category}</span></td>
        <td>${item.location || '—'}</td>
        <td><strong>${item.amount} ${item.unit || ''}</strong></td>
        <td>
          <button class="btn-primary" onclick="requestItem(${item.item_id})" style="padding:6px 14px; font-size:13px;">
            Request
          </button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  document.getElementById("table-meta").textContent = `Showing ${items.length} item(s)`;
}

function updateSummaryCards() {
  const total = inventoryItems.length;
  const available = inventoryItems.filter(i => (i.amount || 0) > 5).length;
  const lowStock = inventoryItems.filter(i => (i.amount || 0) > 0 && (i.amount || 0) <= 5).length;

  document.getElementById("total-items").textContent = total;
  document.getElementById("available-count").textContent = available;
  document.getElementById("low-stock-count").textContent = lowStock;
}

function filterInventory() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();

  const filtered = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm) || 
    (item.category && item.category.toLowerCase().includes(searchTerm))
  );

  renderInventory(filtered);
}

window.requestItem = function(id) {
  const item = inventoryItems.find(i => i.item_id === id);
  if (!item) return;

  const qty = prompt(`How many ${item.name} would you like to request?`, "1");
  if (qty && parseInt(qty) > 0) {
    alert(`✅ Request for ${qty} × ${item.name} has been submitted!`);
  }
};

// Category Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    currentCategory = btn.dataset.category || 'all';
    
    const filtered = currentCategory === 'all' 
      ? inventoryItems 
      : inventoryItems.filter(item => item.category === currentCategory);
    
    renderInventory(filtered);
  });
});

// Initialize
document.addEventListener("DOMContentLoaded", loadInventory);