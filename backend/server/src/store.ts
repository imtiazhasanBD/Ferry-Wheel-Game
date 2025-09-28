import { FRUITS, FruitKey, Bet, User } from "./types.js";
import { randomUUID } from "node:crypto";

export const CHIPS = [1000,2000,3000,4000,5000] as const;
export const ROUND_DURATION_MS = 10_000;
export const PAUSE_MS = 1500;

export const users = new Map<string, User>();

// round state (module-level, server-authoritative)
export let currentRoundId = randomUUID();
export let roundStart = Date.now();
export let roundState: "betting"|"revealing"|"pause" = "betting";
export let roundWinner: FruitKey | undefined = undefined;

const betsByRound = new Map<string, Bet[]>();
function ensureRoundBets() {
  if (!betsByRound.has(currentRoundId)) betsByRound.set(currentRoundId, []);
  return betsByRound.get(currentRoundId)!;
}

export function getFruitTotals(): Record<FruitKey, number> {
  const totals = Object.fromEntries(FRUITS.map(f => [f, 0])) as Record<FruitKey, number>;
  for (const b of ensureRoundBets()) totals[b.fruit] += b.value;
  return totals;
}

export function getUserBets(userId: string): Bet[] {
  return ensureRoundBets().filter(b => b.userId === userId);
}

export function newUser(name: string): User {
  const id = randomUUID();
  const user: User = { id, name, balance: 100_000, profit: 0, loss: 0 };
  users.set(id, user);
  return user;
}

export function placeBet(userId: string, fruit: FruitKey, value: number): Bet | Error {
  const user = users.get(userId);
  if (!user) return new Error("USER_NOT_FOUND");
  if (roundState !== "betting") return new Error("BETTING_CLOSED");
  if (!CHIPS.includes(value as any)) return new Error("INVALID_CHIP");
  if (user.balance < value) return new Error("INSUFFICIENT_FUNDS");

  user.balance -= value; // deduct stake immediately
  const bet: Bet = {
    id: randomUUID(),
    userId,
    fruit,
    value,
    roundId: currentRoundId,
    createdAt: new Date().toISOString(),
  };
  ensureRoundBets().push(bet);
  return bet;
}

export function pickWinner(): FruitKey {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

export function settleRound(winner: FruitKey) {
  roundWinner = winner;
  const bets = ensureRoundBets();
  const perUser = new Map<string, { balance: number; profit: number; loss: number }>();

  for (const b of bets) {
    const d = perUser.get(b.userId) ?? { balance: 0, profit: 0, loss: 0 };
    if (b.fruit === winner) {
      d.balance += b.value * 2; // stake back + profit
      d.profit += b.value;
    } else {
      d.loss += b.value;
    }
    perUser.set(b.userId, d);
  }

  for (const [uid, d] of perUser) {
    const u = users.get(uid);
    if (!u) continue;
    u.balance += d.balance;
    u.profit += d.profit;
    u.loss += d.loss;
  }
}

export function resetForNewRound() {
  currentRoundId = randomUUID();
  roundStart = Date.now();
  roundWinner = undefined;
  roundState = "betting";
}

export function getCurrentRoundBets(): Bet[] { return ensureRoundBets(); }