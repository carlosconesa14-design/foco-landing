import { reducedMotion } from '../scenes/common';
import { icon } from './icons';
/** Short, bounded presentation effects attached to existing successful actions. */
export function researchIdea(target:HTMLElement):void {
 if(reducedMotion())return;
 const r=target.getBoundingClientRect(),node=document.createElement('span');node.className='research-idea';node.setAttribute('aria-hidden','true');node.innerHTML=icon('ic_idea');document.body.append(node);
 const anim=node.animate([{transform:`translate(${innerWidth/2}px,110px) scale(.8)`,opacity:0},{transform:`translate(${innerWidth/2}px,145px) scale(1.2)`,opacity:1,offset:.25},{transform:`translate(${r.left+r.width/2-20}px,${r.top+r.height/2-20}px) scale(.3)`,opacity:0}],{duration:650,easing:'cubic-bezier(.3,.1,.4,1)'});
 anim.onfinish=()=>node.remove();anim.oncancel=()=>node.remove();
}
export function savingsGoal(root:HTMLElement,progress:number):void {
 root.querySelector('.savings-notice')?.remove();const node=document.createElement('div');node.className='savings-notice';node.setAttribute('aria-hidden','true');node.innerHTML=`${icon('order')}<div class="bar2"><i style="width:${Math.max(0,Math.min(100,progress*100))}%"></i></div>`;root.append(node);setTimeout(()=>node.remove(),3500);
}
export function ipoBell():void {
 const el=document.createElement('span');el.className='ipo-bell';el.setAttribute('aria-hidden','true');el.innerHTML=icon('item_bell');document.body.append(el);
 if(!reducedMotion())el.animate([{transform:'rotate(-15deg)'},{transform:'rotate(15deg)'},{transform:'rotate(-10deg)'},{transform:'rotate(10deg)'},{transform:'rotate(0)'}],{duration:800,easing:'ease-in-out'});
 setTimeout(()=>el.remove(),1200);
}
