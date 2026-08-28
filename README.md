# La Mia Cineteca — v1.0-alpha

Refactoring della versione originale: l'interfaccia resta una semplice GitHub Page, mentre HTML, CSS e JavaScript sono separati e le chiamate Supabase sono centralizzate.

## 1. GitHub Pages

Sostituisci il contenuto del repository con il contenuto di questa cartella e fai commit/push. Non serve npm, build o server.

## 2. Configurazione browser

Modifica `js/config.js` solo se cambiano progetto Supabase o chiave publishable/anon. Non inserire mai `service_role` o il token TMDb nel repository.

## 3. Supabase

Le Edge Functions da mantenere sono:

- `search-film`
- `add-film`
- `refresh-film`
- `refresh-all`

I secret usati dalle funzioni sono `TMDB_ACCESS_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY`.

Esegui una volta gli SQL in `supabase/sql/001_add_metadata_columns.sql` e `supabase/sql/002_get_tmdb_batch.sql` se non sono già presenti nel progetto.

Le funzioni possono essere aggiornate dal Dashboard Supabase copiando i rispettivi `index.ts`.

## 4. Uso

Il sito pubblico continua a leggere `films` tramite la chiave publishable/anon.

Il pulsante ⚙ apre il pannello Admin. Da lì puoi cercare un film su TMDb, aggiungerlo tramite `tmdb_id`, ricaricare il catalogo e avviare l'aggiornamento a batch.

## 5. Sicurezza

La chiave publishable/anon è adatta al browser quando le policy RLS sono configurate correttamente. Le chiavi privilegiate restano esclusivamente nei Secrets delle Edge Functions.

## 6. Rollback

Conserva il vecchio `index.html`. La release originale è inclusa nel pacchetto come `original-index.html` solo come riferimento; non viene usata dalla pagina.


## Statistiche Admin

Il pannello Admin include statistiche dinamiche del catalogo: copertura TMDb, durata e voto medi, generi e registi più presenti, distribuzione per decennio e principali estremi del catalogo.

### Backup ed esportazione
Nel pannello Admin sono disponibili **Backup JSON** ed **Esporta CSV**. I file vengono creati direttamente nel browser usando i dati già caricati e non vengono inviati online.

## v1.2.0-alpha.7
Admin now supports editing Saga/Ciclo and Supporto for existing films. TMDb refresh preserves local metadata.
