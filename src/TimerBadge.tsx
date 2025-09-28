import { useMemo } from "react";

type Round =
  | { state: "betting" | "revealing" | "idle"; timeLeftMs: number }
  | undefined;

export default function TimerBadge({
  round,
  bettingOpen,
  totalMs = 30000, // set your round length here (ms) for the progress arc
}: {
  round: Round;
  bettingOpen: boolean;
  totalMs?: number;
}) {
  const seconds = Math.max(0, Math.floor((round?.timeLeftMs ?? 0) / 1000));
  const label = bettingOpen
    ? "Timer"
    : round?.state === "revealing"
    ? "Revealing…"
    : "Next Round";

  // progress (1 -> full, 0 -> empty)
  const progress = useMemo(() => {
    if (!round || totalMs <= 0) return 0;
    return Math.min(1, Math.max(0, (round.timeLeftMs || 0) / totalMs));
  }, [round, totalMs]);

  // circle math
  const size = 172;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * progress;

  return (
    <div
      className="absolute left-1/2 top-[290px] -translate-x-1/2 -translate-y-1/2"
      style={{ width: size, height: size }}
    >
      {/* Outer glow + soft shadow */}
      <div className="relative w-full h-full rounded-full">
        <div className="absolute inset-0 rounded-full blur-xl opacity-70"
             style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(255,130,92,.35) 0%, rgba(255,84,58,.15) 60%, transparent 100%)" }} />
        <div className="absolute inset-0 rounded-full"
             style={{ boxShadow: "0 14px 28px rgba(0,0,0,.35)" }} />

        {/* Conic gradient bezel */}
        <div
          className="relative w-full h-full rounded-full p-[14px] bg-black/10 backdrop-blur"
          style={{
            background:
              "conic-gradient(from 140deg, #ffb168, #ff6b4a 25%, #ff3c2b 50%, #ff7a59 75%, #ffb168)",
          }}
        >
          {/* Inner glass disc */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-b from-zinc-900/50 to-zinc-800/40 backdrop-blur-sm border border-white/10 grid place-items-center overflow-hidden">
            {/* subtle texture/gloss */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[140%] h-[60%] rounded-b-[999px] bg-white/10 blur-md pointer-events-none" />
            <div className="absolute inset-0 opacity-[.06] pointer-events-none" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1.5px)", backgroundSize: "6px 6px" }} />

            {/* Progress ring */}
            <svg
              className="absolute inset-0"
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
            >
              <defs>
                <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fff3c4" />
                  <stop offset="50%" stopColor="#ffe08a" />
                  <stop offset="100%" stopColor="#ffd257" />
                </linearGradient>
                <linearGradient id="progress" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#ffe9d6" />
                  <stop offset="100%" stopColor="#ffd0b9" />
                </linearGradient>
              </defs>

              {/* base ring (subtle) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke="url(#ring)"
                strokeOpacity="0.25"
                strokeWidth={stroke}
                fill="none"
              />

              {/* animated progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke="url(#progress)"
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${dash} ${c - dash}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{
                  filter:
                    "drop-shadow(0 2px 6px rgba(255,255,255,.25)) drop-shadow(0 0 10px rgba(255,140,100,.35))",
                  transition: "stroke-dasharray 120ms linear",
                }}
              />
            </svg>

            {/* content */}
            <div className="relative z-10 flex flex-col items-center gap-1 text-white">
              {/* top mini-pill */}
              <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-white/10 border border-white/15 shadow-sm">
                {label}
              </div>

              {/* center emblem (replace with logo if you like) */}
              <div className="text-[28px] leading-none select-none opacity-90">
                ✦
              </div>

              {/* bottom glass chip with time */}
              <div className="mt-1 px-3 py-1 rounded-xl font-black tabular-nums text-[18px] tracking-tight border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]"
                   style={{ background: "linear-gradient(180deg, rgba(255,72,72,.85) 0%, rgba(210,28,28,.9) 100%)" }}>
                {round ? `${seconds}s` : "0s"}
              </div>
            </div>
          </div>
        </div>

        {/* tick marks around bezel */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * 360;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 w-[2px] h-[10px] bg-white/70 rounded-full"
                style={{
                  transform: `rotate(${angle}deg) translate(0, -78px)`,
                  transformOrigin: "center -78px",
                  opacity: i % 3 === 0 ? 0.9 : 0.55,
                  height: i % 3 === 0 ? 14 : 10,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
