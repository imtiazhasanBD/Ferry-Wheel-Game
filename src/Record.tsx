import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getEmojiForBox } from "./RoundWinnersModal";

/* ========= Types for the new "rounds" response ========= */
type PerBox = {
  box: string;
  totalAmount: number;
  betCount: number;
  lastBetAt: string;
  multiplierUsed: number;
  isWinner: boolean;
  winAmount: number;
  loseAmount: number;
  outcome: "win" | "lose";
};

type RoundItem = {
  _id: string;
  roundId: string;
  roundNumber: number;
  roundStatus: "betting" | "revealing" | "completed";
  winningBox: string | null;
  lastBetAt: string;
  perBox: PerBox[];
  totalBet: number;
  totalWin: number;
  totalLose: number;
};

/* ========= View model for our rows ========= */
type RoundVM = {
  dateStr: string;
  roundNumber: number;
  bets: { box: string; amount: number }[];
  resultBox: string | null;
  totalWin: number;
};

/* ========= Formatters ========= */
//const fmt = (n: number) => n.toLocaleString();

const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${(n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}K`;
  return `${n}`;
};
const ymd = (iso: string) => {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const COLS = "2fr 2fr 1fr 1.2fr";

export default function Record({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<RoundVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (false) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRoundHistory();
        setRows(data);
        console.log("dataaaaaaaaaaaaaaa",data)
      } catch (err: any) {
        console.error(err);
        setError("Failed to load bet history.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [true]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            // initial={{ opacity: 0, scale: 0.95, y: 14 }}
            // animate={{ opacity: 1, scale: 1, y: 0 }}
            // transition={{ type: "spring", stiffness: 220, damping: 22 }}
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
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
            {/* Ribbon */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <motion.div
              // initial={{ y: -16, opacity: 0 }}
              // animate={{ y: 0, opacity: 1 }}
              // transition={{
              //   type: "spring",
              //   stiffness: 300,
              //   damping: 18,
              //   delay: 0.05,
              // }}
              >
                <RibbonBlueTwisted>RECORD</RibbonBlueTwisted>
              </motion.div>
            </div>

            {/* Close */}
            <motion.button
              type="button"
              onClick={onClose}
              className="absolute right-2.5 top-5 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
              aria-label="Close"
            >
              ✕
            </motion.button>

            {/* Content */}
            <div className="px-4 pt-14 pb-6">
              {/* Header (kept same) */}
              <div
                className="grid gap-2 sticky top-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg"
                style={{
                  gridTemplateColumns: COLS,
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
              <div className="mt-2 max-h-[52vh] overflow-y-auto space-y-1 pr-1 no-scrollbar">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="grid gap-2 px-3 py-3 text-[12px] rounded-lg animate-pulse"
                        style={{
                          gridTemplateColumns: COLS,
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.03) 100%)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,.15), 0 4px 10px rgba(19,62,112,.15)",
                          border: "1px solid rgba(35,121,201,.25)",
                        }}
                      >
                        <div className="h-3 w-24 bg-white/20 rounded"></div>
                        <div className="h-3 w-20 bg-white/25 rounded"></div>
                        <div className="h-3 w-14 bg-white/20 rounded"></div>
                        <div className="h-3 w-10 bg-white/25 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center text-sm text-rose-400 py-6">
                    {error}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="text-center text-sm text-white/70 py-6">
                    No records found.
                  </div>
                ) : (
                  rows.map((r, i) => (
                    <div key={r.roundNumber + "-" + i}>
                      {/* one "round" */}
                      <div
                        className="grid gap-2 px-3 py-3 text-[12px] rounded-lg"
                        style={{
                          gridTemplateColumns: COLS,
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,.15)",
                          boxShadow: "0 2px 10px rgba(0,0,0,.12)",
                        }}
                      >
                        {/* Time */}
                        <div className="text-white/65 leading-tight m-auto">
                          <div>{r.dateStr}</div>
                          <div className="text-white/70 text-[11px]">
                            Round:{r.roundNumber}
                          </div>
                        </div>

                        {/* Bet — list each box */}
                        <div className="flex flex-col gap-1 ">
                          {r.bets.map((b, idx) => (
                            <div
                              key={b.box + idx}
                              className="flex items-center gap-1.5"
                            >
                              <span className="text-[14x] leading-none bg-gray-200 rounded-full p-0.5">
                                {getEmojiForBox(b.box)}
                              </span>
                              <span className="text-[12px] text-white/90">
                                🪙 {fmtShort(b.amount)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Result — winning box emoji */}
                        <div className="m-auto">
                          {r.resultBox ? (
                            <div className="space-y-1">
                              <div className="text-[14px] leading-none bg-gray-200 rounded-full p-0.5">
                                {getEmojiForBox(r.resultBox)}
                              </div>
                              <div className="text-[14px] leading-none bg-gray-200 rounded-full p-0.5">
                                {[
                                  "Meat",
                                  "Sausage",
                                  "Skewer",
                                  "Ham",
                                  "Pizza",
                                ].some((item) => r?.resultBox?.includes(item))
                                  ? "🍕"
                                  : "🥗"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/60">—</span>
                          )}
                        </div>

                        {/* Win  */}
                        <div className="flex items-start m-auto text-[12px]">
                          <span className="font-semibold text-emerald-300">
                            🪙 {fmtShort(r.totalWin)}
                          </span>
                        </div>
                      </div>

                      {/* divider between rounds like the image */}
                      {/*      <div className="my-2 h-px bg-white/25" /> */}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========= Fetch & map to the new "rounds" structure ========= */
async function getRoundHistory(): Promise<RoundVM[]> {
  const token = localStorage?.getItem("auth_token");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const res = await fetch(`${API_BASE}/api/v1/bet/user-bet-history`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) throw new Error("Failed to fetch bet history");

  const data = await res.json();

  // Prefer the new 'rounds' shape;
  const rounds: RoundItem[] = Array.isArray(data?.rounds) ? data.rounds : [];

  return rounds.map((rd) => ({
    dateStr: ymd(rd.lastBetAt),
    roundNumber: rd.roundNumber,
    bets: rd.perBox.map((p) => ({ box: p.box, amount: p.totalAmount })),
    resultBox: rd.winningBox,
    totalWin: rd.totalWin ?? 0,
  }));
}

/* ===== Twisted Ribbon (blue) – unchanged ===== */
function RibbonBlueTwisted({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex justify-center">
      <div
        className="absolute -left-10 top-1/2 h-8 w-10 -translate-y-1/2 rotate-[-12deg] rounded-l-md"
        style={{
          background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
          boxShadow: "-4px 4px 0 rgba(0,0,0,.15)",
        }}
      />
      <div
        className="absolute -right-10 top-1/2 h-8 w-10 -translate-y-1/2 rotate-[12deg] rounded-r-md"
        style={{
          background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
          boxShadow: "4px 4px 0 rgba(0,0,0,.15)",
        }}
      />
      <div
        className="relative min-w-[200px] rounded-[16px] px-6 py-1.5 text-center text-[18px] font-extrabold tracking-wide text-white"
        style={{
          background:
            "linear-gradient(180deg,#36a2ff 0%, #2379c9 60%, #1b5d9c 100%)",
          textShadow: "0 1px 0 rgba(0,0,0,.25)",
          boxShadow:
            "0 6px 12px rgba(0,0,0,.3), inset 0 2px 0 rgba(255,255,255,.6)",
          border: "2px solid rgba(255,255,255,.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
