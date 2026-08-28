import { CONFIG } from './config.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

async function getAuthHeaders(extra = {}) {
  let accessToken = CONFIG.supabaseAnonKey;
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth session timeout')), 2000))
    ]);
    const session = result?.data?.session;
    if (session?.access_token) accessToken = session.access_token;
  } catch {
    // Public catalog access must not depend on Supabase Auth.
  }
  return {
    apikey: CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function request(url, options = {}) {
  const authHeaders = await getAuthHeaders(options.headers || {});
  const response = await fetch(url, { ...options, headers: authHeaders });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || data?.error_description || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function loadFilms() {
  const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${CONFIG.filmsTable}?select=*&order=title.asc`, {
    headers: { apikey: CONFIG.supabaseAnonKey, Accept: 'application/json' }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }
  return data;
}

export async function searchFilm(title) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/search-film`, { method:'POST', body:JSON.stringify({ title }) });
}

export async function addFilm(tmdb_id, saga = '', mediaTypes = []) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/add-film`, { method:'POST', body:JSON.stringify({ tmdb_id, saga, media_types: mediaTypes }) });
}

export async function editFilm(id, saga = '', mediaTypes = []) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/edit-film`, { method:'POST', body:JSON.stringify({ id, saga, media_types: mediaTypes }) });
}

export async function refreshFilm(tmdb_id) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/refresh-film`, { method:'POST', body:JSON.stringify({ tmdb_id }) });
}

export async function refreshAllBatch(offset = 0, limit = CONFIG.batchSize) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/refresh-all`, { method:'POST', body:JSON.stringify({ offset, limit }) });
}

export async function adminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data?.session?.access_token) throw new Error('Supabase non ha restituito una sessione valida');
  return data;
}

export async function adminLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAdminSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function refreshAdminSession() {
  const { data: { session }, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return session;
}

export function isAdminAuthenticated() {
  return Boolean(supabase.auth.getSession);
}

export function getPublicConfig() { return CONFIG; }

export async function deleteFilm(id) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/delete-film`, { method:'POST', body:JSON.stringify({ id }) });
}

export async function mergeFilms(keeper_id, duplicate_ids) {
  return request(`${CONFIG.supabaseUrl}/functions/v1/merge-films`, { method:'POST', body:JSON.stringify({ keeper_id, duplicate_ids }) });
}
