const SUFFIXES = ["", "K", "M", "B", "T"];

/** 1234 -> "1.23 K"; después de T sigue con aa, ab, ac… como los idle clásicos. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(2) : Math.floor(n).toString();
  const e = Math.floor(Math.log10(n) / 3);
  let suffix = SUFFIXES[e];
  if (!suffix) {
    const j = e - SUFFIXES.length;
    suffix = String.fromCharCode(97 + (Math.floor(j / 26) % 26)) + String.fromCharCode(97 + (j % 26));
  }
  const v = n / Math.pow(1000, e);
  return `${v < 100 ? v.toFixed(2) : v.toFixed(1)} ${suffix}`;
}

export function fmtTime(sec: number): string {
  if (sec < 1) return `${Math.max(0, sec).toFixed(1)} s`;
  const s = Math.ceil(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  if (h) return `${h}:${pad(m)}:${pad(r)}`;
  if (m) return `${m}:${pad(r)}`;
  return `${r} s`;
}
