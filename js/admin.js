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
  document.getElementById('duplicate-scan-btn').addEventListener('click', scanDuplicates);
  document.getElementById('bulk-import-btn').addEventListener('click', bulkImport);
  document.getElementById('bulk-import-clear').addEventListener('click', clearBulkImport);
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


function normalizeDuplicateText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function scanDuplicates() {
  const box = document.getElementById('duplicate-results');
  const summary = document.getElementById('duplicate-summary');
  const catalog = getCatalog();
  const groups = new Map();

  catalog.forEach(movie => {
    const key = `${normalizeDuplicateText(movie.title)}::${movie.year || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(movie);
  });

  const duplicateGroups = [...groups.values()].filter(group => group.length > 1);
  const tmdbMap = new Map();
  catalog.forEach(movie => {
    if (!movie.tmdb_id) return;
    const key = String(movie.tmdb_id);
    if (!tmdbMap.has(key)) tmdbMap.set(key, []);
    tmdbMap.get(key).push(movie);
  });
  const tmdbDuplicates = [...tmdbMap.values()].filter(group => group.length > 1);

  box.innerHTML = '';
  const totalIssues = duplicateGroups.length + tmdbDuplicates.length;
  summary.textContent = totalIssues ? `${totalIssues} gruppi da verificare` : 'Nessun duplicato rilevato';

  if (!totalIssues) {
    box.innerHTML = '<div class="admin-note duplicate-clean">✓ Il catalogo non presenta duplicati evidenti per titolo/anno o TMDb ID.</div>';
    return;
  }

  const seen = new Set();
  duplicateGroups.forEach(group => {
    const signature = group.map(m => m.id).sort().join(',');
    seen.add(signature);
    box.appendChild(buildDuplicateGroup('Titolo + anno', group));
  });
  tmdbDuplicates.forEach(group => {
    const signature = group.map(m => m.id).sort().join(',');
    if (seen.has(signature)) return;
    box.appendChild(buildDuplicateGroup('Stesso TMDb ID', group));
  });
}

function buildDuplicateGroup(reason, movies) {
  const group = document.createElement('div');
  group.className = 'duplicate-group';
  group.innerHTML = `<div class="duplicate-head"><div><strong>${esc(reason)}</strong><span>${movies.length} record</span></div></div><div class="duplicate-list"></div>`;
  const list = group.querySelector('.duplicate-list');
  movies.forEach((movie, index) => {
    const row = document.createElement('div');
    row.className = 'duplicate-row';
    const recommended = index === 0 && movie.poster_url && movie.synopsis && movie.tmdb_id;
    row.innerHTML = `${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="">` : '<div class="no-thumb"></div>'}<div class="duplicate-info"><strong>${esc(movie.title)}</strong><span>ID ${movie.id} · ${movie.year || '—'} · TMDb ${movie.tmdb_id || '—'}</span></div><div class="duplicate-actions">${recommended ? '<span class="duplicate-keep">Conserva</span>' : ''}<button class="admin-btn danger" type="button">Elimina</button></div>`;
    row.querySelector('button').addEventListener('click', () => deleteDuplicate(movie, row, group));
    list.appendChild(row);
  });
  return group;
}

async function deleteDuplicate(movie, row, group) {
  const ok = window.confirm(`Eliminare definitivamente \"${movie.title}\" (record ID ${movie.id})?`);
  if (!ok) return;
  const btn = row.querySelector('button');
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await api.deleteFilm(movie.id);
    await reloadCatalog();
    renderCatalogAdmin();
    row.remove();
    if (!group.querySelector('.duplicate-row')) group.remove();
    showToast(`${movie.title} eliminato`);
    const remaining = document.querySelectorAll('.duplicate-group').length;
    document.getElementById('duplicate-summary').textContent = remaining ? `${remaining} gruppi da verificare` : 'Nessun duplicato rilevato';
  } catch (e) {
    if (!(await handleAuthError(e))) showToast(`Errore: ${e.message}`, 5000);
    btn.disabled = false;
    btn.textContent = 'Elimina';
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
      row.innerHTML = `${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="">` : '<div class="no-thumb"></div>'}<div><div class="tmdb-result-title">${esc(movie.title)} ${movie.recommended ? '<span class="match-recommended">Consigliato</span>' : ''}</div><div class="tmdb-result-meta">${movie.year || '—'} · TMDb ${movie.tmdb_id}</div></div><button class="admin-btn ${present ? '' : 'primary'}" type="button">${present ? '↻' : '+'}</button>`;
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

function clearBulkImport() {
  document.getElementById('bulk-import-input').value = '';
  document.getElementById('bulk-import-results').innerHTML = '';
  document.getElementById('bulk-progress-wrap').hidden = true;
}

function bulkSetProgress(current, total, text) {
  const wrap = document.getElementById('bulk-progress-wrap');
  const bar = document.getElementById('bulk-progress-bar');
  const pct = document.getElementById('bulk-progress-percent');
  const label = document.getElementById('bulk-progress-text');
  wrap.hidden = false;
  const value = total ? Math.round((current / total) * 100) : 0;
  bar.style.width = `${value}%`;
  pct.textContent = `${value}%`;
  label.textContent = text;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function bulkImport() {
  const btn = document.getElementById('bulk-import-btn');
  const input = document.getElementById('bulk-import-input');
  const resultsBox = document.getElementById('bulk-import-results');
  const titles = [...new Set(input.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean))];
  if (!titles.length) { showToast('Inserisci almeno un titolo'); return; }
  if (titles.length > 50) { showToast('Massimo 50 titoli per importazione', 5000); return; }

  btn.disabled = true;
  resultsBox.innerHTML = '';
  bulkSetProgress(0, titles.length, 'Ricerca su TMDb…');
  const existing = new Set(getCatalog().map(movie => Number(movie.tmdb_id)).filter(Boolean));
  let completed = 0;

  try {
    for (const title of titles) {
      const item = document.createElement('div');
      item.className = 'bulk-item';
      item.innerHTML = `<div class="bulk-item-head"><strong class="bulk-item-title">${esc(title)}</strong><span class="bulk-item-status">ricerca…</span></div><div class="bulk-candidates"></div>`;
      resultsBox.appendChild(item);
      try {
        const results = await api.searchFilm(title);
        const candidates = results.slice(0, 8).filter(movie => !existing.has(Number(movie.tmdb_id)));
        const status = item.querySelector('.bulk-item-status');
        const box = item.querySelector('.bulk-candidates');
        if (!candidates.length) {
          item.classList.add('warn');
          status.textContent = results.length ? 'già presenti o nessun candidato utile' : 'non trovato';
          completed += 1;
          bulkSetProgress(completed, titles.length, `Ricercati ${completed} / ${titles.length}`);
          await sleep(180);
          continue;
        }
        if (candidates.length === 1) {
          const movie = candidates[0];
          const row = buildBulkCandidate(movie, true);
          box.appendChild(row);
          status.textContent = 'selezione proposta';
          item.classList.add('warn');
        } else {
          candidates.forEach((movie, index) => box.appendChild(buildBulkCandidate(movie, index === 0 && movie.recommended)));
          status.textContent = `${candidates.length} risultati da scegliere`;
          item.classList.add('warn');
        }
      } catch (e) {
        if (await handleAuthError(e)) return;
        item.classList.add('error');
        item.querySelector('.bulk-item-status').textContent = `errore: ${e.message}`;
      }
      completed += 1;
      bulkSetProgress(completed, titles.length, `Ricercati ${completed} / ${titles.length}`);
      await sleep(180);
    }
    showToast(`Ricerca completata: ${titles.length} titoli`);
  } finally {
    btn.disabled = false;
    bulkSetProgress(titles.length, titles.length, `Ricerca completata: ${titles.length} titoli`);
  }
}

function buildBulkCandidate(movie, proposed = false) {
  const row = document.createElement('div');
  row.className = 'bulk-candidate';
  row.innerHTML = `${movie.poster_url ? `<img src="${esc(movie.poster_url)}" alt="">` : '<div class="no-thumb"></div>'}<div><div class="bulk-candidate-title">${esc(movie.title)} ${proposed ? '<span class="match-recommended">Consigliato</span>' : ''}</div><div class="bulk-candidate-meta">${movie.year || '—'} · TMDb ${movie.tmdb_id}</div></div><button class="admin-btn ${proposed ? 'primary' : ''}" type="button">${proposed ? 'Aggiungi' : '+'}</button>`;
  row.querySelector('button').addEventListener('click', async () => {
    const btn = row.querySelector('button');
    btn.disabled = true; btn.textContent = '…';
    try {
      const result = await api.addFilm(movie.tmdb_id);
      if (result.inserted) {
        row.closest('.bulk-item').classList.remove('warn');
        row.closest('.bulk-item').classList.add('done');
        row.closest('.bulk-item').querySelector('.bulk-item-status').textContent = 'aggiunto';
        btn.textContent = '✓';
        await reloadCatalog();
        renderCatalogAdmin();
        const film = getCatalog().find(item => Number(item.tmdb_id) === Number(movie.tmdb_id));
        if (film) document.getElementById('header-count')?.dispatchEvent(new Event('noop'));
      } else {
        btn.textContent = '✓';
        row.closest('.bulk-item').classList.add('done');
        row.closest('.bulk-item').querySelector('.bulk-item-status').textContent = 'già presente';
      }
    } catch (e) {
      if (!(await handleAuthError(e))) showToast(`Errore: ${e.message}`, 5000);
      btn.disabled = false; btn.textContent = proposed ? 'Aggiungi' : '+';
    }
  });
  return row;
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
