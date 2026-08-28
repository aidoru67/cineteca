export function esc(value) {
  if (value == null) return '';
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

export function debounce(fn, delay = 180) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function fallbackPoster(title) {
  return `<div class="poster-fallback"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4M12 17v4"/></svg><span>${esc(title)}</span></div>`;
}
