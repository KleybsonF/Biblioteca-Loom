app.get('/api/videos', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;
    
    try {
        let query = supabase.from('videos').select('*', { count: 'exact' });
        
        // Aplicar filtros se existirem
        if (req.query.category) {
            query = query.eq('category', req.query.category);
        }
        if (req.query.subcategory) {
            query = query.eq('subcategory', req.query.subcategory);
        }
        if (req.query.search) {
            query = query.or(`title.ilike.%${req.query.search}%,description.ilike.%${req.query.search}%`);
        }
        
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
        res.status(500).json({ error: error.message });
    }
});