// gameNormalize.ts
export type UBox = {
  title: string;        // server's label (e.g., "Meat")
  icon: string;         // emoji
  multiplier: number;   // pays xN
  totalAmount: number;  // sum of bets
  bettorsCount: number; // number of bettors
  group?: string;       // optional (e.g., "Pizza" | "Salad")
};

/** from roundStarted.boxes */
export function normalizeFromStarted(boxes: any[] | undefined): UBox[] {
  return (boxes ?? []).map(b => ({
    title: String(b.title ?? ""),
    icon: String(b.icon ?? ""),
    multiplier: Number(b.multiplier ?? 0),
    totalAmount: Number(b.totalBet ?? 0),      // roundStarted can carry totalBet/userCount
    bettorsCount: Number(b.userCount ?? 0),
    group: b.group ? String(b.group) : undefined,
  }));
}

/** apply roundUpdated.boxStats on top of current */
export function applyStats(current: UBox[], boxStats: any[] | undefined): UBox[] {
  if (!boxStats?.length) return current;
  const map = new Map(current.map(b => [b.title, b]));
  for (const s of boxStats) {
    const key = String(s.box ?? s.title ?? "");
    const prev = map.get(key);
    if (prev) {
      map.set(key, {
        ...prev,
        multiplier: s.multiplier != null ? Number(s.multiplier) : prev.multiplier,
        totalAmount: Number(s.totalAmount ?? prev.totalAmount ?? 0),
        bettorsCount: Number(s.bettorsCount ?? prev.bettorsCount ?? 0),
        group: s.group ?? prev.group,
      });
    } else {
      // late-coming box (defensive)
      map.set(key, {
        title: key,
        icon: "❓",
        multiplier: Number(s.multiplier ?? 0),
        totalAmount: Number(s.totalAmount ?? 0),
        bettorsCount: Number(s.bettorsCount ?? 0),
        group: s.group ? String(s.group) : undefined,
      });
    }
  }
  return Array.from(map.values());
}
