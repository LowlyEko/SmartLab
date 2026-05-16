<?php
// api/dashboard-stats.php

header('Content-Type: application/json');

$db_path = __DIR__ . '/../config/db.php';

if (!file_exists($db_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'db.php not found at: ' . $db_path]);
    exit;
}

require_once $db_path;

try {
    $sql = "
        SELECT
            (
                (SELECT COUNT(*) FROM inventory_apparatus)
              + (SELECT COUNT(*) FROM inventory_equipment)
              + (SELECT COUNT(*) FROM inventory_supplies)
              + (SELECT COUNT(*) FROM inventory_glassware)
              + (SELECT COUNT(*) FROM inventory_chemicals)
            ) AS total_equipment
    ";

    $stmt = $pdo->query($sql);
    $row  = $stmt->fetch();

    echo json_encode([
        'total_equipment' => (int) ($row['total_equipment'] ?? 0),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed: ' . $e->getMessage()]);
}