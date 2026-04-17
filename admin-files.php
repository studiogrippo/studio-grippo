<?php
/**
 * Admin File Viewer - Studio Legale Grippo
 */

// ============ Carica .env ============
$env = [];
foreach ([__DIR__ . '/../.env', __DIR__ . '/.env'] as $envPath) {
    if (is_file($envPath) && is_readable($envPath)) {
        $env = parse_ini_file($envPath, false, INI_SCANNER_RAW) ?: [];
        break;
    }
}
$admin_password = $env['ADMIN_PHP_PASSWORD'] ?? getenv('ADMIN_PHP_PASSWORD') ?: '';

if ($admin_password === '' || strlen($admin_password) < 12) {
    http_response_code(500);
    exit('Configurazione mancante: ADMIN_PHP_PASSWORD non impostata.');
}

// ============ Sessione sicura ============
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();

// ============ Header sicurezza ============
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// ============ Logout ============
if (isset($_GET['logout'])) {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    header('Location: admin-files.php');
    exit;
}

// ============ Session timeout (30 min) ============
$timeout = 30 * 60;
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $timeout) {
    $_SESSION = [];
    session_destroy();
    session_start();
}
$_SESSION['last_activity'] = time();

// ============ Rate limit login (5 tentativi / 15 min) ============
if (!isset($_SESSION['login_attempts'])) $_SESSION['login_attempts'] = [];
$_SESSION['login_attempts'] = array_filter(
    $_SESSION['login_attempts'],
    fn($t) => (time() - $t) < (15 * 60)
);

// ============ CSRF ============
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf = $_SESSION['csrf_token'];

// ============ Login handling ============
$login_error = '';
$is_logged = !empty($_SESSION['admin_logged']);

if (!$is_logged && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if (count($_SESSION['login_attempts']) >= 5) {
        $login_error = 'Troppi tentativi falliti. Riprova tra 15 minuti.';
    } elseif (!isset($_POST['csrf_token']) || !hash_equals($csrf, $_POST['csrf_token'])) {
        $login_error = 'Token di sicurezza non valido. Ricarica la pagina.';
    } elseif (hash_equals($admin_password, (string)$_POST['password'])) {
        session_regenerate_id(true);
        $_SESSION['admin_logged'] = true;
        $_SESSION['last_activity'] = time();
        $_SESSION['login_attempts'] = [];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        header('Location: admin-files.php');
        exit;
    } else {
        $_SESSION['login_attempts'][] = time();
        $remaining = max(0, 5 - count($_SESSION['login_attempts']));
        $login_error = 'Password errata. Tentativi rimasti: ' . $remaining;
        usleep(random_int(500000, 1500000)); // Anti-timing
    }
}

// ============ Login form ============
if (!$is_logged) {
    ?><!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex,nofollow">
        <title>Accesso Admin - Studio Legale Grippo</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 50px; margin: 0; }
            .login-box { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #0a1628; margin-top: 0; }
            input[type="password"] { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            input[type="submit"] { background: #0a1628; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
            .err { color: #c00; padding: 10px; background: #fee; border-radius: 4px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Accesso Admin</h2>
            <?php if ($login_error): ?>
                <div class="err"><?= htmlspecialchars($login_error, ENT_QUOTES, 'UTF-8') ?></div>
            <?php endif; ?>
            <form method="post" autocomplete="off">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">
                <input type="password" name="password" placeholder="Password Admin" required autofocus>
                <input type="submit" value="Accedi">
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// ============ Autenticato — Area admin ============
$upload_dir = __DIR__ . '/uploads/progetti/';

function formatFileSize($bytes) {
    if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576)    return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024)       return number_format($bytes / 1024, 2) . ' KB';
    return $bytes . ' bytes';
}

function scanProjectsDirectory($dir) {
    $projects = [];
    if (!is_dir($dir)) return $projects;

    foreach (scandir($dir) as $type_folder) {
        if ($type_folder === '.' || $type_folder === '..') continue;
        $type_path = $dir . $type_folder;
        if (!is_dir($type_path)) continue;

        foreach (scandir($type_path) as $project_folder) {
            if ($project_folder === '.' || $project_folder === '..') continue;
            $project_path = $type_path . '/' . $project_folder;
            if (is_dir($project_path)) {
                $projects[] = [
                    'type' => $type_folder,
                    'name' => $project_folder,
                    'path' => $project_path,
                    'date' => date('Y-m-d H:i:s', filemtime($project_path))
                ];
            }
        }
    }

    usort($projects, fn($a, $b) => strtotime($b['date']) - strtotime($a['date']));
    return $projects;
}

$projects = scanProjectsDirectory($upload_dir);
$total_projects = count($projects);
$total_files = 0;
$total_size = 0;
foreach ($projects as $project) {
    foreach (scandir($project['path']) as $file) {
        if ($file !== '.' && $file !== '..' && is_file($project['path'] . '/' . $file)) {
            $total_files++;
            $total_size += filesize($project['path'] . '/' . $file);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex,nofollow">
    <title>Admin File - Studio Legale Grippo</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .header { background: #0a1628; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .header h1 { margin: 0; display: flex; align-items: center; gap: 10px; }
        .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); flex: 1; min-width: 200px; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #d4af37; }
        .project-folder { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .project-header { background: #e9ecef; padding: 15px 20px; border-bottom: 1px solid #dee2e6; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .project-header:hover { background: #d4af37; color: white; }
        .project-content { padding: 20px; display: none; }
        .project-content.active { display: block; }
        .file-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .file-name { font-weight: 600; color: #0a1628; }
        .file-size { font-size: 0.9rem; color: #666; }
        .file-actions { display: flex; gap: 10px; }
        .btn { padding: 5px 15px; border: none; border-radius: 4px; text-decoration: none; font-size: 0.9rem; cursor: pointer; }
        .btn-download { background: #00a651; color: white; }
        .btn-view { background: #0066ff; color: white; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; }
        .metadata h4 { margin-top: 0; color: #0a1628; }
        .logout { background: #dc3545; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            <span>Gestione File Progetti - Studio Legale Grippo</span>
            <a href="?logout=1" class="logout">Logout</a>
        </h1>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number"><?= (int)$total_projects ?></div>
            <div>Progetti Totali</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?= (int)$total_files ?></div>
            <div>File Caricati</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?= htmlspecialchars(formatFileSize($total_size), ENT_QUOTES, 'UTF-8') ?></div>
            <div>Spazio Utilizzato</div>
        </div>
    </div>

    <?php if (empty($projects)): ?>
        <div class="project-folder">
            <div class="project-header"><h3>Nessun progetto caricato</h3></div>
            <div class="project-content active">
                <p>Non sono ancora stati caricati documenti tramite l'Area Progetti.</p>
            </div>
        </div>
    <?php else: ?>
        <?php foreach ($projects as $index => $project): ?>
            <div class="project-folder">
                <div class="project-header" onclick="toggleProject(<?= (int)$index ?>)">
                    <div>
                        <h3><?= htmlspecialchars($project['name'], ENT_QUOTES, 'UTF-8') ?></h3>
                        <small>Tipo: <?= htmlspecialchars($project['type'], ENT_QUOTES, 'UTF-8') ?> | Data: <?= htmlspecialchars($project['date'], ENT_QUOTES, 'UTF-8') ?></small>
                    </div>
                    <span id="toggle-<?= (int)$index ?>">▼</span>
                </div>

                <div class="project-content" id="content-<?= (int)$index ?>">
                    <?php
                    $metadata_file = $project['path'] . '/metadata.json';
                    $metadata = null;
                    if (file_exists($metadata_file)) {
                        $metadata = json_decode(file_get_contents($metadata_file), true);
                    }
                    ?>
                    <?php if ($metadata && isset($metadata['project_info'])): ?>
                        <div class="metadata">
                            <h4>Informazioni Progetto</h4>
                            <p><strong>Mittente:</strong> <?= htmlspecialchars($metadata['project_info']['sender_name'] ?? '', ENT_QUOTES, 'UTF-8') ?></p>
                            <p><strong>Email:</strong> <?= htmlspecialchars($metadata['project_info']['sender_email'] ?: 'Non fornita', ENT_QUOTES, 'UTF-8') ?></p>
                            <p><strong>Nome Progetto:</strong> <?= htmlspecialchars($metadata['project_info']['name'] ?? '', ENT_QUOTES, 'UTF-8') ?></p>
                            <?php if (!empty($metadata['project_info']['notes'])): ?>
                                <p><strong>Note:</strong> <?= nl2br(htmlspecialchars($metadata['project_info']['notes'], ENT_QUOTES, 'UTF-8')) ?></p>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>

                    <h4>File Caricati</h4>
                    <?php
                    $files = array_diff(scandir($project['path']), ['.', '..']);
                    foreach ($files as $file):
                        if (!is_file($project['path'] . '/' . $file)) continue;
                        if ($file === 'metadata.json') continue;
                        $file_path = $project['path'] . '/' . $file;
                        $file_size = filesize($file_path);
                        $rel = 'uploads/progetti/' . rawurlencode($project['type']) . '/' . rawurlencode($project['name']) . '/' . rawurlencode($file);
                        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    ?>
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-name"><?= htmlspecialchars($file, ENT_QUOTES, 'UTF-8') ?></div>
                                <div class="file-size"><?= htmlspecialchars(formatFileSize($file_size), ENT_QUOTES, 'UTF-8') ?></div>
                            </div>
                            <div class="file-actions">
                                <a href="<?= htmlspecialchars($rel, ENT_QUOTES, 'UTF-8') ?>" class="btn btn-download" download>Download</a>
                                <?php if (in_array($ext, ['pdf', 'jpg', 'jpeg', 'png'], true)): ?>
                                    <a href="<?= htmlspecialchars($rel, ENT_QUOTES, 'UTF-8') ?>" class="btn btn-view" target="_blank" rel="noopener">Visualizza</a>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>

    <script>
        function toggleProject(index) {
            const content = document.getElementById('content-' + index);
            const toggle = document.getElementById('toggle-' + index);
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                toggle.textContent = '▼';
            } else {
                content.classList.add('active');
                toggle.textContent = '▲';
            }
        }
    </script>
</body>
</html>
