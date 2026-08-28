ALTER TABLE public.films ADD COLUMN IF NOT EXISTS sagas text[] DEFAULT '{}'::text[], ADD COLUMN IF NOT EXISTS media_types text[] DEFAULT '{}'::text[];
