import { esc, fallbackPoster } from './utils.js';

let films = [];
let activeGenres = new Set();
let searchQuery = '';
let advancedFilters = { yearFrom:null, yearTo:null, director:'', original:'', runtimeFrom:null, runtimeTo:null, genre:'' };
let onFilterChanged = () => {};

export function setFilms(value) { films = Array.isArray(value) ? value : []; }
export function getFilms() { return films; }
export function getActiveGenres() { return activeGenres; }
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

export function updateTagUI() {
  document.querySelectorAll('.tag[data-genre]').forEach(b => b.classList.toggle('active', activeGenres.has(b.dataset.genre)));
  const n=activeGenres.size; document.getElementById('genre-toggle').classList.toggle('has-active',n>0); document.getElementById('genre-badge').textContent=n;
}

export function togglePanel() {
  document.getElementById('tags-panel').classList.toggle('open');
  document.getElementById('genre-toggle').classList.toggle('open');
}
function openPanel(){document.getElementById('tags-panel').classList.add('open');document.getElementById('genre-toggle').classList.add('open')}

function filtered() {
  const q=searchQuery.trim().toLowerCase();
  const a=advancedFilters;
  return films.filter(f => {
    if(activeGenres.size && !(f.genres||[]).some(g=>activeGenres.has(g))) return false;
    if(q){const hay=[f.title,f.original_title,f.director,f.synopsis].filter(Boolean).join(' ').toLowerCase();if(!hay.includes(q)) return false;}
    if(a.genre && !(f.genres||[]).some(g=>g===a.genre)) return false;
    if(a.director && !String(f.director||'').toLowerCase().includes(a.director.toLowerCase())) return false;
    if(a.original && !String(f.original_title||'').toLowerCase().includes(a.original.toLowerCase())) return false;
    if(a.yearFrom && (!f.year || Number(f.year)<a.yearFrom)) return false;
    if(a.yearTo && (!f.year || Number(f.year)>a.yearTo)) return false;
    if(a.runtimeFrom && (!f.runtime || Number(f.runtime)<a.runtimeFrom)) return false;
    if(a.runtimeTo && (!f.runtime || Number(f.runtime)>a.runtimeTo)) return false;
    return true;
  });
}

export function setSearch(value){searchQuery=value;render()}
export function setAdvancedFilters(value){advancedFilters={...advancedFilters,...value};render()}
export function getAdvancedFilters(){return {...advancedFilters}}
export function getAllGenres(){const all=new Set();films.forEach(f=>(f.genres||[]).forEach(g=>all.add(g)));return [...all].sort((a,b)=>a.localeCompare(b,'it'));}
export function getFilteredCount(){return filtered().length}

export function render() {
  const list=filtered(), grid=document.getElementById('grid');
  document.getElementById('count').innerHTML=`<span>${list.length}</span> film`;
  if(!list.length){grid.innerHTML='<div class="state-msg"><strong>∅</strong>Nessun film trovato</div>';return;}
  grid.innerHTML='';
  list.forEach((f,i)=>{
    const card=document.createElement('article');card.className='card';card.style.animationDelay=`${Math.min(i*20,300)}ms`;
    const genres=(f.genres||[]).slice(0,3).map(g=>`<span class="card-tag">${esc(g)}</span>`).join('');
    const poster=f.poster_url?`<img class="card-poster" src="${esc(f.poster_url)}" alt="${esc(f.title)}" loading="lazy">`:fallbackPoster(f.title);
    card.innerHTML=`${poster}<div class="card-body"><div class="card-title">${esc(f.title)}</div><div class="card-meta"><span class="card-year">${f.year||'—'}</span>${f.director?`<span>${esc(f.director)}</span>`:''}</div>${genres?`<div class="card-genres">${genres}</div>`:''}</div>`;
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

  modal.innerHTML=`${poster}<div class="modal-content"><h2 id="modal-title" class="modal-title">${esc(f.title)}</h2>${originalTitle}<div class="modal-details">${year}${duration}${director}</div>${genres?`<div class="modal-tags">${genres}</div>`:''}${f.synopsis?`<p class="modal-synopsis">${esc(f.synopsis)}</p>`:''}<button class="modal-close" type="button">Chiudi</button></div>`;
  modal.querySelector('.modal-close').addEventListener('click',closeModal);
  modal.querySelectorAll('.modal-tag').forEach(b=>b.addEventListener('click',()=>{closeModal();const g=b.dataset.genre;activeGenres.add(g);updateTagUI();render();onFilterChanged();document.querySelector('.controls').scrollIntoView({behavior:'smooth'});}));
  document.getElementById('modal-overlay').classList.add('open');document.getElementById('modal-overlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
export function closeModal(){document.getElementById('modal-overlay').classList.remove('open');document.getElementById('modal-overlay').setAttribute('aria-hidden','true');document.body.style.overflow='';}
