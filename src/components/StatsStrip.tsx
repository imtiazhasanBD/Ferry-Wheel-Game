import React from "react";
import { fmt } from "../constants";

type Props = {
  balanceEl: React.RefObject<HTMLDivElement>;
  balance: number;
  rewards: number;
};

export default function StatsStrip({ balanceEl, balance, rewards }: Props) {
  return (
    <div
      className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
      style={{
        background: "linear-gradient(180deg, #36a2ff, #2379c9)",
        borderColor: "#1e40af",
        boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
      }}
    >
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
        style={{
          background: "linear-gradient(180deg,#2f63c7,#1f4290)",
          borderColor: "rgba(255,255,255,.25)",
          boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
        }}
      >
        Stats
      </div>

      <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
        <div className="text-[11px] opacity-90 leading-none">Coins</div>
        <div ref={balanceEl} className="text-[14px] font-bold tabular-nums leading-tight">
          💎 {fmt(balance ?? 0)}
        </div>
      </div>

      <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
        <div className="text-[11px] opacity-90 leading-none">Rewards</div>
        <div className="text-[14px] font-bold tabular-nums leading-tight">
          💎 {fmt(rewards)}
        </div>
      </div>
    </div>
  );
}
