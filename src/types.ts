export const FOODS = [
  "meat",
  "tomato",
  "corn",
  "sausage",
  "lettuce",
  "carrot",
  "skewer",
  "ham",
] as const;

export type FoodsKey = typeof FOODS[number];
export type RoundState = "betting" | "revealing" | "pause";