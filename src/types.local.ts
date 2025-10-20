import type { FoodsKey } from "./types";

export type RoundStatus = "betting" | "revealing" | "revealed" | "completed" | "preparing";

export type Round = {
  roundId: string;
  roundStatus: RoundStatus;
  startTime?: string | number;
  endTime?: string | number;
  revealTime?: string | number;
  prepareTime?: string | number;
  winnerBox?: string;
  winningBox?: string;
  boxStats?: BoxStat[];
  boxes?: BoxDef[];
  // other fields allowed
} | null | undefined;

export type BoxKey = FoodsKey; // you only keep core foods

export type LiveBox = {
  key: BoxKey;
  title: string;
  icon?: string;
  multiplier: number;
  total: number;
  bettors?: number;
};

export type BoxStat = { box?: string; title?: string; icon?: string; multiplier?: number; totalAmount?: number; bettorsCount?: number };
export type BoxDef  = { title?: string; icon?: string; multiplier?: number; totalBet?: number; userCount?: number };

export type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
export type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
export type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
export type BankFly = { id: string; fromX: number; fromY: number; delay: number };
