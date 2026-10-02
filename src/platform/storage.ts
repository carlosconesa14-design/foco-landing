import { Preferences } from "@capacitor/preferences";

/**
 * Guardado persistente: Preferences usa almacenamiento nativo en móvil y localStorage en web.
 *
 * Cada guardado lleva una firma y se escribe dos veces (partida y copia de seguridad). Si alguien
 * edita la partida a mano, la firma no cuadra y **la edición no sirve**: se carga la última copia
 * válida (o, si también se ha tocado, una partida nueva) y se apunta la señal `save`, que deja al
 * jugador fuera de los premios de la Liga hasta que se revise.
 *
 * No es infalible (la clave va dentro de la app): frena la edición casual. Lo que da dinero real
 * se comprueba además en el servidor (ver docs/SEGURIDAD.md).
 *
 * Formato: `s1:<firma>:<json>` en una sola escritura (la firma y los datos nunca se desparejan).
 * Las partidas antiguas sin firma se aceptan una vez y se firman al guardar.
 */
const KEY = "rider-millonario-save";
const BACKUP = "rider-millonario-save-ok";
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

/**
 * Separa firma y datos. `signed` dice si venía firmada. Si no se puede comprobar (sin crypto), se acepta.
 * Exportado para los tests.
 */
export async function decodeSave(value: string): Promise<{ data: unknown; tampered: boolean; signed: boolean }> {
  if (!value.startsWith(PREFIX)) return { data: JSON.parse(value), tampered: false, signed: false };
  const rest = value.slice(PREFIX.length);
  const cut = rest.indexOf(":");
  const sig = rest.slice(0, cut);
  const json = rest.slice(cut + 1);
  const expected = await sign(json);
  let data: unknown = null;
  try {
    data = JSON.parse(json);
  } catch {
    return { data: null, tampered: true, signed: true };
  }
  return { data, tampered: !!expected && sig !== expected, signed: true };
}

export async function encodeSave(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const sig = await sign(json);
  return sig ? `${PREFIX}${sig}:${json}` : json;
}

export interface LoadedSave {
  data: unknown;
  /** La partida guardada se había editado fuera del juego. */
  tampered: boolean;
  /** Se ha recuperado la última copia válida (si no, se empieza de cero). */
  restored: boolean;
}

/**
 * Decide qué partida cargar a partir de la principal y la copia. Puro, para los tests.
 * Una partida sin firma cuando ya existe una copia firmada también cuenta como editada.
 */
export async function pickSave(main: string | null, backup: string | null, canSign: boolean): Promise<LoadedSave> {
  const safe = async (v: string | null) => {
    if (!v) return null;
    try {
      return await decodeSave(v);
    } catch {
      return { data: null, tampered: true, signed: false };
    }
  };
  const m = await safe(main);
  const b = await safe(backup);
  const bValid = !!b && !b.tampered && b.data != null;
  const mEdited = !!m && (m.tampered || m.data == null || (canSign && !m.signed && !!b?.signed));
  if (m && !mEdited) return { data: m.data, tampered: false, restored: false };
  if (!m) return { data: bValid ? b!.data : null, tampered: false, restored: false };
  // La principal se ha editado: la copia válida manda; si no hay, partida nueva.
  return bValid && b!.signed ? { data: b!.data, tampered: true, restored: true } : { data: null, tampered: true, restored: false };
}

/** Carga la partida (ver `pickSave`). */
export async function loadSave(): Promise<LoadedSave> {
  try {
    const [{ value: main }, { value: backup }] = await Promise.all([Preferences.get({ key: KEY }), Preferences.get({ key: BACKUP })]);
    return await pickSave(main, backup, (await sign("")) !== null);
  } catch {
    return { data: null, tampered: false, restored: false };
  }
}

/** Los guardados van en fila: uno lento nunca pisa a uno más reciente. */
let queue: Promise<void> = Promise.resolve();

/** Tras recuperar una partida de la nube no se guarda nada más hasta recargar (no se pisa la recuperada). */
let locked = false;

export function writeSave(data: unknown): Promise<void> {
  if (locked) return queue;
  const value = encodeSave(data);
  queue = queue.then(async () => {
    try {
      const v = await value;
      await Preferences.set({ key: KEY, value: v });
      await Preferences.set({ key: BACKUP, value: v });
    } catch {
      /* sin almacenamiento disponible: la partida sigue en memoria */
    }
  });
  return queue;
}

/**
 * Sustituye la partida por una ya firmada (la recuperada de la nube) y bloquea los guardados hasta
 * recargar. Devuelve false si la firma no cuadra (partida editada): entonces no se toca nada.
 */
export async function replaceSave(value: string): Promise<boolean> {
  const d = await decodeSave(value);
  if (d.tampered || !d.signed) return false;
  locked = true;
  await queue;
  try {
    await Preferences.set({ key: KEY, value });
    await Preferences.set({ key: BACKUP, value });
  } catch {
    locked = false;
    return false;
  }
  return true;
}

export async function clearSave(): Promise<void> {
  try {
    await Preferences.remove({ key: KEY });
    await Preferences.remove({ key: BACKUP });
  } catch {
    /* nada que borrar */
  }
}
