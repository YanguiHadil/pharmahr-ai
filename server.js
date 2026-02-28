const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/groq', async (req, res) => {
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY manquante dans .env' });
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const text = await response.text();
        res.status(response.status).type('application/json').send(text);
    } catch (error) {
        res.status(500).json({ error: 'Erreur proxy Groq', detail: error.message });
    }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`PharmaHR AI lancé sur http://localhost:${PORT}`);
});