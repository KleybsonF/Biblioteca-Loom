/**
 * utils.js — Utilitários compartilhados por todas as páginas
 * Biblioteca Loom
 */

// ── Configuração da API ──────────────────────────────────────
const API_URL = 'https://biblioteca-loom.onrender.com/api';

// ── Autenticação ─────────────────────────────────────────────
function getAuthToken() {
    return sessionStorage.getItem('loom_admin_token') || '';
}

function getAuthHeader() {
    const token = getAuthToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function isLoggedIn() {
    return !!getAuthToken();
}

function saveToken(token) {
    sessionStorage.setItem('loom_admin_token', token);
}

function clearToken() {
    sessionStorage.removeItem('loom_admin_token');
}

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
/**
 * @param {string} loomUrl  - URL do loom
 * @returns {string}        - HTML do elemento .video-thumbnail
 */
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
/**
 * Renderiza botões de paginação com ellipsis
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {Function} onPageClick  - callback(page)
 * @param {number} maxVisible
 * @returns {HTMLElement} - container com os botões
 */
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

// ── API Helpers ───────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const url = API_URL + path;
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Erro ' + res.status);
    }
    return res.json();
}

async function apiGet(path) {
    return apiFetch(path);
}

async function apiPost(path, body) {
    return apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
    });
}

async function apiPut(path, body) {
    return apiFetch(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
    });
}

async function apiDelete(path) {
    return apiFetch(path, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
    });
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
    API_URL,
    escapeHtml,
    getLoomId,
    getLoomEmbedUrl,
    getLoomThumbnailUrl,
    buildThumbnailHtml,
    formatDate,
    buildPagination,
    apiFetch, apiGet, apiPost, apiPut, apiDelete,
    fetchCategories,
    getAuthToken, getAuthHeader, isLoggedIn, saveToken, clearToken
};
