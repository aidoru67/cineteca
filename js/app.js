import * as api from './api.js';
import * as films from './films.js';
import { debounce } from './utils.js';
import { showToast } from './ui.js';
import { updateStats } from './stats.js';
import { initAdmin } from './admin.js';
import { initExport } from './export.js';
import { initAdvancedSearch, refreshGenres, refreshCollections } from './advanced-search.js';

async function loadCatalog(){
  const grid=document.getElementById('grid');
  try{
    const data=await api.loadFilms();
    films.setFilms(data);films.buildTags();films.updateTagUI();films.buildSagas();films.updateSagaUI();refreshGenres(films.getAllGenres());refreshCollections(films.getAllSagas(), films.getAllMediaTypes());films.render();
    document.getElementById('header-count').textContent=`${data.length} film · ordinati per titolo`;
    updateStats(data);
  }catch(e){grid.innerHTML=`<div class="state-msg"><strong>!</strong>Errore: ${escapeText(e.message)}<br><small>Controlla la configurazione Supabase.</small></div>`}
}
function escapeText(v){const d=document.createElement('div');d.textContent=v;return d.innerHTML}

initAdvancedSearch({ onChange: value => films.setAdvancedFilters(value), getFilters: films.getAdvancedFilters, getGenres: films.getAllGenres });

const search=document.getElementById('search');search.addEventListener('input',debounce(e=>films.setSearch(e.target.value),120));
document.getElementById('genre-toggle').addEventListener('click',films.togglePanel);
document.getElementById('saga-toggle')?.addEventListener('click',films.toggleSagaPanel);
films.buildSagas(); films.updateSagaUI();
window.addEventListener('cineteca:dvd-filter', e => films.setDvdOnly(Boolean(e.detail?.active)));
films.updateDvdUI();
document.getElementById('modal-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget)films.closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')films.closeModal()});

// Piccolo adattatore per il modulo admin: gli fornisce il catalogo corrente senza duplicarlo.
loadCatalog.getFilms=films.getFilms;
initAdmin(loadCatalog);
  initExport(films.getFilms, msg => { const el = document.getElementById('export-status'); if (el) el.textContent = msg; });
loadCatalog.getFilms=films.getFilms;
loadCatalog();
