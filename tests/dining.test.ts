import { describe, expect, it } from "vitest";
import { DiningRoom } from "../src/scenes/dining";
const advance = (room: DiningRoom, seconds: number) => { for(let t=0;t<seconds;t+=0.05) room.update(0.05); };
describe("salón del restaurante", () => {
  it("espera pedidos reales y limita las colas cuando la cocina no vende", () => {
    const room=new DiningRoom(1);
    advance(room,120);
    expect(room.served).toBe(0);
    expect(room.guests.filter(g=>g.phase==="waiting")).toHaveLength(2);
    expect(room.guests.length).toBeLessThanOrEqual(5);
    expect(room.guests.some(g=>g.phase==="eating")).toBe(false);
  });
  it("una venta permite un servicio y libera la mesa al salir el cliente", () => {
    const room=new DiningRoom(3);
    advance(room,12);
    const id=room.guests.find(g=>g.phase==="waiting")!.id;
    room.recordSale();advance(room,3);
    expect(room.served).toBe(1);
    expect(room.guests.find(g=>g.id===id)?.phase).toBe("eating");
    advance(room,9);
    expect(room.guests.some(g=>g.id===id)).toBe(false);
    expect(room.served).toBe(1);
  });
  it("mantiene aforo y mesas exclusivas durante muchas ventas", () => {
    const room=new DiningRoom(8);
    for(let i=0;i<6000;i++) {
      if(i%10===0) room.recordSale();
      room.update(0.05);
      const occupied=room.guests.filter(g=>g.table>=0).map(g=>g.table);
      expect(new Set(occupied).size).toBe(occupied.length);
      expect(room.guests.length).toBeLessThanOrEqual(9);
      expect(room.orders).toBeLessThanOrEqual(6);
    }
    expect(room.served).toBeGreaterThan(10);
  });
});
