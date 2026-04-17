const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// --- .env loader (no external dep) ---
(function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
        if (!line || line.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (key && !(key in process.env)) process.env[key] = val;
    });
})();

// --- Config ---
const PORT = process.env.PORT || 3000;
const HMAC_SECRET = process.env.HMAC_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minuti

if (!HMAC_SECRET || HMAC_SECRET.length < 32) {
    console.error('FATAL: HMAC_SECRET mancante o troppo corto nel file .env');
    process.exit(1);
}

const CREDENTIALS = {
    studio: process.env.STUDIO_PASSWORD,
    unisa: process.env.UNISA_PASSWORD
};

const app = express();

// --- Security headers (helmet-lite) ---
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

app.use(express.json({ limit: '1mb' }));

// --- Rate limiter (in-memory) ---
function createRateLimiter({ windowMs, max, message }) {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [key, arr] of hits) {
            const recent = arr.filter(t => now - t < windowMs);
            if (recent.length === 0) hits.delete(key);
            else hits.set(key, recent);
        }
    }, windowMs).unref();

    return (req, res, next) => {
        const key = (req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown').split(',')[0].trim();
        const now = Date.now();
        const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
        if (arr.length >= max) {
            return res.status(429).json({ error: message || 'Troppe richieste, riprova più tardi' });
        }
        arr.push(now);
        hits.set(key, arr);
        next();
    };
}

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Troppi tentativi di login, attendi 15 minuti' });
const chatLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 8 });
const uploadLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });

// --- Auth helpers (HMAC signed tokens) ---
function signToken(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('base64url');
    return `${body}.${sig}`;
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (!payload.exp || Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

function extractToken(req) {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    return req.body?.authToken || req.query.token || null;
}

function requireAuth(req, res, next) {
    const payload = verifyToken(extractToken(req));
    if (!payload) return res.status(401).json({ error: 'Token non valido o scaduto' });
    req.user = { username: payload.sub };
    next();
}

function requireStudio(req, res, next) {
    if (req.user?.username !== 'studio') return res.status(403).json({ error: 'Accesso riservato' });
    next();
}

// --- Login ---
app.post('/api/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Richiesta non valida' });
    }
    const expected = CREDENTIALS[username];
    if (!expected) {
        crypto.timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
        return res.status(401).json({ error: 'Credenziali non valide' });
    }
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Credenziali non valide' });
    }
    const token = signToken({ sub: username, exp: Date.now() + TOKEN_TTL_MS });
    res.json({ token, expiresIn: TOKEN_TTL_MS });
});

// --- Chat (rate-limited, API key server-side) ---
app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
        const { messaggio } = req.body || {};
        if (typeof messaggio !== 'string' || messaggio.length === 0 || messaggio.length > 2000) {
            return res.status(400).json({ error: 'Messaggio non valido' });
        }
        if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith('sk-REPLACE')) {
            return res.status(503).json({ error: 'Servizio chat non configurato' });
        }
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENAI_API_KEY
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: "Sei l'assistente AI dello Studio Legale Grippo a Salerno. Fornisci risposte legali preliminari, chiare e professionali. Non fornire pareri definitivi." },
                    { role: 'user', content: messaggio }
                ],
                max_tokens: 500
            })
        });
        if (!response.ok) {
            return res.status(502).json({ error: 'Errore servizio AI' });
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('[chat]', err.message);
        res.status(500).json({ error: 'Errore interno' });
    }
});

// --- File progetti setup ---
const uploadsDir = path.join(__dirname, 'uploads', 'progetti');
const projectTypes = ['BAC_PNRR', 'PRIN', 'HORIZON', 'ERASMUS', 'ALTRO'];
projectTypes.forEach(t => {
    const p = path.join(uploadsDir, t);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// --- Lettura file (solo admin studio) ---
app.get('/api/files', requireAuth, requireStudio, (req, res) => {
    try {
        if (!fs.existsSync(uploadsDir)) {
            return res.json({ projects: [], stats: { total_projects: 0, total_files: 0, total_size: 0 } });
        }
        const projects = [];
        let totalFiles = 0;
        let totalSize = 0;

        for (const typeFolder of fs.readdirSync(uploadsDir)) {
            const typePath = path.join(uploadsDir, typeFolder);
            if (!fs.statSync(typePath).isDirectory()) continue;

            for (const projectFolder of fs.readdirSync(typePath)) {
                const projectPath = path.join(typePath, projectFolder);
                if (!fs.statSync(projectPath).isDirectory()) continue;

                const files = fs.readdirSync(projectPath)
                    .filter(n => n !== 'metadata.json' && fs.statSync(path.join(projectPath, n)).isFile())
                    .map(name => {
                        const st = fs.statSync(path.join(projectPath, name));
                        totalFiles++;
                        totalSize += st.size;
                        return {
                            name,
                            size: st.size,
                            modified: st.mtime,
                            downloadUrl: `/uploads/progetti/${encodeURIComponent(typeFolder)}/${encodeURIComponent(projectFolder)}/${encodeURIComponent(name)}`
                        };
                    });

                let metadata = null;
                const mPath = path.join(projectPath, 'metadata.json');
                if (fs.existsSync(mPath)) {
                    try { metadata = JSON.parse(fs.readFileSync(mPath, 'utf8')); } catch { /* ignore */ }
                }

                if (files.length > 0) {
                    projects.push({
                        type: typeFolder,
                        name: projectFolder,
                        date: fs.statSync(projectPath).mtime,
                        files,
                        metadata
                    });
                }
            }
        }

        projects.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ projects, stats: { total_projects: projects.length, total_files: totalFiles, total_size: totalSize } });
    } catch (err) {
        console.error('[files]', err.message);
        res.status(500).json({ error: 'Errore lettura file' });
    }
});

// --- Upload ---
const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const upload = multer({
    dest: path.join(__dirname, 'uploads', 'temp'),
    limits: { fileSize: 50 * 1024 * 1024, files: 20, fields: 10 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) return cb(new Error('Estensione non consentita'));
        if (/\.(php|phtml|phar|js|sh|exe|html)\./i.test(file.originalname)) return cb(new Error('Double extension non consentita'));
        cb(null, true);
    }
});

function sanitizeSegment(s) {
    return String(s).replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 80);
}

app.post('/api/upload', uploadLimiter, requireAuth, upload.array('files', 20), (req, res) => {
    try {
        const { projectType, projectName, senderName, senderEmail, notes } = req.body;
        const files = req.files;

        if (!projectType || !projectName || !senderName || !files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'Dati mancanti' });
        }
        if (!projectTypes.includes(projectType)) {
            return res.status(400).json({ success: false, error: 'Tipo progetto non valido' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const folderName = `${timestamp}_${sanitizeSegment(projectName)}_${sanitizeSegment(senderName)}`;
        const targetDir = path.join(uploadsDir, projectType, folderName);

        // Guard path traversal
        const resolved = path.resolve(targetDir);
        if (!resolved.startsWith(path.resolve(uploadsDir) + path.sep)) {
            return res.status(400).json({ success: false, error: 'Path non valido' });
        }

        fs.mkdirSync(targetDir, { recursive: true });

        const savedFiles = [];
        for (const file of files) {
            const safeOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const destName = `${timestamp}_${safeOriginal}`;
            fs.renameSync(file.path, path.join(targetDir, destName));
            savedFiles.push(destName);
        }

        const metadata = {
            uploaded_at: timestamp,
            uploaded_by: req.user.username,
            project_info: {
                type: projectType,
                name: projectName,
                sender_name: senderName,
                sender_email: typeof senderEmail === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail) ? senderEmail : null,
                notes: typeof notes === 'string' ? notes.slice(0, 2000) : null
            },
            files: savedFiles
        };
        fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

        res.json({ success: true, message: 'Upload completato', files_uploaded: savedFiles.length });
    } catch (err) {
        console.error('[upload]', err.message);
        if (req.files) {
            req.files.forEach(f => { try { fs.existsSync(f.path) && fs.unlinkSync(f.path); } catch {} });
        }
        res.status(500).json({ success: false, error: 'Errore interno' });
    }
});

// --- Download file protetti ---
app.use('/uploads', requireAuth, requireStudio, (req, res, next) => {
    // Path traversal guard
    const requested = path.resolve(path.join(__dirname, 'uploads', decodeURIComponent(req.path)));
    const base = path.resolve(path.join(__dirname, 'uploads'));
    if (!requested.startsWith(base + path.sep) && requested !== base) {
        return res.status(400).json({ error: 'Path non valido' });
    }
    next();
}, express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res, filePath) => {
        // Forza download invece di esecuzione inline
        res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(filePath) + '"');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// --- Static (pagine pubbliche) ---
// IMPORTANTE: mettere DOPO le route protette, e negare file sensibili
app.use((req, res, next) => {
    const blocked = /^\/(\.env|\.gitignore|server\.js|package(-lock)?\.json|\.htaccess|Backup\/|Test\/|node_modules\/|upload_php\.php$|admin-files\.php$)/i;
    if (blocked.test(req.path)) {
        return res.status(404).send('Not found');
    }
    next();
});
app.use(express.static(__dirname, { dotfiles: 'deny', index: 'index.html' }));

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Endpoint non trovato' }));

// --- Error handler ---
app.use((err, req, res, next) => {
    console.error('[error]', err.message);
    res.status(err.status || 500).json({ error: 'Errore interno' });
});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});
