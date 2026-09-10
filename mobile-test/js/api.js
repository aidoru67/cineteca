import { CONFIG } from './config.js';

// Mobile/public build: use Supabase REST directly so the app also works
// when index.html is opened locally via file://. No external JS module is needed.
async function request(url, options = {}) {
  const headers = {
    apikey: CONFIG.supabaseAnonKey,
    Accept: 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const message = data?.message || data?.error || data?.hint || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function loadFilms() {
  const params = new URLSearchParams({
    select: '*',
    order: 'title.asc'
  });
  return request(`${CONFIG.supabaseUrl}/rest/v1/${CONFIG.filmsTable}?${params.toString()}`);
}

export function getPublicConfig() { return CONFIG; }
