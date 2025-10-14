// useGame.local.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { FOODS, type FoodsKey } from "./types";

/** ======= Local “backend” config ======= */
const STORAGE_USER_KEY = "wheel.local.user.v1";
const STORAGE_BLOCK_COUNTER = "wheel.local.blockCounter.v1";
const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

type RoundState = "betting" | "revealing" | "pause";
type RoundPublic = {
  roundId: string;
  state: RoundState;
  timeLeftMs: number;
  winner?: FoodsKey;
  blockRound?: number; // 1..10
};

type BetEcho = {
  betId: string;
  userId: string;
  fruit: FoodsKey;
  value: number;
  roundId: string;
};

type LocalUser = {
  id: string;
  name: string;
  balance: number;
  profit: number;
  loss: number;
};

const DEFAULT_USER: LocalUser = {
  id: "me",
  name: "You",
  balance: 200_000,
  profit: 0,
  loss: 0,
};

// Safe UUID that works on HTTP too
const uid = (() => {
  let i = 0;
  return () => {
    try {
      if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    } catch { }
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return `id-${t}-${r}-${i++}`;
  };
})();


const BETTING_MS = 30_000;   // matches your UI’s 10s progress bar
const REVEAL_MS = 6_000;
const PAUSE_MS = 3_000;

/** Small helpers */
const now = () => Date.now();
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const pickRandom = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const fmtRoundId = (t: number) => `r-${t}`;

/** Persist & load user */
function loadUser(): LocalUser {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw) as LocalUser;
      // guard older schemas
      return {
        id: u.id ?? "me",
        name: u.name ?? "You",
        balance: typeof u.balance === "number" ? u.balance : 200_000,
        profit: typeof u.profit === "number" ? u.profit : 0,
        loss: typeof u.loss === "number" ? u.loss : 0,
      };
    }
  } catch { }
  return { ...DEFAULT_USER };
}
function saveUser(u: LocalUser) {
  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
  } catch { }
}

/** Block round 1..10 for your leaderboard ribbon */
function loadBlockCounter(): number {
  try {
    const raw = localStorage.getItem(STORAGE_BLOCK_COUNTER);
    if (raw) return Number(raw) || 1;
  } catch { }
  return 1;
}
function saveBlockCounter(n: number) {
  try {
    localStorage.setItem(STORAGE_BLOCK_COUNTER, String(n));
  } catch { }
}

/** ============ The hook ============ */
export function useGame() {
  // ----- user -----
  const [user, setUser] = useState<LocalUser>(() => loadUser());
  const setUserPersist = useCallback((updater: (u: LocalUser) => LocalUser) => {
    setUser((prev) => {
      const next = updater(prev);
      saveUser(next);
      return next;
    });
  }, []);

  // ----- round -----
  const [round, setRound] = useState<RoundPublic>(() => {
    const startAt = now();
    const rid = fmtRoundId(startAt);
    const blockRound = loadBlockCounter();
    return { roundId: rid, state: "betting", timeLeftMs: BETTING_MS, blockRound };
  });

  const timerRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef<number>(now());
  const phaseLenRef = useRef<number>(BETTING_MS);

  // ----- live state for current-round bets -----
  const currentBetsRef = useRef<Record<FoodsKey, number>>({
    meat: 0,
    tomato: 0,
    corn: 0,
    sausage: 0,
    lettuce: 0,
    carrot: 0,
    skewer: 0,
    ham: 0,
  });

  // ----- echo queue for your animations -----
  const [echoQueue, setEchoQueue] = useState<BetEcho[]>([]);
  const shiftEcho = useCallback(() => {
    setEchoQueue((q) => q.slice(1));
  }, []);

  /** Optional: simulate some “other players” placing small bets during betting phase */
  const simulateOthers = useCallback(() => {
    if (round.state !== "betting") return;
    // ~50% chance per second that somebody throws a tiny bet
    if (Math.random() < 0.5) {
      const fruit = pickRandom(FOODS);
      const value = pickRandom([1000, 2000, 5000]);
      const betId = uid();
      setEchoQueue((q) => [...q, { betId, userId: "npc", fruit, value, roundId: round.roundId }]);
      // we don't track NPC totals for payout
    }
  }, [round.state, round.roundId]);

  /** Round engine */
  useEffect(() => {
    // clear any previous
    if (timerRef.current) window.clearInterval(timerRef.current);

    phaseStartedAtRef.current = now();
    phaseLenRef.current = round.state === "betting" ? BETTING_MS
      : round.state === "revealing" ? REVEAL_MS
        : PAUSE_MS;

    timerRef.current = window.setInterval(() => {
      const elapsed = now() - phaseStartedAtRef.current;
      const left = clamp(phaseLenRef.current - elapsed, 0, phaseLenRef.current);

      setRound((r) => ({ ...r, timeLeftMs: left }));

      // keep a tiny “npc” trickle during betting
      if (round.state === "betting" && elapsed > 250 && Math.floor(elapsed) % 1000 < 50) {
        simulateOthers();
      }

      if (left <= 0) {
        // phase transition
        setRound((r) => advancePhase(r, currentBetsRef, setUserPersist));
      }
    }, 50) as unknown as number;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.state, round.roundId]); // restart engine on new phase/new round

  /** Advance finite-state machine */
  const advancePhase = (
    r: RoundPublic,
    betsRef: typeof currentBetsRef,
    setUserPersistCb: typeof setUserPersist
  ): RoundPublic => {
    if (r.state === "betting") {
      // move to revealing; pick winner deterministically from roundId to match your wheel
      const winner = chooseWinner(r.roundId);
      return { ...r, state: "revealing", timeLeftMs: REVEAL_MS, winner };
    }

    if (r.state === "revealing") {
      // settle payouts for *local user* only
      const winner = r.winner!;
      const betOnWinner = betsRef.current[winner] || 0;
      if (betOnWinner > 0) {
        const multiplier = MULTIPLIER[winner];
        const winAmount = betOnWinner * multiplier;
        setUserPersistCb((u) => ({
          ...u,
          balance: u.balance + winAmount,
          profit: u.profit + winAmount,
        }));
      }
      // losses are what the user bet on non-winning fruits this round
      const totalBet =
        (Object.values(betsRef.current).reduce((a, b) => a + b, 0) || 0);
      const lost = totalBet - betOnWinner;
      if (lost > 0) {
        setUserPersistCb((u) => ({ ...u, loss: u.loss + lost }));
      }

      // clear current-round bets
      betsRef.current = {
        meat: 0,
        tomato: 0,
        corn: 0,
        sausage: 0,
        lettuce: 0,
        carrot: 0,
        skewer: 0,
        ham: 0,
      };

      return { ...r, state: "pause", timeLeftMs: PAUSE_MS };
    }

    // pause -> next round
    const nextBlock = bumpBlockRound(r.blockRound ?? 1);
    const newRoundId = fmtRoundId(now());
    const next: RoundPublic = {
      roundId: newRoundId,
      state: "betting",
      timeLeftMs: BETTING_MS,
      blockRound: nextBlock,
    };
    return next;
  };

  /** Winner table (same as your UI multipliers) */
  const MULTIPLIER: Record<FoodsKey, number> = {
    meat: 45,
    tomato: 5,
    corn: 5,
    sausage: 10,
    lettuce: 5,
    carrot: 5,
    skewer: 15,
    ham: 25,
  };

  /** Deterministic(ish) winner choice to feel stable across UI */
  const chooseWinner = (seed: string): FoodsKey => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619;
    const idx = (h >>> 0) % FOODS.length;
    return FOODS[idx];
  };

  const bumpBlockRound = (cur: number) => {
    const next = cur >= 10 ? 1 : cur + 1;
    saveBlockCounter(next);
    return next;
  };

  /** ========== API expected by your component ========== */

  const placeBet = useCallback(async (fruit: FoodsKey, value: number) => {
    // require betting window
    if (round.state !== "betting") return;

    // check balance
    setUserPersist((u) => {
      if (u.balance < value) return u; // not enough
      const next = { ...u, balance: u.balance - value };
      return next;
    });

    // keep per-round totals (used for settlement)
    currentBetsRef.current[fruit] += value;

    // enqueue an echo for your animations
    const betId = uid();
    setEchoQueue((q) => [
      ...q,
      { betId, userId: user.id, fruit, value, roundId: round.roundId },
    ]);
  }, [round.state, round.roundId, setUserPersist, user.id]);

  const creditWin = useCallback(async (amount: number) => {
    // your UI already calls this; keep for compatibility
    if (amount <= 0) return;
    setUserPersist((u) => ({ ...u, balance: u.balance + amount, profit: u.profit + amount }));
  }, [setUserPersist]);

  const updateBalance = useCallback((delta: number) => {
    if (!delta) return;
    setUserPersist((u) => ({ ...u, balance: u.balance + delta }));
  }, [setUserPersist]);

  const startNextRound = useCallback(() => {
    // force skip to next betting phase (used after leaderboard)
    setRound((r) => {
      const nextBlock = bumpBlockRound(r.blockRound ?? 1);
      return {
        roundId: fmtRoundId(now()),
        state: "betting",
        timeLeftMs: BETTING_MS,
        blockRound: nextBlock,
      };
    });
  }, []);

  // A tiny echo throttle to mimic server drip (optional)
  useEffect(() => {
    if (!echoQueue.length) return;
    // let the UI pop them one by one using shiftEcho already,
    // but to be safe we also auto-drain if left stuck
    const t = setTimeout(() => setEchoQueue((q) => q.slice(1)), 1800);
    return () => clearTimeout(t);
  }, [echoQueue]);

  // remember the last round start time (optional debugging)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LAST_ROUND_AT, String(Date.now()));
    } catch { }
  }, [round.roundId]);

  /** Hook return (shape matches your current backend hook closely) */
  return {
    user,
    round,
    placeBet,
    echoQueue,
    shiftEcho,
    creditWin,
    updateBalance,
    startNextRound,
  };
}



// // useGame.socket.ts (replace your current file)
// // If you prefer to keep the original filename, you can — just overwrite it.
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { FOODS, type FoodsKey } from "./types";
// import { useSocket, emitAck } from "./socket";

// /** ======= Local persistence keys ======= */
// const STORAGE_USER_KEY = "wheel.local.user.v1";
// const STORAGE_BLOCK_COUNTER = "wheel.local.blockCounter.v1";
// const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

// /** ======= Types ======= */
// type RoundState = "betting" | "revealing" | "pause";
// type RoundPublic = {
//   roundId: string;
//   state: RoundState;
//   timeLeftMs: number;
//   winner?: FoodsKey;
//   blockRound?: number; // 1..10
// };

// type BetEcho = {
//   betId: string;
//   userId: string;
//   fruit: FoodsKey;
//   value: number;
//   roundId: string;
// };

// type LocalUser = {
//   id: string;
//   name: string;
//   balance: number;
//   profit: number;
//   loss: number;
// };

// const DEFAULT_USER: LocalUser = {
//   id: "me",
//   name: "You",
//   balance: 200_000,
//   profit: 0,
//   loss: 0,
// };

// /** ======= Small helpers ======= */
// const uid = (() => {
//   let i = 0;
//   return () => {
//     try {
//       if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
//     } catch {}
//     const t = Date.now().toString(36);
//     const r = Math.random().toString(36).slice(2, 10);
//     return `id-${t}-${r}-${i++}`;
//   };
// })();

// const now = () => Date.now();
// const fmtRoundId = (t: number) => `r-${t}`;

// /** Persist & load user */
// function loadUser(): LocalUser {
//   try {
//     const raw = localStorage.getItem(STORAGE_USER_KEY);
//     if (raw) {
//       const u = JSON.parse(raw) as LocalUser;
//       return {
//         id: u.id ?? "me",
//         name: u.name ?? "You",
//         balance: typeof u.balance === "number" ? u.balance : 200_000,
//         profit: typeof u.profit === "number" ? u.profit : 0,
//         loss: typeof u.loss === "number" ? u.loss : 0,
//       };
//     }
//   } catch {}
//   return { ...DEFAULT_USER };
// }
// function saveUser(u: LocalUser) {
//   try {
//     localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
//   } catch {}
// }

// /** Block round 1..10 for your leaderboard ribbon */
// function loadBlockCounter(): number {
//   try {
//     const raw = localStorage.getItem(STORAGE_BLOCK_COUNTER);
//     if (raw) return Number(raw) || 1;
//   } catch {}
//   return 1;
// }
// function saveBlockCounter(n: number) {
//   try {
//     localStorage.setItem(STORAGE_BLOCK_COUNTER, String(n));
//   } catch {}
// }

// /** Winner name normalizer (server → FoodsKey) */
// const normalizeToFoodsKey = (s: string): FoodsKey | undefined => {
//   const key = s?.toLowerCase().trim();
//   if ((FOODS as readonly string[]).includes(key)) return key as FoodsKey;
//   const alias: Record<string, FoodsKey> = {
//     beef: "meat",
//     pork: "ham",
//     hotdog: "sausage",
//     salad: "lettuce",
//   };
//   return alias[key];
// };

// /** ======= The hook (socket-driven) ======= */
// export function useGame() {
//   const socket = useSocket();

//   // ----- user & simple app state -----
//   const [user, setUser] = useState<LocalUser>(() => loadUser());
//   const [balance, setBalance] = useState(0);
//   const [sid, setSid] = useState<string | null>(null);
//   const [log, setLog] = useState<string[]>([]);
//   const [users, setTotalUsers] = useState(0);
//   const [myBetTotal, setMyBetTotal] = useState(0);
//   const [companyWallet, setCompanyWallet] = useState(0);
// console.log(user)
//   // ----- round (driven by server events) -----
//   const [round, setRound] = useState<RoundPublic>(() => {
//     const rid = fmtRoundId(now());
//     const blockRound = loadBlockCounter();
//     return { roundId: rid, state: "pause", timeLeftMs: 0, blockRound };
//   });

//   // timer based on server-provided phaseEndTime
//   const phaseIntervalRef = useRef<number | null>(null);
//   const phaseEndRef = useRef<number>(0);

//   // ----- echo queue (for animations) -----
//   const [echoQueue, setEchoQueue] = useState<BetEcho[]>([]);
//   const shiftEcho = useCallback(() => {
//     setEchoQueue((q) => q.slice(1));
//   }, []);

//   const setUserPersist = useCallback((updater: (u: LocalUser) => LocalUser) => {
//     setUser((prev) => {
//       const next = updater(prev);
//       saveUser(next);
//       return next;
//     });
//   }, []);

//   const foodsSet = useMemo(() => new Set(FOODS), []);

//   const addLog = (x: string) =>
//     setLog((p) => [`[${new Date().toLocaleTimeString()}] ${x}`, ...p.slice(-100)]);

//   /** ---- Connect & initial balance ---- */
//   useEffect(() => {
//     if (!socket) return;

//     const onConnect = () => {
//       setSid(socket.id ?? null);
//       socket.emit("join", { room: "table:alpha" }, () => {});
//       socket.emit("get_balance", {}, (res: any) => {
//         if (res?.success && typeof res.balance === "number") {
//           setBalance(res.balance);
//           setUserPersist((u) => ({ ...u, balance: res.balance }));
//         }
//       });
//       addLog("connected");
//     };

//     const onDisconnect = (reason: string) => {
//       setSid(null);
//       addLog(`disconnect: ${reason}`);
//     };

//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//     };
//   }, [socket, setUserPersist]);

//   /** ---- Round lifecycle & timers ---- */
//   useEffect(() => {
//     if (!socket) return;

//     const startTicker = () => {
//       if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
//       phaseIntervalRef.current = window.setInterval(() => {
//         if (!phaseEndRef.current) return;
//         const left = Math.max(0, phaseEndRef.current - Date.now());
//         setRound((r) => ({ ...r, timeLeftMs: left }));
//         if (left <= 0 && phaseIntervalRef.current) {
//           clearInterval(phaseIntervalRef.current);
//           phaseIntervalRef.current = null;
//         }
//       }, 1000) as unknown as number;
//     };

//     const stopTicker = () => {
//       if (phaseIntervalRef.current) {
//         clearInterval(phaseIntervalRef.current);
//         phaseIntervalRef.current = null;
//       }
//     };

//     const onRoundStarted = (d: any) => {
//       const rid = String(d?._id ?? fmtRoundId(now()));
//       const end = new Date(d?.phaseEndTime ?? Date.now()).getTime();
//       phaseEndRef.current = end;
//       setRound({
//         roundId: rid,
//         state: "betting",
//         timeLeftMs: Math.max(0, end - Date.now()),
//         blockRound: loadBlockCounter(),
//       });
//       startTicker();
//       try {
//         localStorage.setItem(STORAGE_LAST_ROUND_AT, String(Date.now()));
//       } catch {}
//     };

//     const onRoundUpdated = (d: any) => {
//       const rid = String(d?._id ?? round.roundId);
//       setRound((r) => ({ ...r, roundId: rid, state: "betting" }));
//     };

//     const onRoundClosed = (_d: any) => {
//       setRound((r) => ({ ...r, state: "revealing" }));
//     };

//     const onWinnerRevealed = (d: any) => {
//       const key = normalizeToFoodsKey(String(d?.winnerBox ?? ""));
//       setRound((r) => ({ ...r, state: "revealing", winner: key }));
//     };

//     const onRoundEnded = (_d: any) => {
//       stopTicker();
//       // bump block ribbon
//       const cur = Number(round.blockRound ?? loadBlockCounter());
//       const next = cur >= 10 ? 1 : cur + 1;
//       saveBlockCounter(next);
//       setRound((r) => ({ ...r, state: "pause", blockRound: next, timeLeftMs: 0 }));
//     };

//     const onPhaseUpdate = (d: any) => {
//       const end = new Date(d?.phaseEndTime ?? Date.now()).getTime();
//       phaseEndRef.current = end;
//       setRound((r) => ({ ...r, timeLeftMs: Math.max(0, end - Date.now()) }));
//       startTicker();
//     };

//     socket.on("roundStarted", onRoundStarted);
//     socket.on("roundUpdated", onRoundUpdated);
//     socket.on("roundClosed", onRoundClosed);
//     socket.on("winnerRevealed", onWinnerRevealed);
//     socket.on("roundEnded", onRoundEnded);
//     socket.on("phaseUpdate", onPhaseUpdate);

//     return () => {
//       socket.off("roundStarted", onRoundStarted);
//       socket.off("roundUpdated", onRoundUpdated);
//       socket.off("roundClosed", onRoundClosed);
//       socket.off("winnerRevealed", onWinnerRevealed);
//       socket.off("roundEnded", onRoundEnded);
//       socket.off("phaseUpdate", onPhaseUpdate);
//       stopTicker();
//     };
//   }, [socket, round.blockRound, round.roundId]);

//   /** ---- Money/meta events ---- */
//   useEffect(() => {
//     if (!socket) return;

//     const onAccepted = ({ bet }: any) => {
//       // mirror balance drop if server sends amount
//       if (bet?.amount) {
//         setBalance((b) => Math.max(0, b - Number(bet.amount)));
//         setUserPersist((u) => ({ ...u, balance: Math.max(0, u.balance - Number(bet.amount)) }));
//       }
//       // enqueue echo for UI
//       const fruit = normalizeToFoodsKey(String(bet?.box ?? bet?.fruit ?? ""));
//       if (fruit && foodsSet.has(fruit)) {
//         const betId = String(bet?._id ?? uid());
//         const value = Number(bet?.amount ?? 0);
//         const roundId = String(bet?.roundId ?? round.roundId);
//         setEchoQueue((q) => [...q, { betId, userId: String(bet?.userId ?? "me"), fruit, value, roundId }]);
//       }
//     };

//     const onBalance = ({ balance }: any) => {
//       if (typeof balance === "number") {
//         setBalance(balance);
//         setUserPersist((u) => ({ ...u, balance }));
//       }
//     };

//     const onTotalUsersCount = ({ count }: any) => setTotalUsers(count ?? 0);
//     const onUserBetTotal = ({ totalUserBet }: any) => setMyBetTotal(totalUserBet ?? 0);
//     const onCompanyWallet = ({ wallet }: any) => setCompanyWallet(wallet ?? 0);

//     socket.on("bet_accepted", onAccepted);
//     socket.on("balance:update", onBalance);
//     socket.on("joinedTotalUsers", onTotalUsersCount);
//     socket.on("user_bet_total", onUserBetTotal);
//     socket.on("get_company_wallet", onCompanyWallet);

//     return () => {
//       socket.off("bet_accepted", onAccepted);
//       socket.off("balance:update", onBalance);
//       socket.off("joinedTotalUsers", onTotalUsersCount);
//       socket.off("user_bet_total", onUserBetTotal);
//       socket.off("get_company_wallet", onCompanyWallet);
//     };
//   }, [socket, foodsSet, round.roundId, setUserPersist]);

//   /** ======= API expected by your component ======= */

//   const placeBet = useCallback(
//     async (fruit: FoodsKey, value: number) => {
//       if (!socket) return;
//       if (round.state !== "betting") return;

//       const amt = Math.max(50, Number(value) || 0);
//       // Emit to server and await ack
//       const res: any = await emitAck(socket as any, "place_bet", {
//         roundId: (round as any)._id || round.roundId,
//         box: fruit,
//         amount: amt,
//       });

//       // If server returns balance, sync
//       if (res && typeof res.balance === "number") {
//         setBalance(res.balance);
//         setUserPersist((u) => ({ ...u, balance: res.balance }));
//       }

//       // Local echo so UI animates immediately
//       const betId = uid();
//       setEchoQueue((q) => [...q, { betId, userId: user.id, fruit, value: amt, roundId: round.roundId }]);
//     },
//     [socket, round.state, round.roundId, setUserPersist, user.id]
//   );

//   // Keep for compatibility (client-side credit, e.g., coin animation)
//   const creditWin = useCallback(
//     async (amount: number) => {
//       if (amount <= 0) return;
//       setBalance((b) => b + amount);
//       setUserPersist((u) => ({ ...u, balance: u.balance + amount, profit: u.profit + amount }));
//     },
//     [setUserPersist]
//   );

//   const updateBalance = useCallback(
//     (delta: number) => {
//       if (!delta) return;
//       setBalance((b) => b + delta);
//       setUserPersist((u) => ({ ...u, balance: u.balance + delta }));
//     },
//     [setUserPersist]
//   );

//   // Server drives next rounds; this just soft-resets UI if needed
//   const startNextRound = useCallback(() => {
//     setRound((r) => ({ ...r, state: "pause", timeLeftMs: 0 }));
//   }, []);

//   // Auto-drain echo if stuck
//   useEffect(() => {
//     if (!echoQueue.length) return;
//     const t = setTimeout(() => setEchoQueue((q) => q.slice(1)), 1800);
//     return () => clearTimeout(t);
//   }, [echoQueue]);

//   // remember last round timestamp (debug)
//   useEffect(() => {
//     try {
//       localStorage.setItem(STORAGE_LAST_ROUND_AT, String(Date.now()));
//     } catch {}
//   }, [round.roundId]);

//   return {
//     user,
//     round,
//     placeBet,
//     echoQueue,
//     shiftEcho,
//     creditWin,
//     updateBalance,
//     startNextRound,

//     // If you need these outside, you can also return:
//     // sid, log, users, myBetTotal, companyWallet, balance
//   };
// }
