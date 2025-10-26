import React, { useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, Music2, X } from "lucide-react";

export type Prefs = {
  master: number; // affects Bet/Reveal/Win only
  bet: number;
  reveal: number;
  win: number;
  bg: number; // background music only
};

export default function SettingsDialog({
  open,
  onClose,
  prefs,
  setPrefs,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
}) {
  // Now "BG Music" is its own slider (no averaging)
  const bgValue = useMemo(() => prefs.bg, [prefs.bg]);

  // Remember last non-zero values for mute toggles
  const prevMasterRef = useRef<number>(prefs.master || 1);
  const prevBgRef = useRef<number>(prefs.bg || 1);

  // Setters
  const setBg = (v: number) => setPrefs((p) => ({ ...p, bg: v }));

  // Master mute (affects SFX only in your mixer code)
  const toggleMasterMute = () =>
    setPrefs((p) => {
      if (p.master > 0) {
        prevMasterRef.current = p.master || 1;
        return { ...p, master: 0 };
      }
      return { ...p, master: prevMasterRef.current || 1 };
    });

  // BG mute only
  const toggleBgMute = () =>
    setPrefs((p) => {
      if (p.bg > 0) {
        prevBgRef.current = p.bg || 1;
        return { ...p, bg: 0 };
      }
      return { ...p, bg: prevBgRef.current || 1 };
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Dialog card */}
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-[92%] max-w-md rounded-3xl text-white pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                "linear-gradient(180deg,#2379c9 0%, #1f6bb4 40%, #1b5d9c 75%, #154b7e 100%)",
              border: "4px solid rgba(255,255,255,.15)",
              boxShadow:
                "0 0 0 6px rgba(35,121,201,.35) inset, 0 16px 40px rgba(0,0,0,.45)",
            }}
          >
            {/* Ribbon */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
              >
                <RibbonBlueTwisted>SETTINGS</RibbonBlueTwisted>
              </motion.div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-end px-4 py-3 border-b border-white/20">
              <button
                className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-5">
              {/* Master (affects Bet/Reveal/Win only in the mixer) */}
              <div className="mt-1">
                <SliderRow
                  label="Master (no BG)"
                  value={prefs.master}
                  onChange={(v) => setPrefs((p) => ({ ...p, master: v }))}
                  iconOn={<Volume2 size={18} />}
                  onToggleMute={toggleMasterMute}
                />
                <p className="mt-1 text-[11px] text-white/70">
                  Controls Bet, Reveal, and Win. Background music is NOT affected.
                </p>
              </div>

              {/* BG Music only */}
              <div className="mt-4">
                <SliderRow
                  label="BG Music"
                  value={bgValue}
                  onChange={setBg}
                  iconOn={<Music2 size={18} />}
                  onToggleMute={toggleBgMute}
                />
                <p className="mt-2 text-[11px] text-white/70">Controls only Background Music.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Slider ---------- */
function SliderRow({
  label,
  value,
  onChange,
  iconOn,
  iconOff,
  onToggleMute,
}: {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  iconOn: React.ReactNode;
  iconOff?: React.ReactNode; // optional: if not provided, we'll show red cross overlay
  onToggleMute: () => void;
}) {
  const pct = Math.round((value || 0) * 100);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-[12px] mb-2 text-white/90">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Mute toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={`${label} mute`}
          className="relative grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25 transition"
        >
          {value > 0 ? (
            iconOn
          ) : iconOff ? (
            iconOff
          ) : (
            <>
              {iconOn}
              {/* Red cross overlay */}
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  stroke="red"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <line x1="4" y1="4" x2="20" y2="20" />
                </svg>
              </span>
            </>
          )}
        </button>

        {/* Range */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
          className="w-full h-2 rounded-full appearance-none outline-none touch-none"
          style={{
            background: `linear-gradient(90deg, #36a2ff ${pct}%, #0f355e ${pct}%)`,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
          }}
        />
      </div>

      {/* Cross-browser thumb/track */}
      <style>{`
        input[type="range"] { -webkit-appearance: none; appearance: none; }
        input[type="range"] { height: 8px; border-radius: 9999px; }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px; border-radius: 9999px; background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 8px; border-radius: 9999px; background: transparent;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 9999px;
          background: #ffd125;
          box-shadow: 0 0 0 2px rgba(0,0,0,.2), inset 0 -2px 0 rgba(0,0,0,.15);
          cursor: pointer; margin-top: -6px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 9999px;
          background: #ffd125; border: none;
          box-shadow: 0 0 0 2px rgba(0,0,0,.2), inset 0 -2px 0 rgba(0,0,0,.15);
          cursor: pointer;
        }
        input[type="range"] { touch-action: none; }
      `}</style>
    </div>
  );
}

/* ===== Ribbon (blue, twisted tails) ===== */
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
      {/* Ribbon body */}
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
