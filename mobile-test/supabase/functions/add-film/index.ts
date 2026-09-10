import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const TMDB=Deno.env.get("TMDB_ACCESS_TOKEN")!;const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

serve(async(req)=>{if(req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });try{const {tmdb_id}=await req.json();if(!tmdb_id)return json({error:"Missing tmdb_id"},{status:400});const {data:exists}=await db.from("films").select("id,title").eq("tmdb_id",tmdb_id).maybeSingle();if(exists)return json({inserted:false,reason:"already_exists",film:exists});const h={Authorization:`Bearer ${TMDB}`};const [dRes,cRes]=await Promise.all([fetch(`https://api.themoviedb.org/3/movie/${tmdb_id}?language=it-IT`,{headers:h}),fetch(`https://api.themoviedb.org/3/movie/${tmdb_id}/credits`,{headers:h})]);if(!dRes.ok)return json({error:"Film non trovato su TMDb"},{status:404});const d=await dRes.json(),c=await cRes.json();const director=c.crew?.find((x:any)=>x.job==="Director")?.name??"";const {data,error}=await db.from("films").insert({tmdb_id,title:d.title,original_title:d.original_title,year:d.release_date?Number(d.release_date.slice(0,4)):null,runtime:d.runtime,director,genres:d.genres?.map((g:any)=>g.name)??[],synopsis:d.overview,poster_url:d.poster_path?`https://image.tmdb.org/t/p/w500${d.poster_path}`:null,vote_average:d.vote_average,updated_at:new Date().toISOString()}).select().single();if(error)throw error;return json({inserted:true,film:data});}catch(e:any){return json({error:e.message},{status:500})}});
