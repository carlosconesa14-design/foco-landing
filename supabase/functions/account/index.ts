// Edge Function «account»: cuentas anónimas del juego (invitar a amigos y partida en la nube).
// Misma autenticación que la Liga: id + clave secreta que el juego guarda en el móvil.
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
/** Una partida ocupa unas decenas de KB; el servidor limita a 300 KB. */
const MAX_BODY = 320_000;

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { action?: string; id?: string; secret?: string; code?: string; save?: string; earned?: number; recovery?: string };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "size" }, 413);
    body = JSON.parse(text);
    if (!body || typeof body !== "object") throw new Error("json");
  } catch {
    return json({ error: "json" }, 400);
  }

  try {
    // La IP solo se guarda como hash: limita altas y que se prueben claves a lo bruto.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (body.action === "register") return json(await rpc("account_register", { p_ip_hash: await sha256(`account:${ip}`) }));
    if (body.action === "recover") {
      return json(await rpc("save_recover", { p_recovery: String(body.recovery ?? "").slice(0, 40), p_ip_hash: await sha256(`account:${ip}`) }));
    }

    if (typeof body.id !== "string" || !UUID.test(body.id) || typeof body.secret !== "string" || body.secret.length > 128) {
      return json({ error: "auth" }, 401);
    }
    const ok = await rpc("account_auth", { p_id: body.id, p_secret: body.secret });
    if (!ok) return json({ error: "auth" }, 401);

    switch (body.action) {
      case "ref_status":
        return json(await rpc("ref_status", { p_player: body.id }));
      case "ref_use":
        return json(await rpc("ref_use", { p_friend: body.id, p_code: String(body.code ?? "").slice(0, 12) }));
      case "ref_qualify":
        return json(await rpc("ref_qualify", { p_friend: body.id }));
      case "ref_claim":
        return json(await rpc("ref_claim", { p_player: body.id }));
      case "save":
        return json(await rpc("save_put", { p_player: body.id, p_save: typeof body.save === "string" ? body.save : null, p_earned: Number(body.earned) || 0 }));
      default:
        return json({ error: "action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
