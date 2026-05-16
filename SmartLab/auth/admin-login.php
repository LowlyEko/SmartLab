<?php
// auth/admin-login.php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$email    = trim($_POST['email']    ?? '');
$password = trim($_POST['password'] ?? '');

if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format.']);
    exit;
}

try {
    // Query the admin table using its actual columns
    $stmt = $pdo->prepare("
        SELECT admin_id, first_name, last_name, email, password, role, is_active
        FROM admin
        WHERE email = :email
        AND role IN ('laboratory_staff', 'laboratory_chemist')
        LIMIT 1
    ");
    $stmt->execute([':email' => $email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'No admin account found with that email.']);
        exit;
    }

    if (!$admin['is_active']) {
        echo json_encode(['success' => false, 'message' => 'Your account has been deactivated. Contact support.']);
        exit;
    }

    if (!password_verify($password, $admin['password'])) {
        echo json_encode(['success' => false, 'message' => 'Incorrect password.']);
        exit;
    }

    // Update updated_at timestamp
    $pdo->prepare("UPDATE admin SET updated_at = NOW() WHERE admin_id = :id")
        ->execute([':id' => $admin['admin_id']]);

    // Set session
    session_regenerate_id(true);
    $_SESSION['admin_id']   = $admin['admin_id'];
    $_SESSION['first_name'] = $admin['first_name'];
    $_SESSION['last_name']  = $admin['last_name'];
    $_SESSION['email']      = $admin['email'];
    $_SESSION['role']       = $admin['role'];
    $_SESSION['logged_in']  = true;

    echo json_encode([
        'success'  => true,
        'redirect' => '/SmartLab/dashboard.html'
    ]);

} catch (PDOException $e) {
    error_log('Admin login DB error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'A server error occurred. Please try again.']);
}