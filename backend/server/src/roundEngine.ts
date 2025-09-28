// --- Compatibility layer for single-table roundEngine.ts ---
import type { Bet, FruitKey } from "./types.js";
import { pool } from "./db.js"; // if you're already in db.ts, remove this line

// If rounds.table_id exists in your schema, we insert a default tableId "public-1".
// Safe no-op if the row already exists.
export async function openRound(roundId: string, tableId: string = "public-1") {
  await pool.query(
    `INSERT INTO rounds (id, table_id)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [roundId, tableId]
  );
}

export async function closeRound(roundId: string, winner: FruitKey) {
  await pool.query(
    `UPDATE rounds
       SET finished_at = NOW(),
           winner = $2
     WHERE id = $1`,
    [roundId, winner]
  );
}

// Overloads let you call with 2 args (winner, bets) or 3 (tableId, winner, bets)
export async function upsertDailyAggForRound(winner: FruitKey, bets: Bet[]): Promise<void>;
export async function upsertDailyAggForRound(tableId: string, winner: FruitKey, bets: Bet[]): Promise<void>;
export async function upsertDailyAggForRound(a: any, b: any, c?: any): Promise<void> {
  // Use your existing implementation (3-arg) under the hood
  const hasTableId = typeof a === "string" && c !== undefined;
  const tableId = hasTableId ? (a as string) : "public-1";
  const winner = (hasTableId ? b : a) as FruitKey;
  const bets = (hasTableId ? c : b) as Bet[];

  // ----- BEGIN: your existing 3-arg logic (adapted) -----
  // Example implementation; keep yours if you already have it:
  // (Assumes daily_user_agg and daily_platform_agg exist)
  let platformWin = 0;  // payouts to users (their profit)
  let platformLoss = 0; // users' lost stakes kept by platform

  const perUser = new Map<string, { win: number; loss: number }>();
  for (const bet of bets) {
    const u = perUser.get(bet.userId) ?? { win: 0, loss: 0 };
    if (bet.fruit === winner) { u.win += bet.value; platformWin += bet.value; }
    else { u.loss += bet.value; platformLoss += bet.value; }
    perUser.set(bet.userId, u);
  }

  // Upsert user/day
  await Promise.all(
    [...perUser.entries()].map(([userId, agg]) =>
      pool.query(
        `INSERT INTO daily_user_agg (day, user_id, win, loss)
         VALUES (CURRENT_DATE, $1, $2, $3)
         ON CONFLICT (day, user_id)
         DO UPDATE SET
           win  = daily_user_agg.win  + EXCLUDED.win,
           loss = daily_user_agg.loss + EXCLUDED.loss`,
        [userId, agg.win, agg.loss]
      )
    )
  );

  // Upsert platform/day
  await pool.query(
    `INSERT INTO daily_platform_agg (day, win, loss)
     VALUES (CURRENT_DATE, $1, $2)
     ON CONFLICT (day)
     DO UPDATE SET
       win  = daily_platform_agg.win  + EXCLUDED.win,
       loss = daily_platform_agg.loss + EXCLUDED.loss`,
    [platformWin, platformLoss]
  );
  // ----- END: your existing logic -----
}
