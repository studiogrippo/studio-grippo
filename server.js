const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const app = express();

app.use(express.static('.'));
app.use(express.json());

// *** MIDDLEWARE DI AUTENTICAZIONE ***
function validateAuth(req, res, next) {
    const token = req.body.authToken || req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Token mancante' });
    }
    
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [username, timestamp] = decoded.split(':');
        const validCredentials = { 'studio': 'Grippo2025!', 'unisa': 'progetti2025' };
        
        if (!validCredentials[username]) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }
        
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 4 * 60 * 60 * 1000) { // 4 ore
            return res.status(401).json({ error: 'Token scaduto' });
        }
        
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token non valido' });
    }
}

// Chat API (senza autenticazione)
app.post('/api/chat', async (req, res) => {
    try {
        const { messaggio } = req.body;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Sei l'assistente AI dello Studio Legale Grippo a Salerno..."
                    },
                    {
                        role: "user", 
                        content: messaggio
                    }
                ],
                max_tokens: 500
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Errore API Chat:', error);
        res.status(500).json({ error: 'Errore interno server' });
    }
});

// GESTIONE FILE PROGETTI
const uploadsDir = path.join(__dirname, 'uploads/progetti');

// Crea struttura cartelle se non esiste
const projectTypes = ['BAC_PNRR', 'PRIN', 'HORIZON', 'ERASMUS', 'ALTRO'];
projectTypes.forEach(type => {
    const typeDir = path.join(uploadsDir, type);
    if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
    }
});

// API per lettura file (con autenticazione)
app.get('/api/files', validateAuth, (req, res) => {
    try {
        if (!fs.existsSync(uploadsDir)) {
            return res.json({ 
                projects: [], 
                stats: { total_projects: 0, total_files: 0, total_size: 0 } 
            });
        }

        const projects = [];
        let totalFiles = 0;
        let totalSize = 0;

        const typefolders = fs.readdirSync(uploadsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        typefolders.forEach(typeFolder => {
            const typePath = path.join(uploadsDir, typeFolder);
            
            if (!fs.existsSync(typePath)) return;
            
            const projectFolders = fs.readdirSync(typePath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            projectFolders.forEach(projectFolder => {
                const projectPath = path.join(typePath, projectFolder);
                const stats = fs.statSync(projectPath);
                
                const files = fs.readdirSync(projectPath, { withFileTypes: true })
                    .filter(dirent => dirent.isFile() && dirent.name !== 'metadata.json') // Filtra metadata.json
                    .map(dirent => {
                        const filePath = path.join(projectPath, dirent.name);
                        const fileStats = fs.statSync(filePath);
                        totalFiles++;
                        totalSize += fileStats.size;
                        
                        return {
                            name: dirent.name,
                            size: fileStats.size,
                            modified: fileStats.mtime,
                            downloadUrl: `/uploads/progetti/${typeFolder}/${projectFolder}/${dirent.name}`
                        };
                    });

                // Leggi metadata se esiste
                let metadata = null;
                const metadataPath = path.join(projectPath, 'metadata.json');
                if (fs.existsSync(metadataPath)) {
                    try {
                        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    } catch (e) {
                        console.log('Errore lettura metadata:', e);
                    }
                }

                // Aggiungi progetto solo se ha file (escluso metadata)
                if (files.length > 0) {
                    projects.push({
                        type: typeFolder,
                        name: projectFolder,
                        path: `${typeFolder}/${projectFolder}`,
                        date: stats.mtime,
                        files: files,
                        metadata: metadata
                    });
                }
            });
        });

        // Ordina progetti per data (più recenti prima)
        projects.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            projects: projects,
            stats: {
                total_projects: projects.length,
                total_files: totalFiles,
                total_size: totalSize
            }
        });

    } catch (error) {
        console.error('Errore lettura file:', error);
        res.status(500).json({ error: 'Errore lettura file' });
    }
});

// Configura multer per upload
const upload = multer({ dest: 'uploads/temp/' });

// API per upload documenti (con autenticazione)
app.post('/api/upload', validateAuth, upload.array('files'), (req, res) => {
    try {
        const { projectType, projectName, senderName, senderEmail, notes } = req.body;
        const files = req.files;

        // Validazione dati
        if (!projectType || !projectName || !senderName || !files || files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dati mancanti o file non caricati' 
            });
        }

        // Genera timestamp e nomi sicuri
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');
        const safeSender = senderName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');
        const folderName = `${timestamp}_${safeProjectName}_${safeSender}`;
        const targetDir = path.join(__dirname, 'uploads/progetti', projectType, folderName);

        // Crea directory progetto
        fs.mkdirSync(targetDir, { recursive: true });

        // Sposta i file dalla temp alla destinazione finale
        const savedFiles = [];
        for (const file of files) {
            const ext = path.extname(file.originalname);
            const destName = `${timestamp}_${file.originalname}`;
            const destPath = path.join(targetDir, destName);
            
            fs.renameSync(file.path, destPath);
            savedFiles.push(destName);
        }

        // Crea file metadata.json
        const metadata = {
            uploaded_at: timestamp,
            project_info: {
                type: projectType,
                name: projectName,
                sender_name: senderName,
                sender_email: senderEmail || null,
                notes: notes || null
            },
            files: savedFiles
        };

        fs.writeFileSync(
            path.join(targetDir, 'metadata.json'), 
            JSON.stringify(metadata, null, 2)
        );

        // Log upload (opzionale)
        const logEntry = `${timestamp} | ${projectType} | ${projectName} | ${senderName} | ${savedFiles.length} file\n`;
        const logPath = path.join(__dirname, 'uploads/progetti/upload_log.txt');
        
        try {
            fs.appendFileSync(logPath, logEntry);
        } catch (logError) {
            console.log('Errore scrittura log:', logError);
        }

        res.json({ success: true, message: 'Upload completato con successo' });

    } catch (err) {
        console.error('Errore durante upload:', err);
        
        // Pulizia file temporanei in caso di errore
        if (req.files) {
            req.files.forEach(file => {
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (cleanupError) {
                    console.log('Errore pulizia file temp:', cleanupError);
                }
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Errore interno server durante upload' 
        });
    }
});

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});