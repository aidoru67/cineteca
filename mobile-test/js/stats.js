function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRuntime(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

function renderBars(container, entries, formatter = (value) => String(value), limit = 6) {
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = '<div class="stats-empty">Nessun dato disponibile</div>';
    return;
  }

  const top = entries.slice(0, limit);
  const max = top[0]?.[1] || 1;
  container.innerHTML = top.map(([label, value]) => `
    <div class="stats-bar-row">
      <div class="stats-bar-head"><span>${escapeHtml(label)}</span><strong>${formatter(value)}</strong></div>
      <div class="stats-bar"><span style="width:${Math.max(6, (value / max) * 100)}%"></span></div>
    </div>
  `).join('');
}

function countMap(items) {
  const map = new Map();
  items.forEach(item => {
    if (!item) return;
    map.set(item, (map.get(item) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'it'));
}

export function updateStats(films) {
  const genres = [];
  const directors = [];
  const years = [];
  const decadeItems = [];
  let runtimeTotal = 0;
  let runtimeCount = 0;
  let ratingTotal = 0;
  let ratingCount = 0;
  let withTmdb = 0;

  films.forEach(film => {
    (film.genres || []).forEach(g => genres.push(g));
    if (film.director) directors.push(film.director);
    if (film.year) {
      years.push(Number(film.year));
      const decade = Math.floor(Number(film.year) / 10) * 10;
      decadeItems.push(`${decade}s`);
    }
    if (film.runtime) {
      runtimeTotal += Number(film.runtime);
      runtimeCount++;
    }
    if (film.vote_average !== null && film.vote_average !== undefined && film.vote_average !== '') {
      ratingTotal += Number(film.vote_average);
      ratingCount++;
    }
    if (film.tmdb_id) withTmdb++;
  });

  const genreEntries = countMap(genres);
  const directorEntries = countMap(directors);
  const decadeEntries = countMap(decadeItems);
  const sortedYears = [...years].sort((a, b) => a - b);

  document.getElementById('stat-total').textContent = films.length;
  document.getElementById('stat-genres').textContent = genreEntries.length;
  document.getElementById('stat-directors').textContent = directorEntries.length;
  document.getElementById('stat-years').textContent = sortedYears.length;
  document.getElementById('stat-with-tmdb').textContent = withTmdb;
  document.getElementById('stat-runtime').textContent = runtimeCount ? formatRuntime(Math.round(runtimeTotal / runtimeCount)) : '—';
  document.getElementById('stat-rating').textContent = ratingCount ? (ratingTotal / ratingCount).toFixed(1) : '—';
  document.getElementById('stat-range').textContent = sortedYears.length ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : '—';

  renderBars(document.getElementById('stats-genres-list'), genreEntries);
  renderBars(document.getElementById('stats-directors-list'), directorEntries, value => value === 1 ? '1 film' : `${value} film`);
  renderBars(document.getElementById('stats-decades-list'), decadeEntries, value => value === 1 ? '1 film' : `${value} film`, 8);

  const extremes = document.getElementById('stats-extremes');
  if (extremes) {
    const oldest = films.filter(f => f.year).sort((a, b) => Number(a.year) - Number(b.year))[0];
    const newest = films.filter(f => f.year).sort((a, b) => Number(b.year) - Number(a.year))[0];
    const longest = films.filter(f => f.runtime).sort((a, b) => Number(b.runtime) - Number(a.runtime))[0];
    const topRated = films.filter(f => f.vote_average !== null && f.vote_average !== undefined).sort((a, b) => Number(b.vote_average) - Number(a.vote_average))[0];

    extremes.innerHTML = [
      ['Più vecchio', oldest ? `${oldest.title} (${oldest.year})` : '—'],
      ['Più recente', newest ? `${newest.title} (${newest.year})` : '—'],
      ['Più lungo', longest ? `${longest.title} · ${formatRuntime(Number(longest.runtime))}` : '—'],
      ['Voto più alto', topRated ? `${topRated.title} · ${Number(topRated.vote_average).toFixed(1)}` : '—']
    ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }
}
