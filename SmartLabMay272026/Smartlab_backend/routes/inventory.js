// routes/inventory.js
const express = require('express');
const router  = express.Router();

const {
  getAllInventory,
  getEquipmentById,
  getChemicalById,
  getLocations,
  getBorrowedCount,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createChemical,
  updateChemical,
  deleteChemical,
} = require('../controllers/inventoryController');

const { authenticate, requireStaff } = require('../middleware/auth');

// ── Student routes ────────────────────────────────────────────────────────────
// GET /api/inventory?type=equipment|chemical   (combined list)
router.get('/', authenticate, getAllInventory);

// GET /api/inventory/locations  — for Add/Edit dropdowns
router.get('/locations', authenticate, getLocations);

// GET /api/inventory/borrowed-count  — total qty of items in Approved reservations
router.get('/borrowed-count', authenticate, getBorrowedCount);

// GET /api/inventory/equipment/:id
router.get('/equipment/:id', authenticate, getEquipmentById);

// GET /api/inventory/chemical/:id
router.get('/chemical/:id', authenticate, getChemicalById);

// ── Staff / Admin routes ──────────────────────────────────────────────────────
// Equipment CRUD
router.post  ('/equipment',     authenticate, requireStaff, createEquipment);
router.put   ('/equipment/:id', authenticate, requireStaff, updateEquipment);
router.delete('/equipment/:id', authenticate, requireStaff, deleteEquipment);

// Chemical CRUD
router.post  ('/chemical',     authenticate, requireStaff, createChemical);
router.put   ('/chemical/:id', authenticate, requireStaff, updateChemical);
router.delete('/chemical/:id', authenticate, requireStaff, deleteChemical);

module.exports = router;