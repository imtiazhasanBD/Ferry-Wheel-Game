import type { ApiHistoryItem } from "../useGame.socket";

type Props = {
  items: ApiHistoryItem[];     // newest first
  emojiMap: Record<string, string>; // e.g., FoodsKey -> emoji
  labelMap: Record<string, string>; // e.g., FoodsKey -> "Meat"
};

export default function ResultsStrip({ items, emojiMap, labelMap }: Props) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
      style={{
        bottom: 0, width: "115%", height: 52,
        background: "linear-gradient(180deg, #36a2ff, #2379c9)",
        border: "4px solid #1e40af",
        boxShadow: "0 5px 0 #1e3a8a",
      }}
    >
      <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
        <div
          className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
          style={{
            background: "linear-gradient(180deg,#2f63c7,#1f4290)",
            border: "1px solid rgba(255,255,255,.25)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
          }}
        >
          Result
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {items.length ? (
            items.map((k, idx) => {
              const key = String((k as any).box ?? (k as any).title ?? "").trim().toLowerCase();
              const emoji = emojiMap[key] ?? "❓";
              const label = labelMap[key] ?? key;
              const id = (k as any)?.id ?? (k as any)?._id ?? (k as any)?.createdAt ?? `${key}-${idx}`;
              return (
                <div key={id} className="relative shrink-0" title={label}>
                  <div
                    className="w-7 h-7 rounded-xl grid place-items-center"
                    style={{
                      background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
                      border: "1px solid #7fb4ff",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
                    }}
                  >
                    <span className="text-[16px] leading-none">{emoji}</span>
                  </div>
                  {idx === 0 && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[6px] font-black"
                      style={{
                        background: "linear-gradient(180deg,#ffd84d,#ffb800)",
                        border: "1px solid rgba(0,0,0,.2)",
                        boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
                        color: "#3a2a00",
                        whiteSpace: "nowrap",
                      }}
                    >
                      NEW
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
