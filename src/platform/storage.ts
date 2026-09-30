import { Preferences } from "@capacitor/preferences";

/** Guardado persistente: Preferences usa almacenamiento nativo en móvil y localStorage en web. */
const KEY = "rider-millonario-save";

export async function loadSave(): Promise<unknown> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function writeSave(data: unknown): Promise<void> {
  try {
    await Preferences.set({ key: KEY, value: JSON.stringify(data) });
  } catch {
    /* sin almacenamiento disponible: la partida sigue en memoria */
  }
}

export async function clearSave(): Promise<void> {
  try {
    await Preferences.remove({ key: KEY });
  } catch {
    /* nada que borrar */
  }
}
