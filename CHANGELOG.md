# Changelog

## 1.2.0-alpha.4
- Ricerca intelligente locale con tolleranza agli errori di battitura.
- Normalizzazione di accenti e punteggiatura.
- Ranking per pertinenza su titolo, titolo originale, regista e sinossi.
- Ordinamento alfabetico mantenuto quando non è presente una query.

## 1.1.0-alpha.0
- Aggiunta importazione multipla dal pannello Admin.
- Un titolo per riga, massimo 50 titoli per sessione.
- Ricerca sequenziale su TMDb per ridurre richieste concorrenti.
- I casi con più risultati restano da confermare manualmente.
- Inserimento tramite `add-film` senza esporre il token TMDb.
- Progress bar dedicata all'importazione multipla.

# Changelog

## v1.0.0-alpha.5
- Replaced the manual Supabase Auth REST login with the official `@supabase/supabase-js` client.
- Added persistent Auth session management with automatic token refresh.
- Admin API calls now read the current Supabase Auth session token directly.
- Improved session-expiration handling.
- Login errors are surfaced directly in the Admin panel.

## v1.0.0-alpha.4
- Added Supabase Auth protection for the Admin panel.
- Admin panel now requires email + password authentication.
- Admin access token is kept only in sessionStorage and is never written to the repository.
- API calls to Edge Functions use the authenticated Admin session token.
- Added Admin logout and expired-session handling.

## 1.1.0-alpha.1
- Migliorato il ranking dei risultati TMDb.
- Priorità a corrispondenza esatta del titolo, titolo originale e anno.
- Popolarità usata come tie-breaker.
- Evidenziato il candidato consigliato.

## 1.1.0-alpha.2
- Added duplicate detection by normalized title + year and duplicate TMDb ID.
- Added confirmation-based deletion from the Admin panel for duplicate cleanup.

## 1.2.0-alpha.0
- Added advanced catalog search: director, original title, year range, runtime range, genre.
- Filters combine with the existing text search and genre tags.
- Added reset action.

## 1.2.0-alpha.1
- Added expanded Admin catalog statistics.
- Added TMDb coverage, average runtime and average TMDb rating.
- Added top genres, top directors and films by decade.
- Added oldest/newest, longest and highest-rated film summaries.

## 1.2.0-alpha.2
- Backup JSON completo del catalogo dal pannello Admin.
- Esportazione CSV UTF-8 del catalogo.
- Download generato localmente nel browser; nessun dato viene inviato a servizi esterni.

## 1.2.0-alpha.3
- Gestione avanzata duplicati con confronto affiancato.
- Selezione record principale.
- Unione dei dati mancanti tramite Edge Function `merge-films`.
- Eliminazione dei duplicati solo dopo conferma.
