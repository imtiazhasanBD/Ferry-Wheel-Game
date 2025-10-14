import { AnimatePresence, motion } from "framer-motion";

const rows = [
  { time: "1:15 PM", bet: 2000, result: "🍎", win: -2000 },
  { time: "2:00 PM", bet: 500,  result: "🍋", win: +750  },
  { time: "3:45 PM", bet: 1500, result: "🍉", win: -1500 },
];

const fmt = (n: number) => n.toLocaleString();

export default function Record({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
          {/* Dialog card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-[92%] max-w-md rounded-3xl text-white pointer-events-auto"
            style={{
              background:
                "linear-gradient(180deg,#2379c9 0%, #1f6bb4 40%, #1b5d9c 75%, #154b7e 100%)",
              border: "4px solid rgba(255,255,255,.15)",
              boxShadow:
                "0 0 0 6px rgba(35,121,201,.35) inset, 0 16px 40px rgba(0,0,0,.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Twisted Ribbon */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
              >
                <RibbonBlueTwisted>RECORD</RibbonBlueTwisted>
              </motion.div>
            </div>

            {/* Close Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onClose}
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
              aria-label="Close"
            >
              ✕
            </motion.button>

            {/* Content */}
            <div className="px-4 pt-12 pb-6">
              {/* Header */}
              <div
                className="grid grid-cols-4 gap-2 sticky top-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%)",
                  color: "rgba(240,248,255,.9)",
                  boxShadow: "inset 0 -1px 0 rgba(35,121,201,.35)",
                }}
              >
                <span>Time</span>
                <span>Bet</span>
                <span>Result</span>
                <span>Win</span>
              </div>

              {/* Rows */}
              <div className="mt-2 max-h-[52vh] overflow-y-auto space-y-2 pr-1">
                {rows.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    className="grid grid-cols-4 gap-2 px-3 py-3 text-[12px] rounded-lg"
                    style={{
                      // no white bg: deep blue glassy pills
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,.04) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.25), 0 6px 14px rgba(19,62,112,.25)",
                      border: "1px solid rgba(35,121,201,.35)",
                    }}
                  >
                    <span className="text-white/85">{r.time}</span>
                    <span className="text-white">{fmt(r.bet)}</span>
                    <span className="truncate text-white">{r.result}</span>
                    <span
                      className={`${r.win >= 0 ? "text-emerald-400" : "text-rose-400"} font-semibold`}
                    >
                      {r.win >= 0 ? `+${fmt(r.win)}` : `${fmt(r.win)}`}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===== Twisted Ribbon (blue) ===== */

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
