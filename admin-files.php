<?php
/**
 * Admin File Viewer - Studio Legale Grippo
 * Visualizza tutti i file caricati tramite Area Progetti
 */

// Password semplice per proteggere l'accesso
$admin_password = "grippo2025"; // Cambia questa password

session_start();

// Verifica autenticazione
if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
    if (isset($_POST['password']) && $_POST['password'] === $admin_password) {
        $_SESSION['admin_logged'] = true;
    } else {
        // Form di login
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin - Studio Legale Grippo</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 50px; }
                .login-box { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
                input[type="password"] { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
                input[type="submit"] { background: #0a1628; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>Accesso Admin - File Progetti</h2>
                <form method="post">
                    <input type="password" name="password" placeholder="Password Admin" required>
                    <input type="submit" value="Accedi">
                </form>
            </div>
        </body>
        </html>
        <?php
        exit;
    }
}

// Configurazione
$upload_dir = __DIR__ . '/uploads/progetti/';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Admin File - Studio Legale Grippo</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
        }
        .header {
            background: #0a1628;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            flex: 1;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #d4af37;
        }
        .project-folder {
            background: white;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .project-header {
            background: #e9ecef;
            padding: 15px 20px;
            border-bottom: 1px solid #dee2e6;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .project-header:hover {
            background: #d4af37;
            color: white;
        }
        .project-content {
            padding: 20px;
            display: none;
        }
        .project-content.active {
            display: block;
        }
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        .file-info {
            flex: 1;
        }
        .file-name {
            font-weight: 600;
            color: #0a1628;
        }
        .file-size {
            font-size: 0.9rem;
            color: #666;
        }
        .file-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 5px 15px;
            border: none;
            border-radius: 4px;
            text-decoration: none;
            font-size: 0.9rem;
            cursor: pointer;
        }
        .btn-download {
            background: #00a651;
            color: white;
        }
        .btn-view {
            background: #0066ff;
            color: white;
        }
        .metadata {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
        }
        .metadata h4 {
            margin-top: 0;
            color: #0a1628;
        }
        .logout {
            float: right;
            background: #dc3545;
            color: white;
            padding: 8px 15px;
            text-decoration: none;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            🗂️ Gestione File Progetti - Studio Legale Grippo
            <a href="?logout=1" class="logout">Logout</a>
        </h1>
    </div>

    <?php
    // Logout
    if (isset($_GET['logout'])) {
        session_destroy();
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }

    // Funzioni helper
    function formatFileSize($bytes) {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }

    function scanProjectsDirectory($dir) {
        $projects = [];
        if (!is_dir($dir)) {
            return $projects;
        }
        
        foreach (scandir($dir) as $type_folder) {
            if ($type_folder === '.' || $type_folder === '..') continue;
            
            $type_path = $dir . $type_folder;
            if (is_dir($type_path)) {
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
        }
        
        // Ordina per data (più recenti prima)
        usort($projects, function($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });
        
        return $projects;
    }

    // Carica progetti
    $projects = scanProjectsDirectory($upload_dir);
    $total_projects = count($projects);
    $total_files = 0;
    $total_size = 0;

    // Calcola statistiche
    foreach ($projects as $project) {
        if (is_dir($project['path'])) {
            foreach (scandir($project['path']) as $file) {
                if ($file !== '.' && $file !== '..' && is_file($project['path'] . '/' . $file)) {
                    $total_files++;
                    $total_size += filesize($project['path'] . '/' . $file);
                }
            }
        }
    }
    ?>

    <!-- Statistiche -->
    <div class="stats">
        <div class="stat-card">
            <div class="stat-number"><?php echo $total_projects; ?></div>
            <div>Progetti Totali</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo $total_files; ?></div>
            <div>File Caricati</div>
        </div>
        <div class="stat-card">
            <div class="stat-number"><?php echo formatFileSize($total_size); ?></div>
            <div>Spazio Utilizzato</div>
        </div>
    </div>

    <!-- Lista Progetti -->
    <?php if (empty($projects)): ?>
        <div class="project-folder">
            <div class="project-header">
                <h3>📂 Nessun progetto caricato</h3>
            </div>
            <div class="project-content active">
                <p>Non sono ancora stati caricati documenti tramite l'Area Progetti.</p>
                <p><a href="area-progetti.html">Vai all'Area Progetti</a></p>
            </div>
        </div>
    <?php else: ?>
        <?php foreach ($projects as $index => $project): ?>
            <div class="project-folder">
                <div class="project-header" onclick="toggleProject(<?php echo $index; ?>)">
                    <div>
                        <h3>📂 <?php echo htmlspecialchars($project['name']); ?></h3>
                        <small>Tipo: <?php echo htmlspecialchars($project['type']); ?> | Data: <?php echo $project['date']; ?></small>
                    </div>
                    <span id="toggle-<?php echo $index; ?>">▼</span>
                </div>
                
                <div class="project-content" id="content-<?php echo $index; ?>">
                    <?php
                    // Carica metadata se esiste
                    $metadata_file = $project['path'] . '/metadata.json';
                    $metadata = null;
                    if (file_exists($metadata_file)) {
                        $metadata = json_decode(file_get_contents($metadata_file), true);
                    }
                    ?>
                    
                    <?php if ($metadata): ?>
                        <div class="metadata">
                            <h4>Informazioni Progetto</h4>
                            <p><strong>Mittente:</strong> <?php echo htmlspecialchars($metadata['project_info']['sender_name']); ?></p>
                            <p><strong>Email:</strong> <?php echo htmlspecialchars($metadata['project_info']['sender_email'] ?: 'Non fornita'); ?></p>
                            <p><strong>Nome Progetto:</strong> <?php echo htmlspecialchars($metadata['project_info']['name']); ?></p>
                            <?php if (!empty($metadata['project_info']['notes'])): ?>
                                <p><strong>Note:</strong> <?php echo nl2br(htmlspecialchars($metadata['project_info']['notes'])); ?></p>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                    
                    <h4>File Caricati</h4>
                    <?php
                    $files = array_diff(scandir($project['path']), ['.', '..']);
                    foreach ($files as $file):
                        if (is_file($project['path'] . '/' . $file)):
                            $file_path = $project['path'] . '/' . $file;
                            $file_size = filesize($file_path);
                            $file_url = str_replace(__DIR__, '', $file_path);
                    ?>
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-name"><?php echo htmlspecialchars($file); ?></div>
                                <div class="file-size"><?php echo formatFileSize($file_size); ?></div>
                            </div>
                            <div class="file-actions">
                                <a href="<?php echo $file_url; ?>" class="btn btn-download" download>Download</a>
                                <?php if (in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['pdf', 'jpg', 'jpeg', 'png'])): ?>
                                    <a href="<?php echo $file_url; ?>" class="btn btn-view" target="_blank">Visualizza</a>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php 
                        endif;
                    endforeach; 
                    ?>
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