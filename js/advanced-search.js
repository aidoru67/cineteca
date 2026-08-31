import { esc } from './utils.js';

let applyFilters = () => {};
let getState = () => ({});
let genreSelect;

export function initAdvancedSearch({ onChange, getFilters, getGenres }) {
  applyFilters = onChange;
  getState = getFilters;

  const toggle = document.getElementById('advanced-toggle');
  const panel = document.getElementById('advanced-panel');
  genreSelect = document.getElementById('advanced-genre');

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
  document.getElementById('advanced-clear')?.addEventListener('click', clear);

  refreshGenres(getGenres());
}

export function refreshGenres(genres) {
  if (!genreSelect) genreSelect = document.getElementById('advanced-genre');
  if (!genreSelect) return;
  const current = genreSelect.value;
  genreSelect.innerHTML = `<option value="">Tutti i generi</option>` + genres.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  if (genres.includes(current)) genreSelect.value = current;
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
    genre: genreSelect?.value || ''
  };
}

export function getAdvancedFilters() {
  return { ...readForm(), ...getState() };
}

export function clear() {
  ['advanced-year-from','advanced-year-to','advanced-director','advanced-original','advanced-runtime-from','advanced-runtime-to'].forEach(id => { const el=document.getElementById(id); if (el) el.value=''; });
  if (genreSelect) genreSelect.value='';
  applyFilters(readForm());
}

function value(id) { return document.getElementById(id)?.value.trim() || ''; }
function numberValue(id) { const n = Number(document.getElementById(id)?.value); return Number.isFinite(n) && n > 0 ? n : null; }
