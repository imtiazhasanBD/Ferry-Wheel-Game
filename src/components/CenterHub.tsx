import { motion } from "framer-motion";

type Props = {
  top: number;           // hubTop
  size: number;          // hubSize
  status: "betting" | "revealing" | "revealed" | "completed" | string | undefined;
  bettingOpen: boolean;
  showLeaderboard: boolean;
  uiLeftMs: number;
  catGifSrc?: string;    // default: "/cat_anomation.gif"
};

export default function CenterHub({
  top,
  size,
  status,
  bettingOpen,
  showLeaderboard,
  uiLeftMs,
  catGifSrc = "/cat_anomation.gif",
}: Props) {
  const label =
    bettingOpen && !showLeaderboard
      ? "Place bets"
      : status === "revealing"
        ? "Revealing…"
        : status === "revealed" || status === "completed"
          ? "Next round in"
          : "Preparing…";

  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
      style={{
        top,
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
        boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
        border: "1px solid rgba(255,255,255,.25)",
      }}
      animate={{
        boxShadow: [
          "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
          "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
          "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
        ],
      }}
      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
    >
      <img src={catGifSrc} className="w-64 absolute -top-8" alt="" />
      <div className="text-center relative">
        <div className="text-[12px] font-semibold tracking-wide mt-9">{label}</div>
        <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
          {`${Math.floor(uiLeftMs / 1000)}s`}
        </div>
      </div>
    </motion.div>
  );
}
