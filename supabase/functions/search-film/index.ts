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

serve(async (req) => { if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders }); try { const { title } = await req.json(); if (!title) return json({ error:"Missing title" },{status:400}); const res=await fetch(`https://api.themoviedb.org/3/search/movie?language=it-IT&query=${encodeURIComponent(title)}`,{headers:{Authorization:`Bearer ${TMDB}`}}); const data=await res.json(); return json((data.results||[]).map((m:any)=>({tmdb_id:m.id,title:m.title,year:m.release_date?Number(m.release_date.slice(0,4)):null,poster_url:m.poster_path?`https://image.tmdb.org/t/p/w200${m.poster_path}`:null}))); } catch(e:any){return json({error:e.message},{status:500})} });
