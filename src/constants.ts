export const SND = {
  BET: "/mixkit-clinking-coins-1993.wav",
  REVEAL: "/video-game-bonus-retro-sparkle-gamemaster-audio-lower-tone-1-00-00.mp3",
  WIN: "/mixkit-ethereal-fairy-win-sound-2019.wav",
  BG: "/background-music-minecraftgaming-405001.mp3",
} as const;

export const DUR = {
  hopMs: 70,
  decelAddMs: 12,
  decelMaxMs: 260,
  payoutLingerMs: 1200,
  bankLingerMs: 1100,
  intermissionSecs: 8,
} as const;

export const colorPalette = [
  "#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#06b6d4", "#3b82f6",
];

export const chipColorMap: Record<number, string> = {
  500: "#16a34a",
  1000: "#1fb141",
  2000: "#3b82f6",
  5000: "#fb923c",
  10000: "#ef4444",
  50000: "#c084fc",
};

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export function fmt(n: number) {
  const format = (num: number, suffix: string) => {
    const f = (num).toFixed(1);
    return f.endsWith(".0") ? `${parseInt(f)}${suffix}` : `${f}${suffix}`;
  };
  if (n >= 1_000_000) return format(n / 1_000_000, "M");
  if (n >= 1_000) return format(n / 1_000, "K");
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
}

export const parseTs = (v?: string | number) =>
  typeof v === "number" ? v : v ? Date.parse(v) : 0;

export const uid = (() => {
  let i = 0;
  return () => {
    try { if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch {}
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return `id-${t}-${r}-${i++}`;
  };
})();
