<?php
// config/google-oauth.php
require_once __DIR__ . '/../vendor/autoload.php';

define('GOOGLE_CLIENT_ID',     '232131012131-60b6dqmijdu0pgibnkjikf4vp78gsgvj.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', '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');
define('GOOGLE_REDIRECT_URI',  'http://localhost/SmartLab/auth/google-callback.php');

function getGoogleClient(): Google_Client {
    $client = new Google_Client();
    $client->setClientId(GOOGLE_CLIENT_ID);
    $client->setClientSecret(GOOGLE_CLIENT_SECRET);
    $client->setRedirectUri(GOOGLE_REDIRECT_URI);
    $client->addScope('email');
    $client->addScope('profile');
    return $client;
}