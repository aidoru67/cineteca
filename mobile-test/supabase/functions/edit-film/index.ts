import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const j=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...C,"Content-Type":"application/json"}});
serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:C});try{
const b=await req.json().catch(()=>({})); const id=Number(b.id);
if(!Number.isInteger(id))return j({error:"Invalid id"},400);
const saga=typeof b.saga==="string"?b.saga.trim():null;
const media_types=Array.isArray(b.media_types)?[...new Set(b.media_types.map((x:any)=>String(x).trim()).filter(Boolean))]:[];
const {data,error}=await db.from("films").update({saga, sagas:saga?[saga]:[], media_type:media_types[0]||null, media_types, updated_at:new Date().toISOString()}).eq("id",id).select().single();
if(error)throw error;
return j({updated:true,film:data});
}catch(e:any){return j({error:e?.message??String(e)},500)}});
