import { AnimatePresence, motion } from "framer-motion";

export type RoundWinnerEntry = {
  userId: string;
  name: string;
  avatarUrl?: string;
  bet: number;
  win: number;
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `${Math.round(n / 1_000_000)}M` :
  n >= 1_000 ? `${Math.round(n / 1_000)}K` :
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

export default function RoundWinnersModal({
  open,
  onClose,
  entries,
  meId,
}: {
  open: boolean;
  onClose: () => void;
  entries: RoundWinnerEntry[];
  meId?: string;
}) {
  const top = entries.slice(0, 3);
  const me = entries.find(e => e.userId === meId) ?? { userId: meId ?? "me", name: "Harper Clark", bet: 0, win: 0 };
console.log("entriessssssssssssssssssssssssssssssssssss",entries)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Card shell (LEADERBOARD blue theme) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[92%] max-w-sm rounded-[22px] text-white"
            style={{
              background:
                "linear-gradient(180deg,#2379c9 0%, #1f6bb4 40%, #1b5d9c 75%, #154b7e 100%)",
              border: "4px solid rgba(255,255,255,.15)",
              boxShadow: "0 0 0 6px rgba(35,121,201,.35) inset, 0 16px 40px rgba(0,0,0,.45)",
            }}
          >
         {/* Twisted Ribbon */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
              >
                <RibbonBlueTwisted>GOOD LUCK</RibbonBlueTwisted>
              </motion.div>
            </div>

            {/* Close */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2.5 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
            >
              ✕
            </motion.button>

            {/* Inner panel (slightly darker glass, like screenshot) */}
            <div
              className="mt-12 mx-2 mb-2 rounded-[18px] p-[10px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%)",
                border: "1px solid rgba(35,121,201,.35)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)",
              }}
            >
              {/* Subtitle */}
              <div className="text-center text-[12px] text-white/90 mb-2">
                congratulations to the following winner(s)
              </div>

              {/* 3-podium grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {top.map((p, idx) => {
                  const place = idx + 1;
                  const crown = place === 1 ? "👑" : place === 2 ? "🥈" : "🥉";
                  return (
                    <motion.div
                      key={p.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + idx * 0.05 }}
                      className="rounded-[14px] p-2 text-center"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.05) 100%)",
                        border: "1px solid rgba(35,121,201,.35)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,.25), 0 6px 14px rgba(19,62,112,.25)",
                      }}
                    >
                      {/* Top badge/crown */}
                      <div className="text-[22px] leading-none mb-1">{crown}</div>

                      {/* Avatar frame (rounded rect like screenshot) */}
                      <div
                        className="mx-auto w-[60px] h-[60px] rounded-[10px] overflow-hidden grid place-items-center"
                        style={{
                          background: "linear-gradient(180deg,#ffffff,#f1f7ff)",
                          border: "1px solid rgba(35,121,201,.35)",
                          boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                        }}
                      >
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[#0f355e]/60 text-lg">{p.name.slice(0, 1)}</span>
                        )}
                      </div>

                      {/* Gold name banner */}
                      <div
                        className="mt-1 mx-auto max-w-[110px] truncate rounded px-2 py-[2px] text-[11px] font-bold"
                        title={p.name}
                        style={{
                          background:
                            "linear-gradient(180deg,#ffd27a 0%, #f3b635 60%, #e49a22 100%)",
                          color: "#0f355e",
                          textShadow: "0 1px 0 rgba(255,255,255,.6)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,.8), 0 2px 6px rgba(0,0,0,.15)",
                          border: "1px solid rgba(190,120,40,.6)",
                        }}
                      >
                        {p.name}
                      </div>

                      {/* Bet/Win rows (purple glass bars in screenshot → blue glass here) */}
                      <div
                        className="mt-2 space-y-1 text-[11px] text-white/95 text-left rounded-[10px] p-2"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(15,53,94,.35) 0%, rgba(15,53,94,.22) 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)",
                          border: "1px solid rgba(35,121,201,.35)",
                        }}
                      >
                        <div className="flex justify-between">
                          <span className="opacity-90">Bet:</span>
                          <b className="tabular-nums">{fmt(p.bet)}</b>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-90">Win:</span>
                          <b
                            className="tabular-nums"
                            style={{ color: "#ffd27a", textShadow: "0 1px 0 rgba(0,0,0,.25)" }}
                          >
                            {fmt(p.win)}
                          </b>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* if fewer than 3 entries, fill placeholders */}
                {Array.from({ length: Math.max(0, 3 - top.length) }).map((_, i) => (
                  <div
                    key={`ph-${i}`}
                    className="rounded-[14px] p-2 text-center opacity-60"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,.04) 100%)",
                      border: "1px solid rgba(35,121,201,.25)",
                    }}
                  >
                    <div className="text-[22px]">—</div>
                    <div
                      className="mx-auto w-[60px] h-[60px] rounded-[10px]"
                      style={{ background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)" }}
                    />
                    <div className="mt-1 mx-auto h-[18px] w-[90px] rounded bg-white/10" />
                    <div className="mt-2 h-[36px] rounded bg-white/5" />
                  </div>
                ))}
              </div>

              {/* Bottom "you" row */}
              <div
                className="rounded-[12px] px-3 py-2"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%)",
                  border: "1px solid rgba(35,121,201,.35)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="grid h-9 w-9 place-items-center overflow-hidden rounded-md"
                    style={{
                      background: "linear-gradient(180deg,#ffffff,#f1f7ff)",
                      border: "1px solid rgba(35,121,201,.35)",
                      boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                    }}
                  >
                    <span className="text-[#0f355e]/60 text-base">👤</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{me.name}</div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[12px]">
                      <div
                        className="rounded-[10px] px-2 py-[4px] flex items-center justify-between"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(15,53,94,.35) 0%, rgba(15,53,94,.22) 100%)",
                          border: "1px solid rgba(35,121,201,.35)",
                        }}
                      >
                        <span>Bet:</span>
                        <b className="tabular-nums">{fmt(me.bet)}</b>
                      </div>
                      <div
                        className="rounded-[10px] px-2 py-[4px] flex items-center justify-between"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(15,53,94,.35) 0%, rgba(15,53,94,.22) 100%)",
                          border: "1px solid rgba(35,121,201,.35)",
                        }}
                      >
                        <span>Win:</span>
                        <b
                          className="tabular-nums"
                          style={{ color: "#ffd27a", textShadow: "0 1px 0 rgba(0,0,0,.25)" }}
                        >
                          {fmt(me.win)}
                        </b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---- Same twisted blue ribbon you use on LEADERBOARD ---- */
function RibbonBlueTwisted({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex justify-center">
      {/* Left tail */}
      <div
        className="absolute -left-10 top-1/2 h-8 w-10 -translate-y-1/2 rotate-[-12deg] rounded-l-md"
        style={{
          background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
          boxShadow: "-4px 4px 0 rgba(0,0,0,.15)",
        }}
      />
      {/* Right tail */}
      <div
        className="absolute -right-10 top-1/2 h-8 w-10 -translate-y-1/2 rotate-[12deg] rounded-r-md"
        style={{
          background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
          boxShadow: "4px 4px 0 rgba(0,0,0,.15)",
        }}
      />
      {/* Body */}
      <div
        className="relative min-w-[200px] rounded-[16px] px-6 py-1.5 text-center text-[18px] font-extrabold tracking-wide text-white"
        style={{
          background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 60%, #1b5d9c 100%)",
          textShadow: "0 1px 0 rgba(0,0,0,.25)",
          boxShadow: "0 6px 12px rgba(0,0,0,.3), inset 0 2px 0 rgba(255,255,255,.6)",
          border: "2px solid rgba(255,255,255,.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
