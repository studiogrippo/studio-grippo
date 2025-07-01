const express = require('express');
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

app.listen(process.env.PORT || 3000);