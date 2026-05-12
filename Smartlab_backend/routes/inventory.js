// routes/inventory.js
const express = require('express');
const router = express.Router();
const { 
  getAllInventory,
  getInventoryById,
  getAllInventoryAdmin,
  createInventoryItem,
  updateInventoryItem
} = require('../controllers/inventoryController');

const { authenticate, requireRole } = require('../middleware/auth');

// ===================== STUDENT ROUTES =====================
router.get('/', authenticate, getAllInventory);                    // Students browse inventory
router.get('/:id', authenticate, getInventoryById);                // Get single item

// ===================== STAFF ROUTES =====================
router.get('/admin', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN'), getAllInventoryAdmin);
router.post('/', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN'), createInventoryItem);
router.put('/:id', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN'), updateInventoryItem);

module.exports = router;