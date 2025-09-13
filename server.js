const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const crypto = require('crypto');
const app = express();

// --- CONFIG GLOBALE ---
const AUTH_SECRET = process.env.AUTH_SECRET || 'CHANGE_ME_STRONG_SECRET';

// Percorso cartelle upload: /data/uploads su Render, ./uploads in locale
const uploadsDir = path.join(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'), 'progetti');

// Credenziali: da variabile ENV JSON, oppure fallback hardcoded per i test locali
global.validCredentials = { 'studio': 'Grippo2025!', 'unisa': 'progetti2025' };
if (process.env.ADMIN_USERS) {
    try {
        global.validCredentials = JSON.parse(process.env.ADMIN_USERS);
    } catch (err) {
        console.error("Errore parsing ADMIN_USERS:", err);
    }
}

app.use(express.static('.'));
app.use(express.json());
// Servire file statici (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));


// --- Login: verifica credenziali server-side ed emette token firmato ---
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        const validCredentials = global.validCredentials;

        if (!validCredentials[username] || validCredentials[username] !== password) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }
        const ts = Date.now().toString();
        const payload = `${username}:${ts}`;
        const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
        const token = Buffer.from(`${payload}:${signature}`).toString('base64');
        return res.json({ token, expiresIn: 4 * 60 * 60 }); // 4 ore
    } catch (e) {
        console.error('Errore login:', e);
        return res.status(500).json({ error: 'Errore interno server' });
    }
});

// *** MIDDLEWARE DI AUTENTICAZIONE ***
function validateAuth(req, res, next) {
    const hdr = req.headers['authorization'] || '';
    const token = (req.body.authToken || hdr).replace(/^Bearer\s+/i, '');

    if (!token) {
        return res.status(401).json({ error: 'Token mancante' });
    }

    try {
        const raw = Buffer.from(token, 'base64').toString();
        const parts = raw.split(':');
        const validCredentials = global.validCredentials;

        // Supporto retrocompatibile temporaneo (vecchio formato: username:timestamp)
        if (parts.length === 2) {
            const [username, timestamp] = parts;
            if (!validCredentials[username]) {
                return res.status(401).json({ error: 'Credenziali non valide' });
            }
            const age = Date.now() - parseInt(timestamp, 10);
            if (age > 4 * 60 * 60 * 1000) {
                return res.status(401).json({ error: 'Token scaduto' });
            }
            req.user = { username };
            return next();
        }

        // Nuovo formato firmato: username:timestamp:signature
        if (parts.length !== 3) {
            return res.status(401).json({ error: 'Token non valido' });
        }

        const [username, timestamp, signature] = parts;
        if (!validCredentials[username]) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const payload = `${username}:${timestamp}`;
        const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
        if (signature !== expected) {
            return res.status(401).json({ error: 'Token non valido' });
        }

        const age = Date.now() - parseInt(timestamp, 10);
        if (age > 4 * 60 * 60 * 1000) {
            return res.status(401).json({ error: 'Token scaduto' });
        }

        req.user = { username };
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

// --- GESTIONE FILE PROGETTI ---
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
    if (req.user?.username !== 'studio') {
        return res.status(403).json({ error: 'Accesso riservato allo Studio' });
    }
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
                    .filter(dirent => dirent.isFile() && dirent.name !== 'metadata.json')
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

                let metadata = null;
                const metadataPath = path.join(projectPath, 'metadata.json');
                if (fs.existsSync(metadataPath)) {
                    try {
                        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    } catch (e) {
                        console.log('Errore lettura metadata:', e);
                    }
                }

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

// Configura multer per upload (patch: usa temp coerente con uploadsDir)
const tempDir = path.join(uploadsDir, '..', 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}
const upload = multer({ dest: tempDir });

// API per upload documenti (con autenticazione)
app.post('/api/upload', validateAuth, upload.array('files'), (req, res) => {
    try {
        const { projectType, projectName, senderName, senderEmail, notes } = req.body;
        const files = req.files || (req.file ? [req.file] : []);

        if (!projectType || !projectName || !senderName || !files || files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dati mancanti o file non caricati' 
            });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');
        const safeSender = senderName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');
        const folderName = `${timestamp}_${safeProjectName}_${safeSender}`;
        const targetDir = path.join(uploadsDir, projectType, folderName);

        fs.mkdirSync(targetDir, { recursive: true });

        const savedFiles = [];
        for (const file of files) {
            const ext = path.extname(file.originalname);
            const destName = `${timestamp}_${file.originalname}`;
            const destPath = path.join(targetDir, destName);
            
            fs.renameSync(file.path, destPath);
            savedFiles.push(destName);
        }

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

        const logEntry = `${timestamp} | ${projectType} | ${projectName} | ${senderName} | ${savedFiles.length} file\n`;
        const logPath = path.join(uploadsDir, 'upload_log.txt');
        
        try {
            fs.appendFileSync(logPath, logEntry);
        } catch (logError) {
            console.log('Errore scrittura log:', logError);
        }

        res.json({ success: true, message: 'Upload completato con successo' });

    } catch (err) {
        console.error('Errore durante upload:', err);
        
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

// Middleware per servire file statici dall'uploads (patch: usa uploadsDir)
app.use('/uploads', validateAuth, express.static(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')));

// Gestione errori 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint non trovato' });
});

// Gestione errori globali
app.use((err, req, res, next) => {
    console.error('Errore server:', err);
    res.status(500).json({ error: 'Errore interno server' });
});

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
    console.log(`Area progetti: http://localhost:${PORT}/area-progetti.html`);
    console.log(`Gestione file: http://localhost:${PORT}/file-manager.html`);
});
