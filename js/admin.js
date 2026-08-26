import * as api from './api.js';
import { updateStats } from './stats.js';
import { setProgress, showToast } from './ui.js';
import { esc } from './utils.js';

let reloadCatalog = async () => {};
let getCatalog = () => [];
let panel;
let loginView;
let contentView;

export function initAdmin(reloadFn) {
  reloadCatalog = reloadFn;
  getCatalog = reloadFn.getFilms || (() => []);
  panel = document.getElementById('admin-panel');
  loginView = document.getElementById('admin-login');
  contentView = document.getElementById('admin-content');

  document.getElementById('admin-open').addEventListener('click', open);
  document.getElementById('admin-close').addEventListener('click', close);
  document.getElementById('admin-backdrop').addEventListener('click', close);
  document.getElementById('tmdb-search-btn').addEventListener('click', search);
  document.getElementById('tmdb-search').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  document.getElementById('catalog-filter').addEventListener('input', renderCatalogAdmin);
  document.getElementById('refresh-all-btn').addEventListener('click', refreshAll);
  document.getElementById('reload-btn').addEventListener('click', async () => {
    await reloadCatalog();
    renderCatalogAdmin();
    showToast('Catalogo aggiornato');
  });
  document.getElementById('admin-login-form').addEventListener('submit', handleLogin);
  document.getElementById('admin-logout').addEventListener('click', async () => { try { await api.adminLogout(); } finally { showLogin(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

async function open() {
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  try {
    const session = await api.getAdminSession();
    if (session?.access_token) showContent(); else showLogin();
  } catch {
    showLogin();
  }
}

function close() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

function showLogin(message = '') {
  loginView.hidden = false;
  contentView.hidden = true;
  const error = document.getElementById('admin-login-error');
  error.textContent = message;
  error.hidden = !message;
  document.getElementById('admin-email').focus();
}

function showContent() {
  loginView.hidden = true;
  contentView.hidden = false;
  updateStats(getCatalog());
  renderCatalogAdmin();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('admin-login-btn');
  btn.disabled = true;
  btn.textContent = 'Accesso…';

  try {
    await api.adminLogin(email, password);
    document.getElementById('admin-password').value = '';
    showContent();
    showToast('Accesso Admin effettuato');
  } catch (e) {
    showLogin(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Accedi';
  }
}

async function handleAuthError(e) {
  if (e?.status === 401) {
    try { await api.adminLogout(); } catch {}
    showLogin('Sessione scaduta. Effettua nuovamente l’accesso.');
    return true;
  }
  return false;
}

function renderCatalogAdmin() {
  const box = document.getElementById('catalog-admin-list');
  const count = document.getElementById('catalog-count');
  const query = document.getElementById('catalog-filter').value.trim().toLowerCase();
  const catalog = getCatalog();
  const filtered = catalog.filter(movie => !query || [movie.title, movie.original_title, movie.director, movie.year].filter(Boolean).join(' ').toLowerCase().includes(query));
  count.textContent = `${filtered.length}/${catalog.length}`;

  if (!filtered.length) {
    box.innerHTML = '<div class="admin-note">Nessun film nel catalogo corrisponde al filtro.</div>';
    return;
  }

  box.innerHTML = '';
  filtered.forEach(movie => {
    const row = document.createElement('div');
    row.className = 'catalog-admin-row';
    row.innerHTML = `${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="" loading="lazy">` : '<div class="no-thumb"></div>'}<div class="catalog-admin-info"><div class="catalog-admin-title">${esc(movie.title)}</div><div class="catalog-admin-meta">${movie.year || '—'} · TMDb ${movie.tmdb_id || '—'}</div></div><button class="admin-btn" type="button">↻</button>`;
    row.querySelector('button').addEventListener('click', () => refreshOne(movie, row));
    box.appendChild(row);
  });
}

async function refreshOne(movie, row) {
  if (!movie.tmdb_id) { showToast('Questo film non ha un TMDb ID', 5000); return; }
  const btn = row.querySelector('button');
  btn.disabled = true; btn.textContent = '…';
  try {
    await api.refreshFilm(movie.tmdb_id);
    await reloadCatalog();
    renderCatalogAdmin();
    showToast(`${movie.title} aggiornato`);
  } catch (e) {
    if (!(await handleAuthError(e))) showToast(`Errore: ${e.message}`, 5000);
    btn.disabled = false; btn.textContent = '↻';
  }
}

async function search() {
  const input = document.getElementById('tmdb-search');
  const q = input.value.trim();
  const box = document.getElementById('tmdb-results');
  if (!q) return;
  box.innerHTML = '<div class="admin-note">Ricerca…</div>';
  try {
    const results = await api.searchFilm(q);
    const existing = new Set(getCatalog().map(movie => Number(movie.tmdb_id)).filter(Boolean));
    box.innerHTML = '';
    if (!results.length) { box.innerHTML = '<div class="admin-note">Nessun risultato.</div>'; return; }
    results.forEach(movie => {
      const present = existing.has(Number(movie.tmdb_id));
      const row = document.createElement('div');
      row.className = 'tmdb-result';
      row.innerHTML = `${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="">` : '<div class="no-thumb"></div>'}<div><div class="tmdb-result-title">${esc(movie.title)}</div><div class="tmdb-result-meta">${movie.year || '—'} · TMDb ${movie.tmdb_id}</div></div><button class="admin-btn ${present ? '' : 'primary'}" type="button">${present ? '↻' : '+'}</button>`;
      row.querySelector('button').addEventListener('click', () => present ? refreshOne(movie, row) : add(movie, row));
      box.appendChild(row);
    });
  } catch (e) {
    if (!(await handleAuthError(e))) box.innerHTML = `<div class="admin-note">Errore: ${esc(e.message)}</div>`;
  }
}

async function add(movie, row) {
  const btn = row.querySelector('button');
  btn.disabled = true; btn.textContent = '…';
  try {
    const result = await api.addFilm(movie.tmdb_id);
    if (result.inserted) {
      showToast(`${movie.title} aggiunto`);
      await reloadCatalog(); renderCatalogAdmin(); btn.textContent = '✓';
    } else { showToast('Film già presente'); btn.textContent = '↻'; btn.disabled = false; }
  } catch (e) {
    if (!(await handleAuthError(e))) showToast(`Errore: ${e.message}`, 5000);
    btn.disabled = false; btn.textContent = '+';
  }
}

async function refreshAll() {
  const btn = document.getElementById('refresh-all-btn');
  btn.disabled = true;
  document.getElementById('progress-wrap').hidden = false;
  try {
    const films = getCatalog();
    const total = films.length;
    let offset = 0; let processed = 0;
    if (!total) { showToast('Catalogo vuoto'); return; }
    while (offset < total) {
      const result = await api.refreshAllBatch(offset, Math.min(10, total - offset));
      processed += result.processed || 0;
      offset = result.next_offset ?? offset + (result.processed || 0);
      setProgress(Math.min(processed, total), total, `Aggiornati ${Math.min(processed, total)} / ${total}`);
      if (!result.processed) break;
    }
    await reloadCatalog(); renderCatalogAdmin();
    setProgress(total, total, `Aggiornamento completato: ${processed} film`);
    showToast(`Aggiornamento completato: ${processed} film`);
  } catch (e) {
    if (!(await handleAuthError(e))) showToast(`Aggiornamento interrotto: ${e.message}`, 5000);
  } finally { btn.disabled = false; }
}
