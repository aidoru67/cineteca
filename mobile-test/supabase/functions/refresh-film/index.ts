import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TMDB = Deno.env.get("TMDB_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers || {}) }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tmdb_id } = await req.json();
    if (!tmdb_id) return json({ error: "Missing tmdb_id" }, { status: 400 });

    const headers = { Authorization: `Bearer ${TMDB}` };
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${tmdb_id}?language=it-IT`, { headers }),
      fetch(`https://api.themoviedb.org/3/movie/${tmdb_id}/credits?language=it-IT`, { headers })
    ]);

    if (!detailRes.ok) return json({ error: "Movie not found" }, { status: 404 });
    const detail = await detailRes.json();
    const credits = creditsRes.ok ? await creditsRes.json() : { crew: [], cast: [] };

    const director = credits.crew?.find((x: any) => x.job === "Director")?.name ?? "";
    const cast_names = (credits.cast ?? [])
      .slice(0, 8)
      .map((x: any) => x.name)
      .filter(Boolean);

    const payload = {
      title: detail.title,
      original_title: detail.original_title,
      year: detail.release_date ? Number(detail.release_date.slice(0, 4)) : null,
      runtime: detail.runtime ?? null,
      director,
      genres: detail.genres?.map((g: any) => g.name) ?? [],
      synopsis: detail.overview ?? "",
      poster_url: detail.poster_path
        ? `https://image.tmdb.org/t/p/w500${detail.poster_path}`
        : null,
      vote_average: detail.vote_average ?? null,
      tagline: detail.tagline ?? null,
      cast_names,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from("films")
      .update(payload)
      .eq("tmdb_id", tmdb_id)
      .select()
      .single();

    if (error) throw error;
    return json({ updated: true, film: data });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, { status: 500 });
  }
});
