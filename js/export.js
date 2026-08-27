function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  if (Array.isArray(value)) value = value.join(' | ');
  if (value === null || value === undefined) value = '';
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function initExport(getFilms, onStatus) {
  const jsonBtn = document.getElementById('export-json-btn');
  const csvBtn = document.getElementById('export-csv-btn');
  if (!jsonBtn || !csvBtn) return;

  const status = msg => onStatus?.(msg);

  jsonBtn.addEventListener('click', () => {
    const films = [...getFilms()];
    if (!films.length) { status('Il catalogo è vuoto.'); return; }
    const payload = {
      exported_at: new Date().toISOString(),
      version: '1.2.0-alpha.2',
      count: films.length,
      films
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `cineteca-backup-${timestamp()}.json`);
    status(`Backup JSON creato: ${films.length} film.`);
  });

  csvBtn.addEventListener('click', () => {
    const films = [...getFilms()];
    if (!films.length) { status('Il catalogo è vuoto.'); return; }
    const columns = ['id','title','original_title','year','runtime','director','genres','synopsis','poster_url','tmdb_id','vote_average','updated_at'];
    const rows = [columns.map(csvCell).join(',')];
    for (const film of films) rows.push(columns.map(key => csvCell(film[key])).join(','));
    const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `cineteca-export-${timestamp()}.csv`);
    status(`CSV creato: ${films.length} film.`);
  });
}
