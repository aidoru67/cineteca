import { CONFIG } from './config.js';

const headers = () => ({
  apikey: CONFIG.supabaseAnonKey,
  Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
  'Content-Type': 'application/json'
});

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  return data;
}

export async function loadFilms() {
  return request(`${CONFIG.supabaseUrl}/rest/v1/${CONFIG.filmsTable}?select=*&order=title.asc`);
}

export async function searchFilm(title) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/search-film`, { method:'POST', body:JSON.stringify({ title }) });
}

export async function addFilm(tmdb_id) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/add-film`, { method:'POST', body:JSON.stringify({ tmdb_id }) });
}

export async function refreshFilm(tmdb_id) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/refresh-film`, { method:'POST', body:JSON.stringify({ tmdb_id }) });
}

export async function refreshAllBatch(offset = 0, limit = CONFIG.batchSize) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/refresh-all`, { method:'POST', body:JSON.stringify({ offset, limit }) });
}

export function getPublicConfig() { return CONFIG; }
