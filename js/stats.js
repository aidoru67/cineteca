export function updateStats(films) {
  const genres=new Set(), directors=new Set(), years=new Set();
  films.forEach(f=>{(f.genres||[]).forEach(g=>genres.add(g));if(f.director)directors.add(f.director);if(f.year)years.add(f.year)});
  document.getElementById('stat-total').textContent=films.length;
  document.getElementById('stat-genres').textContent=genres.size;
  document.getElementById('stat-directors').textContent=directors.size;
  document.getElementById('stat-years').textContent=years.size;
}
