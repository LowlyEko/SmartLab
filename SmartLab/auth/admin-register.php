<?php
// auth/admin-register.php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// Collect fields — admin table has: first_name, last_name, email, password, role
$firstName = trim($_POST['first_name'] ?? '');
$lastName  = trim($_POST['last_name']  ?? '');
$email     = trim($_POST['email']      ?? '');
$password  = trim($_POST['password']   ?? '');
$role      = trim($_POST['user_type']  ?? ''); // form still sends 'user_type'

// Validation
$errors = [];

if (empty($firstName)) $errors[] = 'First name is required.';
if (empty($lastName))  $errors[] = 'Last name is required.';
if (empty($email))     $errors[] = 'Email is required.';
if (empty($password))  $errors[] = 'Password is required.';
if (empty($role))      $errors[] = 'Please select a role.';

if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format.';
}

if (!empty($password) && (
    strlen($password) < 8 ||
    !preg_match('/[A-Za-z]/', $password) ||
    !preg_match('/[0-9]/', $password)
)) {
    $errors[] = 'Password must be at least 8 characters and contain letters and numbers.';
}

if (!empty($errors)) {
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// Validate role against allowed values in the admin table CHECK constraint
$allowedRoles = ['laboratory_staff', 'laboratory_chemist'];
if (!in_array($role, $allowedRoles)) {
    echo json_encode(['success' => false, 'message' => 'Invalid role selected.']);
    exit;
}

try {
    // Check for duplicate email in admin table
    $check = $pdo->prepare("SELECT admin_id FROM admin WHERE email = :email LIMIT 1");
    $check->execute([':email' => $email]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'An account with that email already exists.']);
        exit;
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert into admin table — matches schema exactly
    $stmt = $pdo->prepare("
        INSERT INTO admin
            (first_name, last_name, email, password, role, is_active, created_at, updated_at)
        VALUES
            (:first_name, :last_name, :email, :password, :role, TRUE, NOW(), NOW())
    ");
    $stmt->execute([
        ':first_name' => $firstName,
        ':last_name'  => $lastName,
        ':email'      => $email,
        ':password'   => $passwordHash,
        ':role'       => $role,
    ]);

    $newId = $pdo->lastInsertId();

    // Auto-login after registration
    session_regenerate_id(true);
    $_SESSION['admin_id']   = $newId;
    $_SESSION['first_name'] = $firstName;
    $_SESSION['last_name']  = $lastName;
    $_SESSION['email']      = $email;
    $_SESSION['role']       = $role;
    $_SESSION['logged_in']  = true;

    echo json_encode([
        'success'  => true,
        'message'  => 'Account created successfully!',
        'redirect' => '/SmartLab/dashboard.html'
    ]);

} catch (PDOException $e) {
    error_log('Admin register DB error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'A server error occurred. Please try again.']);
}