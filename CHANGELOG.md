# Changelog

## v1.0.0-alpha.4
- Added Supabase Auth protection for the Admin panel.
- Admin panel now requires email + password authentication.
- Admin access token is kept only in sessionStorage and is never written to the repository.
- API calls to Edge Functions use the authenticated Admin session token.
- Added Admin logout and expired-session handling.
