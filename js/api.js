import { CONFIG } from './config.js';

let adminAccessToken = sessionStorage.getItem('cineteca_admin_access_token') || '';

const headers = (options = {}) => ({
  apikey: CONFIG.supabaseAnonKey,
  Authorization: `Bearer ${adminAccessToken || CONFIG.supabaseAnonKey}`,
  'Content-Type': 'application/json',
  ...(options.headers || {})
});

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: headers(options) });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
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

export async function adminLogin(email, password) {
  const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: CONFIG.supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || data?.message || 'Credenziali non valide');
  }

  if (!data?.access_token) throw new Error('Supabase non ha restituito una sessione valida');

  adminAccessToken = data.access_token;
  sessionStorage.setItem('cineteca_admin_access_token', adminAccessToken);
  if (data.refresh_token) sessionStorage.setItem('cineteca_admin_refresh_token', data.refresh_token);
  return data;
}

export function adminLogout() {
  adminAccessToken = '';
  sessionStorage.removeItem('cineteca_admin_access_token');
  sessionStorage.removeItem('cineteca_admin_refresh_token');
}

export function isAdminAuthenticated() {
  return Boolean(adminAccessToken);
}

export function getPublicConfig() { return CONFIG; }
