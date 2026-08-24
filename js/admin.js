import * as api from './api.js';
import { updateStats } from './stats.js';
import { setProgress, showToast } from './ui.js';
import { esc } from './utils.js';

let reloadCatalog = async () => {};
let getCatalog = () => [];

export function initAdmin(reloadFn) {
  reloadCatalog = reloadFn;
  getCatalog = reloadFn.getFilms || (() => []);

  const panel = document.getElementById('admin-panel');
  const close = () => {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  };

  document.getElementById('admin-open').addEventListener('click', () => {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    updateStats(getCatalog());
    renderCatalogAdmin();
  });

  document.getElementById('admin-close').addEventListener('click', close);
  document.getElementById('admin-backdrop').addEventListener('click', close);
  document.getElementById('tmdb-search-btn').addEventListener('click', search);
  document.getElementById('tmdb-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') search();
  });
  document.getElementById('catalog-filter').addEventListener('input', renderCatalogAdmin);
  document.getElementById('refresh-all-btn').addEventListener('click', refreshAll);
  document.getElementById('reload-btn').addEventListener('click', async () => {
    await reloadCatalog();
    renderCatalogAdmin();
    showToast('Catalogo aggiornato');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}

function renderCatalogAdmin() {
  const box = document.getElementById('catalog-admin-list');
  const count = document.getElementById('catalog-count');
  const query = document.getElementById('catalog-filter').value.trim().toLowerCase();
  const catalog = getCatalog();
  const filtered = catalog.filter(movie =>
    !query || [movie.title, movie.original_title, movie.director, movie.year]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query)
  );

  count.textContent = `${filtered.length}/${catalog.length}`;

  if (!filtered.length) {
    box.innerHTML = '<div class="admin-note">Nessun film nel catalogo corrisponde al filtro.</div>';
    return;
  }

  box.innerHTML = '';
  filtered.forEach(movie => {
    const row = document.createElement('div');
    row.className = 'catalog-admin-row';
    row.innerHTML = `
      ${movie.poster_url
        ? `<img src="${esc(movie.poster_url)}" alt="" loading="lazy">`
        : '<div class="no-thumb"></div>'}
      <div class="catalog-admin-info">
        <div class="catalog-admin-title">${esc(movie.title)}</div>
        <div class="catalog-admin-meta">${movie.year || '—'} · TMDb ${movie.tmdb_id}</div>
      </div>
      <button class="admin-btn" type="button">↻</button>`;

    row.querySelector('button').addEventListener('click', () => refreshOne(movie, row));
    box.appendChild(row);
  });
}

async function refreshOne(movie, row) {
  const btn = row.querySelector('button');
  btn.disabled = true;
  btn.textContent = '…';

  try {
    await api.refreshFilm(movie.tmdb_id);
    await reloadCatalog();
    renderCatalogAdmin();
    showToast(`${movie.title} aggiornato`);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '↻';
    showToast(`Errore: ${e.message}`, 5000);
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
    const existing = new Set(getCatalog().map(movie => Number(movie.tmdb_id)));
    box.innerHTML = '';

    if (!results.length) {
      box.innerHTML = '<div class="admin-note">Nessun risultato.</div>';
      return;
    }

    results.forEach(movie => {
      const present = existing.has(Number(movie.tmdb_id));
      const row = document.createElement('div');
      row.className = 'tmdb-result';
      row.innerHTML = `
        ${movie.poster_url
          ? `<img src="${esc(movie.poster_url)}" alt="">`
          : '<div class="no-thumb"></div>'}
        <div>
          <div class="tmdb-result-title">${esc(movie.title)}</div>
          <div class="tmdb-result-meta">${movie.year || '—'} · TMDb ${movie.tmdb_id}</div>
        </div>
        <button class="admin-btn ${present ? '' : 'primary'}" type="button">${present ? '↻' : '+'}</button>`;

      row.querySelector('button').addEventListener('click', () =>
        present ? refreshOne(movie, row) : add(movie, row)
      );
      box.appendChild(row);
    });
  } catch (e) {
    box.innerHTML = `<div class="admin-note">Errore: ${esc(e.message)}</div>`;
  }
}

async function add(movie, row) {
  const btn = row.querySelector('button');
  btn.disabled = true;
  btn.textContent = '…';

  try {
    const result = await api.addFilm(movie.tmdb_id);
    if (result.inserted) {
      showToast(`${movie.title} aggiunto`);
      await reloadCatalog();
      renderCatalogAdmin();
      btn.textContent = '✓';
    } else {
      showToast('Film già presente');
      btn.textContent = '↻';
      btn.disabled = false;
    }
  } catch (e) {
    showToast(`Errore: ${e.message}`, 5000);
    btn.disabled = false;
    btn.textContent = '+';
  }
}

async function refreshAll() {
  const btn = document.getElementById('refresh-all-btn');
  btn.disabled = true;
  document.getElementById('progress-wrap').hidden = false;

  try {
    const films = getCatalog();
    const total = films.length;
    let offset = 0;
    let processed = 0;

    if (!total) {
      showToast('Catalogo vuoto');
      return;
    }

    while (offset < total) {
      const result = await api.refreshAllBatch(offset, Math.min(10, total - offset));
      processed += result.processed || 0;
      offset = result.next_offset ?? offset + (result.processed || 0);
      setProgress(processed, total, `Aggiornati ${processed} / ${total}`);
      if (!result.processed) break;
    }

    await reloadCatalog();
    renderCatalogAdmin();
    setProgress(total, total, 'Aggiornamento completato');
    showToast(`Aggiornamento completato: ${processed} film`);
  } catch (e) {
    showToast(`Aggiornamento interrotto: ${e.message}`, 5000);
  } finally {
    btn.disabled = false;
  }
}
