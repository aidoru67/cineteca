import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TMDB = Deno.env.get("TMDB_ACCESS_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...corsHeaders, ...(init.headers || {}) }
  });
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractYear(query: string): number | null {
  const match = query.match(/(?:^|\s|\(|\[)(19\d{2}|20\d{2})(?:\s|\)|\])?$/);
  return match ? Number(match[1]) : null;
}

function titleScore(query: string, movie: any): number {
  const q = normalize(query);
  const title = normalize(movie.title);
  const original = normalize(movie.original_title);
  const yearWanted = extractYear(query);
  const year = movie.release_date ? Number(String(movie.release_date).slice(0, 4)) : null;

  let score = 0;

  if (title === q) score += 1000;
  else if (original && original === q) score += 960;
  else if (title.startsWith(q)) score += 700;
  else if (original && original.startsWith(q)) score += 660;
  else if (title.includes(q)) score += 500;
  else if (original && original.includes(q)) score += 460;
  else {
    const qTokens = q.split(" ").filter(Boolean);
    const titleTokens = new Set(`${title} ${original}`.trim().split(" ").filter(Boolean));
    const overlap = qTokens.filter(token => titleTokens.has(token)).length;
    score += overlap * 80;
  }

  if (yearWanted && year === yearWanted) score += 800;
  else if (yearWanted && year && Math.abs(year - yearWanted) <= 1) score += 120;

  // Popularity is used only as a tie-breaker, not as the main criterion.
  score += Math.min(Number(movie.popularity || 0), 100) * 0.5;

  // Favor films with a poster when relevance is otherwise comparable.
  if (movie.poster_path) score += 5;

  return score;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = String(body.title ?? "").trim();

    if (!rawTitle) {
      return json({ error: "Missing title" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?language=it-IT&include_adult=false&query=${encodeURIComponent(rawTitle)}`,
      {
        headers: {
          Authorization: `Bearer ${TMDB}`
        }
      }
    );

    if (!res.ok) {
      throw new Error(`TMDb HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const ranked = results
      .map((movie: any) => ({ movie, score: titleScore(rawTitle, movie) }))
      .sort((a: any, b: any) => b.score - a.score)
      .map(({ movie, score }: any, index: number) => ({
        tmdb_id: movie.id,
        title: movie.title,
        original_title: movie.original_title || null,
        year: movie.release_date
          ? Number(String(movie.release_date).slice(0, 4))
          : null,
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
          : null,
        popularity: Number(movie.popularity || 0),
        match_score: Math.round(score * 10) / 10,
        recommended: index === 0 && score >= 900
      }));

    return json(ranked);
  } catch (e: any) {
    return json({ error: e?.message || "Search failed" }, { status: 500 });
  }
});
