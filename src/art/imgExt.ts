/**
 * Formato de las imágenes del juego: WebP (3–5 veces más ligero; ver scripts/build-webp.mjs) si el
 * navegador lo lee, y si no, el PNG original. Android lo dice al codificar un canvas; Safari lo lee
 * desde iOS 14 aunque no lo codifique, así que se mira la versión.
 */
function webpOk(): boolean {
  try {
    if (typeof document !== "undefined" && document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp")) return true;
  } catch {
    /* sin canvas: se mira el navegador */
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
  const m = ua.match(/(?:iPhone|iPad|iPod).* OS (\d+)_/) ?? ua.match(/Version\/(\d+)[.\d]* (?:Mobile\/\S+ )?Safari/);
  return !!m && Number(m[1]) >= 14;
}

export const IMG_EXT = webpOk() ? "webp" : "png";
