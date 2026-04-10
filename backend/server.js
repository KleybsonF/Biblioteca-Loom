require('dotenv').config({ path: './supabase.env' });

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Rotas da API

app.get('/', (req, res) => {
    res.json({ 
        message: 'API da Loom Library está funcionando!',
        endpoints: {
            videos: '/api/videos',
            documentacao: 'Use GET, POST, PUT, DELETE em /api/videos'
        }
    });
});

app.get('/api/videos', async (req, res) => {
    const { data, error } = await supabase.from('videos').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/videos', async (req, res) => {
    const { data, error } = await supabase.from('videos').insert([req.body]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/videos/:id', async (req, res) => {
    const { error } = await supabase
        .from('videos')
        .update(req.body)
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Updated' });
});

app.delete('/api/videos/:id', async (req, res) => {
    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));