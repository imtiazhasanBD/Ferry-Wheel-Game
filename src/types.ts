export const FOODS = [
  "meat",
  "tomato",
  "skewer",
  "carrot",
  "ham",
  "lettuce",
  "sausage",
  "corn",
] as const;
export const FRUITS = [
    "cherry", "lemon", "grape", "watermelon", "apple", "pineapple", "blueberry", "strawberry"
] as const;
export type FoodsKey = typeof FOODS[number];
export type FruitKey = typeof FRUITS[number];
export type RoundState = "betting" | "revealing" | "pause";