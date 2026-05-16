<?php
// auth/google-login.php
session_start();
session_destroy();
session_start();
require_once __DIR__ . '/../config/google-oauth.php';

$client = getGoogleClient();

$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;
$client->setState($state);

$authUrl = $client->createAuthUrl();
header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
exit;