<?php
// auth/google-callback.php
session_start();
require_once __DIR__ . '/../config/google-oauth.php';
require_once __DIR__ . '/../config/db.php';

// 1. Validate state (CSRF protection)
if (!isset($_GET['state'])) {
    die('Missing state parameter.');
}

$sessionState = $_SESSION['oauth_state'] ?? null;
if ($sessionState === null || $_GET['state'] !== $sessionState) {
    error_log('Session state: ' . var_export($sessionState, true));
    error_log('GET state: ' . $_GET['state']);
    die('Invalid state parameter. Possible CSRF attack.');
}
unset($_SESSION['oauth_state']);

// 2. Check for errors from Google
if (isset($_GET['error'])) {
    header('Location: ../Login-Register.html?error=google_denied');
    exit;
}

if (!isset($_GET['code'])) {
    header('Location: ../Login-Register.html?error=no_code');
    exit;
}

// 3. Exchange auth code for access token
$client = getGoogleClient();
try {
    $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
    if (isset($token['error'])) {
        throw new Exception($token['error_description'] ?? 'Token error');
    }
    $client->setAccessToken($token);

    if ($client->isAccessTokenExpired()) {
        header('Location: ../Login-Register.html?error=token_expired');
        exit;
    }
} catch (Exception $e) {
    header('Location: ../Login-Register.html?error=token_failed');
    exit;
}

// 4. Get user info from Google
$googleService = new Google_Service_Oauth2($client);
$googleUser    = $googleService->userinfo->get();

$email     = $googleUser->getEmail();
$firstName = $googleUser->getGivenName();
$lastName  = $googleUser->getFamilyName();

// 5. Look up or create student in the student table
try {
    $stmt = $pdo->prepare("SELECT * FROM student WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($student) {
        // Existing student — check if active
        if (!$student['is_active']) {
            header('Location: ../Login-Register.html?error=account_inactive');
            exit;
        }

        // Touch updated_at
        $pdo->prepare("UPDATE student SET updated_at = NOW() WHERE user_id = :id")
            ->execute([':id' => $student['user_id']]);

    } else {
        // New student — auto-register
        // student table requires year_level (NOT NULL); default to 1 until profile is completed
        $stmt = $pdo->prepare("
            INSERT INTO student
                (first_name, last_name, email, is_active, user_type, created_at, updated_at)
            VALUES
                (:first_name, :last_name, :email, TRUE, 'student', NOW(), NOW())
        ");
        $stmt->execute([
            ':first_name' => $firstName,
            ':last_name'  => $lastName,
            ':email'      => $email,
        ]);

        $newId   = $pdo->lastInsertId();
        $stmt    = $pdo->prepare("SELECT * FROM student WHERE user_id = :id");
        $stmt->execute([':id' => $newId]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // 6. Set session — use student table column names
    $_SESSION['student_db_id'] = $student['user_id'];
    $_SESSION['student_id']    = $student['student_id']; // may be NULL until assigned
    $_SESSION['first_name']    = $student['first_name'];
    $_SESSION['last_name']     = $student['last_name'];
    $_SESSION['email']         = $student['email'];
    $_SESSION['user_type']     = $student['user_type'];
    $_SESSION['logged_in']     = true;

    // 7. Redirect to student dashboard
    header('Location: ../student-dashboard.html');
    exit;

} catch (PDOException $e) {
    error_log('Google OAuth DB error: ' . $e->getMessage());
    header('Location: ../Login-Register.html?error=db_error');
    exit;
}