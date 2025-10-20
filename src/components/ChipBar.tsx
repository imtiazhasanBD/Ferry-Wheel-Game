import React from "react";
import { motion } from "framer-motion";
import { chipColorMap } from "../constants";

type Props = {
  chips: number[];
  selected: number;
  balance: number;
  onSelect: (v: number) => void;
  chipRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
  notify: (m: string) => void;
};

export default function ChipBar({ chips, selected, balance, onSelect, chipRefs, notify }: Props) {
  return (
    <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
      {chips.map((v) => {
        const color = chipColorMap[v] || "#6b7280";
        const isSelected = selected === v;
        const afford = balance >= v;

        return (
          <motion.button
            key={v}
            ref={(el) => { chipRefs.current[v] = el; return undefined; }}
            whileTap={{ scale: 0.95, rotate: -2 }}
            onClick={() => {
              if (!afford) return notify("Not enough balance for this chip");
              onSelect(v);
            }}
            className="relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none"
            style={{
              width: 48, height: 48, transformStyle: "preserve-3d",
              boxShadow: isSelected ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55` : "0 8px 16px rgba(0,0,0,.35)",
              border: `2px solid ${isSelected ? color : "rgba(255,255,255,.14)"}`,
              background: `
                conic-gradient(
                  #fff 0 15deg, ${color} 15deg 45deg,
                  #fff 45deg 60deg, ${color} 60deg 90deg,
                  #fff 90deg 105deg, ${color} 105deg 135deg,
                  #fff 135deg 150deg, ${color} 150deg 180deg,
                  #fff 180deg 195deg, ${color} 195deg 225deg,
                  #fff 225deg 240deg, ${color} 240deg 270deg,
                  #fff 270deg 285deg, ${color} 285deg 315deg,
                  #fff 315deg 330deg, ${color} 330deg 360deg
                )`,
            }}
            title={`${v}`}
            aria-label={`Select chip ${v}`}
            aria-disabled={!afford}
          >
            <div
              className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
              style={{
                width: 34, height: 34,
                background: isSelected
                  ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
                  : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
                border: "2px solid rgba(0,0,0,.15)",
                color: isSelected ? "#0b3a8e" : "#1f2937",
                boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
              }}
            >
              {v >= 1000 ? v / 1000 + "K" : v}
            </div>
            {isSelected && (
              <div className="absolute inset-[-4px] rounded-full pointer-events-none"
                   style={{ border: `2px solid ${color}88`, boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66` }} />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
