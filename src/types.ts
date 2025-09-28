export const FRUITS = [
    "cherry", "lemon", "grape", "watermelon", "apple", "pineapple", "blueberry", "strawberry"
] as const;
export type FruitKey = typeof FRUITS[number];
export type RoundState = "betting" | "revealing" | "pause";