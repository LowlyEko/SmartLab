<?php
session_start();
session_unset();
session_destroy();

header('Location: /SmartLab/Login-Register.html');
exit;