// Edge Function «league»: única puerta de la Liga Millonario.
// Autenticación propia: cada jugador tiene un id y una clave secreta que el juego guarda en el móvil.
// La base de datos (RLS sin políticas) solo es accesible con la clave de servicio, desde aquí.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { action?: string; id?: string; secret?: string; events?: unknown; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }

  try {
    if (body.action === "register") {
      // La IP solo se guarda como hash, para limitar altas masivas.
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      return json(await rpc("league_register", { p_ip_hash: await sha256(`league:${ip}`) }));
    }

    if (typeof body.id !== "string" || typeof body.secret !== "string") return json({ error: "auth" }, 401);
    const ok = await rpc("league_auth", { p_id: body.id, p_secret: body.secret });
    if (!ok) return json({ error: "auth" }, 401);

    switch (body.action) {
      case "status":
        return json(await rpc("league_status", { p_player: body.id }));
      case "events": {
        const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
        const res = await rpc("league_add_events", { p_player: body.id, p_events: events });
        return json(res);
      }
      case "nickname":
        return json(await rpc("league_set_nickname", { p_player: body.id, p_nick: String(body.nickname ?? "") }));
      case "claim":
        return json(await rpc("league_claim", { p_player: body.id }));
      default:
        return json({ error: "action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
