import { useCallback, useEffect, useRef, useState } from "react";
import { DUR, colorPalette } from "../constants";

const randColor = () => colorPalette[(Math.random() * colorPalette.length) | 0];

export function useCursor(sliceCount: number, onLand: (index: number) => void, playHop?: ()=>void) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeColor, setActiveColor] = useState<string>("#22c55e");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const runningRef  = useRef(false);
  const landedRef   = useRef(false);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current)  { clearTimeout(timeoutRef.current);   timeoutRef.current = null; }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    runningRef.current = false;
  }, [clearTimers]);

  const start = useCallback((speedMs = DUR.hopMs) => {
    if (!sliceCount) return;
    stop();
    runningRef.current = true;
    setActiveIdx(prev => (prev == null ? 0 : prev));
    setActiveColor(randColor());

    intervalRef.current = setInterval(() => {
      setActiveIdx(idx => {
        const next = ((idx ?? 0) + 1) % sliceCount;
        setActiveColor(randColor());
        playHop?.();
        return next;
      });
    }, Math.max(25, speedMs));
  }, [sliceCount, stop, playHop]);

  const settleOn = useCallback((targetIndex: number) => {
    if (!sliceCount) return;
    if (targetIndex < 0 || targetIndex >= sliceCount) { stop(); return; }

    clearTimers();

    let idx = (activeIdx ?? 0);
    let stepsLeft = ((targetIndex - idx + sliceCount) % sliceCount) + sliceCount * 2;
    let delay = 60;

    const step = () => {
      if (stepsLeft <= 0) {
        stop();
        if (!landedRef.current) {
          landedRef.current = true;
          onLand(targetIndex);
        }
        return;
      }
      idx = (idx + 1) % sliceCount;
      setActiveIdx(idx);
      setActiveColor(randColor());
      playHop?.();
      stepsLeft--;
      delay = Math.min(DUR.decelMaxMs, delay + DUR.decelAddMs);
      timeoutRef.current = setTimeout(step, delay);
    };

    step();
  }, [sliceCount, activeIdx, stop, clearTimers, onLand, playHop]);

  // cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  const markNotLanded = useCallback(() => { landedRef.current = false; }, []);

  return { activeIdx, activeColor, start, stop, settleOn, markNotLanded };
}
