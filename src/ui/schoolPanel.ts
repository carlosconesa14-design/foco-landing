import { researchIdea } from "./visualEffects";
import { SCHOOL, canStudy, ideas, schoolCost, schoolLevel, schoolText, study } from "../game/school";
import { t } from "../i18n";
import { analytics } from "../platform/analytics";
import type { PanelCtx } from "./panels";
import { icon } from "./icons";
import { openSheet } from "./sheet";

/**
 * Escuela de negocios (school.ts): árbol de investigación permanente pagado con ideas 💡.
 * Panel funcional y sencillo; el diseño final del árbol es de Codex (docs/VISUAL.md §14.2).
 */

const $ = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;

export function openSchool(ctx: PanelCtx): void {
  openSheet(
    ctx.root,
    `<div class="sheet-head"><span class="sicon">🎓</span><div><h3>${t("Escuela de negocios")}</h3><p class="muted" data-ideas></p></div></div>
     <p class="small muted">${t("Cada hito x2 (nivel 10, 25, 50…) te da una idea 💡. Lo que investigas aquí no se pierde nunca: ni al salir a bolsa ni al cambiar de ciudad.")}</p>
     <div class="school-tree" data-list></div>`,
    (el) => {
      const s = ctx.state();
      $(el, "[data-ideas]").textContent = t("Tienes {n} ideas 💡", { n: ideas(s) });
      const rows = SCHOOL.map((node) => {
        const txt = schoolText(node.id);
        const lvl = schoolLevel(s, node.id);
        const check = canStudy(s, node.id);
        const req = node.req ? SCHOOL.find((n) => n.id === node.req!.id)! : null;
        const sub =
          check === "locked" && req
            ? t("Necesitas {name} nivel {n}", { name: schoolText(req.id).name, n: node.req!.level })
            : txt.desc;
        const btn =
          check === "max"
            ? `<button class="claim" disabled>${t("Máx")}</button>`
            : check === "locked"
              ? `<button class="claim" disabled>🔒</button>`
              : `<button class="claim" data-study="${node.id}" ${check === "ok" ? "" : "disabled"}>💡 ${schoolCost(lvl)}</button>`;
        return `<div data-node="${node.id}" class="row school-node ${check === "ok" ? "ready" : check === "locked" ? "locked" : check === "max" ? "done" : ""}"><span class="face">${icon(`ic_school_${node.id}`)}</span>
          <div><b>${txt.name} · ${lvl}/${node.max}</b><span class="sub">${sub}</span></div>${btn}</div>`;
      }).join("");
      const list = $(el, "[data-list]");
      if (list.dataset.html === rows) return;
      list.dataset.html = rows;
      list.innerHTML = rows;
      list.style.setProperty("--prod-line",schoolLevel(s,"prod")>=2?"#ffe48c":"#9cae98");
      list.style.setProperty("--log-line",schoolLevel(s,"log")>=2?"#ffe48c":"#9cae98");
      list.style.setProperty("--sale-line",schoolLevel(s,"sale")>=3?"#ffe48c":"#9cae98");
      list.querySelectorAll<HTMLButtonElement>("[data-study]").forEach((b) => {
        b.onclick = () => {
          const id = b.dataset.study as (typeof SCHOOL)[number]["id"];
          const st = ctx.state();
          if (!study(st, id)) return ctx.fx("error");
          analytics.track("school_study", { node: id, level: schoolLevel(st, id) });
          ctx.fx("upgrade", true);
          researchIdea(b);
          ctx.floatAt(b, `${schoolText(id).name} ${schoolLevel(st, id)}`);
        };
      });
    }, { screen: "school" },
  );
}
