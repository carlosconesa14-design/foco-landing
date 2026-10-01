import { icon } from "./icons";

let active = 0;
let lastFlight = -Infinity;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A bounded cosmetic effect: never touches balances or waits before paying the player. */
export function flyCoins(x: number, y: number, lucky = false): void {
  const target = document.getElementById('cash');
  if (!target || reduced() || performance.now() - lastFlight < 250 || active >= 12) return;
  const rect = target.getBoundingClientRect();
  if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) return;
  lastFlight = performance.now();
  for (let i = 0; i < (lucky ? 5 : 3) && active < 12; i++) {
    active++;
    const coin = document.createElement('span');
    coin.className = 'reward-coin';
    coin.setAttribute('aria-hidden','true');
    coin.innerHTML = icon('cash');
    document.body.appendChild(coin);
    const endX = rect.left + 12, endY = rect.top + rect.height / 2;
    const startX = x + (i - 1) * 9, startY = y - i * 3;
    const animation = coin.animate([
      { transform:`translate(${startX}px,${startY}px) scale(.65)`, opacity:0 },
      { transform:`translate(${startX + (i - 1) * 14}px,${startY - 38}px) scale(1.1)`,opacity:1,offset:.25 },
      { transform:`translate(${endX}px,${endY}px) scale(.5)`,opacity:1 },
    ],{duration:650+i*55,delay:i*45,easing:'cubic-bezier(.3,.1,.4,1)',fill:'both'});
    const cleanup = () => { coin.remove(); active--; };
    animation.onfinish = () => { cleanup(); if (!reduced()) { target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); setTimeout(()=>target.classList.remove('bump'),350); } };
    animation.oncancel = cleanup;
  }
}
