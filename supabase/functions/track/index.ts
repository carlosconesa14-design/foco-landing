// Edge Function «track»: recibe eventos de analítica anónimos (un id aleatorio por instalación).
// Solo inserta nombres permitidos y lotes pequeños (lo comprueba analytics_insert en SQL).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method !== "POST") return reply({ error: "method" }, 405);
  try {
    const text = await req.text();
    if (text.length > 32_768) return reply({ error: "size" }, 413);
    const b = JSON.parse(text);
    if (typeof b?.device !== "string" || !UUID.test(b.device) || !Array.isArray(b.events)) return reply({ error: "bad" }, 400);
    const { data, error } = await db.rpc("analytics_insert", {
      p_device: b.device,
      p_platform: String(b.platform ?? ""),
      p_version: String(b.version ?? ""),
      p_events: b.events.slice(0, 50),
    });
    if (error) throw error;
    return reply({ stored: data });
  } catch (e) {
    if (e instanceof SyntaxError) return reply({ error: "bad" }, 400);
    console.error(e);
    return reply({ error: "server" }, 500);
  }
});
