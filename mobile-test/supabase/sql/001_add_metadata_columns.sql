alter table public.films
  add column if not exists original_title text,
  add column if not exists runtime integer,
  add column if not exists vote_average numeric(3,1),
  add column if not exists updated_at timestamptz;
