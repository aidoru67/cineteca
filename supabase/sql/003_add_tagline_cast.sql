ALTER TABLE public.films
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS cast_names text[];
