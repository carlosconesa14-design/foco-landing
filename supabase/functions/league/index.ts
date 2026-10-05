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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ninguna petición legítima pasa de unos pocos KB (50 eventos como mucho). */
const MAX_BODY = 16_384;

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { action?: string; id?: string; secret?: string; events?: unknown; nickname?: string; week?: string; email?: string; adult?: boolean; platform?: string; city?: string; device?: string };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "size" }, 413);
    body = JSON.parse(text);
    if (!body || typeof body !== "object") throw new Error("json");
  } catch {
    return json({ error: "json" }, 400);
  }

  // Hora del servidor: el juego la usa para que cambiar la hora del móvil no adelante nada.
  if (body.action === "time") return json({ now: Date.now() });

  try {
    // Carrera de fundadores: plazas ocupadas (público, para el mapa del mundo).
    if (body.action === "founders") return json(await rpc("founder_count", { p_city: String(body.city ?? "dubai") }));
    // Premios de la semana y últimos ganadores (público, para la landing page).
    if (body.action === "prizes") return json(await rpc("league_prizes", {}));

    if (body.action === "register") {
      // La IP solo se guarda como hash, para limitar altas masivas.
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      // Beta web: sin premios en dinero (ver migración 0006).
      const platform = body.platform === "web" ? "web" : "app";
      return json(await rpc("league_register", { p_ip_hash: await sha256(`league:${ip}`), p_platform: platform }));
    }

    if (typeof body.id !== "string" || !UUID.test(body.id) || typeof body.secret !== "string" || body.secret.length > 128) {
      return json({ error: "auth" }, 401);
    }
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
      case "founder":
        // Puesto de llegada a una ciudad nueva (los primeros reciben un ejecutivo exclusivo del juego).
        return json(
          await rpc("founder_claim", {
            p_player: body.id,
            p_city: String(body.city ?? ""),
            p_device: typeof body.device === "string" && UUID.test(body.device) ? body.device : null,
          }),
        );
      case "payouts":
        return json({ payouts: await rpc("league_payouts", { p_player: body.id }) });
      case "payout":
        return json(
          await rpc("league_request_payout", {
            p_player: body.id,
            p_week: String(body.week ?? ""),
            p_email: String(body.email ?? ""),
            p_adult: body.adult === true,
          }),
        );
      default:
        return json({ error: "action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
