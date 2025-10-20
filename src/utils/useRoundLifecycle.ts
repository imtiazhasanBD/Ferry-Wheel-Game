import { useEffect } from "react";
import { norm, parseTs } from "../constants";
import type { Round } from "../types.local";

/**
 * Centralizes round-driven side effects:
 * - When status becomes "revealing": start cursor
 * - When status becomes "revealed": land cursor on winner
 * - When round changes or settles: do a full per-round reset
 */
export function useRoundLifecycle(opts: {
  round: Round;
  currentRoundId: string | null;
  setCurrentRoundId: (id: string) => void;

  // cursor controls
  startCursor: () => void;
  stopCursor: () => void;
  settleOnWinnerIndex: (i: number) => void;
  markNotLanded: () => void;

  // wheel meta
  liveBoxKeys: string[]; // in render order

  // full reset action
  resetForNewOrSettledRound: () => void;

}) {
  const {
    round,
    currentRoundId,
    setCurrentRoundId,
    startCursor, stopCursor, settleOnWinnerIndex, markNotLanded,
    liveBoxKeys,
    resetForNewOrSettledRound
  } = opts;

  // Single effect to handle new round / settled cleanup
  useEffect(() => {
    if (!round) return;
    const isNewRound = currentRoundId && currentRoundId !== round.roundId;
    const isSettled = round.roundStatus === "revealed" || round.roundStatus === "completed";
    if (isNewRound || isSettled) resetForNewOrSettledRound();
    setCurrentRoundId(round.roundId);
  }, [round?.roundId, round?.roundStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enter revealing → start fast cursor
  useEffect(() => {
    if (!round) return;
    if (round.roundStatus === "revealing") {
      markNotLanded();
      startCursor();
    } else if (round.roundStatus !== "revealed") {
      stopCursor();
    }
  }, [round?.roundStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revealed → decelerate to winner
  useEffect(() => {
    if (!round) return;
    if (round.roundStatus !== "revealed") return;

    const raw = norm(round.winnerBox ?? round.winningBox);
    const target = liveBoxKeys.findIndex(k => norm(k) === raw);
    if (target >= 0) settleOnWinnerIndex(target);
    else stopCursor();
  }, [round?.roundStatus, round?.winnerBox, round?.winningBox, liveBoxKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Optional) Derived durations could live here if you want a single place:
  // const phaseTotalMs = useMemo(() => {...}, [round]);
  parseTs; // keep import used
}
