require('dotenv').config({ path: './supabase.env' });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ──────────────────────────────────────────────
// CORS — restringe às origens configuradas
// ──────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost', 'http://127.0.0.1', 'https://biblioteca-loom.vercel.app'];

app.use(cors({
    origin: function (origin, callback) {
        // Permite chamadas sem origin (ex: curl, Postman em dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origem não permitida pelo CORS: ' + origin));
    }
}));

app.use(express.json());

// ──────────────────────────────────────────────
// Supabase
// ──────────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ──────────────────────────────────────────────
// JWT — Auth middleware para rotas de escrita
// ──────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'loom-library-secret-fallback';

function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado. Faça login como administrador.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
    }
}

// ──────────────────────────────────────────────
// POST /api/auth/login — Login do painel admin
// ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada no servidor.' });
    }
    if (!password || password !== adminPassword) {
        return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
});

// ──────────────────────────────────────────────
// GET /api/categories — Categorias e subcategorias únicas
// ──────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('category, subcategory')
            .order('category');

        if (error) throw error;

        // Agrupa: { Categoria: Set<subcategorias> }
        const map = {};
        for (const row of data) {
            if (!row.category) continue;
            if (!map[row.category]) map[row.category] = new Set();
            if (row.subcategory) map[row.category].add(row.subcategory);
        }

        const result = Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
            .map(([category, subs]) => ({
                category,
                subcategories: [...subs].sort((a, b) => a.localeCompare(b, 'pt-BR'))
            }));

        res.set('Cache-Control', 'public, max-age=120');
        res.json(result);
    } catch (error) {
        console.error('Erro em /api/categories:', error);
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// GET /api/videos — Lista paginada com filtros
// ──────────────────────────────────────────────
app.get('/api/videos', async (req, res) => {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;

    try {
        let query = supabase.from('videos').select('*', { count: 'exact' });

        if (req.query.category && req.query.category !== 'all') {
            query = query.eq('category', req.query.category);
        }
        if (req.query.subcategory && req.query.subcategory !== 'all') {
            query = query.eq('subcategory', req.query.subcategory);
        }
        if (req.query.search) {
            query = query.or(`title.ilike.%${req.query.search}%,description.ilike.%${req.query.search}%`);
        }

        const { data, error, count } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.set('Cache-Control', 'public, max-age=30');
        res.json({
            data,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Erro em /api/videos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// GET /api/videos/:id — Busca vídeo individual
// ──────────────────────────────────────────────
app.get('/api/videos/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Vídeo não encontrado.' });

        res.set('Cache-Control', 'public, max-age=60');
        res.json(data);
    } catch (error) {
        console.error('Erro em /api/videos/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// GET /api/videos/:id/related — Vídeos relacionados
// ──────────────────────────────────────────────
app.get('/api/videos/:id/related', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    try {
        // Busca o vídeo atual para obter categoria e subcategoria
        const { data: current, error: errCurrent } = await supabase
            .from('videos')
            .select('category, subcategory')
            .eq('id', req.params.id)
            .single();

        if (errCurrent || !current) {
            return res.status(404).json({ error: 'Vídeo não encontrado.' });
        }

        // Busca mesma subcategoria primeiro (excluindo o próprio vídeo)
        const { data: sameSubcat } = await supabase
            .from('videos')
            .select('*')
            .eq('category', current.category)
            .eq('subcategory', current.subcategory)
            .neq('id', req.params.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        let related = sameSubcat || [];

        // Complementa com mesma categoria, diferente subcategoria
        if (related.length < limit) {
            const excludeIds = [req.params.id, ...related.map(v => v.id)];
            const { data: sameCat } = await supabase
                .from('videos')
                .select('*')
                .eq('category', current.category)
                .not('id', 'in', `(${excludeIds.join(',')})`)
                .order('created_at', { ascending: false })
                .limit(limit - related.length);

            if (sameCat) related = [...related, ...sameCat];
        }

        res.set('Cache-Control', 'public, max-age=60');
        res.json(related);
    } catch (error) {
        console.error('Erro em /api/videos/:id/related:', error);
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// POST /api/videos — Criar vídeo (requer auth)
// ──────────────────────────────────────────────
app.post('/api/videos', requireAuth, async (req, res) => {
    const { title, link, category, subcategory, description } = req.body;

    if (!title || !link || !category || !subcategory) {
        return res.status(400).json({
            error: 'Campos obrigatórios ausentes: title, link, category, subcategory.'
        });
    }
    if (typeof title !== 'string' || typeof link !== 'string') {
        return res.status(400).json({ error: 'Tipos de dados inválidos.' });
    }
    if (!link.includes('loom.com')) {
        return res.status(400).json({ error: 'O link deve ser uma URL válida do Loom.' });
    }

    const payload = { title: title.trim(), link: link.trim(), category, subcategory, description: description?.trim() || '' };

    const { data, error } = await supabase.from('videos').insert([payload]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// ──────────────────────────────────────────────
// PUT /api/videos/:id — Atualizar vídeo (requer auth)
// ──────────────────────────────────────────────
app.put('/api/videos/:id', requireAuth, async (req, res) => {
    const { title, link, category, subcategory, description } = req.body;

    if (!title || !link || !category || !subcategory) {
        return res.status(400).json({
            error: 'Campos obrigatórios ausentes: title, link, category, subcategory.'
        });
    }
    if (link && !link.includes('loom.com')) {
        return res.status(400).json({ error: 'O link deve ser uma URL válida do Loom.' });
    }

    const payload = { title: title.trim(), link: link.trim(), category, subcategory, description: description?.trim() || '' };

    const { error } = await supabase
        .from('videos')
        .update(payload)
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Vídeo atualizado com sucesso.' });
});

// ──────────────────────────────────────────────
// DELETE /api/videos/:id — Remover vídeo (requer auth)
// ──────────────────────────────────────────────
app.delete('/api/videos/:id', requireAuth, async (req, res) => {
    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Vídeo removido com sucesso.' });
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));