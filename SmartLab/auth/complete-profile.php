<?php // Student submits their student ID
$studentId = trim($_POST['student_id'] ?? '');

// Validate it exists in the school data store
// (see options below for how to validate)

$stmt = $pdo->prepare("
    UPDATE student 
    SET student_id = :student_id,
        college = :college,
        year_level = :year_level,
        section = :section,
        updated_at = NOW()
    WHERE user_id = :user_id
");
$stmt->execute([
    ':student_id' => $studentId,
    ':college'    => $college,
    ':year_level' => $yearLevel,
    ':section'    => $section,
    ':user_id'    => $_SESSION['student_db_id'],
]);

?>