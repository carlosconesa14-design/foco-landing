import type Phaser from "phaser";
import { reducedMotion } from "./common";

export { streetLoop, loopPosition, type StreetLoop } from "./streets";

/** Grounded footsteps and slight lean: a standing sprite no longer glides rigidly along a path. */
export function gait(image: Phaser.GameObjects.Image, groundY: number, clock: number, moving: boolean, vehicle = false): void {
  const active = moving && !reducedMotion();
  const step = Math.sin(clock * (vehicle ? 10 : 12));
  image.y = groundY - (active ? Math.abs(step) * (vehicle ? 0.45 : 2.1) : 0);
  image.setAngle(active ? step * (vehicle ? 0.3 : 2.5) : 0);
}

export function actorShadow(scene: Phaser.Scene, width: number): Phaser.GameObjects.Ellipse {
  return scene.add.ellipse(0, 0, width * 0.75, width * 0.24, 0x173746, 0.18);
}
