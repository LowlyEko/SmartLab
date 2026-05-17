// controllers/inventoryController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

// ==================== HELPERS ====================

/**
 * Map the flat frontend status string to the Prisma ItemStatus enum.
 * Frontend sends: "Available", "Low Stock", "Out of Stock", "DEFECTIVE", etc.
 */
function toItemStatus(s) {
  if (!s) return undefined;
  const map = {
    'available':    'AVAILABLE',
    'low stock':    'LOW_STOCK',
    'out of stock': 'OUT_OF_STOCK',
    'defective':    'DEFECTIVE',
    'for repair':   'FOR_REPAIR',
    'for disposal': 'FOR_DISPOSAL',
  };
  return map[String(s).toLowerCase()] || 'AVAILABLE';
}

/**
 * Map ItemStatus enum back to a human-readable string for the frontend.
 */
function fromItemStatus(s) {
  const map = {
    AVAILABLE:    'Available',
    LOW_STOCK:    'Low Stock',
    OUT_OF_STOCK: 'Out of Stock',
    DEFECTIVE:    'Defective',
    FOR_REPAIR:   'For Repair',
    FOR_DISPOSAL: 'For Disposal',
  };
  return map[s] || s;
}

/**
 * Normalize an InventoryItem from DB to the shape the frontend expects.
 */
function normalize(item) {
  return {
    id:              item.item_id,
    category:        item.category,
    name:            item.name,
    description:     item.description   || '',
    brand:           item.brand         || '',
    location:        item.location      || '',
    amount:          Number(item.amount),
    unit:            item.unit          || '',
    // Equipment
    serial:          item.serial_number    || '',
    propertyNo:      item.property_number  || '',
    code:            item.equipment_code   || '',
    calibrationDate: item.calibration_date
                       ? item.calibration_date.toISOString().split('T')[0]
                       : '',
    calibrationFreq: item.calibration_freq || 'N/A',
    // Chemical
    hazard:          item.hazard       || '',
    expiry:          item.expiry_date
                       ? item.expiry_date.toISOString().split('T')[0]
                       : '',
    // Common
    status:          fromItemStatus(item.status),
    remarks:         item.remarks      || '',
    is_active:       item.is_active,
    created_at:      item.created_at,
    updated_at:      item.updated_at,
  };
}

// ==================== STUDENT ENDPOINTS ====================

/**
 * GET /api/inventory
 * Students browse active inventory items.
 */
exports.getAllInventory = async (req, res) => {
  try {
    const { category } = req.query;

    const where = { is_active: true };
    if (category) where.category = category.toUpperCase();

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        item_id:  true,
        category: true,
        name:     true,
        location: true,
        amount:   true,
        unit:     true,
        status:   true,
      },
    });

    success(res, items.map(i => ({
      id:       i.item_id,
      category: i.category,
      name:     i.name,
      location: i.location || '',
      amount:   Number(i.amount),
      unit:     i.unit    || '',
      status:   fromItemStatus(i.status),
    })));
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * GET /api/inventory/:id
 * Single item for reservation form.
 */
exports.getInventoryById = async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { item_id: parseInt(req.params.id) },
    });

    if (!item) return error(res, 'Item not found', 404);
    success(res, normalize(item));
  } catch (err) {
    error(res, err.message);
  }
};

// ==================== STAFF / ADMIN ENDPOINTS ====================

/**
 * GET /api/inventory/admin/all
 * Staff/Admin: view all items including inactive, with optional filters.
 */
exports.getAllInventoryAdmin = async (req, res) => {
  try {
    const { category, status, search } = req.query;

    const where = {};
    if (category) where.category = category.toUpperCase();
    if (status)   where.status   = toItemStatus(status);
    if (search) {
      where.OR = [
        { name:     { contains: search, mode: 'insensitive' } },
        { brand:    { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { remarks:  { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    success(res, items.map(normalize));
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * POST /api/inventory
 * Staff/Admin: create a new inventory item.
 * Accepts all fields from all five category tabs.
 */
exports.createInventoryItem = async (req, res) => {
  try {
    const {
      category, name, description, brand, location, amount, unit,
      // equipment
      serial, propertyNo, code, calibrationDate, calibrationFreq,
      // chemical
      hazard, expiry,
      // common
      status, remarks,
    } = req.body;

    if (!category || !name) {
      return error(res, 'Category and Name are required', 400);
    }

    const validCategories = ['GLASSWARE', 'EQUIPMENT', 'APPARATUS', 'SUPPLY', 'CHEMICAL'];
    const cat = String(category).toUpperCase();
    if (!validCategories.includes(cat)) {
      return error(res, `Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
    }

    const item = await prisma.inventoryItem.create({
      data: {
        category:         cat,
        name,
        description:      description      || null,
        brand:            brand            || null,
        location:         location         || null,
        amount:           parseFloat(amount) || 0,
        unit:             unit             || null,
        serial_number:    serial           || null,
        property_number:  propertyNo       || null,
        equipment_code:   code             || null,
        calibration_date: calibrationDate  ? new Date(calibrationDate) : null,
        calibration_freq: calibrationFreq  || null,
        hazard:           hazard           || null,
        expiry_date:      expiry           ? new Date(expiry) : null,
        status:           toItemStatus(status) || 'AVAILABLE',
        remarks:          remarks          || null,
      },
    });

    success(res, normalize(item), 'Inventory item created successfully', 201);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * PUT /api/inventory/:id
 * Staff/Admin: update any field of an inventory item.
 */
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, brand, location, amount, unit,
      serial, propertyNo, code, calibrationDate, calibrationFreq,
      hazard, expiry,
      status, remarks, is_active,
    } = req.body;

    // Build partial update — only include fields that were sent
    const data = {};
    if (name            !== undefined) data.name             = name;
    if (description     !== undefined) data.description      = description     || null;
    if (brand           !== undefined) data.brand            = brand           || null;
    if (location        !== undefined) data.location         = location        || null;
    if (amount          !== undefined) data.amount           = parseFloat(amount) || 0;
    if (unit            !== undefined) data.unit             = unit            || null;
    if (serial          !== undefined) data.serial_number    = serial          || null;
    if (propertyNo      !== undefined) data.property_number  = propertyNo      || null;
    if (code            !== undefined) data.equipment_code   = code            || null;
    if (calibrationDate !== undefined) data.calibration_date = calibrationDate ? new Date(calibrationDate) : null;
    if (calibrationFreq !== undefined) data.calibration_freq = calibrationFreq || null;
    if (hazard          !== undefined) data.hazard           = hazard          || null;
    if (expiry          !== undefined) data.expiry_date      = expiry ? new Date(expiry) : null;
    if (status          !== undefined) data.status           = toItemStatus(status);
    if (remarks         !== undefined) data.remarks          = remarks         || null;
    if (is_active       !== undefined) data.is_active        = Boolean(is_active);

    const item = await prisma.inventoryItem.update({
      where: { item_id: parseInt(id) },
      data,
    });

    success(res, normalize(item), 'Inventory item updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Item not found', 404);
    error(res, err.message);
  }
};

/**
 * DELETE /api/inventory/:id
 * Staff/Admin: soft-delete (deactivate) an item.
 * Hard-delete is blocked while reservation_items or accountability records exist.
 */
exports.deleteInventoryItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    // Check for linked reservation items or accountability records
    const links = await prisma.inventoryItem.findUnique({
      where: { item_id: itemId },
      include: {
        _count: {
          select: {
            reservation_items: true,
            accountability:    true,
          },
        },
      },
    });

    if (!links) return error(res, 'Item not found', 404);

    const hasLinks =
      links._count.reservation_items > 0 ||
      links._count.accountability    > 0;

    if (hasLinks) {
      // Soft-delete: just deactivate so historical records remain intact
      const item = await prisma.inventoryItem.update({
        where: { item_id: itemId },
        data:  { is_active: false },
      });
      return success(res, normalize(item), 'Item deactivated (linked records exist — cannot hard-delete)');
    }

    // Hard-delete when no links exist
    await prisma.inventoryItem.delete({ where: { item_id: itemId } });
    success(res, { id: itemId }, 'Inventory item deleted successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Item not found', 404);
    error(res, err.message);
  }
};