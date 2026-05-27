// student/js/inventory.js
import { CONFIG, getHeaders } from './config.js';

let inventoryItems = [];
let currentCategory = 'all';
let searchDebounce  = null;

let currentPage   = 1;
const ITEMS_PER_PAGE = 10;
let filteredItems = [];

// ── Column definitions per category ──────────────────────────────────────────
const COLUMN_DEFS = {
  all: [
    { label: 'ID',       render: item => `<strong>#${item.id}</strong>` },
    { label: 'Name',     render: item => item.name },
    { label: 'Category', render: item => `<span class="category-chip">${item.category || '—'}</span>` },
    { label: 'Quantity', render: item => renderQuantity(item) },
  ],
  APPARATUS: [
    { label: 'ID',       render: item => `<strong>#${item.id}</strong>` },
    { label: 'Name',     render: item => item.name },
    { label: 'Location', render: item => item.location || '—' },
    { label: 'Quantity', render: item => renderQuantity(item) },
    { label: 'Brand',    render: item => item.brand || '—' },
  ],
  GLASSWARE: [
    { label: 'ID',       render: item => `<strong>#${item.id}</strong>` },
    { label: 'Name',     render: item => item.name },
    { label: 'Location', render: item => item.location || '—' },
    { label: 'Quantity', render: item => renderQuantity(item) },
    { label: 'Brand',    render: item => item.brand || '—' },
  ],
  EQUIPMENT: [
    { label: 'ID',       render: item => `<strong>#${item.id}</strong>` },
    { label: 'Name',     render: item => item.name },
    { label: 'Location', render: item => item.location || '—' },
    { label: 'Remarks',  render: item => renderEquipmentRemarks(item) },
    { label: 'Brand',    render: item => item.brand || '—' },
  ],
  SUPPLY: [
    { label: 'ID',       render: item => `<strong>#${item.id}</strong>` },
    { label: 'Name',     render: item => item.name },
    { label: 'Location', render: item => item.location || '—' },
    { label: 'Quantity', render: item => renderQuantity(item) },
    { label: 'Brand',    render: item => item.brand || '—' },
  ],
  CHEMICAL: [
    { label: 'ID',          render: item => `<strong>#${item.id}</strong>` },
    { label: 'Name',        render: item => item.name },
    { label: 'Amount/Unit', render: item => renderChemicalAmount(item) },
    { label: 'Remarks',     render: item => item.remarks || '—' },
  ],
};

// ── Render helpers ────────────────────────────────────────────────────────────
function renderQuantity(item) {
  if (item.available_quantity == null) return '—';
  let html = `<strong>${item.available_quantity}</strong>`;
  if (item.total_quantity != null) {
    html += `<span style="color:#aaa;">/${item.total_quantity}</span>`;
  }
  return html;
}

const EQUIPMENT_REMARK_STYLES = {
  'functional':     { bg: '#e8f5e9', color: '#2e7d32' },
  'not functional': { bg: '#fdecea', color: '#c62828' },
  'for repair':     { bg: '#fff3cd', color: '#856404' },
  'for pms':        { bg: '#e3f2fd', color: '#1565c0' },
  'new':            { bg: '#f3e5f5', color: '#6a1b9a' },
};

function renderEquipmentRemarks(item) {
  if (!item.remarks) return '—';
  const key = item.remarks.toLowerCase();
  const style = EQUIPMENT_REMARK_STYLES[key];
  if (style) {
    return `<span class="status-badge" style="background:${style.bg};color:${style.color};">${item.remarks}</span>`;
  }
  return item.remarks;
}

function renderChemicalAmount(item) {
  if (item.available_quantity == null && !item.unit) return '—';
  const amount = item.available_quantity ?? '—';
  const unit   = item.unit ? ` ${item.unit}` : '';
  return `<strong>${amount}</strong>${unit}`;
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadInventory() {
  try {
    const res  = await fetch(`${CONFIG.BASE_URL}/inventory`, { headers: getHeaders() });
    const data = await res.json();
    if (data.success) {
      inventoryItems = data.data.map(item => ({
        id:                 item.id,
        name:               item.name,
        type:               item.type,           // 'equipment' | 'chemical'
        category:           item.category        || '—',
        location:           item.location        || null,
        brand:              item.brand           || null,
        volume_size:        item.volume_size      || null,
        total_quantity:     item.total_quantity   ?? null,
        available_quantity: item.available_quantity ?? null,
        unit:               item.unit            || null,
        remarks:            item.remarks         || null,
        status:             deriveStatus(item),
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
  if (qty === 0) return 'Out of Stock';
  if (qty <= 5)  return 'Low Stock';
  return 'Available';
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderInventory(items) {
  filteredItems = items;
  currentPage   = 1;
  renderPage();
}

function renderPage() {
  const tbody = document.getElementById('inventory-tbody');
  const thead = document.querySelector('.data-table thead tr');
  if (!tbody || !thead) return;

  const cols       = COLUMN_DEFS[currentCategory] || COLUMN_DEFS.all;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  currentPage      = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paged = filteredItems.slice(start, start + ITEMS_PER_PAGE);

  // Headers
  thead.innerHTML = cols.map(c => `<th>${c.label}</th>`).join('');

  // Rows
  tbody.innerHTML = paged.length
    ? paged.map(item =>
        `<tr>${cols.map(c => `<td>${c.render(item)}</td>`).join('')}</tr>`
      ).join('')
    : `<tr><td colspan="${cols.length}" style="text-align:center;color:#aaa;padding:24px;">No items found.</td></tr>`;

  document.getElementById('table-meta').textContent =
    `Showing ${start + 1}–${Math.min(start + ITEMS_PER_PAGE, filteredItems.length)} of ${filteredItems.length} item(s)`;

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination');
  if (!container) return;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';

  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} id="pg-first"><i class='bx bx-chevrons-left'></i></button>`;
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} id="pg-prev"><i class='bx bx-chevron-left'></i></button>`;

  html += `<button class="page-btn active">${currentPage}</button>`;

  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} id="pg-next"><i class='bx bx-chevron-right'></i></button>`;
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} id="pg-last"><i class='bx bx-chevrons-right'></i></button>`;

  container.innerHTML = html;

  document.getElementById('pg-first')?.addEventListener('click', () => { currentPage = 1; renderPage(); });
  document.getElementById('pg-prev')?.addEventListener('click',  () => { currentPage--; renderPage(); });
  document.getElementById('pg-next')?.addEventListener('click',  () => { currentPage++; renderPage(); });
  document.getElementById('pg-last')?.addEventListener('click',  () => { currentPage = totalPages; renderPage(); });
}

function updateSummaryCards() {
  const total     = inventoryItems.length;
  const available = inventoryItems.filter(i => i.status === 'Available').length;
  const lowStock  = inventoryItems.filter(i => i.status === 'Low Stock').length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('total-items',     total);
  set('available-count', available);
  set('low-stock-count', lowStock);
}

// ── Filtering ─────────────────────────────────────────────────────────────────
function filterInventory() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q = document.getElementById('search-input')?.value?.toLowerCase().trim() || '';

    let base = inventoryItems;

    if (currentCategory !== 'all') {
      base = base.filter(i =>
        i.category?.toUpperCase() === currentCategory.toUpperCase()
      );
    }

    const result = q
      ? base.filter(i =>
          i.name.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q)
        )
      : base;

    renderInventory(result);
  }, 200);
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category || 'all';
    filterInventory();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  loadInventory();
  document.getElementById('search-input')?.addEventListener('input', filterInventory);
});