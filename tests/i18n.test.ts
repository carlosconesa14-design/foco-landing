import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ALL_BUSINESSES, CITIES, LIFE, MISSIONS, OFFICE, TUTORIAL, VIRAL_TITLES } from "../src/game/data";
import { PRODUCTS } from "../src/game/shop";
import { lang, money, t } from "../src/i18n";
import { EN } from "../src/i18n/en";
import { EN_DATA } from "../src/i18n/data";
import { RANKS } from "../src/game/ranks";
import { LUXURY, LUXURY_CATS } from "../src/game/luxury";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });
}

/** Todas las frases que el código pasa a `t("…")`. */
const keys = [...new Set(files("src").flatMap((f) => [...readFileSync(f, "utf8").matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])))];
/** Nombres propios que no se traducen. */
const BRAND = ["Hustle", "Rider Millionaire: Idle Tycoon", "Rider Millionaire", "Rider", "Millionaire"];
const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("traducción al inglés", () => {
  it("encuentra las frases del código", () => {
    expect(keys.length).toBeGreaterThan(300);
  });

  it("todas las frases tienen traducción", () => {
    expect(keys.filter((k) => !(k in EN))).toEqual([]);
  });

  it("las traducciones conservan los {marcadores}", () => {
    const bad = Object.entries(EN).filter(([es, en]) => holes(es).join() !== holes(en).join());
    expect(bad).toEqual([]);
  });

  it("los textos visibles de index.html están traducidos", () => {
    const html = readFileSync("index.html", "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
    const texts = [...html.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter((s) => /[a-záéíóúñ]{2}/i.test(s) && !BRAND.includes(s));
    const attrs = [...html.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect([...texts, ...attrs].filter((s) => !(s in EN))).toEqual([]);
  });

  it("el contenido (negocios, misiones, logros…) está completo", () => {
    expect(ALL_BUSINESSES.filter((b) => !EN_DATA.BUSINESSES_EN[b.id]).map((b) => b.id)).toEqual([]);
    expect(CITIES.filter((c) => !EN_DATA.CITIES_EN[c.id]).map((c) => c.id)).toEqual([]);
    expect(OFFICE.filter((o) => !EN_DATA.OFFICE_EN[o.id]).map((o) => o.id)).toEqual([]);
    expect(Object.keys(MISSIONS).filter((k) => !EN_DATA.MISSIONS_EN[k])).toEqual([]);
    expect(ACHIEVEMENTS.filter((a) => !EN_DATA.ACHIEVEMENTS_EN[a.id]).map((a) => a.id)).toEqual([]);
    expect(PRODUCTS.filter((p) => !EN_DATA.PRODUCTS_EN[p.id]).map((p) => p.id)).toEqual([]);
    expect(EN_DATA.LIFE_EN).toHaveLength(LIFE.length);
    expect(EN_DATA.RANKS_EN).toHaveLength(RANKS.length);
    expect(LUXURY.filter((i) => !EN_DATA.LUXURY_EN[i.id]).map((i) => i.id)).toEqual([]);
    expect(LUXURY_CATS.filter((c) => !EN_DATA.LUXURY_CATS_EN[c.id]).map((c) => c.id)).toEqual([]);
    expect(EN_DATA.TUTORIAL_EN).toHaveLength(TUTORIAL.length);
    expect(EN_DATA.VIRAL_EN).toHaveLength(VIRAL_TITLES.length);
  });

  it("fuera del navegador el juego está en español", () => {
    expect(lang).toBe("es");
    expect(t("Nivel {n}", { n: 3 })).toBe("Nivel 3");
    expect(money(1500)).toBe("1.50 K €");
  });
});
