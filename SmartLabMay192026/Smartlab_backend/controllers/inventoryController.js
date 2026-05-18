// controllers/inventoryController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

// ==================== NORMALIZERS ====================
// Each normalizes a DB row → the flat shape the frontend expects.

function normalizeApparatus(item) {
  return {
    id:                 Number(item.apparatus_id),
    item_type:          'apparatus',
    type:               'equipment',
    category:           'Apparatus',
    name:               item.apparatus_name,
    volume_size:        item.description   || '',
    brand:              item.brand         || '',
    remarks:            item.remarks       || '',
    location_id:        Number(item.location_id),
    location:           item.location?.location_name || '',
    total_quantity:     item.quantity,
    available_quantity: item.quantity,
  };
}

function normalizeGlassware(item) {
  return {
    id:                 Number(item.glassware_id),
    item_type:          'glassware',
    type:               'equipment',
    category:           'Glassware',
    name:               item.glassware,
    volume_size:        item.description   || '',
    brand:              item.brand         || '',
    remarks:            item.remarks       || '',
    location_id:        Number(item.location_id),
    location:           item.location?.location_name || '',
    total_quantity:     item.quantity,
    available_quantity: item.quantity,
  };
}

function normalizeEquipment(item) {
  return {
    id:                 Number(item.equipment_id),
    item_type:          'equipment',
    type:               'equipment',
    category:           'Equipment',
    name:               item.equipment_name,
    volume_size:        item.model         || '',
    brand:              item.brand         || '',
    serial_no:          item.serial_no     || '',
    property_number:    item.property_number || '',
    equipment_code:     item.equipment_code  || '',
    status:             item.status,
    remarks:            item.remarks       || '',
    location_id:        Number(item.location_id),
    location:           item.location?.location_name || '',
    calibration_date:   item.calibration_date || null,
    calibration_frequency: item.calibration_frequency || '',
    total_quantity:     item.quantity,
    available_quantity: item.quantity,
  };
}

function normalizeSupplies(item) {
  return {
    id:                 Number(item.supplies_id),
    item_type:          'supplies',
    type:               'equipment',
    category:           'Supply',
    name:               item.supplies_name,
    volume_size:        item.quantity_unit || '',
    brand:              item.brand         || '',
    location_id:        Number(item.location_id),
    location:           item.location?.location_name || '',
    total_quantity:     item.quantity,
    available_quantity: item.quantity,
  };
}

function normalizeChemical(item) {
  return {
    id:                 Number(item.chemical_id),
    item_type:          'chemicals',
    type:               'chemical',
    category:           'Chemical',
    name:               item.chemical_name,
    unit:               item.amount        || '',
    volume_size:        item.amount        || '',
    location_id:        Number(item.location_id),
    location:           item.location?.location_name || '',
    available_quantity: 0,   // new schema has no quantity column for chemicals
    remarks:            item.remarks       || '',
  };
}

const locationInclude = { location: { select: { location_name: true } } };

// ==================== STUDENT ENDPOINTS ====================

/**
 * GET /api/inventory?type=equipment|chemical
 * Returns all items of the requested type (or both).
 */
exports.getAllInventory = async (req, res) => {
  try {
    const { type } = req.query;

    let items = [];

    if (!type || type === 'equipment') {
      const [apparatus, glassware, equipment, supplies] = await Promise.all([
        prisma.inventoryApparatus.findMany({ orderBy: { apparatus_name: 'asc' }, include: locationInclude }),
        prisma.inventoryGlassware.findMany({ orderBy: { glassware: 'asc' },       include: locationInclude }),
        prisma.inventoryEquipment.findMany({ orderBy: { equipment_name: 'asc' },  include: locationInclude }),
        prisma.inventorySupplies.findMany({ orderBy: { supplies_name: 'asc' },    include: locationInclude }),
      ]);

      items = [
        ...apparatus.map(normalizeApparatus),
        ...glassware.map(normalizeGlassware),
        ...equipment.map(normalizeEquipment),
        ...supplies.map(normalizeSupplies),
      ];
    }

    if (!type || type === 'chemical') {
      const chemicals = await prisma.inventoryChemical.findMany({
        orderBy: { chemical_name: 'asc' },
        include: locationInclude,
      });
      items = [...items, ...chemicals.map(normalizeChemical)];
    }

    success(res, items);
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

/**
 * GET /api/inventory/equipment/:id?item_type=apparatus|glassware|equipment|supplies
 */
exports.getEquipmentById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { item_type } = req.query;

    let item;
    if (item_type === 'apparatus') {
      item = normalizeApparatus(await prisma.inventoryApparatus.findUnique({ where: { apparatus_id: id }, include: locationInclude }));
    } else if (item_type === 'glassware') {
      item = normalizeGlassware(await prisma.inventoryGlassware.findUnique({ where: { glassware_id: id }, include: locationInclude }));
    } else if (item_type === 'supplies') {
      item = normalizeSupplies(await prisma.inventorySupplies.findUnique({ where: { supplies_id: id }, include: locationInclude }));
    } else {
      item = normalizeEquipment(await prisma.inventoryEquipment.findUnique({ where: { equipment_id: id }, include: locationInclude }));
    }

    if (!item) return error(res, 'Item not found', 404);
    success(res, item);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * GET /api/inventory/chemical/:id
 */
exports.getChemicalById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.inventoryChemical.findUnique({ where: { chemical_id: id }, include: locationInclude });
    if (!item) return error(res, 'Chemical not found', 404);
    success(res, normalizeChemical(item));
  } catch (err) {
    error(res, err.message);
  }
};

// ==================== STAFF / ADMIN ENDPOINTS ====================

/**
 * POST /api/inventory/equipment
 * Body: { name, volume_size?, category, total_quantity?, brand?, location_id? }
 * category determines which table to insert into: Apparatus | Glassware | Equipment | Supply
 */
exports.createEquipment = async (req, res) => {
  try {
    const { name, volume_size, category, total_quantity, brand, location_id, remarks, model, serial_no, property_number, equipment_code, status } = req.body;

    if (!name)        return error(res, 'Name is required', 400);
    if (!location_id) return error(res, 'location_id is required', 400);

    const qty    = parseInt(total_quantity) || 0;
    const loc_id = BigInt(location_id);
    let item;

    const cat = (category || '').toLowerCase();

    if (cat === 'apparatus') {
      const raw = await prisma.inventoryApparatus.create({ data: { apparatus_name: name, description: volume_size || null, location_id: loc_id, quantity: qty, brand: brand || null, remarks: remarks || null }, include: locationInclude });
      item = normalizeApparatus(raw);
    } else if (cat === 'glassware') {
      const raw = await prisma.inventoryGlassware.create({ data: { glassware: name, description: volume_size || null, location_id: loc_id, quantity: qty, brand: brand || null, remarks: remarks || null }, include: locationInclude });
      item = normalizeGlassware(raw);
    } else if (cat === 'supply') {
      const raw = await prisma.inventorySupplies.create({ data: { supplies_name: name, quantity_unit: volume_size || null, location_id: loc_id, quantity: qty, brand: brand || null }, include: locationInclude });
      item = normalizeSupplies(raw);
    } else {
      // default: Equipment
      const raw = await prisma.inventoryEquipment.create({ data: { equipment_name: name, model: model || volume_size || null, brand: brand || null, serial_no: serial_no || null, property_number: property_number || null, equipment_code: equipment_code || null, location_id: loc_id, quantity: qty, status: status || 'FUNCTIONAL', remarks: remarks || null }, include: locationInclude });
      item = normalizeEquipment(raw);
    }

    success(res, item, 'Item created successfully', 201);
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

/**
 * PUT /api/inventory/equipment/:id
 * Body includes item_type to know which table to update.
 */
exports.updateEquipment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, volume_size, total_quantity, brand, remarks, item_type, location_id, model, status } = req.body;

    const qty = total_quantity !== undefined ? parseInt(total_quantity) : undefined;
    const loc  = location_id   !== undefined ? BigInt(location_id)     : undefined;
    let item;

    if (item_type === 'apparatus') {
      const data = {};
      if (name        !== undefined) data.apparatus_name = name;
      if (volume_size !== undefined) data.description    = volume_size || null;
      if (qty         !== undefined) data.quantity        = qty;
      if (brand       !== undefined) data.brand           = brand || null;
      if (remarks     !== undefined) data.remarks         = remarks || null;
      if (loc         !== undefined) data.location_id     = loc;
      const raw = await prisma.inventoryApparatus.update({ where: { apparatus_id: id }, data, include: locationInclude });
      item = normalizeApparatus(raw);
    } else if (item_type === 'glassware') {
      const data = {};
      if (name        !== undefined) data.glassware   = name;
      if (volume_size !== undefined) data.description = volume_size || null;
      if (qty         !== undefined) data.quantity    = qty;
      if (brand       !== undefined) data.brand       = brand || null;
      if (remarks     !== undefined) data.remarks     = remarks || null;
      if (loc         !== undefined) data.location_id = loc;
      const raw = await prisma.inventoryGlassware.update({ where: { glassware_id: id }, data, include: locationInclude });
      item = normalizeGlassware(raw);
    } else if (item_type === 'supplies') {
      const data = {};
      if (name        !== undefined) data.supplies_name  = name;
      if (volume_size !== undefined) data.quantity_unit  = volume_size || null;
      if (qty         !== undefined) data.quantity       = qty;
      if (brand       !== undefined) data.brand          = brand || null;
      if (loc         !== undefined) data.location_id    = loc;
      const raw = await prisma.inventorySupplies.update({ where: { supplies_id: id }, data, include: locationInclude });
      item = normalizeSupplies(raw);
    } else {
      const data = {};
      if (name        !== undefined) data.equipment_name = name;
      if (model || volume_size !== undefined) data.model = model || volume_size || null;
      if (qty         !== undefined) data.quantity       = qty;
      if (brand       !== undefined) data.brand          = brand || null;
      if (status      !== undefined) data.status         = status;
      if (remarks     !== undefined) data.remarks        = remarks || null;
      if (loc         !== undefined) data.location_id    = loc;
      const raw = await prisma.inventoryEquipment.update({ where: { equipment_id: id }, data, include: locationInclude });
      item = normalizeEquipment(raw);
    }

    success(res, item, 'Item updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Item not found', 404);
    console.error(err);
    error(res, err.message);
  }
};

/**
 * DELETE /api/inventory/equipment/:id?item_type=apparatus|glassware|equipment|supplies
 */
exports.deleteEquipment = async (req, res) => {
  try {
    const id        = parseInt(req.params.id);
    const item_type = req.query.item_type || req.body.item_type || 'equipment';

    if (item_type === 'apparatus') {
      await prisma.inventoryApparatus.delete({ where: { apparatus_id: id } });
    } else if (item_type === 'glassware') {
      await prisma.inventoryGlassware.delete({ where: { glassware_id: id } });
    } else if (item_type === 'supplies') {
      await prisma.inventorySupplies.delete({ where: { supplies_id: id } });
    } else {
      await prisma.inventoryEquipment.delete({ where: { equipment_id: id } });
    }

    success(res, { id }, 'Item deleted successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Item not found', 404);
    error(res, err.message);
  }
};

/**
 * POST /api/inventory/chemical
 * Body: { name, amount?, location_id?, remarks? }
 */
exports.createChemical = async (req, res) => {
  try {
    const { name, amount, unit, location_id, remarks } = req.body;

    if (!name)        return error(res, 'Name is required', 400);
    if (!location_id) return error(res, 'location_id is required', 400);

    const raw = await prisma.inventoryChemical.create({
      data: {
        chemical_name: name,
        amount:        amount || unit || null,
        location_id:   BigInt(location_id),
        remarks:       remarks || null,
      },
      include: locationInclude,
    });

    success(res, normalizeChemical(raw), 'Chemical created successfully', 201);
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

/**
 * PUT /api/inventory/chemical/:id
 */
exports.updateChemical = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, amount, unit, location_id, remarks } = req.body;

    const data = {};
    if (name        !== undefined) data.chemical_name = name;
    if (amount || unit !== undefined) data.amount     = amount || unit || null;
    if (location_id !== undefined) data.location_id   = BigInt(location_id);
    if (remarks     !== undefined) data.remarks       = remarks || null;

    const raw = await prisma.inventoryChemical.update({
      where:   { chemical_id: id },
      data,
      include: locationInclude,
    });

    success(res, normalizeChemical(raw), 'Chemical updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Chemical not found', 404);
    error(res, err.message);
  }
};

/**
 * DELETE /api/inventory/chemical/:id
 */
exports.deleteChemical = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const linked = await prisma.reservationChemical.count({
      where: { chemical_id: id },
    });

    if (linked > 0) {
      return error(res, 'Cannot delete chemical linked to reservations.', 409);
    }

    await prisma.inventoryChemical.delete({ where: { chemical_id: id } });
    success(res, { id }, 'Chemical deleted successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Chemical not found', 404);
    error(res, err.message);
  }
};

/**
 * GET /api/inventory/locations
 * Returns all locations for the Add/Edit Item dropdowns.
 */
exports.getLocations = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      select:  { location_id: true, location_name: true },
      orderBy: { location_name: 'asc' },
    });
    // Convert BigInt location_id to Number for JSON serialisation
    success(res, locations.map(l => ({ location_id: Number(l.location_id), location_name: l.location_name })));
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};