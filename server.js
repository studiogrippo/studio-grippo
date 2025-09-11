const express = require('express');
const fs = require('fs');
const path = require('path');
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

app.listen(process.env.PORT || 3000);