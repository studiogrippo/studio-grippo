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