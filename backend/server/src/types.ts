export const FRUITS = [
  "cherry","lemon","grape","watermelon","apple","pineapple","blueberry","strawberry"
] as const;
export type FruitKey = typeof FRUITS[number];

export type RoundState = "betting" | "revealing" | "pause";

export type User = {
  id: string;
  name: string;
  balance: number; // chips
  profit: number;  // lifetime
  loss: number;    // lifetime
};

export type Bet = {
  id: string;
  userId: string;
  fruit: FruitKey;
  value: number;   // 1000..5000
  roundId: string;
  createdAt: string; // ISO
};

export type RoundPublic = {
  roundId: string;
  state: RoundState;
  timeLeftMs: number;
  winner?: FruitKey;
};

export type ClientStateForUser = {
  user: User;
  round: RoundPublic;
  fruitTotals: Record<FruitKey, number>;
  myBets: Bet[];
};