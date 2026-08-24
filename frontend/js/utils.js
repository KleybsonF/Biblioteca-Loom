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
    throw new Error('apiFetch chamado indevidamente no modo local.');
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
        const categories = {};
        for (const v of (typeof VIDEOS_DB !== 'undefined' ? VIDEOS_DB : [])) {
            if (!v.category) continue;
            if (!categories[v.category]) {
                categories[v.category] = { subcategories: [] };
            }
            if (v.subcategory && !categories[v.category].subcategories.includes(v.subcategory)) {
                categories[v.category].subcategories.push(v.subcategory);
            }
        }
        return categories;
    }
    
    throw new Error('Rota GET não mapeada: ' + path);
}

async function apiPost(path, data) {
    throw new Error('Biblioteca em modo Local. Edite data.js para alterar vídeos.');
}

async function apiPut(path, data) {
    throw new Error('Biblioteca em modo Local. Edite data.js para alterar vídeos.');
}

async function apiDelete(path) {
    throw new Error('Biblioteca em modo Local. Edite data.js para alterar vídeos.');
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
