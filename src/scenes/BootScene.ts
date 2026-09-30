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
    this.load.json("sprite-manifest", "sprites/manifest.json");
    this.load.once("filecomplete-json-sprite-manifest", (_key: string, _type: string, data: unknown) => {
      if (!Array.isArray(data)) return;
      for (const key of data) if (typeof key === "string" && ART[key]) this.load.image(key, `sprites/${key}.png`);
    });
  }

  create(): void {
    // Si de un personaje solo hay la pose quieta (_0), se usa también para caminar.
    for (const key of Object.keys(ART)) {
      const m = /^(ch_\w+)_([12])$/.exec(key);
      if (!m || this.textures.exists(key) || !this.textures.exists(`${m[1]}_0`)) continue;
      this.textures.addImage(key, this.textures.get(`${m[1]}_0`).getSourceImage() as HTMLImageElement);
    }
    buildArt(this, DPR);
    this.game.events.emit("art-ready");
  }
}
