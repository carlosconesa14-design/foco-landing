import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VISUAL_FRAMES, VISUAL_SHEETS } from '../src/art/visualFrames';
import { LUXURY } from '../src/game/luxury';

describe('shipped visual atlas coverage', () => {
  it('keeps every registered crop inside its actual PNG', () => {
    for (const sheet of VISUAL_SHEETS) {
      const png=readFileSync(`public/sprites/generated/${sheet.file}.png`);
      const width=png.readUInt32BE(16), height=png.readUInt32BE(20);
      expect(Math.max(width,height)).toBeLessThanOrEqual(2048);
      const atlas=JSON.parse(readFileSync(`public/sprites/generated/${sheet.file}.json`,'utf8'));
      for(const [key,f] of Object.entries(VISUAL_FRAMES).filter(([,f])=>f.sheet===sheet.key)) {
        expect(f.sheetW).toBe(width);expect(f.sheetH).toBe(height);
        expect(f.x).toBeGreaterThanOrEqual(0);expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.w).toBeGreaterThan(0);expect(f.h).toBeGreaterThan(0);
        expect(f.x+f.w).toBeLessThanOrEqual(width);expect(f.y+f.h).toBeLessThanOrEqual(height);
        expect(atlas.frames[key].frame).toEqual({x:f.x,y:f.y,w:f.w,h:f.h});
      }
    }
  });
  it('supplies all luxury items, outfit poses and selected city vehicles', () => {
    for(const item of LUXURY) {
      expect(VISUAL_FRAMES[`lux_${item.id}`],item.id).toBeDefined();
      if(item.cat==='outfit')expect(VISUAL_FRAMES[`avatar_${item.id}`]).toMatchObject({w:340,h:504});
      if(item.cat==='car')expect(VISUAL_FRAMES[`luxcar_${item.id}`]).toEqual(VISUAL_FRAMES[`lux_${item.id}`]);
    }
  });
  it('supplies three distinct Dubai evolutions and its own production pieces', () => {
    for(const id of ['supercars','hotel','safari','souk','tower']) {
      const crops=[1,2,3].map(n=>VISUAL_FRAMES[`bld_${id}_${n}`]);
      expect(new Set(crops.map(f=>`${f.x}/${f.y}`)).size).toBe(3);
      expect(VISUAL_FRAMES[`st_${id}`]).toBeDefined();
    }
    for(const id of ['mechanic','valet','butler','guide','goldsmith','builder'])expect(VISUAL_FRAMES[`ch_${id}_0`]).toBeDefined();
    for(const id of ['ghost','pumpkin','veh_supply','ch_vip_0','exec_founder'])expect(VISUAL_FRAMES[id]).toBeDefined();
  });
});
