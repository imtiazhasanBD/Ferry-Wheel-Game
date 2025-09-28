import { Pool } from "pg";
import dayjs from "dayjs";
import type { FruitKey } from "./types.js";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      balance BIGINT NOT NULL,
      profit BIGINT NOT NULL,
      loss BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rounds (
      id UUID PRIMARY KEY,
      table_id TEXT NOT NULL,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP,
      winner TEXT
    );
    CREATE TABLE IF NOT EXISTS bets (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      round_id UUID NOT NULL REFERENCES rounds(id),
      table_id TEXT NOT NULL,
      fruit TEXT NOT NULL,
      value BIGINT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS daily_user_agg (
      day DATE NOT NULL,
      user_id UUID NOT NULL,
      win BIGINT NOT NULL DEFAULT 0,
      loss BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (day, user_id)
    );
    CREATE TABLE IF NOT EXISTS daily_platform_agg (
      day DATE PRIMARY KEY,
      win BIGINT NOT NULL DEFAULT 0,
      loss BIGINT NOT NULL DEFAULT 0
    );
  `);
}

export async function ensureUserRow(u: { id:string; name:string; balance:number; profit:number; loss:number }) {
  await pool.query(
    `INSERT INTO users (id,name,balance,profit,loss)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
    [u.id, u.name, u.balance, u.profit, u.loss]
  );
}

export async function writeBet(b: { id:string; userId:string; roundId:string; tableId:string; fruit:string; value:number; createdAt:string }) {
  await pool.query(
    `INSERT INTO bets (id,user_id,round_id,table_id,fruit,value,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [b.id, b.userId, b.roundId, b.tableId, b.fruit, b.value, b.createdAt]
  );
}

export async function upsertDailyAggForRound(tableId: string, winner: FruitKey, bets: Array<{ userId:string; fruit:FruitKey; value:number }>) {
  const day = dayjs().format("YYYY-MM-DD");
  let platformWin = 0, platformLoss = 0;
  const map = new Map<string, { win:number; loss:number }>();
  for (const b of bets) {
    const m = map.get(b.userId) ?? { win:0, loss:0 };
    if (b.fruit === winner) { m.win += b.value; platformWin += b.value; }
    else { m.loss += b.value; platformLoss += b.value; }
    map.set(b.userId, m);
  }
  for (const [userId, agg] of map) {
    await pool.query(
      `INSERT INTO daily_user_agg (day,user_id,win,loss)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (day,user_id) DO UPDATE SET
         win = daily_user_agg.win + EXCLUDED.win,
         loss = daily_user_agg.loss + EXCLUDED.loss`,
      [day, userId, agg.win, agg.loss]
    );
  }
  await pool.query(
    `INSERT INTO daily_platform_agg (day,win,loss)
     VALUES ($1,$2,$3)
     ON CONFLICT (day) DO UPDATE SET
       win = daily_platform_agg.win + EXCLUDED.win,
       loss = daily_platform_agg.loss + EXCLUDED.loss`,
    [day, platformWin, platformLoss]
  );
}

export async function adminDaily(day?: string) {
  const d = day || dayjs().format("YYYY-MM-DD");
  const users = await pool.query(`SELECT * FROM daily_user_agg WHERE day=$1 ORDER BY win DESC`, [d]);
  const platform = await pool.query(`SELECT * FROM daily_platform_agg WHERE day=$1`, [d]);
  return { day: d, users: users.rows, platform: platform.rows[0] || { day: d, win: 0, loss: 0 } };
}

export async function updateUserTotals(id: string, { balance, profit, loss }:{balance:number;profit:number;loss:number}) {
  await pool.query(
    `UPDATE users SET balance=$2, profit=$3, loss=$4 WHERE id=$1`,
    [id, balance, profit, loss]
  );
}
