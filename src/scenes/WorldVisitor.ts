import Phaser from "phaser";
import { art } from "../art/catalog";
import type { OfferKind } from "../game/offers";
import { swapArt } from "../art/generated";
import { actorShadow } from "./motion";
import { DPR, overlayHeight, reducedMotion, calmWorld } from "./common";

/** Scene-owned presentation only. Scheduling, expiry, ads and rewards stay in main/offers. */
export class WorldVisitor {
  private actor: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private halo: Phaser.GameObjects.Ellipse;
  private started: number;
  private leaving = false;
  constructor(private scene: Phaser.Scene, readonly kind: OfferKind, private button: HTMLButtonElement,
    private entry: { x: number; y: number }, private dock: { x: number; y: number }, private wasDrag: () => boolean) {
    this.actor = art(scene, entry.x, entry.y, kind === "truck" ? "veh_supply" : "ch_vip_0").setOrigin(.5, .98);
    this.shadow = actorShadow(scene, this.actor.displayWidth);
    this.halo = scene.add.ellipse(dock.x, dock.y, kind === "truck" ? 92 : 56, kind === "truck" ? 38 : 22, 0xffd76b, .23).setStrokeStyle(2, 0xffd76b, .85);
    this.actor.setInteractive({ useHandCursor: true });
    this.actor.on("pointerup", () => { if (!this.wasDrag() && !this.leaving) button.click(); });
    this.started = scene.time.now;
    this.update();
  }
  update(): void {
    if (!this.actor.scene) return;
    const duration = calmWorld() ? 1 : this.kind === "truck" ? 1400 : 1000;
    const progress = Phaser.Math.Clamp((this.scene.time.now - this.started) / duration, 0, 1);
    const p = Phaser.Math.Easing.Cubic.Out(progress);
    this.actor.setPosition(Phaser.Math.Linear(this.entry.x, this.dock.x, p), Phaser.Math.Linear(this.entry.y, this.dock.y, p)).setDepth(this.actor.y + 3);
    this.shadow.setPosition(this.actor.x, this.actor.y + 1).setDepth(this.actor.y - 1);
    this.halo.setDepth(this.dock.y - 2).setAlpha(reducedMotion() ? .6 : .5 + Math.sin(this.scene.time.now / 600) * .18);
    if (this.leaving) return;
    // Camera matrix follows panning/zoom and DPR; the keyboard target follows the real actor.
    const cam = this.scene.cameras.main;
    const point = { x: cam.x + (this.actor.x - cam.scrollX) * cam.zoom, y: cam.y + (this.actor.y - cam.scrollY - this.actor.displayHeight - 12) * cam.zoom };
    const root = this.button.parentElement;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const top = document.getElementById("hud")!.offsetHeight + 40;
    const bottom = innerHeight - document.getElementById("bar")!.offsetHeight - overlayHeight() - 65;
    const x = point.x / DPR - rect.left;
    const y = point.y / DPR - rect.top;
    const safeX = Phaser.Math.Clamp(x, 64, rect.width - 80);
    const safeY = Phaser.Math.Clamp(y, top, Math.max(top, bottom));
    this.button.style.left = `${safeX}px`;
    this.button.style.top = `${safeY}px`;
    this.button.classList.toggle("offscreen", Math.abs(x - safeX) > 30 || Math.abs(y - safeY) > 30);
    this.button.hidden = !!document.querySelector(".scrim,.celebrate") || document.getElementById("moreMenu")?.hasAttribute("open") === true;
  }
  depart(): void {
    if (this.leaving || !this.actor.scene) return;
    this.leaving = true;
    this.actor.disableInteractive();
    this.halo.destroy();
    if (calmWorld()) { this.actor.destroy(); this.shadow.destroy(); return; }
    const actor = this.actor, shadow = this.shadow;
    if (this.kind === "truck" && this.scene.textures.exists("veh_supply_rear")) swapArt(actor,"veh_supply_rear");
    this.scene.tweens.add({ targets: actor, x: this.entry.x, y: this.entry.y, alpha: 0, duration: 650, ease: "Cubic.easeIn",
      onUpdate: () => { actor.setDepth(actor.y + 3); shadow.setPosition(actor.x, actor.y + 1).setDepth(actor.y - 1).setAlpha(actor.alpha * .2); },
      onComplete: () => { actor.destroy(); shadow.destroy(); } });
  }
}
