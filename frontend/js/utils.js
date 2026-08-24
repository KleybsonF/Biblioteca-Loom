/**
 * utils.js — Utilitários compartilhados por todas as páginas
 * Biblioteca Loom TSMX (Local)
 */

// ── Escape HTML (seguro para atributos e conteúdo) ───────────
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Loom Helpers ─────────────────────────────────────────────
function getLoomId(loomUrl) {
    if (!loomUrl) return null;
    const match = loomUrl.trim().match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

function getLoomEmbedUrl(loomUrl) {
    const id = getLoomId(loomUrl);
    return id ? 'https://www.loom.com/embed/' + id : (loomUrl || '');
}

function getLoomThumbnailUrl(loomUrl) {
    const id = getLoomId(loomUrl);
    return id
        ? 'https://cdn.loom.com/sessions/thumbnails/' + id + '/thumbnail.jpg'
        : null;
}

// ── Remove Emojis ───────────────────────────────────────────
function stripEmojis(str) {
    if (!str) return '';
    return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
}

// ── Renderiza thumbnail dinâmica ─────────────────
function buildThumbnailHtml(loomUrl, title = '') {
    const cleanTitle = stripEmojis(title || 'Vídeo sem título');
    return `
        <div class="video-thumbnail dynamic-thumb">
            <img class="thumb-logo-tsmx" src="https://tsmxmail.sgp.net.br/r2/logo/logo_sombra.png" alt="TSMX" loading="lazy">
            <div class="thumb-title-container">
                <div class="thumb-title">${escapeHtml(cleanTitle)}</div>
            </div>
            <img class="thumb-deco-icon" src="https://sys.tsmx.net.br/public/files/REFJKME2TAG.png" alt="" loading="lazy">
            <div class="play-overlay"><i class="fas fa-play"></i></div>
        </div>
    `;
}

// ── Data ─────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return 'Adicionado em ' + date.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

// ── Paginação ─────────────────────────────────────────────────
function buildPagination(currentPage, totalPages, onPageClick, maxVisible = 5) {
    const container = document.createElement('div');
    container.className = 'pagination';

    function btn(label, page, disabled = false, active = false) {
        const b = document.createElement('button');
        b.innerHTML = label;
        if (disabled) b.disabled = true;
        if (active) b.classList.add('active');
        if (!disabled && !active) b.addEventListener('click', () => onPageClick(page));
        return b;
    }

    container.appendChild(btn('<i class="fas fa-chevron-left"></i> Anterior', currentPage - 1, currentPage === 1));

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end   = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
        container.appendChild(btn('1', 1));
        if (start > 2) container.appendChild(btn('...', null, true));
    }

    for (let i = start; i <= end; i++) {
        container.appendChild(btn(String(i), i, false, i === currentPage));
    }

    if (end < totalPages) {
        if (end < totalPages - 1) container.appendChild(btn('...', null, true));
        container.appendChild(btn(String(totalPages), totalPages));
    }

    container.appendChild(btn('Próximo <i class="fas fa-chevron-right"></i>', currentPage + 1, currentPage === totalPages));

    return container;
}

// ── API (Modo Local/Estático) ──────────────────────────────────
// Lê diretamente de data.js (VIDEOS_DB) para velocidade máxima (sem delay de API)
const API_BASE_URL = 'https://biblioteca-loom.onrender.com/api';

async function apiFetch(endpoint, options = {}) {
    const url = API_BASE_URL + endpoint;
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Erro ' + res.status);
    }
    return res.json();
}

async function apiGet(path) {
    if (path.startsWith('/videos?')) {
        const urlParams = new URLSearchParams(path.split('?')[1]);
        const page = parseInt(urlParams.get('page') || '1', 10);
        const limit = parseInt(urlParams.get('limit') || '500', 10);
        
        let filtered = [...(typeof VIDEOS_DB !== 'undefined' ? VIDEOS_DB : [])];
        
        // Ordena mais recentes primeiro
        filtered.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

        const search = urlParams.get('search');
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(v => 
                (v.title && v.title.toLowerCase().includes(s)) || 
                (v.description && v.description.toLowerCase().includes(s)) ||
                (v.category && v.category.toLowerCase().includes(s)) ||
                (v.subcategory && v.subcategory.toLowerCase().includes(s))
            );
        }
        
        const cat = urlParams.get('category');
        if (cat) {
            filtered = filtered.filter(v => v.category === cat);
        }
        
        const sub = urlParams.get('subcategory');
        if (sub) {
            filtered = filtered.filter(v => v.subcategory === sub);
        }
        
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const data = filtered.slice(start, start + limit);
        
        return { data, total, page, totalPages };
    }
    
    if (path.startsWith('/videos/')) {
        const parts = path.split('/');
        const id = parts[2].split('?')[0];
        
        const db = typeof VIDEOS_DB !== 'undefined' ? VIDEOS_DB : [];
        const v = db.find(x => x.id === id);
        
        if (parts[3] && parts[3].startsWith('related')) {
            if (!v) return [];
            let related = db.filter(x => x.category === v.category && x.id !== id);
            related.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
            return related.slice(0, 10);
        }
        
        if (v) return v;
        throw new Error('Vídeo não encontrado');
    }
    
    if (path === '/categories') {
        const catMap = {};
        for (const v of (typeof VIDEOS_DB !== 'undefined' ? VIDEOS_DB : [])) {
            if (!v.category) continue;
            if (!catMap[v.category]) {
                catMap[v.category] = { category: v.category, subcategories: [] };
            }
            if (v.subcategory && !catMap[v.category].subcategories.includes(v.subcategory)) {
                catMap[v.category].subcategories.push(v.subcategory);
            }
        }
        return Object.values(catMap);
    }
    
    throw new Error('Rota GET não mapeada: ' + path);
}

async function apiPost(path, data) {
    if (path === '/auth/login') {
        if (data.password === 'admin123' || data.password === 'TSMX2026') {
            return { token: 'local-admin-token' };
        }
        throw new Error('Senha incorreta.');
    }

    try {
        const result = await apiFetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data)
        });
        if (typeof VIDEOS_DB !== 'undefined' && path === '/videos') {
            const newVideo = result.video || result;
            if (newVideo && newVideo.id) VIDEOS_DB.unshift(newVideo);
        }
        return result;
    } catch (err) {
        console.warn('Fallback local para POST', path, err);
        if (typeof VIDEOS_DB !== 'undefined' && path === '/videos') {
            const newVideo = { id: 'local_' + Date.now(), ...data, created_at: new Date().toISOString() };
            VIDEOS_DB.unshift(newVideo);
            return { video: newVideo };
        }
        throw err;
    }
}

async function apiPut(path, data) {
    try {
        const result = await apiFetch(path, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify(data)
        });
        if (typeof VIDEOS_DB !== 'undefined' && path.startsWith('/videos/')) {
            const updatedVideo = result.video || result || data;
            const id = path.split('/')[2];
            const index = VIDEOS_DB.findIndex(v => v.id === id);
            if (index !== -1) VIDEOS_DB[index] = { ...VIDEOS_DB[index], ...updatedVideo };
        }
        return result;
    } catch (err) {
        console.warn('Fallback local para PUT', path, err);
        if (typeof VIDEOS_DB !== 'undefined' && path.startsWith('/videos/')) {
            const id = path.split('/')[2];
            const index = VIDEOS_DB.findIndex(v => v.id === id);
            if (index !== -1) {
                VIDEOS_DB[index] = { ...VIDEOS_DB[index], ...data };
                return { video: VIDEOS_DB[index] };
            }
        }
        throw err;
    }
}

async function apiDelete(path) {
    try {
        const result = await apiFetch(path, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        if (typeof VIDEOS_DB !== 'undefined' && path.startsWith('/videos/')) {
            const id = path.split('/')[2];
            const index = VIDEOS_DB.findIndex(v => v.id === id);
            if (index !== -1) VIDEOS_DB.splice(index, 1);
        }
        return result;
    } catch (err) {
        console.warn('Fallback local para DELETE', path, err);
        if (typeof VIDEOS_DB !== 'undefined' && path.startsWith('/videos/')) {
            const id = path.split('/')[2];
            const index = VIDEOS_DB.findIndex(v => v.id === id);
            if (index !== -1) VIDEOS_DB.splice(index, 1);
            return { success: true };
        }
        throw err;
    }
}

// ── Autenticação (Admin) ──────────────────────────────────────
const TOKEN_KEY = 'loom_admin_token';

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeader() {
    const token = getAuthToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function isLoggedIn() {
    return !!getAuthToken();
}

// ── Categorias (cache em memória) ─────────────────────────────
let _categoriesCache = null;
async function fetchCategories() {
    if (_categoriesCache) return _categoriesCache;
    const data = await apiGet('/categories');
    _categoriesCache = data;
    return data;
}

// ── Exporta tudo no escopo global (sem módulos ES) ────────────
window.LoomLib = {
    escapeHtml,
    getLoomId,
    getLoomEmbedUrl,
    getLoomThumbnailUrl,
    buildThumbnailHtml,
    formatDate,
    buildPagination,
    apiGet, apiPost, apiPut, apiDelete,
    fetchCategories,
    getAuthToken, getAuthHeader, isLoggedIn, saveToken, clearToken
};
