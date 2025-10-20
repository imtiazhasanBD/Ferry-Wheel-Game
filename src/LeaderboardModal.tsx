import { AnimatePresence, motion } from "framer-motion";

type RankItem = {
  userId: string;
  name?: string;
  wins?: number;    // fallback metric if you still track “wins”
  amount?: number;  // coins/chips won in the block
  avatarUrl?: string;
};

export default function LeaderboardModal({
  open,
  onClose,
  ranking,
  intermissionSec,
  user,
  onStartNow,
}: {
  open: boolean;
  onClose: () => void;
  onStartNow?: () => void;
  ranking: RankItem[];
  intermissionSec?: number;
  user?: { id: string } | undefined;
}) {
  const fmt = (n?: number) => (typeof n === "number" ? n.toLocaleString() : "0");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm"
          // initial={{ opacity: 0 }}
          // animate={{ opacity: 1 }}
          // exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Card container (click stop) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-[92%] max-w-sm rounded-[28px] px-4 pt-16 pb-5"
            style={{
              background:
                "linear-gradient(180deg,#2379c9 0%, #1f6bb4 40%, #1b5d9c 75%, #154b7e 100%)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.2)",
              border: "2px solid rgba(255,255,255,.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Twisted ribbon (animated) */}
            <div className="absolute -top-9 left-1/2 -translate-x-1/2">
              <motion.div
                initial={{ y: -18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
              >
                <RibbonBlue />
              </motion.div>
            </div>

            {/* Inner card */}
            <div
              className="rounded-[22px] border overflow-hidden"
              style={{
                background: "linear-gradient(180deg,#e6f3ff 0%, #d9ecff 50%, #c9e4ff 100%)",
                borderColor: "#2379c9",
                boxShadow:
                  "inset 0 2px 0 rgba(255,255,255,.8), 0 8px 24px rgba(19,62,112,.25)",
              }}
            >
              {/* Subtitle */}
              <div className="mt-8 text-center text-[11px] font-semibold text-[#0f355e]">
                Last 10 rounds • Next block
                {typeof intermissionSec === "number" ? ` in ${intermissionSec}s` : ""}.
              </div>

              {/* List */}
              <div className="px-3 py-3">
                {ranking.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#0f355e]">No winners this block.</div>
                ) : (
                  <div className="space-y-2">
                    {ranking.map((r, i) => {
                      const idx = i + 1;
                      const isSelf = r.userId === user?.id;

                      const crown =
                        idx === 1 ? "🥇" : idx === 2 ? "🥈" : idx === 3 ? "🥉" : null;

                      return (
                        <motion.div
                          key={r.userId + i}
                          // initial={{ opacity: 0, x: -18 }}
                          // animate={{ opacity: 1, x: 0 }}
                          // transition={{ delay: 0.12 + i * 0.05 }}
                          className="relative flex items-center justify-between rounded-[14px] px-3 py-2.5"
                          style={{
                            background: "linear-gradient(180deg,#eef7ff 0%, #e6f2ff 100%)",
                            boxShadow:
                              "inset 0 2px 0 rgba(255,255,255,.9), 0 6px 12px rgba(23,73,128,.18)",
                            border: "1px solid rgba(35,121,201,.35)",
                          }}
                        >
                          {/* Left side */}
                          <div className="flex min-w-0 items-center gap-2.5">
                            {/* Rank / crown */}
                            <div className="w-7 flex justify-center">
                              {crown ? (
                                <span className="text-[20px] leading-none">{crown}</span>
                              ) : (
                                <span className="text-[13px] font-extrabold text-[#0f355e] tabular-nums">
                                  {idx}
                                </span>
                              )}
                            </div>

                            {/* Avatar */}
                            <div
                              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full"
                              style={{
                                background: "linear-gradient(180deg,#ffffff,#f1f7ff)",
                                border: "1px solid rgba(35,121,201,.35)",
                                boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                              }}
                            >
                              {r.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-lg text-[#0f355e]/40">👤</span>
                              )}
                            </div>

                            {/* Name */}
                            <div className="min-w-0">
                              <div
                                className={`truncate text-[13px] font-extrabold tracking-wide ${
                                  isSelf ? "text-[#2ab47a]" : "text-[#0f355e]"
                                }`}
                                style={{ textShadow: "0 1px 0 rgba(255,255,255,.8)" }}
                              >
                                {isSelf ? "YOU" : r.name || r.userId.slice(0, 6)}
                              </div>
                            </div>
                          </div>

                          {/* Right side: score */}
                          <div className="ml-3 flex shrink-0 items-center gap-1.5">
                            <span>🏆</span>
                            <div
                              className="text-[13px] font-extrabold tabular-nums"
                              style={{ color: "#d76a1f", textShadow: "0 1px 0 rgba(255,255,255,.8)" }}
                            >
                              {fmt(typeof r.amount === "number" ? r.amount : r.wins)}
                            </div>
                          </div>

                          {/* Self highlight */}
                          {isSelf && (
                            <div className="pointer-events-none absolute inset-0 rounded-[14px] ring-2 ring-emerald-500/80" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 px-4 pb-3">
                {onStartNow && (
                  <motion.button
                    type="button"
                    onClick={onStartNow}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-[12px] px-4 py-2 text-sm font-bold text-white shadow"
                    style={{
                      background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
                      boxShadow: "inset 0 2px 0 rgba(255,255,255,.5), 0 6px 14px rgba(19,62,112,.35)",
                      border: "1px solid rgba(35,121,201,.6)",
                    }}
                  >
                    START NOW
                  </motion.button>
                )}
              </div>
            </div>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              aria-label="Close"
              whileTap={{ scale: 0.95 }}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white shadow"
              style={{
                background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
                boxShadow: "inset 0 2px 0 rgba(255,255,255,.5), 0 6px 12px rgba(0,0,0,.25)",
                border: "1px solid rgba(35,121,201,.6)",
              }}
            >
              ✕
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= Twisted Ribbon (blue) ================= */

function RibbonBlue() {
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
      {/* Ribbon body */}
      <div
        className="relative min-w-[230px] rounded-[18px] px-8 py-2 text-center text-[20px] font-extrabold tracking-wide text-white"
        style={{
          background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 60%, #1b5d9c 100%)",
          textShadow: "0 1px 0 rgba(0,0,0,.25)",
          boxShadow: "0 6px 12px rgba(0,0,0,.3), inset 0 2px 0 rgba(255,255,255,.6)",
          border: "2px solid rgba(255,255,255,.5)",
        }}
      >
        LEADERBOARD
      </div>
    </div>
  );
}
