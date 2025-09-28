import { Server } from "socket.io";
import { randomUUID } from "node:crypto";
import { FRUITS, FruitKey } from "./types.js";
import { pool } from "./db.js";

export type RoundState = "betting" | "revealing" | "pause";
export const CHIPS = [1000,2000,3000,4000,5000] as const;

export type TableState = {
  tableId: string;
  currentRoundId: string;
  roundStart: number;
  state: RoundState;
  winner?: FruitKey;
  users: Map<string, { id:string; name:string; balance:number; profit:number; loss:number }>; // same account map across tables if desired
  betsByRound: Map<string, Array<{ id:string; userId:string; fruit:FruitKey; value:number; createdAt:string }>>;
};

export const ROUND_DURATION_MS = 10_000;
export const PAUSE_MS = 1500;

export class TableEngine {
  io: Server; state: TableState; timer?: NodeJS.Timeout;
  constructor(io: Server, tableId: string) {
    this.io = io;
    this.state = {
      tableId,
      currentRoundId: randomUUID(),
      roundStart: Date.now(),
      state: "betting",
      users: new Map(),
      betsByRound: new Map(),
    };
  }
  room() { return `table:${this.state.tableId}`; }
  fruitTotals(): Record<FruitKey, number> {
    const tots = Object.fromEntries(FRUITS.map(f => [f, 0])) as Record<FruitKey, number>;
    const bets = this.ensureBets();
    for (const b of bets) tots[b.fruit] += b.value; return tots;
  }
  ensureBets() {
    if (!this.state.betsByRound.has(this.state.currentRoundId)) this.state.betsByRound.set(this.state.currentRoundId, []);
    return this.state.betsByRound.get(this.state.currentRoundId)!;
  }
  snapshotFor(userId: string) {
    const u = this.state.users.get(userId)!;
    const now = Date.now();
    const round = this.state.state === "betting"
      ? { roundId: this.state.currentRoundId, state: "betting" as const, timeLeftMs: Math.max(0, ROUND_DURATION_MS - (now - this.state.roundStart)) }
      : { roundId: this.state.currentRoundId, state: this.state.state, timeLeftMs: 0, winner: this.state.winner };
    return { user: u, round, fruitTotals: this.fruitTotals(), myBets: this.ensureBets().filter(b => b.userId === userId) };
  }
  joinUser(user: {id:string; name:string; balance:number; profit:number; loss:number}) {
    if (!this.state.users.has(user.id)) this.state.users.set(user.id, user);
  }
  placeBet(userId: string, fruit: FruitKey, value: number): { ok:true } | { ok:false; error:string } {
    if (this.state.state !== "betting") return { ok:false, error:"BETTING_CLOSED" };
    const u = this.state.users.get(userId); if (!u) return { ok:false, error:"NO_USER" };
    if (!CHIPS.includes(value as any)) return { ok:false, error:"INVALID_CHIP" };
    if (u.balance < value) return { ok:false, error:"INSUFFICIENT_FUNDS" };
    u.balance -= value;
    const bet = { id: randomUUID(), userId, fruit, value, createdAt: new Date().toISOString() };
    this.ensureBets().push(bet);
    return { ok:true };
  }
  async openRoundInDB() {
    await pool.query(`INSERT INTO rounds (id, table_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [this.state.currentRoundId, this.state.tableId]);
  }
  async closeRoundInDB(winner: FruitKey) {
    await pool.query(`UPDATE rounds SET finished_at=NOW(), winner=$2 WHERE id=$1`, [this.state.currentRoundId, winner]);
  }
  settle(winner: FruitKey) {
    this.state.winner = winner;
    const perUser = new Map<string, { balance:number; profit:number; loss:number }>();
    for (const b of this.ensureBets()) {
      const d = perUser.get(b.userId) ?? { balance:0, profit:0, loss:0 };
      if (b.fruit === winner) { d.balance += b.value * 2; d.profit += b.value; }
      else { d.loss += b.value; }
      perUser.set(b.userId, d);
    }
    for (const [uid, d] of perUser) {
      const u = this.state.users.get(uid); if (!u) continue;
      u.balance += d.balance; u.profit += d.profit; u.loss += d.loss;
    }
  }
  async loopOnce() {
    const now = Date.now();
    if (this.state.state === "betting") {
      const tl = Math.max(0, ROUND_DURATION_MS - (now - this.state.roundStart));
      this.io.to(this.room()).emit("round:tick", { roundId: this.state.currentRoundId, state: "betting", timeLeftMs: tl, fruitTotals: this.fruitTotals() });
      if (tl <= 0) {
        this.state.state = "revealing";
        this.io.to(this.room()).emit("round:state", { roundId: this.state.currentRoundId, state: "revealing", timeLeftMs: 0 });
        setTimeout(async () => {
          const winner = FRUITS[Math.floor(Math.random()*FRUITS.length)] as FruitKey;
          this.settle(winner);
          this.io.to(this.room()).emit("round:result", { winner });
          await this.closeRoundInDB(winner).catch(()=>{});
          this.io.to(this.room()).emit("balance:refresh");
          this.state.state = "pause";
          this.io.to(this.room()).emit("round:state", { roundId: this.state.currentRoundId, state:"pause", timeLeftMs:0, winner });
          setTimeout(async () => {
            this.state.currentRoundId = randomUUID();
            this.state.roundStart = Date.now();
            this.state.winner = undefined;
            this.state.state = "betting";
            await this.openRoundInDB().catch(()=>{});
          }, PAUSE_MS);
        }, 900);
      }
    }
  }
}

export class Tables {
  io: Server; map = new Map<string, TableEngine>();
  constructor(io: Server) { this.io = io; }
  get(tableId: string) {
    let t = this.map.get(tableId);
    if (!t) {
      t = new TableEngine(this.io, tableId);
      this.map.set(tableId, t);
      t.openRoundInDB().catch(()=>{});
    }
    return t;
  }
  start() {
    setInterval(() => { for (const t of this.map.values()) t.loopOnce(); }, 100);
  }
}