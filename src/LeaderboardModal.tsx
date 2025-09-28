type RankItem = {
  userId: string;
  name?: string;
  wins?: number;         // fallback metric if you still track “wins”
  amount?: number;       // coins/chips won in the block
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
  intermissionSec?: number;        // number | undefined
  user?: { id: string } | undefined;
}) {
  if (!open) return null;

  const fmt = (n?: number) =>
    typeof n === "number" ? n.toLocaleString() : "0";

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm">
      {/* Card */}
      <div
        className="relative w-[92%] max-w-md rounded-3xl text-white shadow-[0_24px_80px_rgba(0,0,0,.6)] pointer-events-auto"
        style={{
          background:
            "linear-gradient(180deg,#8a2be2 0%,#7a27dc 30%,#5a1fcf 70%,#4317c2 100%)",
          border: "4px solid #ff9f1a",
          boxShadow:
            "0 0 0 6px rgba(255,159,26,.25) inset, 0 16px 40px rgba(0,0,0,.45)",
          position: "relative",
          zIndex: 1000,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
          style={{ zIndex: 1001 }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Gold Ribbon Header */}
        <div className="relative px-4 pt-10">
          <div className="relative mx-auto w-[88%]">
            {/* Ribbon body */}
            <div
              className="mx-auto w-full select-none rounded-2xl py-2 text-center text-[22px] font-extrabold tracking-wide"
              style={{
                background:
                  "linear-gradient(180deg,#ffdf7e 0%,#ffbd2e 60%,#ff9f1a 100%)",
                color: "#7a26c6",
                textShadow: "0 1px 0 rgba(255,255,255,.6)",
                boxShadow:
                  "0 10px 22px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.7)",
                border: "2px solid #ffc43a",
              }}
            >
              LEADERBOARD
            </div>
            {/* Ribbon tails */}
            <div className="pointer-events-none absolute -left-6 top-1/2 h-7 w-8 -translate-y-1/2 rounded-l-md"
                 style={{background:"linear-gradient(180deg,#ffdf7e 0%,#ffbd2e 60%,#ff9f1a 100%)", boxShadow:"-6px 8px 0 0 rgba(0,0,0,.08)"}} />
            <div className="pointer-events-none absolute -right-6 top-1/2 h-7 w-8 -translate-y-1/2 rounded-r-md"
                 style={{background:"linear-gradient(180deg,#ffdf7e 0%,#ffbd2e 60%,#ff9f1a 100%)", boxShadow:"6px 8px 0 0 rgba(0,0,0,.08)"}} />
          </div>

          {/* Subtitle */}
          <div className="mt-2 text-center text-[11px] font-medium text-white/85">
            Last 10 rounds • Next block starts
            {typeof intermissionSec === "number" ? ` in ${intermissionSec}s` : ""}.
          </div>
        </div>

        {/* List */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto px-3 pb-4">
          {ranking.length === 0 && (
            <div className="py-10 text-center text-sm text-white/85">
              No winners this block.
            </div>
          )}

          <div className="space-y-2">
            {ranking.map((r, i) => {
              const idx = i + 1;
              const isSelf = r.userId === user?.id;

              const crown =
                idx === 1
                  ? "🥇"
                  : idx === 2
                  ? "🥈"
                  : idx === 3
                  ? "🥉"
                  : null;

              return (
                <div
                  key={r.userId + i}
                  className={`relative flex items-center justify-between rounded-xl border px-3 py-2.5 shadow-sm transition`}
                  style={{
                    background: `linear-gradient(90deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.03) 100%)`,
                    borderColor: "rgba(255,255,255,.18)",
                  }}
                >
                  {/* Left side */}
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Rank badge */}
                    <div className="grid w-8 place-items-center text-sm font-extrabold tabular-nums">
                      {crown ? (
                        <span className="text-[18px] leading-none">{crown}</span>
                      ) : (
                        <span className="opacity-90">{idx}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div
                      className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border ring-0"
                      style={{
                        borderColor: "rgba(255,255,255,.25)",
                        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
                        background:
                          "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
                      }}
                    >
                      {r.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg text-black/50">👤</span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <div
                        className={`truncate text-[13px] font-semibold ${
                          isSelf ? "text-emerald-300" : "text-white"
                        }`}
                      >
                        {isSelf ? "You" : r.name || r.userId.slice(0, 6)}
                      </div>
                      <div className="text-[10px] text-white/70">
                        ID: {r.userId.slice(0, 6)}
                      </div>
                    </div>
                  </div>

                  {/* Right side: amount or wins */}
                  <div className="ml-3 flex shrink-0 items-center gap-1.5">
                    <CoinIcon className="h-4 w-4" />
                    {typeof r.amount === "number" ? (
                      <div className="text-[13px] font-extrabold tabular-nums">
                        {fmt(r.amount)}
                      </div>
                    ) : (
                      <div className="text-[13px] font-extrabold tabular-nums">
                        {fmt(r.wins)}
                      </div>
                    )}
                  </div>

                  {/* Row highlight for self */}
                  {isSelf && (
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-500/80" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between gap-2 px-4 pb-4">
          <div />
          <div className="flex gap-2">
            {onStartNow && (
              <button
                type="button"
                onClick={onStartNow}
                className="rounded-xl border border-white/25 bg-fuchsia-500/30 px-4 py-2 text-sm font-semibold shadow hover:bg-fuchsia-500/40"
              >
                Start Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small coin glyph for the right-side amount */
function CoinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
    >
      <defs>
        <radialGradient id="g" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff7cc" />
          <stop offset="55%" stopColor="#ffd24f" />
          <stop offset="100%" stopColor="#e6a400" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#g)" stroke="rgba(0,0,0,.25)" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="rgba(0,0,0,.25)" />
      <path d="M9.5 9h5M8.5 12h7M9.5 15h5" stroke="rgba(0,0,0,.35)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
