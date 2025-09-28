import { useState } from "react";

export default function SettingsModal({ settingsOpen, setSettingsOpen }: { settingsOpen: boolean; setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
  if (!settingsOpen) return null; // If not open, return null to hide

  const [prefs, setPrefs] = useState({
    master: 0.6,
    bet: 0.6,
    reveal: 0.8,
    win: 0.7,
    bg: 0.5,
  });

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-[92%] max-w-md rounded-3xl text-white shadow-[0_24px_80px_rgba(0,0,0,.6)] pointer-events-auto"
        style={{
          background:
            "linear-gradient(180deg, #8a2be2 0%, #7a27dc 30%, #5a1fcf 70%, #4317c2 100%)",
          border: "4px solid #ff9f1a",
          boxShadow: "0 0 0 6px rgba(255,159,26,.25) inset, 0 16px 40px rgba(0,0,0,.45)",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setSettingsOpen(false)}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Settings Content */}
        <div className="px-4 py-10">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-bold">Settings</div>
          </div>

          <div className="mt-3 text-[12px] text-white/80">Sound</div>

          <div className="mt-2">
            <Slider label="Master" value={prefs.master} onChange={(v) => setPrefs((p) => ({ ...p, master: v }))} />
            <Slider label="Bet" value={prefs.bet} onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))} />
            <Slider label="Reveal" value={prefs.reveal} onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))} />
            <Slider label="Win" value={prefs.win} onChange={(v) => setPrefs((p) => ({ ...p, win: v }))} />
            <Slider label="BG Music" value={prefs.bg} onChange={(v) => setPrefs((p) => ({ ...p, bg: v }))} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-[12px] mb-1 text-white/90">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        className="w-full accent-[#22c55e]" // Green accent color
        style={{
          background:
            "linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.6) 100%)",
        }}
      />
    </div>
  );
}