import { motion } from "framer-motion";
import type { LiveBox } from "../types.local";
import type { FoodsKey } from "../types";

type Props = {
  D: number; // wheel diameter
  wheelTop: number;
  ringR: number;
  R: number;
  btn: number;
  hubTop: number;
  hubSize: number;

  liveBoxes: LiveBox[];
  sliceAngle: number;
  forcedWinner: FoodsKey | null;

  // active ring from cursor
  activeIdx: number | null;
  activeColor: string;

  // state/flags
  roundStatus: string | undefined;
  showLeaderboard: boolean;
  prefersReducedMotion: boolean;
  selectedChip?: number;
  canAffordChip: boolean;
  hasAnyCoins: boolean;

  // data
  totalsForHot: Record<string, number>;
  hotKey: string | null;

  // handlers
  onSliceClick: (key: string) => void;

  // wheel rotation (for counter-rotate child content)
  wheelDeg: number;
};

export default function Wheel(props: Props) {
  const {
    D, wheelTop, ringR, R, btn, hubTop, hubSize,
    liveBoxes, sliceAngle, forcedWinner,
    activeIdx, activeColor,
    roundStatus, showLeaderboard, prefersReducedMotion, selectedChip, canAffordChip, hasAnyCoins,
    totalsForHot, hotKey,
    onSliceClick,
  } = props;

  const disabledPhase = roundStatus !== "betting" || showLeaderboard;
console.log(selectedChip)
  return (
    <div className="relative" style={{ minHeight: wheelTop + D + 140 }}>
      {/* Disc */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
        style={{
          top: wheelTop,
          width: D, height: D, borderRadius: 9999,
          background:
            "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
          boxShadow:
            "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
        }}
      >
        {/* rim highlight */}
        <div
          className="absolute inset-0 rounded-full opacity-50"
          style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
        />

        {/* spokes */}
        {liveBoxes.map((_, i) => (
          <div
            key={`spoke-${i}`}
            className="absolute left-1/2 top-1/2 origin-left"
            style={{ width: R, height: 5, background: "rgba(255,255,255,.05)", transform: `rotate(${i * (360 / liveBoxes.length)}deg)` }}
          />
        ))}

        {/* slices */}
        {liveBoxes.map((bx, i) => {
          const angDeg = i * sliceAngle;
          const rad = ((angDeg - 90) * Math.PI) / 180;
          const cx = R + ringR * Math.cos(rad);
          const cy = R + ringR * Math.sin(rad);

          const visuallyDisabled = disabledPhase || !hasAnyCoins || !canAffordChip;
          const isWinner = forcedWinner === bx.key && roundStatus !== "betting";
          const isActive = activeIdx === i;

          const ACTIVE_RING_PX = 4;

          return (
            <div key={bx.key}>
              <motion.button
                whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
                whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
                onClick={() => {
                  if (visuallyDisabled) return;
                  onSliceClick(bx.key);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
                style={{
                  left: cx, top: cy, width: btn, height: btn,
                  background:
                    "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
                  borderStyle: "solid",
                  borderWidth: isActive ? ACTIVE_RING_PX : 1,
                  borderColor: isWinner ? "#22c55e" : isActive ? activeColor : "rgba(255,255,255,.15)",
                  boxShadow: isWinner
                    ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45)"
                    : isActive
                    ? `0 0 0 2px ${activeColor}, 0 0 10px ${activeColor}cc, 0 0 22px ${activeColor}88`
                    : "0 12px 28px rgba(0,0,0,.45)",
                  transition: "border-color 80ms linear, border-width 80ms linear, box-shadow 80ms linear",
                }}
                aria-label={`Bet on ${bx.title} (pays x${bx.multiplier})`}
                disabled={visuallyDisabled}
                title={`Bet on ${bx.title} (pays x${bx.multiplier})`}
              >
                <div className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
                     style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}>
                  <div aria-hidden className="text-[28px] leading-none drop-shadow">
                    {bx.icon ?? "❓"}
                  </div>
                  <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
                    win <span className="font-extrabold">x{bx.multiplier}</span>
                  </div>
                  {hotKey === bx.key && (
                    <div className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
                         style={{ boxShadow: "0 6px 14px rgba(0,0,0,.45)", border: "1px solid rgba(255,255,255,.25)" }}>
                      HOT
                    </div>
                  )}
                  <div className="text-[10px] text-white">Total: {new Intl.NumberFormat().format(totalsForHot[bx.key] ?? 0)}</div>
                </div>
              </motion.button>
            </div>
          );
        })}
      </motion.div>

      {/* Center hub (only visuals; keep your existing markup if you want) */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
        style={{
          top: hubTop, width: hubSize, height: hubSize,
          background: "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
          boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
          border: "1px solid rgba(255,255,255,.25)",
        }}
        animate={{ boxShadow: [
          "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
          "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
          "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
        ]}}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      >
        {/* keep your cat gif & countdown overlay in parent if needed */}
      </motion.div>
    </div>
  );
}
