create or replace function public.get_tmdb_batch(
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (tmdb_id integer)
language sql
as $$
  select tmdb_id
  from public.films
  where tmdb_id is not null
  order by id
  limit p_limit
  offset p_offset;
$$;
