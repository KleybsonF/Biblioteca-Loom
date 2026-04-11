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

// Rota GET com paginação
app.get('/api/videos', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;
    
    try {
        const { data, error, count } = await supabase
            .from('videos')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: data,
            total: count,
            page: page,
            limit: limit,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota POST
app.post('/api/videos', async (req, res) => {
    const { data, error } = await supabase.from('videos').insert([req.body]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Rota PUT
app.put('/api/videos/:id', async (req, res) => {
    const { error } = await supabase
        .from('videos')
        .update(req.body)
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Updated' });
});

// Rota DELETE
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