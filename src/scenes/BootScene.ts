import { GENERATED_SHEETS, configureGeneratedArt, hasGeneratedArt } from "../art/generated";
import Phaser from "phaser";
import { ART, buildArt } from "../art/catalog";
import { DPR } from "./common";

/**
 * Carga el arte. `public/sprites/manifest.json` lista las claves que tienen PNG propio
 * (p. ej. ["bld_restaurant", "ch_cook_0"]); el resto se dibuja por código.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    for (const sheet of GENERATED_SHEETS) {
      this.load.atlas(sheet.key, `sprites/generated/${sheet.file}.png`, `sprites/generated/${sheet.file}.json`);
    }
    this.load.json("sprite-manifest", "sprites/manifest.json");
    this.load.once("filecomplete-json-sprite-manifest", (_key: string, _type: string, data: unknown) => {
      if (!Array.isArray(data)) return;
      for (const key of data) if (typeof key === "string" && ART[key]) this.load.image(key, `sprites/${key}.png`);
    });
  }

  create(): void {
    // Canvas text textures must be generated after the bundled fonts are available.
    void Promise.all([document.fonts.load('16px "Lilita One"'), document.fonts.load('16px "Rubik"'), document.fonts.load('700 16px "Rubik"')])
      .then(() => this.finishArt(), () => this.finishArt());
  }

  private finishArt(): void {
    configureGeneratedArt(this, ART);
    // Si de un personaje solo hay la pose quieta (_0), se usa también para caminar.
    for (const key of Object.keys(ART)) {
      const m = /^(ch_\w+)_([12])$/.exec(key);
      if (!m || hasGeneratedArt(this, key) || this.textures.exists(key) || !this.textures.exists(`${m[1]}_0`)) continue;
      this.textures.addImage(key, this.textures.get(`${m[1]}_0`).getSourceImage() as HTMLImageElement);
    }
    buildArt(this, DPR);
    this.game.events.emit("art-ready");
  }
}
