# Changelog

## 1.2.0-alpha.13

- Restored the catalog-loading path used by the last known-good release.
- Removed the direct REST loading variation that could leave the public page stuck on “Connessione a Supabase…”.
- Added a version query to the main ES module URL to prevent stale GitHub Pages/browser module caching after deploy.
- Preserved all saga, DVD, advanced search, statistics, import/export, duplicate-management and Admin functionality.
