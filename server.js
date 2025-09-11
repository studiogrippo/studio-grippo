const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.static('.'));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
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
});
// NUOVE ROTTE PER GESTIONE FILE
const uploadsDir = path.join(__dirname, 'uploads/progetti');

app.get('/api/files', (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ projects: [], stats: { total_projects: 0, total_files: 0, total_size: 0 } });
    }

    const projects = [];
    let totalFiles = 0;
    let totalSize = 0;

    const typefolders = fs.readdirSync(uploadsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    typefolders.forEach(typeFolder => {
      const typePath = path.join(uploadsDir, typeFolder);
      const projectFolders = fs.readdirSync(typePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      projectFolders.forEach(projectFolder => {
        const projectPath = path.join(typePath, projectFolder);
        const stats = fs.statSync(projectPath);
        
        const files = fs.readdirSync(projectPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
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

        projects.push({
          type: typeFolder,
          name: projectFolder,
          path: `${typeFolder}/${projectFolder}`,
          date: stats.mtime,
          files: files,
          metadata: metadata
        });
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
// Upload documenti da Area Progetti
const multer = require('multer');

// Configura cartella temporanea per upload
const upload = multer({ dest: 'uploads/temp/' });

app.post('/api/upload', upload.array('files'), (req, res) => {
    try {
        const { projectType, projectName, senderName, senderEmail, notes } = req.body;
        const files = req.files;

        if (!projectType || !projectName || !senderName || files.length === 0) {
            return res.status(400).json({ success: false, error: 'Dati mancanti o file non caricati' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');
        const safeSender = senderName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');
        const folderName = `${timestamp}_${safeProjectName}_${safeSender}`;
        const targetDir = path.join(__dirname, 'uploads/progetti', projectType, folderName);

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

        fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

        // (Opzionale) Scrivi nel log
        const logEntry = `${timestamp} | ${projectType} | ${projectName} | ${senderName} | ${savedFiles.length} file\n`;
        fs.appendFileSync(path.join(__dirname, 'uploads/progetti/upload_log.txt'), logEntry);

        res.json({ success: true });

    } catch (err) {
        console.error('Errore durante upload:', err);
        res.status(500).json({ success: false, error: 'Errore interno server' });
    }
});

app.listen(process.env.PORT || 3000);