import * as api from './api.js';
import { updateStats } from './stats.js';
import { setProgress, showToast } from './ui.js';
import { esc } from './utils.js';

let reloadCatalog = async()=>{};
export function initAdmin(reloadFn){
  reloadCatalog=reloadFn;
  const panel=document.getElementById('admin-panel');
  const close=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
  document.getElementById('admin-open').addEventListener('click',()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false');updateStats(reloadCatalog.getFilms?.()||[])});
  document.getElementById('admin-close').addEventListener('click',close);document.getElementById('admin-backdrop').addEventListener('click',close);
  document.getElementById('tmdb-search-btn').addEventListener('click',search);
  document.getElementById('tmdb-search').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
  document.getElementById('refresh-all-btn').addEventListener('click',refreshAll);
  document.getElementById('reload-btn').addEventListener('click',async()=>{await reloadCatalog();showToast('Catalogo aggiornato')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
}

async function search(){
  const input=document.getElementById('tmdb-search'),q=input.value.trim(),box=document.getElementById('tmdb-results');
  if(!q)return;box.innerHTML='<div class="admin-note">Ricerca…</div>';
  try{const results=await api.searchFilm(q);box.innerHTML='';if(!results.length){box.innerHTML='<div class="admin-note">Nessun risultato.</div>';return}
    results.forEach(movie=>{const row=document.createElement('div');row.className='tmdb-result';row.innerHTML=`${movie.poster_url?`<img src="${esc(movie.poster_url)}" alt="">`:'<div class="no-thumb"></div>'}<div><div class="tmdb-result-title">${esc(movie.title)}</div><div class="tmdb-result-meta">${movie.year||'—'} · TMDb ${movie.tmdb_id}</div></div><button class="admin-btn primary" type="button">+</button>`;row.querySelector('button').addEventListener('click',()=>add(movie,row));box.appendChild(row)});
  }catch(e){box.innerHTML=`<div class="admin-note">Errore: ${esc(e.message)}</div>`}
}

async function add(movie,row){const btn=row.querySelector('button');btn.disabled=true;btn.textContent='…';try{const result=await api.addFilm(movie.tmdb_id);if(result.inserted){showToast(`${movie.title} aggiunto`);await reloadCatalog();btn.textContent='✓'}else{showToast('Film già presente');btn.textContent='✓'}}catch(e){showToast(`Errore: ${e.message}`);btn.disabled=false;btn.textContent='+'}}

async function refreshAll(){
  const btn=document.getElementById('refresh-all-btn');btn.disabled=true;document.getElementById('progress-wrap').hidden=false;
  try{
    const films=reloadCatalog.getFilms?.()||[];const total=films.length;let offset=0,processed=0;
    if(!total){showToast('Catalogo vuoto');return}
    while(offset<total){const result=await api.refreshAllBatch(offset,Math.min(10,total-offset));processed+=result.processed||0;offset=result.next_offset??offset+(result.processed||0);setProgress(processed,total,`Aggiornati ${processed} / ${total}`);if(!result.processed)break}
    await reloadCatalog();setProgress(total,total,'Aggiornamento completato');showToast(`Aggiornamento completato: ${processed} film`);
  }catch(e){showToast(`Aggiornamento interrotto: ${e.message}`,5000)}finally{btn.disabled=false}
}
