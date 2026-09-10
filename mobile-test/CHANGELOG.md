# Changelog

## 1.2-mobile.3
- Fixed local execution of the mobile frontend.
- Removed the dependency on the external `@supabase/supabase-js` browser module for the public/mobile catalog.
- Catalog loading now uses Supabase REST directly with the existing publishable key.
- No database, Supabase schema, Edge Function, or catalog data changes.

## v1.2-mobile.4
- Fixed catalog loading error caused by the mobile/public build calling the Admin statistics updater without its DOM elements.
- No Supabase/database changes.
