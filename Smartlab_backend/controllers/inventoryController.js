// controllers/inventoryController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
// ==================== STUDENT ENDPOINTS ====================

/**
 * Students can browse active inventory items
 */
exports.getAllInventory = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: {
        item_id: true,
        category: true,
        name: true,
        location: true,
        amount: true,
        unit: true
      }
    });
    success(res, items);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * Get single item details (useful for reservation form)
 */
exports.getInventoryById = async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { item_id: parseInt(req.params.id) },
      select: {
        item_id: true,
        category: true,
        name: true,
        location: true,
        amount: true,
        unit: true,
        is_active: true
      }
    });

    if (!item) return error(res, "Item not found", 404);
    success(res, item);
  } catch (err) {
    error(res, err.message);
  }
};

// ==================== STAFF / ADMIN ENDPOINTS ====================

/**
 * Staff can view all items (including inactive)
 */
exports.getAllInventoryAdmin = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
      include: {
        reservation_items: true,
        accountability: true
      }
    });
    success(res, items);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * Staff can create new inventory items
 */
exports.createInventoryItem = async (req, res) => {
  try {
    const { category, name, location, amount, unit } = req.body;

    if (!category || !name) {
      return error(res, "Category and Name are required", 400);
    }

    const item = await prisma.inventoryItem.create({
      data: {
        category: category.toUpperCase(),
        name,
        location,
        amount: parseFloat(amount) || 0,
        unit
      }
    });

    success(res, item, "Inventory item created successfully", 201);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * Staff can update inventory (stock, status, etc.)
 */
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, location, is_active } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { item_id: parseInt(id) },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        location,
        is_active
      }
    });

    success(res, item, "Inventory item updated successfully");
  } catch (err) {
    error(res, err.message);
  }
};