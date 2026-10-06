import Phaser from 'phaser';
import type { SkillStatus } from '../game/skills';
import { label, reducedMotion } from './common';
/** Presentation of the existing manager ability. Exact status/progress comes from the view model. */
export class SkillButton extends Phaser.GameObjects.Container{
 private face:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;
 private before='locked';
 constructor(scene:Phaser.Scene,x:number,y:number){
  super(scene,x,y);this.face=scene.add.graphics();this.title=label(scene,8,0,'',11,'#ffffff',{bold:true,stroke:'#0b2440'}).setOrigin(.5);this.add([this.face,this.title]);this.setSize(54,46);scene.add.existing(this);this.setVisible(false);
 }
 set(sk:SkillStatus,clk:number):void{
  this.setVisible(sk.state!=='locked');if(sk.state==='locked'){this.before='locked';return;}
  const ready=sk.state==='ready',active=sk.state==='active',sec=Math.ceil(sk.left/1000);this.title.setText(ready?'×2':`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`);
  const color=ready?0xffce5d:active?0x3ddc97:0x6a7d90,g=this.face;g.clear();
  g.fillStyle(0x0b2440).fillRoundedRect(-26,-20,52,43,13);g.fillStyle(color).fillRoundedRect(-24,-21,48,40,11);g.fillStyle(0xffffff,.2).fillRoundedRect(-21,-18,42,13,8);
  g.lineStyle(2,0x0b2440).strokeRoundedRect(-24,-21,48,40,11);
  g.fillStyle(ready?0x0b2440:0xffffff).fillPoints([{x:-10,y:-10},{x:-19,y:1},{x:-13,y:1},{x:-16,y:11},{x:-6,y:-2},{x:-12,y:-2}],true);
  if(!ready){g.lineStyle(2,active?0xffef9c:0x9cc9e5,.95).beginPath().arc(0,-1,24,-Math.PI/2,-Math.PI/2+Math.PI*2*sk.progress).strokePath();}
  this.setScale(ready&&!reducedMotion()?1+Math.abs(Math.sin(clk*3))*.04:1);
  if(active&&this.before!=='active'&&!reducedMotion()){
   const halo=this.scene.add.circle(this.x,this.y,21).setStrokeStyle(3,0xffe78e).setDepth(this.depth-1);this.scene.tweens.add({targets:halo,scale:1.8,alpha:0,duration:400,onComplete:()=>halo.destroy()});
   if(this.scene.textures.exists('mgr_cheer_1')){const cheer=this.scene.add.image(this.x+26,this.y-24,'mgr_cheer_1').setDisplaySize(26,36).setDepth(this.depth+1);this.scene.tweens.add({targets:cheer,y:cheer.y-8,alpha:0,duration:650,onComplete:()=>cheer.destroy()});}
  }
  this.before=sk.state;
 }
}
