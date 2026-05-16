// routes/inventory.js
const express = require('express');
const router  = express.Router();
const {
  getAllInventory,
  getInventoryById,
  getAllInventoryAdmin,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require('../controllers/inventoryController');

const { authenticate, requireRole } = require('../middleware/auth');

// ===================== ADMIN ROUTES =====================
// NOTE: Static paths (/admin/all) MUST be declared before parameterised paths (/:id)
// otherwise Express matches "admin" as the :id parameter.

router.get(
  '/admin/all',
  authenticate,
  requireRole('LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'),
  getAllInventoryAdmin
);

router.post(
  '/',
  authenticate,
  requireRole('LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'),
  createInventoryItem
);

router.put(
  '/:id',
  authenticate,
  requireRole('LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'),
  updateInventoryItem
);

router.delete(
  '/:id',
  authenticate,
  requireRole('LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'),
  deleteInventoryItem
);

// ===================== STUDENT ROUTES =====================
// Placed after static paths so /:id doesn't eat /admin/all
router.get('/',    authenticate, getAllInventory);
router.get('/:id', authenticate, getInventoryById);

module.exports = router;