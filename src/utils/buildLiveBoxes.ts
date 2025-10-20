import { norm } from "../constants";
import type { BoxDef, BoxStat, LiveBox } from "../types.local";
import type { FoodsKey } from "../types";

const CORE_ORDER: FoodsKey[] = ["meat","tomato","corn","sausage","lettuce","carrot","skewer","ham"];
const CORE_LABEL: Record<FoodsKey, string> = {
  meat:"Meat", tomato:"Tomato", corn:"Corn", sausage:"Sausage",
  lettuce:"Lettuce", carrot:"Carrot", skewer:"Skewer", ham:"Ham",
};

export function buildLiveBoxes(payload: { boxStats?: BoxStat[]; boxes?: BoxDef[] }): LiveBox[] {
  const src = (payload.boxStats?.length ? payload.boxStats : payload.boxes) ?? [];
  const map = new Map<FoodsKey, LiveBox>();
  for (const it of src as any[]) {
    const key = norm(it.box ?? it.title) as FoodsKey;
    if (!CORE_ORDER.includes(key)) continue;
    const multiplier = Number(it.multiplier ?? 1);
    const total = Number((it.totalAmount ?? it.totalBet) ?? 0);
    const bettors = Number((it.bettorsCount ?? it.userCount) ?? 0);
    map.set(key, {
      key,
      title: CORE_LABEL[key],
      icon: it.icon,
      multiplier: isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
      total: isFinite(total) && total >= 0 ? total : 0,
      bettors: isFinite(bettors) && bettors >= 0 ? bettors : 0,
    });
  }
  return CORE_ORDER.map(k => map.get(k) ?? { key: k, title: CORE_LABEL[k], icon: undefined, multiplier: 1, total: 0, bettors: 0 });
}
