<?php
// api/inventory.php
// Handles all CRUD operations for the SmartLab Inventory module.
// Endpoint: /api/inventory.php?tab=apparatus|glassware|equipment|supplies|chemicals

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';

// ─── Route ────────────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$tab    = $_GET['tab'] ?? '';
$id     = $_GET['id']  ?? null;

$validTabs = ['apparatus', 'glassware', 'equipment', 'supplies', 'chemicals'];
if (!in_array($tab, $validTabs, true)) {
    http_response_code(400);
    echo json_encode(['error' => "Invalid tab: $tab"]);
    exit;
}

try {
    match ($method) {
        'GET'    => handleGet($pdo, $tab),
        'POST'   => handlePost($pdo, $tab),
        'PUT'    => handlePut($pdo, $tab, $id),
        'DELETE' => handleDelete($pdo, $tab, $id),
        default  => throw new Exception("Method not allowed", 405),
    };
} catch (Exception $e) {
    $code = $e->getCode() >= 400 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode(['error' => $e->getMessage()]);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  GET — fetch all rows for a tab
// ═══════════════════════════════════════════════════════════════════════════════
function handleGet(PDO $pdo, string $tab): void
{
    $rows = match ($tab) {
        'apparatus' => fetchApparatus($pdo),
        'glassware' => fetchGlassware($pdo),
        'equipment' => fetchEquipment($pdo),
        'supplies'  => fetchSupplies($pdo),
        'chemicals' => fetchChemicals($pdo),
    };
    echo json_encode($rows);
}

// ── Apparatus ─────────────────────────────────────────────────────────────────
function fetchApparatus(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            a.apparatus_id   AS raw_id,
            a.apparatus_name AS name,
            a.description,
            l.location_name  AS location,
            a.remarks,
            a.quantity
        FROM inventory_apparatus a
        JOIN locations l ON l.location_id = a.location_id
        ORDER BY a.apparatus_id
    ");
    $rows = $stmt->fetchAll();

    $brandStmt = $pdo->query("
        SELECT ab.apparatus_id, GROUP_CONCAT(b.brand_name ORDER BY b.brand_name SEPARATOR '; ') AS brand
        FROM inventory_apparatus_brand ab
        JOIN brands b ON b.brand_id = ab.brand_id
        GROUP BY ab.apparatus_id
    ");
    $brands = [];
    foreach ($brandStmt->fetchAll() as $row) {
        $brands[$row['apparatus_id']] = $row['brand'];
    }

    foreach ($rows as &$r) {
        $numId      = $r['raw_id'];
        $r['id']    = 'AP' . str_pad($numId, 3, '0', STR_PAD_LEFT);
        $r['brand'] = $brands[$numId] ?? '';
        unset($r['raw_id']);
    }
    return $rows;
}

// ── Glassware ─────────────────────────────────────────────────────────────────
function fetchGlassware(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            g.glassware_id   AS raw_id,
            g.glassware      AS name,
            g.description,
            l.location_name  AS location,
            g.remarks,
            g.quantity
        FROM inventory_glassware g
        JOIN locations l ON l.location_id = g.location_id
        ORDER BY g.glassware_id
    ");
    $rows = $stmt->fetchAll();

    $brandStmt = $pdo->query("
        SELECT gb.glassware_id, GROUP_CONCAT(b.brand_name ORDER BY b.brand_name SEPARATOR '; ') AS brand
        FROM inventory_glassware_brand gb
        JOIN brands b ON b.brand_id = gb.brand_id
        GROUP BY gb.glassware_id
    ");
    $brands = [];
    foreach ($brandStmt->fetchAll() as $row) {
        $brands[$row['glassware_id']] = $row['brand'];
    }

    foreach ($rows as &$r) {
        $numId      = $r['raw_id'];
        $r['id']    = 'GL' . str_pad($numId, 3, '0', STR_PAD_LEFT);
        $r['brand'] = $brands[$numId] ?? '';
        unset($r['raw_id']);
    }
    return $rows;
}

// ── Equipment ─────────────────────────────────────────────────────────────────
function fetchEquipment(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            e.equipment_id           AS raw_id,
            e.equipment_name         AS name,
            CONCAT_WS(' ', e.brand, e.model) AS brand,
            e.serial_no              AS serial,
            e.property_number        AS propertyNo,
            e.equipment_code         AS code,
            l.location_name          AS location,
            e.calibration_date       AS calibrationDate,
            e.calibration_frequency  AS calibrationFreq,
            e.status                 AS remarks
        FROM inventory_equipment e
        JOIN locations l ON l.location_id = e.location_id
        ORDER BY e.equipment_id
    ");
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $numId   = $r['raw_id'];
        $r['id'] = 'EQ' . str_pad($numId, 3, '0', STR_PAD_LEFT);
        unset($r['raw_id']);
        foreach ($r as $k => $v) {
            if ($v === null) $r[$k] = '';
        }
    }
    return $rows;
}

// ── Supplies ──────────────────────────────────────────────────────────────────
function fetchSupplies(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            s.supplies_id    AS raw_id,
            s.supplies_name  AS name,
            b.brand_name     AS brand,
            l.location_name  AS location,
            s.quantity,
            s.quantity_unit  AS unit
        FROM inventory_supplies s
        LEFT JOIN brands   b ON b.brand_id   = s.brand_id
        JOIN  locations    l ON l.location_id = s.location_id
        ORDER BY s.supplies_id
    ");
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $numId   = $r['raw_id'];
        $r['id'] = 'IT' . str_pad($numId, 3, '0', STR_PAD_LEFT);
        unset($r['raw_id']);
        foreach ($r as $k => $v) {
            if ($v === null) $r[$k] = '';
        }
    }
    return $rows;
}

// ── Chemicals ─────────────────────────────────────────────────────────────────
function fetchChemicals(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            c.chemical_id    AS raw_id,
            c.chemical_name  AS name,
            l.location_name  AS location,
            c.amount         AS quantity,
            c.remarks
        FROM inventory_chemicals c
        JOIN locations l ON l.location_id = c.location_id
        ORDER BY c.chemical_id
    ");
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $numId   = $r['raw_id'];
        $r['id'] = 'CH' . str_pad($numId, 3, '0', STR_PAD_LEFT);
        unset($r['raw_id']);
        $r['category'] = '';
        $r['unit']     = '';
        $r['hazard']   = '';
        $r['expiry']   = '';
        $r['status']   = '';
        foreach ($r as $k => $v) {
            if ($v === null) $r[$k] = '';
        }
    }
    return $rows;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  POST — insert a new row
// ═══════════════════════════════════════════════════════════════════════════════
function handlePost(PDO $pdo, string $tab): void
{
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $saved = match ($tab) {
        'apparatus' => insertApparatus($pdo, $body),
        'glassware' => insertGlassware($pdo, $body),
        'equipment' => insertEquipment($pdo, $body),
        'supplies'  => insertSupplies($pdo, $body),
        'chemicals' => insertChemicals($pdo, $body),
    };

    http_response_code(201);
    echo json_encode($saved);
}

function resolveLocationId(PDO $pdo, string $name): int
{
    $stmt = $pdo->prepare("SELECT location_id FROM locations WHERE location_name = ?");
    $stmt->execute([$name]);
    $row = $stmt->fetch();
    if (!$row) throw new Exception("Unknown location: $name", 400);
    return (int) $row['location_id'];
}

/**
 * Resolves a brand name to its brand_id.
 * If the brand doesn't exist yet, inserts it and returns the new id.
 */
function resolveBrandId(PDO $pdo, string $brandName): int
{
    $brandName = trim($brandName);
    $stmt = $pdo->prepare("SELECT brand_id FROM brands WHERE brand_name = ?");
    $stmt->execute([$brandName]);
    $row = $stmt->fetch();
    if ($row) {
        return (int) $row['brand_id'];
    }
    // Auto-create the brand so edits are never silently dropped
    $ins = $pdo->prepare("INSERT INTO brands (brand_name) VALUES (?)");
    $ins->execute([$brandName]);
    return (int) $pdo->lastInsertId();
}

/**
 * Parses a semicolon-separated brand string (e.g. "Pyrex; Bomex") into
 * an array of brand_ids, creating missing brands automatically.
 */
function parseBrandIds(PDO $pdo, string $brandString): array
{
    $names = array_filter(
        array_map('trim', explode(';', $brandString)),
        fn($n) => $n !== ''
    );
    return array_map(fn($name) => resolveBrandId($pdo, $name), $names);
}

function insertApparatus(PDO $pdo, array $b): array
{
    $locId = resolveLocationId($pdo, $b['location'] ?? '');
    $stmt  = $pdo->prepare("
        INSERT INTO inventory_apparatus (apparatus_name, description, location_id, remarks, quantity)
        VALUES (?, ?, ?, ?, 0)
    ");
    $stmt->execute([
        $b['name']        ?? '',
        $b['description'] ?: null,
        $locId,
        $b['remarks']     ?: null,
    ]);
    $newId = (int) $pdo->lastInsertId();

    // Save brands to junction table
    if (!empty($b['brand'])) {
        $brandIds = parseBrandIds($pdo, $b['brand']);
        $jStmt    = $pdo->prepare("INSERT IGNORE INTO inventory_apparatus_brand (apparatus_id, brand_id) VALUES (?, ?)");
        foreach ($brandIds as $bid) {
            $jStmt->execute([$newId, $bid]);
        }
    }

    $b['id'] = 'AP' . str_pad($newId, 3, '0', STR_PAD_LEFT);
    return $b;
}

function insertGlassware(PDO $pdo, array $b): array
{
    $locId = resolveLocationId($pdo, $b['location'] ?? '');
    $stmt  = $pdo->prepare("
        INSERT INTO inventory_glassware (glassware, description, location_id, remarks, quantity)
        VALUES (?, ?, ?, ?, 0)
    ");
    $stmt->execute([
        $b['name']        ?? '',
        $b['description'] ?: null,
        $locId,
        $b['remarks']     ?: null,
    ]);
    $newId = (int) $pdo->lastInsertId();

    // Save brands to junction table
    if (!empty($b['brand'])) {
        $brandIds = parseBrandIds($pdo, $b['brand']);
        $jStmt    = $pdo->prepare("INSERT IGNORE INTO inventory_glassware_brand (glassware_id, brand_id) VALUES (?, ?)");
        foreach ($brandIds as $bid) {
            $jStmt->execute([$newId, $bid]);
        }
    }

    $b['id'] = 'GL' . str_pad($newId, 3, '0', STR_PAD_LEFT);
    return $b;
}

function insertEquipment(PDO $pdo, array $b): array
{
    $locId      = resolveLocationId($pdo, $b['location'] ?? '');
    $brandModel = $b['brand'] ?? '';
    $parts      = explode(' ', $brandModel, 2);
    $brand      = $parts[0] ?? '';
    $model      = $parts[1] ?? null;

    $freqMap = [
        'Monthly'     => 'Monthly',
        'Quarterly'   => 'Monthly',
        'Semi-annual' => 'Semi-Annual',
        'Annual'      => 'Annual',
        'N/A'         => 'As Needed',
    ];
    $freq = $freqMap[$b['calibrationFreq'] ?? ''] ?? 'As Needed';

    $stmt = $pdo->prepare("
        INSERT INTO inventory_equipment
            (equipment_name, brand, model, serial_no, property_number,
             equipment_code, location_id, calibration_date, calibration_frequency, status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FUNCTIONAL', ?)
    ");
    $stmt->execute([
        $b['name']            ?? '',
        $brand ?: null,
        $model,
        $b['serial']          ?: null,
        $b['propertyNo']      ?: null,
        $b['code']            ?: null,
        $locId,
        $b['calibrationDate'] ?: null,
        $freq,
        $b['remarks']         ?: null,
    ]);
    $newId   = (int) $pdo->lastInsertId();
    $b['id'] = 'EQ' . str_pad($newId, 3, '0', STR_PAD_LEFT);
    return $b;
}

function insertSupplies(PDO $pdo, array $b): array
{
    $locId   = resolveLocationId($pdo, $b['location'] ?? '');
    $brandId = null;
    if (!empty($b['brand'])) {
        $brandId = resolveBrandId($pdo, $b['brand']);
    }

    $stmt = $pdo->prepare("
        INSERT INTO inventory_supplies (supplies_name, brand_id, location_id, quantity, quantity_unit)
        VALUES (?, ?, ?, 0, NULL)
    ");
    $stmt->execute([$b['name'] ?? '', $brandId, $locId]);
    $newId   = (int) $pdo->lastInsertId();
    $b['id'] = 'IT' . str_pad($newId, 3, '0', STR_PAD_LEFT);
    return $b;
}

function insertChemicals(PDO $pdo, array $b): array
{
    $locId = resolveLocationId($pdo, $b['location'] ?? '');
    $stmt  = $pdo->prepare("
        INSERT INTO inventory_chemicals (chemical_name, amount, location_id, remarks)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([
        $b['name']     ?? '',
        $b['quantity'] ?: null,
        $locId,
        $b['remarks']  ?: null,
    ]);
    $newId   = (int) $pdo->lastInsertId();
    $b['id'] = 'CH' . str_pad($newId, 3, '0', STR_PAD_LEFT);
    return $b;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  PUT — update an existing row
// ═══════════════════════════════════════════════════════════════════════════════
function handlePut(PDO $pdo, string $tab, ?string $id): void
{
    if (!$id) throw new Exception("Missing id", 400);
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $numId = (int) preg_replace('/\D/', '', $id);

    $saved = match ($tab) {
        'apparatus' => updateApparatus($pdo, $numId, $body),
        'glassware' => updateGlassware($pdo, $numId, $body),
        'equipment' => updateEquipment($pdo, $numId, $body),
        'supplies'  => updateSupplies($pdo, $numId, $body),
        'chemicals' => updateChemicals($pdo, $numId, $body),
    };
    echo json_encode($saved);
}

// ── UPDATE: Apparatus ─────────────────────────────────────────────────────────
function updateApparatus(PDO $pdo, int $numId, array $b): array
{
    $locId = resolveLocationId($pdo, $b['location'] ?? '');

    // Update main row
    $pdo->prepare("
        UPDATE inventory_apparatus
        SET apparatus_name = ?,
            description    = ?,
            location_id    = ?,
            remarks        = ?
        WHERE apparatus_id = ?
    ")->execute([
        $b['name']            ?? '',
        $b['description']     ?: null,
        $locId,
        $b['remarks']         ?: null,
        $numId,
    ]);

    // Sync brand junction table:
    // Delete all existing brand links, then re-insert from the submitted value.
    $pdo->prepare("DELETE FROM inventory_apparatus_brand WHERE apparatus_id = ?")
        ->execute([$numId]);

    if (!empty($b['brand'])) {
        $brandIds = parseBrandIds($pdo, $b['brand']);
        $jStmt    = $pdo->prepare("INSERT IGNORE INTO inventory_apparatus_brand (apparatus_id, brand_id) VALUES (?, ?)");
        foreach ($brandIds as $bid) {
            $jStmt->execute([$numId, $bid]);
        }
    }

    return $b;
}

// ── UPDATE: Glassware ─────────────────────────────────────────────────────────
function updateGlassware(PDO $pdo, int $numId, array $b): array
{
    $locId = resolveLocationId($pdo, $b['location'] ?? '');

    // Update main row
    $pdo->prepare("
        UPDATE inventory_glassware
        SET glassware   = ?,
            description = ?,
            location_id = ?,
            remarks     = ?
        WHERE glassware_id = ?
    ")->execute([
        $b['name']        ?? '',
        $b['description'] ?: null,
        $locId,
        $b['remarks']     ?: null,
        $numId,
    ]);

    // Sync brand junction table
    $pdo->prepare("DELETE FROM inventory_glassware_brand WHERE glassware_id = ?")
        ->execute([$numId]);

    if (!empty($b['brand'])) {
        $brandIds = parseBrandIds($pdo, $b['brand']);
        $jStmt    = $pdo->prepare("INSERT IGNORE INTO inventory_glassware_brand (glassware_id, brand_id) VALUES (?, ?)");
        foreach ($brandIds as $bid) {
            $jStmt->execute([$numId, $bid]);
        }
    }

    return $b;
}

// ── UPDATE: Equipment ─────────────────────────────────────────────────────────
function updateEquipment(PDO $pdo, int $numId, array $b): array
{
    $locId      = resolveLocationId($pdo, $b['location'] ?? '');
    $brandModel = $b['brand'] ?? '';
    $parts      = explode(' ', $brandModel, 2);
    $brand      = $parts[0] ?? '';
    $model      = $parts[1] ?? null;

    $freqMap = [
        'Monthly'     => 'Monthly',
        'Quarterly'   => 'Monthly',
        'Semi-annual' => 'Semi-Annual',
        'Annual'      => 'Annual',
        'N/A'         => 'As Needed',
    ];
    $freq = $freqMap[$b['calibrationFreq'] ?? ''] ?? 'As Needed';

    // Map remarks text → status enum
    $remarks    = strtoupper(trim($b['remarks'] ?? ''));
    $statusMap  = [
        'FUNCTIONAL'     => 'FUNCTIONAL',
        'NOT FUNCTIONAL' => 'NOT FUNCTIONAL',
        'FOR REPAIR'     => 'FOR REPAIR',
        'NEW'            => 'NEW',
    ];
    $status = $statusMap[$remarks] ?? 'FUNCTIONAL';

    $pdo->prepare("
        UPDATE inventory_equipment
        SET equipment_name       = ?,
            brand                = ?,
            model                = ?,
            serial_no            = ?,
            property_number      = ?,
            equipment_code       = ?,
            location_id          = ?,
            calibration_date     = ?,
            calibration_frequency = ?,
            status               = ?,
            remarks              = ?
        WHERE equipment_id = ?
    ")->execute([
        $b['name']            ?? '',
        $brand                ?: null,
        $model,
        $b['serial']          ?: null,
        $b['propertyNo']      ?: null,
        $b['code']            ?: null,
        $locId,
        $b['calibrationDate'] ?: null,
        $freq,
        $status,
        $b['remarks']         ?: null,
        $numId,
    ]);

    return $b;
}

// ── UPDATE: Supplies ──────────────────────────────────────────────────────────
function updateSupplies(PDO $pdo, int $numId, array $b): array
{
    $locId   = resolveLocationId($pdo, $b['location'] ?? '');
    $brandId = null;

    if (!empty($b['brand'])) {
        // resolveBrandId auto-creates the brand if it doesn't exist
        $brandId = resolveBrandId($pdo, $b['brand']);
    }

    $pdo->prepare("
        UPDATE inventory_supplies
        SET supplies_name = ?,
            brand_id      = ?,
            location_id   = ?
        WHERE supplies_id = ?
    ")->execute([
        $b['name'] ?? '',
        $brandId,
        $locId,
        $numId,
    ]);

    return $b;
}

// ── UPDATE: Chemicals ─────────────────────────────────────────────────────────
function updateChemicals(PDO $pdo, int $numId, array $b): array
{
    $locId = resolveLocationId($pdo, $b['location'] ?? '');

    $pdo->prepare("
        UPDATE inventory_chemicals
        SET chemical_name = ?,
            amount        = ?,
            location_id   = ?,
            remarks       = ?
        WHERE chemical_id = ?
    ")->execute([
        $b['name']     ?? '',
        $b['quantity'] ?: null,
        $locId,
        $b['remarks']  ?: null,
        $numId,
    ]);

    return $b;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════════════════════
function handleDelete(PDO $pdo, string $tab, ?string $id): void
{
    if (!$id) throw new Exception("Missing id", 400);
    $numId = (int) preg_replace('/\D/', '', $id);

    $tableMap = [
        'apparatus' => ['inventory_apparatus', 'apparatus_id'],
        'glassware' => ['inventory_glassware', 'glassware_id'],
        'equipment' => ['inventory_equipment', 'equipment_id'],
        'supplies'  => ['inventory_supplies',  'supplies_id'],
        'chemicals' => ['inventory_chemicals',  'chemical_id'],
    ];

    // Delete junction rows first (apparatus & glassware have brand pivot tables)
    $junctionMap = [
        'apparatus' => ['inventory_apparatus_brand', 'apparatus_id'],
        'glassware' => ['inventory_glassware_brand',  'glassware_id'],
    ];
    if (isset($junctionMap[$tab])) {
        [$jTable, $jCol] = $junctionMap[$tab];
        $pdo->prepare("DELETE FROM $jTable WHERE $jCol = ?")->execute([$numId]);
    }

    [$table, $col] = $tableMap[$tab];
    $pdo->prepare("DELETE FROM $table WHERE $col = ?")->execute([$numId]);

    http_response_code(204);
}