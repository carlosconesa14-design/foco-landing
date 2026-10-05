import Phaser from 'phaser';
import { art } from '../art/catalog';
import { now } from '../game/clock';
import type { GameState } from '../game/state';
import { t } from '../i18n';
import { label, reducedMotion } from './common';
import { twistPresentation } from './twistPresentation';

/** Decorative world projection. Existing cards retain every action and reward. */
export class TwistWorld {
  private actor: Phaser.GameObjects.Image | null=null;
  private title: Phaser.GameObjects.Text | null=null;
  private meter: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Ellipse | null=null;
  private visible=false;
  private entered=0;
  constructor(private scene: Phaser.Scene, private id:string,private dock:{x:number;y:number}) {
    this.meter=scene.add.graphics().setDepth(dock.y+5);
  }
  update(s:GameState):void {
    const view=twistPresentation(s,this.id,now());
    if(!view) {
      if(this.visible&&this.actor) {
        this.visible=false;this.title?.setVisible(false);this.meter.clear();
        const targets=[this.actor,this.shadow!];
        this.scene.tweens.killTweensOf(targets);
        if(reducedMotion())targets.forEach(o=>o.setVisible(false));
        else this.scene.tweens.add({targets,alpha:0,duration:350,onComplete:()=>{if(!this.visible)targets.forEach(o=>o.setVisible(false));}});
      }
      return;
    }
    if(!this.actor) {
      this.actor=art(this.scene,this.dock.x,this.dock.y,view.key).setOrigin(.5,.98).setDepth(this.dock.y+2);
      this.shadow=this.scene.add.ellipse(this.dock.x,this.dock.y,this.actor.displayWidth*.7,12,0x12273e,.2).setDepth(this.dock.y-1);
      this.title=label(this.scene,this.dock.x,this.dock.y-this.actor.displayHeight-18,'',10,'#fff',{bold:true,stroke:'#14202f'}).setDepth(this.dock.y+5);
    }
    if(!this.visible) {
      this.visible=true;this.entered=this.scene.time.now;
      this.scene.tweens.killTweensOf([this.actor,this.shadow!]);this.actor.setVisible(true);this.shadow!.setVisible(true).setAlpha(.2);this.title!.setVisible(true);
    }
    const p=reducedMotion()?1:Phaser.Math.Clamp((this.scene.time.now-this.entered)/550,0,1);
    const entry=this.id==='dropship'?72:this.id==='restaurant'?20:0;
    this.actor.setX(this.dock.x+(1-Phaser.Math.Easing.Cubic.Out(p))*entry).setAlpha(p).setTint(view.active?0xffffff:0xb7cddd);
    this.shadow!.setX(this.actor.x);
    const title=this.id==='dropship'?t('Pedidos urgentes'):this.id==='restaurant'?t('Reputación'):this.id==='tiktok'?(view.active?t('En directo'):t('Hype')):t('Investigación');
    this.title!.setText(title);
    const meterY=this.dock.y-this.actor.displayHeight-9;
    this.meter.clear().fillStyle(0x10273e,.9).fillRoundedRect(this.dock.x-29,meterY,58,6,3)
      .fillStyle(view.active?0xffcd66:0x77d7e9,1).fillRoundedRect(this.dock.x-27,meterY+2,54*view.progress,2,1);
  }
}
