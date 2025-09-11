<?php
/**
 * Upload Handler per Area Progetti - Studio Legale Grippo
 * Gestisce il caricamento sicuro dei documenti di progetto
 */

// Configurazione
$config = [
    'upload_dir' => __DIR__ . '/uploads/progetti/',
    'max_file_size' => 50 * 1024 * 1024, // 50MB
    'allowed_extensions' => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar'],
    'allowed_mime_types' => [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/x-rar-compressed'
    ],
    'notification_email' => 'info@studiolegalegrippo.it' // Email dello studio
];

// Headers di sicurezza
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Verifica metodo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

try {
    // Sanitizzazione e validazione dati form
    $project_type = filter_input(INPUT_POST, 'projectType', FILTER_SANITIZE_STRING);
    $project_name = filter_input(INPUT_POST, 'projectName', FILTER_SANITIZE_STRING);
    $sender_name = filter_input(INPUT_POST, 'senderName', FILTER_SANITIZE_STRING);
    $sender_email = filter_input(INPUT_POST, 'senderEmail', FILTER_VALIDATE_EMAIL);
    $notes = filter_input(INPUT_POST, 'notes', FILTER_SANITIZE_STRING);
    
    // Validazione campi obbligatori
    if (empty($project_type) || empty($project_name) || empty($sender_name)) {
        throw new Exception('Campi obbligatori mancanti');
    }
    
    // Verifica presenza file
    if (empty($_FILES['files']['name'][0])) {
        throw new Exception('Nessun file caricato');
    }
    
    // Creazione directory progetto
    $timestamp = date('Y-m-d_H-i-s');
    $safe_project_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $project_name);
    $safe_sender_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $sender_name);
    
    $project_dir = $config['upload_dir'] . $project_type . '/' . $timestamp . '_' . $safe_project_name . '_' . $safe_sender_name . '/';
    
    if (!is_dir($config['upload_dir'])) {
        mkdir($config['upload_dir'], 0755, true);
    }
    
    if (!mkdir($project_dir, 0755, true)) {
        throw new Exception('Impossibile creare la directory di destinazione');
    }
    
    // Array per tracciare i file caricati
    $uploaded_files = [];
    $upload_errors = [];
    
    // Elaborazione file
    $files = $_FILES['files'];
    $file_count = count($files['name']);
    
    for ($i = 0; $i < $file_count; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $file_name = $files['name'][$i];
            $file_tmp = $files['tmp_name'][$i];
            $file_size = $files['size'][$i];
            $file_type = $files['type'][$i];
            
            // Validazione file
            $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
            
            if (!in_array($file_ext, $config['allowed_extensions'])) {
                $upload_errors[] = "Estensione non consentita per: $file_name";
                continue;
            }
            
            if ($file_size > $config['max_file_size']) {
                $upload_errors[] = "File troppo grande: $file_name";
                continue;
            }
            
            // Verifica MIME type
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $detected_type = finfo_file($finfo, $file_tmp);
            finfo_close($finfo);
            
            if (!in_array($detected_type, $config['allowed_mime_types'])) {
                $upload_errors[] = "Tipo di file non consentito: $file_name";
                continue;
            }
            
            // Nome file sicuro
            $safe_filename = $timestamp . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file_name);
            $destination = $project_dir . $safe_filename;
            
            // Spostamento file
            if (move_uploaded_file($file_tmp, $destination)) {
                $uploaded_files[] = [
                    'original_name' => $file_name,
                    'saved_name' => $safe_filename,
                    'size' => $file_size,
                    'type' => $detected_type
                ];
            } else {
                $upload_errors[] = "Errore nel caricamento di: $file_name";
            }
        } else {
            $upload_errors[] = "Errore PHP per: " . $files['name'][$i];
        }
    }
    
    // Creazione file di metadata
    $metadata = [
        'timestamp' => $timestamp,
        'project_info' => [
            'type' => $project_type,
            'name' => $project_name,
            'sender_name' => $sender_name,
            'sender_email' => $sender_email,
            'notes' => $notes
        ],
        'files' => $uploaded_files,
        'errors' => $upload_errors,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    file_put_contents($project_dir . 'metadata.json', json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    // Log generale
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'project_type' => $project_type,
        'project_name' => $project_name,
        'sender_name' => $sender_name,
        'files_count' => count($uploaded_files),
        'directory' => $project_dir
    ];
    
    $log_file = $config['upload_dir'] . 'upload_log.txt';
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
    
    // Invio email di notifica (opzionale)
    if (!empty($config['notification_email'])) {
        $subject = "Nuovo caricamento documenti - " . $project_name;
        $message = "È stato ricevuto un nuovo caricamento di documenti:\n\n";
        $message .= "Tipo progetto: $project_type\n";
        $message .= "Nome progetto: $project_name\n";
        $message .= "Mittente: $sender_name\n";
        $message .= "Email: " . ($sender_email ?: 'Non fornita') . "\n";
        $message .= "File caricati: " . count($uploaded_files) . "\n";
        $message .= "Directory: $project_dir\n\n";
        
        if (!empty($notes)) {
            $message .= "Note:\n$notes\n\n";
        }
        
        if (!empty($upload_errors)) {
            $message .= "Errori:\n" . implode("\n", $upload_errors) . "\n\n";
        }
        
        $headers = "From: noreply@studiolegalegrippo.it\r\n";
        $headers .= "Reply-To: info@studiolegalegrippo.it\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        mail($config['notification_email'], $subject, $message, $headers);
    }
    
    // Risposta di successo
    echo json_encode([
        'success' => true,
        'message' => 'Documenti caricati con successo',
        'files_uploaded' => count($uploaded_files),
        'project_id' => basename($project_dir),
        'errors' => $upload_errors
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    
    // Log errore
    $error_log = $config['upload_dir'] . 'error_log.txt';
    $error_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'error' => $e->getMessage(),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'post_data' => $_POST
    ];
    file_put_contents($error_log, json_encode($error_entry) . "\n", FILE_APPEND | LOCK_EX);
}
?>