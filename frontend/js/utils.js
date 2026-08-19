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

// ── Renderiza thumbnail estática com fallback ─────────────────
function buildThumbnailHtml(loomUrl) {
    const thumbUrl = getLoomThumbnailUrl(loomUrl);
    const imgTag = thumbUrl
        ? `<img src="${escapeHtml(thumbUrl)}" alt="Preview do vídeo" loading="lazy" onerror="this.classList.add('errored')">`
        : '';
    return `
        <div class="video-thumbnail">
            ${imgTag}
            <div class="thumb-fallback"><i class="fas fa-play-circle"></i></div>
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

// ── API ────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:3001/api';

async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE_URL + endpoint, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function apiGet(path) {
    return apiFetch(path, {
        method: 'GET',
        headers: { ...getAuthHeader() }
    });
}

async function apiPost(path, data) {
    return apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
}

async function apiPut(path, data) {
    return apiFetch(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
}

async function apiDelete(path) {
    return apiFetch(path, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
    });
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
