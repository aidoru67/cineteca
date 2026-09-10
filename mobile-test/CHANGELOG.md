# Changelog

## 1.2-mobile.3
- Fixed local execution of the mobile frontend.
- Removed the dependency on the external `@supabase/supabase-js` browser module for the public/mobile catalog.
- Catalog loading now uses Supabase REST directly with the existing publishable key.
- No database, Supabase schema, Edge Function, or catalog data changes.
