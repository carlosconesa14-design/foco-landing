/**
 * Genera las páginas legales (HTML) a partir de los documentos de docs/:
 *   docs/PRIVACIDAD.md  → public/legal/privacidad.html
 *   docs/BASES_LIGA.md  → public/legal/bases-liga.html
 * Se ejecuta antes de cada build, así la app y la web siempre llevan la última versión.
 * Mientras un documento tenga campos [entre corchetes] sin rellenar, la página lo avisa arriba.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const PAGES = [
  { src: "docs/PRIVACIDAD.md", out: "privacidad.html", title: "Política de privacidad" },
  { src: "docs/BASES_LIGA.md", out: "bases-liga.html", title: "Bases de la Liga Millonario" },
];

const css = `:root{color-scheme:light dark;--bg:#0e1a2b;--panel:#16263c;--ink:#eef4fb;--muted:#9fb3cf;--gold:#f5c542}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}
h1,h2,h3{line-height:1.25}h1{color:var(--gold)}a{color:var(--gold)}
table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}th,td{border:1px solid #2b4566;padding:6px 8px;text-align:left;vertical-align:top}
blockquote{margin:16px 0;padding:10px 14px;border-left:4px solid var(--gold);background:var(--panel)}
.draft{background:#7a2d22;color:#fff;padding:10px 14px;border-radius:10px;margin-bottom:16px}
nav{font-size:14px;margin-bottom:16px}`;

mkdirSync("public/legal", { recursive: true });
const links = PAGES.map((p) => `<a href="${p.out}">${p.title}</a>`).join(" · ");
for (const p of PAGES) {
  const md = readFileSync(p.src, "utf8");
  // Los avisos internos del borrador («> **Borrador…**») no van en la página pública.
  const clean = md.replace(/^> \*\*Borrador[^\n]*(\n>[^\n]*)*\n?/m, "");
  const cleaned = clean.replace(/\s*\(BORRADOR\)/g, "");
  const pending = /\[[A-ZÁÉÍÓÚÑ0-9 ]{3,}[^\]]*\]/.test(cleaned);
  const body = marked.parse(cleaned) as string;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title} · Rider Millionaire</title><style>${css}</style></head><body><main>
<nav>${links}</nav>
${pending ? `<div class="draft">Documento en preparación: aún tiene campos por completar.</div>` : ""}
${body}
</main></body></html>`;
  writeFileSync(`public/legal/${p.out}`, html);
  console.log(`legal: ${p.out}${pending ? " (con campos por completar)" : ""}`);
}
