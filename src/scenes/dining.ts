/** Bounded presentation state. Orders enter only from observed sales; no economy is written here. */
export type GuestPhase = "arriving" | "queue" | "seating" | "waiting" | "eating" | "leaving";
export interface Diner { id: number; phase: GuestPhase; progress: number; table: number; }
export class DiningRoom {
  readonly guests: Diner[] = [];
  readonly tableCount: number;
  orders = 0;
  served = 0;
  server = { phase: "idle" as "idle" | "out" | "back", progress: 0, guestId: -1, table: 0 };
  private nextId = 0;
  private arrival = 0;

  constructor(floors: number) {
    this.tableCount = floors >= 6 ? 6 : floors >= 3 ? 4 : 2;
    this.addGuest();
    this.guests[0].phase = "queue";
    this.addGuest();
  }
  recordSale(): void { this.orders = Math.min(this.tableCount, this.orders + 1); }
  private addGuest(): void { this.guests.push({ id: this.nextId++, phase: "arriving", progress: 0, table: -1 }); }

  update(delta: number): void {
    const dt = Math.min(0.1, Math.max(0, delta));
    this.arrival += dt;
    if (this.arrival > 3 && this.guests.filter(g => g.table < 0).length < 3 && this.guests.length < this.tableCount + 3) {
      this.addGuest();
      this.arrival = 0;
    }
    for (const guest of this.guests) {
      if (guest.phase === "arriving" || guest.phase === "seating" || guest.phase === "leaving") {
        guest.progress = Math.min(1, guest.progress + dt / (guest.phase === "seating" ? 2 : 1.8));
        if (guest.progress >= 1 && guest.phase !== "leaving") {
          guest.phase = guest.phase === "arriving" ? "queue" : "waiting";
          guest.progress = 0;
        }
      } else if (guest.phase === "eating") {
        guest.progress += dt / 5;
        if (guest.progress >= 1) { guest.phase = "leaving"; guest.progress = 0; }
      }
      if (guest.phase === "queue") {
        const free = Array.from({ length: this.tableCount }, (_, i) => i).find(i => !this.guests.some(g => g.table === i));
        if (free !== undefined) { guest.table = free; guest.phase = "seating"; guest.progress = 0; }
      }
    }
    for (let i = this.guests.length - 1; i >= 0; i--) if (this.guests[i].phase === "leaving" && this.guests[i].progress >= 1) this.guests.splice(i, 1);

    if (this.server.phase === "idle") {
      const waiting = this.guests.find(g => g.phase === "waiting");
      if (waiting && this.orders > 0) {
        this.orders--;
        this.server = { phase: "out", progress: 0, guestId: waiting.id, table: waiting.table };
      }
    } else {
      this.server.progress = Math.min(1, this.server.progress + dt / 1.6);
      if (this.server.progress >= 1) {
        if (this.server.phase === "out") {
          const guest = this.guests.find(g => g.id === this.server.guestId);
          if (guest) { guest.phase = "eating"; guest.progress = 0; this.served++; }
          this.server.phase = "back";
        } else this.server.phase = "idle";
        this.server.progress = 0;
      }
    }
  }
}
