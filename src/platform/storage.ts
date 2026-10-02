import { Preferences } from "@capacitor/preferences";

/**
 * Guardado persistente: Preferences usa almacenamiento nativo en móvil y localStorage en web.
 * Cada guardado lleva una firma: si alguien edita la partida a mano, se nota al cargarla.
 * No es infalible (la clave va dentro de la app), pero frena la edición casual y deja una señal
 * que se informa a la Liga para revisarla. Nunca se borra ni se castiga la partida por ello.
 *
 * Formato: `s1:<firma>:<json>` en una sola escritura (así la firma y los datos nunca se desparejan).
 * Las partidas antiguas (solo `<json>`) se aceptan y se firman al guardar.
 */
const KEY = "rider-millonario-save";
const PREFIX = "s1:";
const SALT = "rm:7f3c9a1e:save:v1";

async function sign(json: string): Promise<string | null> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + json));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null; // sin crypto.subtle (contexto no seguro): sin firma
  }
}

/** Separa firma y datos. Exportado para los tests. */
export async function decodeSave(value: string): Promise<{ data: unknown; tampered: boolean }> {
  if (!value.startsWith(PREFIX)) return { data: JSON.parse(value), tampered: false };
  const rest = value.slice(PREFIX.length);
  const cut = rest.indexOf(":");
  const sig = rest.slice(0, cut);
  const json = rest.slice(cut + 1);
  const expected = await sign(json);
  return { data: JSON.parse(json), tampered: !!expected && sig !== expected };
}

export async function encodeSave(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const sig = await sign(json);
  return sig ? `${PREFIX}${sig}:${json}` : json;
}

/** Carga la partida. `tampered` es true si la firma no coincide con el contenido. */
export async function loadSave(): Promise<{ data: unknown; tampered: boolean }> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return value ? await decodeSave(value) : { data: null, tampered: false };
  } catch {
    return { data: null, tampered: false };
  }
}

/** Los guardados van en fila: uno lento nunca pisa a uno más reciente. */
let queue: Promise<void> = Promise.resolve();

export function writeSave(data: unknown): Promise<void> {
  const value = encodeSave(data);
  queue = queue.then(async () => {
    try {
      await Preferences.set({ key: KEY, value: await value });
    } catch {
      /* sin almacenamiento disponible: la partida sigue en memoria */
    }
  });
  return queue;
}

export async function clearSave(): Promise<void> {
  try {
    await Preferences.remove({ key: KEY });
  } catch {
    /* nada que borrar */
  }
}
