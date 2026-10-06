import { PANEL_ICONS, PANEL_WORLDS } from '../art/worldThemes';
import { IMG_EXT } from '../art/imgExt';
import { icon } from './icons';
import { reducedMotion } from '../scenes/common';

export interface SheetPresentation { screen?: string; hero?: string }
export function presentSheet(el:HTMLElement,options:SheetPresentation):void {
 const screen=options.screen;if(!screen)return;
 el.dataset.uiScreen=screen;
 const head=el.querySelector<HTMLElement>('.sheet-head');if(!head)return;
 const world=PANEL_WORLDS[screen]??'office';
 head.style.setProperty('--panel-art',`url("sprites/${world==='office'?'ui_office_room':`street_${world}`}.${IMG_EXT}")`);
 const slot=head.querySelector('.sicon');if(slot)slot.innerHTML=icon(PANEL_ICONS[screen]??'missions');
 if(options.hero){const image=document.createElement('img');image.className='panel-object';image.alt='';image.src=`sprites/${options.hero}.${IMG_EXT}`;head.append(image);}
}
/** Cosmetic travel overlay; the existing action has already changed the city. */
export function travelFlight():void{
 if(reducedMotion())return;
 const el=document.createElement('div');el.className='travel-flight';el.setAttribute('aria-hidden','true');el.innerHTML=icon('lux_jet');document.body.append(el);
 const anim=el.animate([{transform:'translate(-80px,65vh) rotate(-12deg)',opacity:0},{transform:'translate(35vw,40vh) rotate(-12deg)',opacity:1,offset:.45},{transform:'translate(110vw,15vh) rotate(-12deg)',opacity:0}],{duration:850,easing:'ease-in-out'});
 anim.onfinish=()=>el.remove();anim.oncancel=()=>el.remove();
}
