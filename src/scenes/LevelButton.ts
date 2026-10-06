import Phaser from 'phaser';
import { t } from '../i18n';
import type { LevelState } from '../view/businessView';
import { label, reducedMotion } from './common';

/** Shared 70×56 enamel button. State comes only from the business view model. */
export class LevelButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private value: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Graphics;
  private visualState: LevelState='idle';
  private pressed=false;
  private previousLevel=-1;
  private tween?: Phaser.Tweens.Tween;
  constructor(scene:Phaser.Scene,x:number,y:number,private bw=70,private bh=56){
    super(scene,x,y);
    this.bg=scene.add.graphics();
    const title=label(scene,0,-13,t('Nivel'),12,'#ffffff',{bold:true,stroke:'#0b2440'}).setOrigin(.5);
    this.value=label(scene,0,9,'1',26,'#ffffff',{display:true,stroke:'#0b2440'}).setOrigin(.5);
    this.arrow=scene.add.graphics();
    this.arrow.fillStyle(0x0b2440).fillTriangle(-11,7,11,7,0,-10);
    this.arrow.fillStyle(0x3ddc97).fillTriangle(-8,5,8,5,0,-7);
    this.add([this.bg,title,this.value,this.arrow]);
    this.setSize(bw,bh);scene.add.existing(this);this.paint();
    this.on('pointerdown',()=>{this.pressed=true;this.paint();});
    this.on('pointerup',()=>{this.pressed=false;this.paint();});
    this.on('pointerout',()=>{this.pressed=false;this.paint();});
    this.once('destroy',()=>this.tween?.stop());
  }
  set(level:number,ready:boolean,warn:boolean):this{
    const state:LevelState=warn?'bottleneck':ready?'ready':'idle';
    if(state!==this.visualState){this.visualState=state;this.paint();}
    if(level!==this.previousLevel){
      const upgraded=this.previousLevel>=0&&level>this.previousLevel;
      this.previousLevel=level;this.value.setText(String(level));
      if(upgraded&&!reducedMotion()){
        this.tween?.stop();this.value.setScale(1);
        this.tween=this.scene.tweens.add({targets:this.value,scale:1.22,duration:120,yoyo:true,ease:'Sine.easeOut'});
      }
    }
    return this;
  }
  bob(clk:number):void{
    this.arrow.setY(-this.bh/2-10-(this.visualState==='ready'&&!reducedMotion()?Math.abs(Math.sin(clk*4))*4:0));
  }
  private paint():void{
    const w=this.bw,h=this.bh,y=this.pressed?3:0;
    const fill=this.visualState==='bottleneck'?0xe08a2e:this.visualState==='ready'?0x2f80d1:0x526d89;
    const g=this.bg;g.clear();
    g.fillStyle(0x0b2440).fillRoundedRect(-w/2-2,-h/2+4,w+4,h+3,13);
    g.fillStyle(fill).fillRoundedRect(-w/2,-h/2+y,w,h,11);
    g.fillStyle(0xffffff,.23).fillRoundedRect(-w/2+4,-h/2+4+y,w-8,17,8);
    g.lineStyle(2,0xbde5ff,.65).strokeRoundedRect(-w/2+2,-h/2+2+y,w-4,h-4,10);
    g.lineStyle(2,0x0b2440).strokeRoundedRect(-w/2,-h/2+y,w,h,11);
    this.arrow.setVisible(this.visualState==='ready');
    this.value.setY(9+y);
  }
}
