<?php
/**
 * Upload Handler per Area Progetti - Studio Legale Grippo
 * Richiede token HMAC firmato (compatibile con server.js) O UPLOAD_API_KEY.
 */

// ============ Carica .env ============
$env = [];
foreach ([__DIR__ . '/../.env', __DIR__ . '/.env'] as $envPath) {
    if (is_file($envPath) && is_readable($envPath)) {
        $env = parse_ini_file($envPath, false, INI_SCANNER_RAW) ?: [];
        break;
    }
}
$HMAC_SECRET    = $env['HMAC_SECRET']    ?? getenv('HMAC_SECRET')    ?: '';
$UPLOAD_API_KEY = $env['UPLOAD_API_KEY'] ?? getenv('UPLOAD_API_KEY') ?: '';
$NOTIFICATION_EMAIL = $env['NOTIFICATION_EMAIL'] ?? 'info@studiolegalegrippo.it';

// ============ Header sicurezza ============
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// ============ Configurazione ============
$config = [
    'upload_dir' => __DIR__ . '/uploads/progetti/',
    'max_file_size' => 50 * 1024 * 1024,
    'max_files_per_request' => 20,
    'allowed_extensions' => ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    'allowed_mime_types' => [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    'allowed_project_types' => ['BAC_PNRR', 'PRIN', 'HORIZON', 'ERASMUS', 'ALTRO']
];

// ============ Helpers ============
function json_err($code, $msg) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

function base64url_decode($d) {
    $pad = strlen($d) % 4;
    if ($pad) $d .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($d, '-_', '+/'));
}

function verify_hmac_token($token, $secret) {
    if (!$token || !$secret) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 2) return null;
    [$body, $sig] = $parts;
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $body, $secret, true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode((string)base64url_decode($body), true);
    if (!is_array($payload) || empty($payload['exp']) || (int)$payload['exp'] < (int)(microtime(true) * 1000)) return null;
    return $payload;
}

// ============ Autenticazione ============
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_err(405, 'Metodo non consentito');
}

$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$authorized = false;

if (strpos($auth_header, 'Bearer ') === 0) {
    $token = substr($auth_header, 7);
    // Opzione 1: API key server-to-server
    if ($UPLOAD_API_KEY !== '' && hash_equals($UPLOAD_API_KEY, $token)) {
        $authorized = true;
    }
    // Opzione 2: token HMAC utente (da /api/login)
    if (!$authorized && verify_hmac_token($token, $HMAC_SECRET)) {
        $authorized = true;
    }
}

if (!$authorized) {
    json_err(401, 'Non autenticato');
}

// ============ Rate limiting (session-based, 10/min) ============
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
}
if (!isset($_SESSION['upl_hits'])) $_SESSION['upl_hits'] = [];
$_SESSION['upl_hits'] = array_filter($_SESSION['upl_hits'], fn($t) => (time() - $t) < 60);
if (count($_SESSION['upl_hits']) >= 10) {
    json_err(429, 'Troppe richieste. Riprova tra un minuto.');
}
$_SESSION['upl_hits'][] = time();

try {
    // ============ Input validation ============
    $project_type = (string)($_POST['projectType'] ?? '');
    $project_name = (string)($_POST['projectName'] ?? '');
    $sender_name  = (string)($_POST['senderName']  ?? '');
    $sender_email = filter_var($_POST['senderEmail'] ?? '', FILTER_VALIDATE_EMAIL) ?: null;
    $notes        = substr((string)($_POST['notes'] ?? ''), 0, 2000);

    if ($project_type === '' || $project_name === '' || $sender_name === '') {
        throw new Exception('Campi obbligatori mancanti');
    }
    if (!in_array($project_type, $config['allowed_project_types'], true)) {
        throw new Exception('Tipo progetto non valido');
    }
    if (empty($_FILES['files']['name'][0])) {
        throw new Exception('Nessun file caricato');
    }

    $file_count = count($_FILES['files']['name']);
    if ($file_count > $config['max_files_per_request']) {
        throw new Exception('Troppi file in una singola richiesta');
    }

    // ============ Path costruito in modo sicuro ============
    $timestamp = date('Y-m-d_H-i-s');
    $safe_project_name = substr(preg_replace('/[^a-zA-Z0-9_-]/', '_', $project_name), 0, 80);
    $safe_sender_name  = substr(preg_replace('/[^a-zA-Z0-9_-]/', '_', $sender_name),  0, 80);
    $project_dir = $config['upload_dir'] . $project_type . '/' . $timestamp . '_' . $safe_project_name . '_' . $safe_sender_name . '/';

    // Path traversal guard
    $base_real = realpath($config['upload_dir']);
    if (!$base_real) {
        mkdir($config['upload_dir'], 0755, true);
        $base_real = realpath($config['upload_dir']);
    }
    $target_parent = realpath(dirname($project_dir));
    if (!$target_parent) {
        mkdir(dirname($project_dir), 0755, true);
        $target_parent = realpath(dirname($project_dir));
    }
    if (!$target_parent || strpos($target_parent, $base_real) !== 0) {
        throw new Exception('Path non valido');
    }

    if (!is_dir($project_dir) && !mkdir($project_dir, 0755, true)) {
        throw new Exception('Impossibile creare la directory di destinazione');
    }

    // ============ Elaborazione file ============
    $uploaded_files = [];
    $upload_errors = [];
    $files = $_FILES['files'];

    for ($i = 0; $i < $file_count; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            $upload_errors[] = "Errore upload: " . basename($files['name'][$i]);
            continue;
        }
        $orig_name = basename($files['name'][$i]);  // Strip any path
        $file_tmp  = $files['tmp_name'][$i];
        $file_size = (int)$files['size'][$i];
        $file_ext  = strtolower(pathinfo($orig_name, PATHINFO_EXTENSION));

        // Controlli
        if (!in_array($file_ext, $config['allowed_extensions'], true)) {
            $upload_errors[] = "Estensione non consentita: $orig_name";
            continue;
        }
        // Double-extension check (es. file.php.pdf)
        if (preg_match('/\.(php|phtml|phar|js|sh|exe|html|htm|cgi|pl|py)\./i', $orig_name)) {
            $upload_errors[] = "Nome file non consentito: $orig_name";
            continue;
        }
        if ($file_size <= 0 || $file_size > $config['max_file_size']) {
            $upload_errors[] = "Dimensione non valida: $orig_name";
            continue;
        }
        if (!is_uploaded_file($file_tmp)) {
            $upload_errors[] = "Upload non valido: $orig_name";
            continue;
        }

        // MIME check
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detected_type = finfo_file($finfo, $file_tmp);
        finfo_close($finfo);

        if (!in_array($detected_type, $config['allowed_mime_types'], true)) {
            $upload_errors[] = "MIME type non consentito: $orig_name";
            continue;
        }

        // Nome sicuro
        $safe_name = $timestamp . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $orig_name);
        $destination = $project_dir . $safe_name;

        if (move_uploaded_file($file_tmp, $destination)) {
            chmod($destination, 0644);
            $uploaded_files[] = [
                'original_name' => $orig_name,
                'saved_name'    => $safe_name,
                'size'          => $file_size,
                'type'          => $detected_type
            ];
        } else {
            $upload_errors[] = "Salvataggio fallito: $orig_name";
        }
    }

    // ============ Metadata ============
    $metadata = [
        'timestamp'    => $timestamp,
        'project_info' => [
            'type'         => $project_type,
            'name'         => $project_name,
            'sender_name'  => $sender_name,
            'sender_email' => $sender_email,
            'notes'        => $notes
        ],
        'files'  => $uploaded_files,
        'errors' => $upload_errors
    ];
    file_put_contents($project_dir . 'metadata.json', json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // ============ Notifica email (minima — no path server) ============
    if (!empty($NOTIFICATION_EMAIL) && count($uploaded_files) > 0) {
        $subject = "Nuovo upload progetto: $project_name";
        $message = "Nuovo caricamento ricevuto.\n\n";
        $message .= "Tipo: $project_type\n";
        $message .= "Progetto: $project_name\n";
        $message .= "Mittente: $sender_name\n";
        $message .= "Email: " . ($sender_email ?: 'non fornita') . "\n";
        $message .= "File caricati: " . count($uploaded_files) . "\n\n";
        $message .= "Accedere all'area admin per visualizzare.";
        $headers  = "From: noreply@studiolegalegrippo.it\r\n";
        $headers .= "Reply-To: " . ($sender_email ?: 'noreply@studiolegalegrippo.it') . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        @mail($NOTIFICATION_EMAIL, $subject, $message, $headers);
    }

    echo json_encode([
        'success'        => true,
        'message'        => 'Documenti caricati con successo',
        'files_uploaded' => count($uploaded_files),
        'errors'         => $upload_errors
    ]);

} catch (Exception $e) {
    json_err(400, $e->getMessage());
}
