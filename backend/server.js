require('dotenv').config({ path: './supabase.env' });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Rota GET com paginação, filtros e ordenação
app.get('/api/videos', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;
    
    try {
        let query = supabase.from('videos').select('*', { count: 'exact' });
        
        // Aplicar filtros de categoria e subcategoria
        if (req.query.category && req.query.category !== 'all') {
            query = query.eq('category', req.query.category);
        }
        if (req.query.subcategory && req.query.subcategory !== 'all') {
            query = query.eq('subcategory', req.query.subcategory);
        }
        
        // Aplicar filtro de busca (título ou descrição)
        if (req.query.search) {
            query = query.or(`title.ilike.%${req.query.search}%,description.ilike.%${req.query.search}%`);
        }
        
        // Executar consulta com paginação e ordenação (mais recentes primeiro)
        const { data, error, count } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            data: data,
            total: count,
            page: page,
            limit: limit,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Erro na consulta:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota POST - Criar novo vídeo
app.post('/api/videos', async (req, res) => {
    const { data, error } = await supabase.from('videos').insert([req.body]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Rota PUT - Atualizar vídeo existente
app.put('/api/videos/:id', async (req, res) => {
    const { error } = await supabase
        .from('videos')
        .update(req.body)
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Updated' });
});

// Rota DELETE - Remover vídeo
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