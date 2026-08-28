import { esc } from './utils.js';

let applyFilters = () => {};
let getState = () => ({});
let genreSelect;
let sagaSelect;
let mediaSelect;
let dvdToggle;

export function initAdvancedSearch({ onChange, getFilters, getGenres }) {
  applyFilters = onChange;
  getState = getFilters;

  const toggle = document.getElementById('advanced-toggle');
  const panel = document.getElementById('advanced-panel');
  genreSelect = document.getElementById('advanced-genre');
  sagaSelect = document.getElementById('advanced-saga');
  mediaSelect = document.getElementById('advanced-media');
  dvdToggle = document.getElementById('dvd-toggle');

  toggle?.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  const ids = ['advanced-year-from','advanced-year-to','advanced-director','advanced-original','advanced-runtime-from','advanced-runtime-to'];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFiltersFromForm);
  });

  genreSelect?.addEventListener('change', applyFiltersFromForm);
  sagaSelect?.addEventListener('change', applyFiltersFromForm);
  mediaSelect?.addEventListener('change', applyFiltersFromForm);
  dvdToggle?.addEventListener('click', () => {
    const active = dvdToggle.classList.toggle('has-active');
    dvdToggle.setAttribute('aria-pressed', String(active));
    applyFiltersFromForm();
  });
  document.getElementById('advanced-clear')?.addEventListener('click', clear);

  refreshGenres(getGenres());
}

export function refreshGenres(genres) {
  if (!genreSelect) genreSelect = document.getElementById('advanced-genre');
  sagaSelect = document.getElementById('advanced-saga');
  mediaSelect = document.getElementById('advanced-media');
  dvdToggle = document.getElementById('dvd-toggle');
  if (!genreSelect) return;
  const current = genreSelect.value;
  genreSelect.innerHTML = `<option value="">Tutti i generi</option>` + genres.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  if (genres.includes(current)) genreSelect.value = current;
}


export function refreshCollections(sagas, mediaTypes) {
  if (!sagaSelect) sagaSelect = document.getElementById('advanced-saga');
  if (!mediaSelect) mediaSelect = document.getElementById('advanced-media');
  const currentSaga = sagaSelect?.value || '';
  const currentMedia = mediaSelect?.value || '';
  if (sagaSelect) {
    sagaSelect.innerHTML = `<option value="">Tutte le saghe</option>` + sagas.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
    if (sagas.includes(currentSaga)) sagaSelect.value = currentSaga;
  }
  if (mediaSelect) {
    mediaSelect.innerHTML = `<option value="">Tutti i supporti</option>` + mediaTypes.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
    if (mediaTypes.includes(currentMedia)) mediaSelect.value = currentMedia;
  }
}

function applyFiltersFromForm() {
  applyFilters(readForm());
}

function readForm() {
  return {
    yearFrom: numberValue('advanced-year-from'),
    yearTo: numberValue('advanced-year-to'),
    director: value('advanced-director'),
    original: value('advanced-original'),
    runtimeFrom: numberValue('advanced-runtime-from'),
    runtimeTo: numberValue('advanced-runtime-to'),
    genre: genreSelect?.value || '',
    saga: sagaSelect?.value || '',
    media: dvdToggle?.classList.contains('has-active') ? 'DVD' : ''
  };
}

export function getAdvancedFilters() {
  return { ...readForm(), ...getState() };
}

export function clear() {
  ['advanced-year-from','advanced-year-to','advanced-director','advanced-original','advanced-runtime-from','advanced-runtime-to'].forEach(id => { const el=document.getElementById(id); if (el) el.value=''; });
  if (genreSelect) genreSelect.value='';
  if (sagaSelect) sagaSelect.value='';
  if (mediaSelect) mediaSelect.value='';
  if (dvdToggle) { dvdToggle.classList.remove('has-active'); dvdToggle.setAttribute('aria-pressed','false'); }
  applyFilters(readForm());
}

function value(id) { return document.getElementById(id)?.value.trim() || ''; }
function numberValue(id) { const n = Number(document.getElementById(id)?.value); return Number.isFinite(n) && n > 0 ? n : null; }
