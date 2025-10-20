import { useCallback, useEffect, useRef, useState } from "react";
import { clamp01 } from "../constants";
import { SND } from "../constants";
import type { Prefs } from "../SettingsBottomSheet";


type SoundName = "bet" | "reveal" | "win" | "bg" | "hop";

const HOP_POOL_SIZE = 6;

export function useAudioManager(prefs: Prefs) {
  const [ready, setReady] = useState(false);

  const betRef = useRef<HTMLAudioElement | null>(null);
  const revealRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const bgRef = useRef<HTMLAudioElement | null>(null);
  const hopPoolRef = useRef<HTMLAudioElement[]>([]);
  const hopIdxRef = useRef(0);

  // init on mount
  useEffect(() => {
    betRef.current = new Audio(SND.BET);
    revealRef.current = new Audio(SND.REVEAL);
    winRef.current = new Audio(SND.WIN);
    bgRef.current = new Audio(SND.BG);
    if (bgRef.current) bgRef.current.loop = true;

    hopPoolRef.current = Array.from({ length: HOP_POOL_SIZE }, () => {
      const a = new Audio(SND.REVEAL); // hop uses reveal tick
      a.preload = "auto";
      return a;
    });
  }, []);

  // volumes
  useEffect(() => {
    const m = clamp01(prefs.master);
    if (betRef.current) betRef.current.volume = m * clamp01(prefs.bet);
    if (revealRef.current) revealRef.current.volume = m * clamp01(prefs.reveal);
    if (winRef.current) winRef.current.volume = m * clamp01(prefs.win);
    if (bgRef.current) bgRef.current.volume = m * clamp01(prefs.bg);
    hopPoolRef.current.forEach(a => { a.volume = m * clamp01(prefs.reveal); });
  }, [prefs]);

  // page visibility (pause bg)
  useEffect(() => {
    const onVis = () => {
      if (!bgRef.current) return;
      if (document.hidden) bgRef.current.pause();
      else if (ready) bgRef.current.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [ready]);

  const primeAll = useCallback(async () => {
    const primeOne = async (a?: HTMLAudioElement | null) => {
      if (!a) return;
      try { a.muted = true; await a.play(); a.pause(); a.currentTime = 0; a.muted = false; } catch {}
    };
    await Promise.all([
      primeOne(betRef.current),
      primeOne(revealRef.current),
      primeOne(winRef.current),
      primeOne(bgRef.current),
      ...hopPoolRef.current.map(a => primeOne(a)),
    ]);
    setReady(true);
    bgRef.current?.play().catch(() => {});
  }, []);

  const play = useCallback((name: SoundName) => {
    if (!ready) return;
    try {
      if (name === "hop") {
        const i = (hopIdxRef.current++ % hopPoolRef.current.length);
        const a = hopPoolRef.current[i];
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
      const m: Partial<Record<SoundName, HTMLAudioElement | null>> = {
        bet: betRef.current,
        reveal: revealRef.current,
        win: winRef.current,
        bg: bgRef.current,
      };
      const a = m[name];
      if (a) { a.pause(); a.currentTime = 0; a.play().catch(() => {}); }
    } catch {}
  }, [ready]);

  return { ready, primeAll, play };
}
