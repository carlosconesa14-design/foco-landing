import type Phaser from "phaser";
import { art } from "../art/catalog";
import { floatText, reducedMotion } from "./common";

/** A short reveal using the scene's own background, without a black flash. */
export function revealScene(scene: Phaser.Scene): void {
  if (reducedMotion()) return;
  const color = scene.cameras.main.backgroundColor;
  scene.cameras.main.fadeIn(180, color.red, color.green, color.blue);
}

function restScale(image: Phaser.GameObjects.Image): { x: number; y: number } {
  let rest = image.getData("restScale") as { x: number; y: number } | undefined;
  if (!rest) {
    rest = { x: image.scaleX, y: image.scaleY };
    image.setData("restScale", rest);
  }
  return rest;
}

export function upgradePop(scene: Phaser.Scene, image: Phaser.GameObjects.Image): void {
  if (reducedMotion()) return;
  const rest = restScale(image);
  scene.tweens.killTweensOf(image);
  image.setScale(rest.x, rest.y);
  scene.tweens.add({ targets: image, scaleX: rest.x * 1.08, scaleY: rest.y * 1.08, duration: 130, yoyo: true, ease: "Sine.easeOut" });
}

/** Anchored construction reveal: the feet/base stay on their parcel as the silhouette grows. */
export function constructionPop(scene: Phaser.Scene, image: Phaser.GameObjects.Image, title: string): void {
  if (reducedMotion()) return;
  const rest = restScale(image);
  image.setScale(rest.x * 0.75, rest.y * 0.75).setAlpha(0);
  scene.tweens.add({ targets: image, scaleX: rest.x, scaleY: rest.y, alpha: 1, duration: 600, ease: "Back.easeOut" });
  const ring = scene.add.ellipse(image.x, image.y + 2, image.displayWidth * 0.9, image.displayWidth * 0.35).setStrokeStyle(3,0xffd36c,0.9).setDepth(image.depth - 1);
  scene.tweens.add({ targets: ring, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
  for (let i=0;i<8;i++) {
    const angle = i * Math.PI / 4;
    const dot = scene.add.circle(image.x, image.y - 12, 2.4, i%2 ? 0xffffff : 0xffce59).setDepth(image.depth+1);
    scene.tweens.add({ targets: dot, x: image.x + Math.cos(angle)*44, y: image.y - 22 + Math.sin(angle)*20, alpha: 0, duration: 650, onComplete: () => dot.destroy() });
  }
  floatText(scene,image.x,image.y-image.displayHeight-15,title,"#f5c542");
}

/** One product per observed handoff, only for feedback: it never participates in the economy. */
export function transferProduct(scene: Phaser.Scene, key: string, from: {x:number;y:number}, to: {x:number;y:number}): void {
  if (reducedMotion()) return;
  const item = art(scene,from.x,from.y,key).setDepth(Math.max(from.y,to.y)+5);
  item.setScale(item.scaleX*0.7,item.scaleY*0.7);
  scene.tweens.addCounter({ from:0,to:1,duration:360,ease:"Sine.easeInOut",onUpdate:tween=>{
    const t=tween.getValue() ?? 0;
    item.setPosition(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*18);
    item.setAlpha(t>0.75 ? (1-t)*4 : 1);
  },onComplete:()=>item.destroy() });
}
