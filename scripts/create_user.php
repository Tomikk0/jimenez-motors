<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/Database.php';

/**
 * Simple CLI helper to create a Jimenez Motors application user.
 */
function print_usage(): void
{
    fwrite(STDERR, "Usage: php scripts/create_user.php --username=NAME --password=SECRET --member=DISPLAY_NAME [--role=user|admin] [--rank=RANK] [--phone=PHONE]\n");
}

function parse_arguments(array $argv): array
{
    $arguments = [];

    foreach (array_slice($argv, 1) as $argument) {
        if (strpos($argument, '--') !== 0) {
            continue;
        }

        $argument = substr($argument, 2);
        if ($argument === '') {
            continue;
        }

        [$key, $value] = array_pad(explode('=', $argument, 2), 2, null);
        if ($value === null) {
            $value = '';
        }

        $arguments[$key] = $value;
    }

    return $arguments;
}

$args = parse_arguments($argv);

$username = isset($args['username']) ? trim($args['username']) : '';
$password = $args['password'] ?? '';
$memberName = isset($args['member']) ? trim($args['member']) : '';
$role = $args['role'] ?? 'user';
$rank = isset($args['rank']) ? trim($args['rank']) : 'Member';
$phone = isset($args['phone']) ? trim($args['phone']) : null;

if ($username === '' || $password === '' || $memberName === '') {
    print_usage();
    exit(1);
}

if (!in_array($role, ['user', 'admin'], true)) {
    fwrite(STDERR, "Role must be either 'user' or 'admin'\n");
    exit(1);
}

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();

    $userCheck = $pdo->prepare('SELECT COUNT(*) AS total FROM app_users WHERE username = :username');
    $userCheck->execute([':username' => $username]);
    $existingUsers = (int) $userCheck->fetchColumn();

    if ($existingUsers > 0) {
        fwrite(STDERR, "A user with this username already exists.\n");
        $pdo->rollBack();
        exit(1);
    }

    $memberStatement = $pdo->prepare('SELECT id, rank, phone FROM members WHERE name = :name LIMIT 1');
    $memberStatement->execute([':name' => $memberName]);
    $member = $memberStatement->fetch();

    if ($member === false) {
        $memberInsert = $pdo->prepare('INSERT INTO members (name, rank, phone, created_by) VALUES (:name, :rank, :phone, :created_by)');
        $memberInsert->execute([
            ':name' => $memberName,
            ':rank' => $rank,
            ':phone' => $phone !== '' ? $phone : null,
            ':created_by' => 'CLI script',
        ]);
    } else {
        $updateFields = [];
        $updateParams = [':name' => $memberName];

        if ($rank !== '' && $member['rank'] !== $rank) {
            $updateFields[] = 'rank = :rank';
            $updateParams[':rank'] = $rank;
        }

        if ($phone !== null && $phone !== $member['phone']) {
            $updateFields[] = 'phone = :phone';
            $updateParams[':phone'] = $phone !== '' ? $phone : null;
        }

        if (!empty($updateFields)) {
            $memberUpdate = $pdo->prepare('UPDATE members SET ' . implode(', ', $updateFields) . ' WHERE name = :name');
            $memberUpdate->execute($updateParams);
        }
    }

    $passwordHash = base64_encode($password);

    $userInsert = $pdo->prepare('INSERT INTO app_users (username, password_hash, member_name, role, rank) VALUES (:username, :password_hash, :member_name, :role, :rank)');
    $userInsert->execute([
        ':username' => $username,
        ':password_hash' => $passwordHash,
        ':member_name' => $memberName,
        ':role' => $role,
        ':rank' => $rank,
    ]);

    $pdo->commit();

    fwrite(STDOUT, "✅ User '{$username}' has been created successfully.\n");
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fwrite(STDERR, 'Error creating user: ' . $exception->getMessage() . "\n");
    exit(1);
}
