import { esc, fallbackPoster } from './utils.js';

let films = [];
let activeGenres = new Set();
let activeSagas = new Set();
let dvdOnly = false;
let searchQuery = '';
let advancedFilters = { yearFrom:null, yearTo:null, director:'', original:'', runtimeFrom:null, runtimeTo:null, genre:'', saga:'', media:'' };
let onFilterChanged = () => {};

export function setFilms(value) { films = Array.isArray(value) ? value : []; }
export function getFilms() { return films; }
export function getActiveGenres() { return activeGenres; }
export function getActiveSagas() { return activeSagas; }
export function setFilterListener(fn) { onFilterChanged = fn; }

export function buildTags() {
  const all = new Set();
  films.forEach(f => (f.genres || []).forEach(g => all.add(g)));
  const container = document.getElementById('tags');
  container.innerHTML = '';
  const clear = document.createElement('button');
  clear.className = 'tag tag-clear'; clear.type = 'button'; clear.textContent = '✕ tutti';
  clear.addEventListener('click', () => { activeGenres.clear(); updateTagUI(); render(); onFilterChanged(); });
  container.appendChild(clear);
  [...all].sort((a,b)=>a.localeCompare(b,'it')).forEach(g => {
    const btn = document.createElement('button'); btn.className='tag'; btn.type='button'; btn.dataset.genre=g; btn.textContent=g;
    btn.addEventListener('click', () => { activeGenres.has(g) ? activeGenres.delete(g) : activeGenres.add(g); updateTagUI(); render(); onFilterChanged(); });
    container.appendChild(btn);
  });
  if (window.innerWidth >= 641) openPanel();
}


export function buildSagas() {
  const all = getAllSagas();
  const container = document.getElementById('saga-tags');
  if (!container) return;
  container.innerHTML = '';
  const clear = document.createElement('button');
  clear.className = 'tag tag-clear'; clear.type = 'button'; clear.textContent = '✕ tutte';
  clear.addEventListener('click', () => { activeSagas.clear(); updateSagaUI(); render(); onFilterChanged(); });
  container.appendChild(clear);
  all.forEach(saga => {
    const btn = document.createElement('button'); btn.className='tag'; btn.type='button'; btn.dataset.saga=saga; btn.textContent=saga;
    btn.addEventListener('click', () => { activeSagas.has(saga) ? activeSagas.delete(saga) : activeSagas.add(saga); updateSagaUI(); render(); onFilterChanged(); });
    container.appendChild(btn);
  });
}

export function toggleSagaPanel() {
  document.getElementById('saga-panel')?.classList.toggle('open');
  document.getElementById('saga-toggle')?.classList.toggle('open');
}

export function updateSagaUI() {
  document.querySelectorAll('#saga-tags .tag[data-saga]').forEach(b => b.classList.toggle('active', activeSagas.has(b.dataset.saga)));
  const active=activeSagas.size;
  const available=getAllSagas().length;
  const toggle=document.getElementById('saga-toggle');
  const badge=document.getElementById('saga-badge');
  if(toggle) { toggle.classList.toggle('has-active', active>0); }
  if(badge) badge.textContent=available;
}

export function setDvdOnly(value){ dvdOnly=Boolean(value); updateDvdUI(); render(); onFilterChanged(); }
export function updateDvdUI() { const b=document.getElementById('dvd-toggle'); if(!b) return; b.classList.toggle('has-active',dvdOnly); b.setAttribute('aria-pressed',String(dvdOnly)); }

export function updateTagUI() {
  document.querySelectorAll('.tag[data-genre]').forEach(b => b.classList.toggle('active', activeGenres.has(b.dataset.genre)));
  const n=activeGenres.size; document.getElementById('genre-toggle').classList.toggle('has-active',n>0); document.getElementById('genre-badge').textContent=n;
}

export function togglePanel() {
  document.getElementById('tags-panel').classList.toggle('open');
  document.getElementById('genre-toggle').classList.toggle('open');
}
function openPanel(){document.getElementById('tags-panel').classList.add('open');document.getElementById('genre-toggle').classList.add('open')}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        cur[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev.splice(0, prev.length, ...cur);
  }
  return prev[b.length];
}

function tokenScore(query, value) {
  const q = normalizeText(query);
  const text = normalizeText(value);
  if (!q || !text) return 0;
  if (text === q) return 1;
  if (text.includes(q)) return 0.95;
  const qTokens = q.split(' ');
  const tTokens = text.split(' ');
  let hits = 0;
  for (const qt of qTokens) {
    if (tTokens.some(tt => tt === qt)) hits += 1;
    else if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt))) hits += 0.75;
    else {
      const nearest = Math.min(...tTokens.map(tt => levenshtein(qt, tt)));
      const threshold = qt.length >= 6 ? 2 : 1;
      if (nearest <= threshold) hits += 0.5;
    }
  }
  return qTokens.length ? hits / qTokens.length * 0.9 : 0;
}

function searchScore(f, query) {
  const fields = [
    [f.title, 1.00],
    [f.original_title, 0.95],
    [f.director, 0.90],
    [f.synopsis, 0.45]
  ];
  let best = 0;
  for (const [value, weight] of fields) best = Math.max(best, tokenScore(query, value) * weight);
  return best;
}

function filtered() {
  const q=searchQuery.trim();
  const a=advancedFilters;
  return films.filter(f => {
    if(activeGenres.size && !(f.genres||[]).some(g=>activeGenres.has(g))) return false;
    if(activeSagas.size && !(activeSagas.has(f.saga) || (f.sagas||[]).some(g=>activeSagas.has(g)))) return false;
    if(dvdOnly && !((f.media_type||'').toUpperCase()==='DVD' || (f.media_types||[]).some(g=>String(g).toUpperCase()==='DVD'))) return false;
    if(q && searchScore(f, q) < 0.32) return false;
    if(a.genre && !(f.genres||[]).some(g=>g===a.genre)) return false;
    if(a.saga && !((f.saga && f.saga===a.saga) || (f.sagas||[]).some(g=>g===a.saga))) return false;
    if(a.media && !((f.media_type && f.media_type===a.media) || (f.media_types||[]).some(g=>g===a.media))) return false;
    if(a.director && !tokenScore(a.director, f.director)) return false;
    if(a.original && !tokenScore(a.original, f.original_title)) return false;
    if(a.yearFrom && (!f.year || Number(f.year)<a.yearFrom)) return false;
    if(a.yearTo && (!f.year || Number(f.year)>a.yearTo)) return false;
    if(a.runtimeFrom && (!f.runtime || Number(f.runtime)<a.runtimeFrom)) return false;
    if(a.runtimeTo && (!f.runtime || Number(f.runtime)>a.runtimeTo)) return false;
    return true;
  }).sort((x, y) => q ? searchScore(y, q) - searchScore(x, q) : normalizeText(x.title).localeCompare(normalizeText(y.title), 'it'));
}

export function setSearch(value){searchQuery=value;render()}
export function setAdvancedFilters(value){advancedFilters={...advancedFilters,...value};render()}
export function getAdvancedFilters(){return {...advancedFilters}}
export function getAllGenres(){const all=new Set();films.forEach(f=>(f.genres||[]).forEach(g=>all.add(g)));return [...all].sort((a,b)=>a.localeCompare(b,'it'));}
export function getAllSagas(){const all=new Set();films.forEach(f=>{if(f.saga)all.add(f.saga);(f.sagas||[]).forEach(g=>all.add(g))});return [...all].sort((a,b)=>a.localeCompare(b,'it'));}
export function getAllMediaTypes(){const order=['HD','DVD']; const all=new Set();films.forEach(f=>{if(f.media_type)all.add(f.media_type);(f.media_types||[]).forEach(g=>all.add(g))}); return [...all].sort((a,b)=>(order.indexOf(a)-order.indexOf(b))||a.localeCompare(b,'it'));}
export function getFilteredCount(){return filtered().length}

export function render() {
  const list=filtered(), grid=document.getElementById('grid');
  document.getElementById('count').innerHTML=`<span>${list.length}</span> film`;
  if(!list.length){grid.innerHTML='<div class="state-msg"><strong>∅</strong>Nessun film trovato</div>';return;}
  grid.innerHTML='';
  list.forEach((f,i)=>{
    const card=document.createElement('article');card.className='card';card.style.animationDelay=`${Math.min(i*20,300)}ms`;
    const genres=(f.genres||[]).slice(0,3).map(g=>`<span class="card-tag">${esc(g)}</span>`).join('');
    const media=[...(f.media_type?[f.media_type]:[]),...(f.media_types||[])].filter((v,i,a)=>String(v).toUpperCase()==='DVD' && a.findIndex(x=>String(x).toUpperCase()==='DVD')===i).map(g=>`<span class="card-tag media-tag">${esc(g)}</span>`).join('');
    const saga=(f.sagas||[]).map(g=>`<span class="card-tag saga-tag">${esc(g)}</span>`).join('');
    const poster=f.poster_url?`<img class="card-poster" src="${esc(f.poster_url)}" alt="${esc(f.title)}" loading="lazy">`:fallbackPoster(f.title);
    card.innerHTML=`${poster}<div class="card-body"><div class="card-title">${esc(f.title)}</div><div class="card-meta"><span class="card-year">${f.year||'—'}</span>${f.director?`<span>${esc(f.director)}</span>`:''}</div>${(genres||media||saga)?`<div class="card-genres">${genres}${saga}${media}</div>`:''}</div>`;
    const img=card.querySelector('img'); if(img) img.addEventListener('error',()=>{img.outerHTML=fallbackPoster(f.title)},{once:true});
    card.addEventListener('click',()=>openModal(f)); grid.appendChild(card);
  });
}

export function openModal(f) {
  const genres=(f.genres||[]).map(g=>`<button class="modal-tag" type="button" data-genre="${esc(g)}">${esc(g)}</button>`).join('');
  const poster=f.poster_url?`<img class="modal-poster" src="${esc(f.poster_url)}" alt="${esc(f.title)}">`:`<div class="modal-no-poster"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div>`;
  const modal=document.getElementById('modal');
  const originalTitle = f.original_title && f.original_title !== f.title
    ? `<div class="modal-original-title"><span class="modal-label">Titolo originale</span><em>${esc(f.original_title)}</em></div>`
    : '';
  const duration = f.runtime
    ? `<div class="modal-info"><span class="modal-label">Durata</span><span>${f.runtime} min</span></div>`
    : '';
  const year = f.year ? `<div class="modal-info"><span class="modal-label">Anno</span><span>${f.year}</span></div>` : '';
  const director = f.director ? `<div class="modal-info"><span class="modal-label">Regia</span><span>${esc(f.director)}</span></div>` : '';
  const rating = Number.isFinite(Number(f.vote_average)) && Number(f.vote_average) > 0
    ? `<div class="modal-info"><span class="modal-label">Voto TMDb</span><span>★ ${Number(f.vote_average).toFixed(1)}/10</span></div>`
    : '';
  const cast = Array.isArray(f.cast_names) && f.cast_names.length
    ? `<div class="modal-section"><span class="modal-label">Cast</span><div class="modal-cast">${f.cast_names.map(name => `<span class="modal-cast-name">${esc(name)}</span>`).join('')}</div></div>`
    : '';
  const tagline = f.tagline ? `<div class="modal-tagline">“${esc(f.tagline)}”</div>` : '';
  const tmdbLink = f.tmdb_id ? `<a class="modal-tmdb-link" href="https://www.themoviedb.org/movie/${encodeURIComponent(f.tmdb_id)}" target="_blank" rel="noopener noreferrer">Vedi su TMDb ↗</a>` : '';

  modal.innerHTML=`${poster}<div class="modal-content"><h2 id="modal-title" class="modal-title">${esc(f.title)}</h2>${tagline}${originalTitle}<div class="modal-details">${year}${duration}${director}${rating}</div>${genres?`<div class="modal-tags">${genres}</div>`:''}${(f.saga || f.sagas?.length)?`<div class="modal-section"><span class="modal-label">Saga / ciclo</span><div class="modal-cast">${[...(f.saga?[f.saga]:[]),...(f.sagas||[])].filter((v,i,a)=>a.indexOf(v)===i).map(s=>`<span class="modal-cast-name">${esc(s)}</span>`).join('')}</div></div>`:''}${(f.media_type || f.media_types?.length)?`<div class="modal-section"><span class="modal-label">Supporto</span><div class="modal-cast">${[...(f.media_type?[f.media_type]:[]),...(f.media_types||[])].filter((v,i,a)=>a.indexOf(v)===i).map(s=>`<span class="modal-cast-name">${esc(s)}</span>`).join('')}</div></div>`:''}${cast}${f.synopsis?`<p class="modal-synopsis">${esc(f.synopsis)}</p>`:''}<div class="modal-actions">${tmdbLink}<button class="modal-close" type="button">Chiudi</button></div></div>`;
  modal.querySelector('.modal-close').addEventListener('click',closeModal);
  modal.querySelectorAll('.modal-tag').forEach(b=>b.addEventListener('click',()=>{closeModal();const g=b.dataset.genre;activeGenres.add(g);updateTagUI();render();onFilterChanged();document.querySelector('.controls').scrollIntoView({behavior:'smooth'});}));
  document.getElementById('modal-overlay').classList.add('open');document.getElementById('modal-overlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
export function closeModal(){document.getElementById('modal-overlay').classList.remove('open');document.getElementById('modal-overlay').setAttribute('aria-hidden','true');document.body.style.overflow='';}
