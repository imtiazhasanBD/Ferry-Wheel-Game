export default function InitialLoader({
  open,
  progress,
  title = "Ferry Wheel Royale",
  subtitle = "Starting your table…",
  backgroundUrl = "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1400&auto=format&fit=crop",
  withinFrame = false,
}: {
  open: boolean;
  progress: number;
  title?: string;
  subtitle?: string;
  backgroundUrl?: string;
  withinFrame?: boolean; // NEW
}) {
  const pct = Math.round((progress ?? 0) * 100);

  if (!open) return null;

  // If we're inside the frame, just overlay it; else fall back to standalone frame
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    withinFrame ? (
      <div className="absolute inset-0 z-[100]">{children}</div>
    ) : (
      <div className="relative w-[360px] max-w-[360px] h-[700px] mx-auto overflow-hidden rounded-[8px] border border-white/10 shadow-2xl z-[100]">
        {children}
      </div>
    );

  return (
    <Wrapper>
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(5,10,25,0.75), rgba(5,10,25,0.85)), url("${backgroundUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Card */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] max-w-[90%] rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white shadow-2xl p-5">
        <div className="text-center">
          <div className="text-[13px] tracking-widest uppercase text-white/75">Welcome to</div>
          <div className="mt-1 text-2xl font-extrabold drop-shadow-sm">{title}</div>
          <div className="mt-1 text-[12px] text-white/80">{subtitle}</div>
        </div>

        <div className="mt-5">
          <div className="h-3 w-full rounded-full border border-white/15 bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                transition: "width 80ms linear",
                background: "linear-gradient(90deg,#8b5cf6,#3b82f6,#06b6d4)",
              }}
            />
          </div>
          <div className="mt-2 text-right text-[11px] font-semibold text-white/85 tabular-nums">
            {pct}%
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
