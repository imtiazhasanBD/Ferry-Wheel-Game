// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { FOODS, type FoodsKey } from "./types";
// import { useSocket, emitAck } from "./socket";

// /** ======= Local persistence keys ======= */
// const STORAGE_USER_KEY = "wheel.local.user.v1";
// const STORAGE_BLOCK_COUNTER = "wheel.local.blockCounter.v1";
// const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

// /** ======= Types ======= */
// type RoundState = "betting" | "revealing" | "pause";
// export type RoundPublic = {
//   roundId: string;
//   state: RoundState;
//   timeLeftMs: number;
//   winner?: FoodsKey;
//   blockRound?: number; // 1..10
//   boxes?: []
//   boxStats?: []
// };

// export type BetEcho = {
//   betId: string;
//   userId: string;
//   fruit: FoodsKey;
//   value: number;
//   roundId: string;
// };

// export type LocalUser = {
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

// function capitalizeFirstLetter(str: string): string {
//   if (!str) return str;
//   return str.charAt(0).toUpperCase() + str.slice(1);
// }


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
//     // console.log("user:",u)
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
//     bbq: "skewer",
//   };
//   return alias[key];
// };

// /** Defaults used for progress if server doesn’t send phase totals */
// const DEFAULT_PHASE_MS: Record<RoundState, number> = {
//   betting: 30_000,
//   revealing: 6_000,
//   pause: 3_000,
// };

// /** ======= The hook (socket-driven) ======= */
// export function useGame() {
//   const socket = useSocket();

//   // ----- user & simple app state -----
//   const [user, setUser] = useState<LocalUser>(() => loadUser());
//   const [balance, setBalance] = useState<number>(loadUser().balance);
//   const [sid, setSid] = useState<string | null>(null);

//   // extra meta you asked for
//   const [usersCount, setUsersCount] = useState(0);
//   const [myBetTotal, setMyBetTotal] = useState(0);
//   const [companyWallet, setCompanyWallet] = useState(0);

//   // ----- round (driven by server events) -----
//   const [round, setRound] = useState<RoundPublic>(() => {
//     const rid = fmtRoundId(now());
//     const blockRound = loadBlockCounter();
//     return { roundId: rid, state: "pause", timeLeftMs: 0, blockRound };
//   });

//   // phase countdown driven by phaseEndTime
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

//   /** ---- ticker helpers (robust to React 18 StrictMode) ---- */
//   const startTicker = useCallback(() => {
//     if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
//     phaseIntervalRef.current = window.setInterval(() => {
//       if (!phaseEndRef.current) return;
//       const left = Math.max(0, phaseEndRef.current - Date.now());
//       setRound((r) => ({ ...r, timeLeftMs: left }));
//       if (left <= 0 && phaseIntervalRef.current) {
//         clearInterval(phaseIntervalRef.current);
//         phaseIntervalRef.current = null;
//       }
//     }, 1000) as unknown as number;
//   }, []);

//   const stopTicker = useCallback(() => {
//     if (phaseIntervalRef.current) {
//       clearInterval(phaseIntervalRef.current);
//       phaseIntervalRef.current = null;
//     }
//   }, []);

//   useEffect(() => () => stopTicker(), [stopTicker]); // cleanup on unmount

//   /** ---- connect & initial balance ---- */
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
//     };

//     const onDisconnect = (_reason: string) => {
//       setSid(null);
//       // keep local UI; server will re-sync on reconnect
//     };

//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//     };
//   }, [socket, setUserPersist]);

//   /** ---- round lifecycle & timers ---- */
//   useEffect(() => {
//     if (!socket) return;

//     const onRoundStarted = (d: any) => {
//       const rid = String(d?._id ?? fmtRoundId(now()));
//       const end = new Date(d?.phaseEndTime ?? Date.now() + DEFAULT_PHASE_MS.betting).getTime();
//       phaseEndRef.current = end;
//       setRound({
//         roundId: rid,
//         state: "betting",
//         timeLeftMs: Math.max(0, end - Date.now()),
//         blockRound: loadBlockCounter(),
//         boxes: d.boxes,
//         boxStats: d.boxStats
//       });
//       startTicker();
//       try {
//         localStorage.setItem(STORAGE_LAST_ROUND_AT, String(Date.now()));
//       } catch {}
//     };

//     const onRoundUpdated = (d: any) => {
//       const rid = String(d?._id ?? round.roundId);
//       setRound((r) => ({ ...r, roundId: rid, state: "betting" }));
//       // time is handled by phaseUpdate
//     };

//     const onRoundClosed = (_d: any) => {
//       setRound((r) => ({ ...r, state: "revealing" }));
//     };

//     const onWinnerRevealed = (d: any) => {
//       const key = normalizeToFoodsKey(String(d?.winnerBox ?? ""));
//       console.log("keyyyyyyyyyyy", key)
//     };

//     const onRoundEnded = (_d: any) => {
//       stopTicker();
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
//     };
//   }, [socket, round.blockRound, round.roundId, startTicker, stopTicker]);

//   /** ---- money/meta events + the extras you want ---- */
//   useEffect(() => {
//     if (!socket) return;

//     const onAccepted = ({ bet }: any) => {
//       if (bet?.amount) {
//         setBalance((b) => Math.max(0, b - Number(bet.amount)));
//         setUserPersist((u) => ({ ...u, balance: Math.max(0, u.balance - Number(bet.amount)) }));
//       }
//       const fruit = normalizeToFoodsKey(String(bet?.box ?? bet?.fruit ?? ""));
//       if (fruit && foodsSet.has(fruit)) {
//         const betId = String(bet?._id ?? uid());
//         const value = Number(bet?.amount ?? 0);
//         const roundId = String(bet?.roundId ?? round.roundId);
//         setEchoQueue((q) => [...q, { betId, userId: String(bet?.userId ?? "me"), fruit, value, roundId }]);
//       }
//     };

//     const onBalanceUpdate = ({ balance }: any) => {
//       if (typeof balance === "number") {
//         setBalance(balance);
//         setUserPersist((u) => ({ ...u, balance }));
//       }
//     };

//     const onUsersCount = ({ count }: any) => setUsersCount(typeof count === "number" ? count : 0);
//     const onMyBetTotal = ({ totalUserBet }: any) =>
//       setMyBetTotal(typeof totalUserBet === "number" ? totalUserBet : 0);
//     const onWallet = ({ wallet }: any) => setCompanyWallet(typeof wallet === "number" ? wallet : 0);

//     socket.on("bet_accepted", onAccepted);
//     socket.on("balance:update", onBalanceUpdate);
//     socket.on("joinedTotalUsers", onUsersCount);
//     socket.on("user_bet_total", onMyBetTotal);
//     socket.on("get_company_wallet", onWallet);

//     return () => {
//       socket.off("bet_accepted", onAccepted);
//       socket.off("balance:update", onBalanceUpdate);
//       socket.off("joinedTotalUsers", onUsersCount);
//       socket.off("user_bet_total", onMyBetTotal);
//       socket.off("get_company_wallet", onWallet);
//     };
//   }, [socket, foodsSet, round.roundId, setUserPersist]);

//   /** ======= API expected by your component ======= */

//   const placeBet = useCallback(
//     async (fruit: FoodsKey, value: number) => {
//       if (!socket) return;
//       if (round.state !== "betting") return;

//       const amt = Math.max(50, Number(value) || 0);

//       const res: any = await emitAck(socket as any, "place_bet", {
//         roundId: (round as any)._id || round.roundId,
//         box: capitalizeFirstLetter(fruit),
//         amount: amt,
//       });

//       if (res && typeof res.balance === "number") {
//         setBalance(res.balance);
//         setUserPersist((u) => ({ ...u, balance: res.balance }));
//       }

//       const betId = uid();
//       setEchoQueue((q) => [...q, { betId, userId: user.id, fruit, value: amt, roundId: round.roundId }]);
//     },
//     [socket, round.state, round.roundId, setUserPersist, user.id]
//   );

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

//   /** Expose everything you need in App.tsx */
//   return {
//     // core
//     user,
//     round,
//     placeBet,
//     echoQueue,
//     shiftEcho,
//     creditWin,
//     updateBalance,
//     startNextRound,

//     // extras
//     balance,        // mirrors user.balance (pick one to display)
//     sid,
//     usersCount,     // <- total connected users in room
//     myBetTotal,     // <- your own total bet for current round
//     companyWallet,  // <- server wallet/house balance (if applicable)
//   };
// }




///////////////////////


// // useGame.socket.ts
// import { useCallback, useEffect, useRef, useState } from "react";
// import { useSocket, emitAck } from "./socket";
// import { normalizeFromStarted, applyStats, type UBox } from "./gameNormalize";

// type RoundPhase = "betting" | "revealing" | "prepare" | "pause";

// type RoundPublic = {
//   serverId?: string;          // authoritative round _id to send back
//   roundNumber?: number;
//   phase: RoundPhase;          // betting / revealing / prepare / pause
//   timeLeftMs: number;         // driven by phaseUpdate
//   uiBoxes: UBox[];            // normalized, ready for UI
//   winnerBox?: string;         // e.g., "Meat"
// };

// /** ======= Local persistence keys ======= */
// const STORAGE_USER_KEY = "wheel.local.user.v1";
// const STORAGE_BLOCK_COUNTER = "wheel.local.blockCounter.v1";
// const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

// /** ======= Types ======= */

// export type BetEcho = {
//   betId: string;
//   userId: string;
//   fruit: [];
//   value: number;
//   roundId: string;
// };

// export type LocalUser = {
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



// /** Persist & load user */
// function loadUser(): LocalUser {
//   try {
//     const raw = localStorage.getItem(STORAGE_USER_KEY);
//     if (raw) {
//       const u = JSON.parse(raw) as LocalUser;
//     // console.log("user:",u)
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


// const DEFAULT_PHASE_MS = { betting: 30000, revealing: 6000, prepare: 3000, pause: 0 } as const;

// export function useGame() {
//   const socket = useSocket();

//   // ----- meta -----
//   const [sid, setSid] = useState<string | null>(null);
//   const [balance, setBalance] = useState(0);
//   const [usersCount, setUsersCount] = useState(0);
//   const [myBetTotal, setMyBetTotal] = useState(0);
//   const [companyWallet, setCompanyWallet] = useState(0);
//     const [user, setUser] = useState<{}>(() => loadUser());

//   // ----- round -----
//   const [round, setRound] = useState<RoundPublic>({
//     phase: "pause",
//     timeLeftMs: 0,
//     uiBoxes: [],
//   });


//     const setUserPersist = useCallback((updater: (u: LocalUser) => LocalUser) => {
//     setUser((prev) => {
//       const next = updater(prev);
//       saveUser(next);
//       return next;
//     });
//   }, []);

//   // countdown ticker
//   const phaseEndRef = useRef<number>(0);
//   const timerRef = useRef<number | null>(null);
//   const startTicker = useCallback(() => {
//     if (timerRef.current) clearInterval(timerRef.current);
//     timerRef.current = window.setInterval(() => {
//       const left = Math.max(0, phaseEndRef.current - Date.now());
//       setRound(r => ({ ...r, timeLeftMs: left }));
//       if (left <= 0 && timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//       }
//     }, 1000) as unknown as number;
//   }, []);
//   useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

//   // connect + initial balance
//   useEffect(() => {
//     if (!socket) return;
//     const onConnect = () => {
//       setSid(socket.id ?? null);
//       socket.emit("join", { room: "table:alpha" }, () => {});
//    socket.emit("get_balance", {}, (res: any) => {
//         if (res?.success && typeof res.balance === "number") {
//           setBalance(res.balance);
//           setUserPersist((u) => ({ ...u, balance: res.balance }));
//         }
//       });
//     };
//     const onDisconnect = () => setSid(null);
//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//     };
//   }, [socket]);

//   // round lifecycle & updates
//   useEffect(() => {
//     if (!socket) return;

//     const onRoundStarted = (d: any) => {
//       const uiBoxes = normalizeFromStarted(d?.boxes);
//       // fallback to endTime if phaseUpdate hasn't come yet:
//       const end = d?.endTime ? new Date(d.endTime).getTime() : Date.now() + DEFAULT_PHASE_MS.betting;
//       phaseEndRef.current = end;
//       setRound({
//         serverId: String(d?._id || ""),
//         roundNumber: Number(d?.roundNumber ?? 0),
//         phase: "betting",
//         timeLeftMs: Math.max(0, end - Date.now()),
//         uiBoxes,
//         winnerBox: undefined,
//       });
//       startTicker();
//     };

//     const onRoundUpdated = (d: any) => {
//       // only merge if it’s the same active round
//       const id = String(d?._id || "");
//       setRound(prev => {
//         if (!prev.serverId || prev.serverId !== id) return prev;
//         return {
//           ...prev,
//           roundNumber: Number(d?.roundNumber ?? prev.roundNumber ?? 0),
//           uiBoxes: applyStats(prev.uiBoxes, d?.boxStats),
//         };
//       });
//     };

//     const onRoundClosed = (d: any) => {
//       const id = String(d?._id || "");
//       setRound(prev => (prev.serverId === id ? { ...prev, phase: "revealing" } : prev));
//     };

//     const onWinnerRevealed = (d: any) => {
//       const id = String(d?._id || "");
//       setRound(prev => (prev.serverId === id
//         ? { ...prev, phase: "revealing", winnerBox: String(d?.winnerBox ?? "") }
//         : prev
//       ));
//     };

//     const onRoundEnded = (d: any) => {
//       const id = String(d?._id || "");
//       setRound(prev => (prev.serverId === id
//         ? { ...prev, phase: "pause", timeLeftMs: 0 }
//         : prev
//       ));
//       if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
//     };

//     const onPhaseUpdate = (d: any) => {
//       // authoritative countdown for any phase
//       const phase: RoundPhase =
//         d?.phase === "betting" ? "betting" :
//         d?.phase === "reveal"  ? "revealing" :
//         d?.phase === "prepare" ? "prepare" : "pause";
//       const end = Number(d?.phaseEndTime ?? Date.now());
//       phaseEndRef.current = end;
//       setRound(prev => ({
//         ...prev,
//         phase,
//         timeLeftMs: Math.max(0, end - Date.now()),
//       }));
//       startTicker();
//     };

//     // user / wallet / balance
//     const onAccepted = ({ bet }: any) => {
//       if (!bet) return;
//       // Optimistic local UX can be done here if you want
//       // But balance will sync via balance:update
//     };
//     const onBalance = ({ balance: b }: any) => {
//       if (typeof b === "number") setBalance(b);
//     };
//     const onUsers = ({ count }: any) => setUsersCount(Number(count || 0));
//     const onUserTotal = ({ totalUserBet }: any) => setMyBetTotal(Number(totalUserBet || 0));
//     const onWallet = (arr: any[]) => {
//       const first = Array.isArray(arr) ? arr[0] : undefined;
//       setCompanyWallet(Number(first?.balance ?? 0));
//     };

//     socket.on("roundStarted", onRoundStarted);
//     socket.on("roundUpdated", onRoundUpdated);
//     socket.on("roundClosed", onRoundClosed);
//     socket.on("winnerRevealed", onWinnerRevealed);
//     socket.on("roundEnded", onRoundEnded);
//     socket.on("phaseUpdate", onPhaseUpdate);

//     socket.on("bet_accepted", onAccepted);
//     socket.on("balance:update", onBalance);
//     socket.on("joinedTotalUsers", onUsers);
//     socket.on("user_bet_total", onUserTotal);
//     socket.on("get_company_wallet", onWallet);

//     return () => {
//       if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
//       socket.off("roundStarted", onRoundStarted);
//       socket.off("roundUpdated", onRoundUpdated);
//       socket.off("roundClosed", onRoundClosed);
//       socket.off("winnerRevealed", onWinnerRevealed);
//       socket.off("roundEnded", onRoundEnded);
//       socket.off("phaseUpdate", onPhaseUpdate);

//       socket.off("bet_accepted", onAccepted);
//       socket.off("balance:update", onBalance);
//       socket.off("joinedTotalUsers", onUsers);
//       socket.off("user_bet_total", onUserTotal);
//       socket.off("get_company_wallet", onWallet);
//     };
//   }, [socket, startTicker]);

//   // place bet — always send serverId and server 'box' title
//   const placeBet = useCallback(async (boxTitle: string, amount: number) => {
//     if (!socket) return;
//     if (round.phase !== "betting") return;
//     const roundId = round.serverId;
//     if (!roundId) return;

//     const amt = Math.max(50, Number(amount) || 0);
//     const res: any = await emitAck(socket as any, "place_bet", {
//       roundId,
//       box: boxTitle, // must match server title, e.g., "Meat"
//       amount: amt,
//     });

//     if (res && typeof res.balance === "number") setBalance(res.balance);
//     // user_bet_total & balance:update will keep syncing too
//   }, [socket, round.phase, round.serverId]);

//   return {
//     // core
//     round,            // { serverId, roundNumber, phase, timeLeftMs, uiBoxes[], winnerBox }
//     placeBet,
// user,
//     // meta
//     sid,
//     balance,
//     usersCount,
//     myBetTotal,
//     companyWallet,
//   };
// }




// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { FOODS, type FoodsKey } from "./types";
// import { useSocket, emitAck } from "./socket";

// /** ======= Local persistence keys ======= */
// const STORAGE_USER_KEY = "wheel.local.user.v1";
// //const STORAGE_BLOCK_COUNTER = "wheel.local.blockCounter.v1";
// const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

// /** ======= Types ======= */
// type ServerRoundStatus = "OPEN" | "CLOSED" | "SETTLED" | "Preparing...";
// //type ClientPhase = "betting" | "revealing" | "pause";

// const API_BASE = "https://greedy.stallforest.com"
// const getAuthToken = () => localStorage.getItem("auth_token") || "";

// type RoundWinnerEntry = {
//   userId: string;
//   name: string;
//   bet: number;
//   win: number;
// };
// type ApiWinner = { userId: string; name?: string; bet?: number; win?: number; };

// type BoxStat = {
//   box: string;
//   totalAmount: number;
//   bettorsCount: number;
//   multiplier: number;
// };

// type RoundModel = {
//   roundId?: string;
//   roundNumber?: string | number;
//   status: ServerRoundStatus;
//   timeLeftMs: number;
//   winningBox?: string;
//   boxStats?: BoxStat[];
//   phaseEndTime?: number; // epoch ms (from server)
// };

// export type BetEcho = {
//   betId: string;
//   userId: string;
//   fruit: FoodsKey;
//   value: number;
//   roundId?: string;
// };

// export type LocalUser = {
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

// function capitalizeFirstLetter(str: string): string {
//   if (!str) return str;
//   return str.charAt(0).toUpperCase() + str.slice(1);
// }

// /** ======= Small helpers ======= */
// const uid = (() => {
//   let i = 0;
//   return () => {
//     try {
//       if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
//     } catch { }
//     const t = Date.now().toString(36);
//     const r = Math.random().toString(36).slice(2, 10);
//     return `id-${t}-${r}-${i++}`;
//   };
// })();

// const now = () => Date.now();

// function loadUser(): LocalUser {
//   try {
//     const raw = localStorage.getItem(STORAGE_USER_KEY);
//     if (raw) {
//       const u = JSON.parse(raw) as Partial<LocalUser>;
//       return {
//         id: u.id ?? "me",
//         name: u.name ?? "You",
//         balance: typeof u.balance === "number" ? u.balance : 200_000,
//         profit: typeof u.profit === "number" ? u.profit : 0,
//         loss: typeof u.loss === "number" ? u.loss : 0,
//       };
//     }
//   } catch { }
//   return { ...DEFAULT_USER };
// }
// function saveUser(u: LocalUser) {
//   try {
//     localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
//   } catch { }
// }

// /** Block round 1..10 for your leaderboard ribbon (kept, though unused here) */
// // function loadBlockCounter(): number {
// //   try {
// //     const raw = localStorage.getItem(STORAGE_BLOCK_COUNTER);
// //     if (raw) return Number(raw) || 1;
// //   } catch { }
// //   return 1;
// // }
// // function saveBlockCounter(n: number) {
// //   try {
// //     localStorage.setItem(STORAGE_BLOCK_COUNTER, String(n));
// //   } catch { }
// // }

// // /** Winner name normalizer (server → FoodsKey) */
// // const normalizeToFoodsKey = (s: string): FoodsKey | undefined => {
// //   const key = s?.toLowerCase().trim();
// //   if ((FOODS as readonly string[]).includes(key)) return key as FoodsKey;
// //   const alias: Record<string, FoodsKey> = {
// //     beef: "meat",
// //     pork: "ham",
// //     hotdog: "sausage",
// //     salad: "lettuce",
// //     bbq: "skewer",
// //   };
// //   return alias[key];
// // };

// // /** Defaults used for progress if server doesn’t send phase totals */
// // const DEFAULT_PHASE_MS: Record<ClientPhase, number> = {
// //   betting: 30_000,
// //   revealing: 6_000,
// //   pause: 3_000,
// // };

// /** A safe initial round */
// const INITIAL_ROUND: RoundModel = {
//   status: "Preparing...",
//   timeLeftMs: 0,
// };

// /** ======= The hook (socket-driven) ======= */
// export function useGame() {
//   const socket = useSocket();

//   // ----- user & simple app state -----
//   const [user, setUser] = useState<LocalUser>(() => loadUser());
//   const [round, setRound] = useState<RoundModel>(INITIAL_ROUND);
//   const [balance, setBalance] = useState<number>(user.balance);
//   const [sid, setSid] = useState<string | null>(null);
//   const [users, setTotalUsers] = useState(0);
//   const [myBetTotal, setMyBetTotal] = useState(0);
//   const [companyWallet, setCompanyWallet] = useState(0);
//   const [time, setTime] = useState(0); // mirrors round.timeLeftMs if you want separate
//   const currentRoundId = round?.roundNumber ?? (round as any)?.roundNumber ?? null;
//   const winnersCache = useRef<Map<string, RoundWinnerEntry[]>>(new Map());
//   console.log("rpunddddddddddddddd", users)
//   // phase countdown driven by phaseEndTime
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

//   // (kept in case you use this elsewhere)
//   useMemo(() => new Set(FOODS), []);

//   /** ---- ticker helpers (robust to React 18 StrictMode) ---- */
//   const startTicker = useCallback(() => {
//     if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
//     phaseIntervalRef.current = window.setInterval(() => {
//       if (!phaseEndRef.current) return;
//       const left = Math.max(0, phaseEndRef.current - Date.now());
//       setRound((r) => ({ ...r, timeLeftMs: left }));
//       setTime(left);
//       if (left <= 0 && phaseIntervalRef.current) {
//         clearInterval(phaseIntervalRef.current);
//         phaseIntervalRef.current = null;
//       }
//     }, 1000) as unknown as number;
//   }, []);

//   const stopTicker = useCallback(() => {
//     if (phaseIntervalRef.current) {
//       clearInterval(phaseIntervalRef.current);
//       phaseIntervalRef.current = null;
//     }
//   }, []);

//   useEffect(() => () => stopTicker(), [stopTicker]); // cleanup on unmount

//   /** ---- connect & initial balance ---- */
//   useEffect(() => {
//     if (!socket) return;

//     const onConnect = () => {
//       setSid(socket.id ?? null);
//       socket.emit("join", { room: "table:alpha" }, () => { });
//       socket.emit("get_balance", {}, (res: any) => {
//         if (res?.success && typeof res.balance === "number") {
//           setBalance(res.balance);
//           setUserPersist((u) => ({ ...u, balance: res.balance }));
//         }
//       });
//     };

//     const onDisconnect = (_reason: string) => {
//       setSid(null);
//       // keep local UI; server will re-sync on reconnect
//     };

//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//     };
//   }, [socket, setUserPersist]);

//   /** ---- round lifecycle & timers ---- */
//   useEffect(() => {
//     if (!socket) return;

//     let phaseUpdateInterval: number | null = null;

//     const upsertRound = (patch: Partial<RoundModel>) =>
//       setRound((prev) => ({ ...prev, ...patch }));

//     const onStart = (d: any) => {
//       upsertRound({
//         ...d,
//         status: "OPEN",
//         timeLeftMs: Math.max(0, (d.phaseEndTime ? new Date(d.phaseEndTime).getTime() : 0) - now()),
//         phaseEndTime: d.phaseEndTime ? new Date(d.phaseEndTime).getTime() : undefined,
//       });
//       if (d.phaseEndTime) {
//         phaseEndRef.current = new Date(d.phaseEndTime).getTime();
//         startTicker();
//       }
//     };

//     const onUpdate = (d: any) => {
//       upsertRound({
//         ...d,
//         status: "OPEN",
//       });
//       if (d.phaseEndTime) {
//         phaseEndRef.current = new Date(d.phaseEndTime).getTime();
//         startTicker();
//       }
//     };

//     const onClosed = (d: any) => {
//       upsertRound({ ...d, status: "CLOSED" });
//     };

//     const onWinner = (d: any) => {
//       upsertRound({ winningBox: d.winnerBox });
//     };

//     const onEnded = (d: any) => {
//       upsertRound({ ...d, status: "SETTLED", timeLeftMs: 0 });
//       stopTicker();
//     };

//     const onAccepted = ({ bet }: any) => {
//       const amt = bet?.amount || 0;
//       setBalance((b) => Math.max(0, b - amt));
//     };


//     const onBalance = ({ balance }: any) => {
//       if (typeof balance === "number") {
//         setBalance(balance);
//         setUserPersist((u) => ({ ...u, balance }));
//       }
//     };

//     const onTotalUsersCount = ({ count }: any) => setTotalUsers(count);
//     const onUserBetTotal = ({ totalUserBet }: any) => setMyBetTotal(totalUserBet);
//     const onCompanyWallet = ({ wallet }: any) => setCompanyWallet(wallet);

//     // A lightweight phase update that may arrive frequently
//     const phaseUpdate = (d: any) => {
//       const endTime = new Date(d.phaseEndTime).getTime();

//       // reset any ad-hoc interval used here
//       if (phaseUpdateInterval) clearInterval(phaseUpdateInterval);

//       phaseEndRef.current = endTime;
//       upsertRound({ phaseEndTime: endTime });

//       // Update time every 1 second
//       phaseUpdateInterval = window.setInterval(() => {
//         const remainingMs = Math.max(0, endTime - Date.now());
//         setTime(remainingMs);
//         setRound((r) => ({ ...r, timeLeftMs: remainingMs }));
//         if (remainingMs <= 0 && phaseUpdateInterval) {
//           clearInterval(phaseUpdateInterval);
//           phaseUpdateInterval = null;
//         }
//       }, 1000) as unknown as number;
//     };

//     socket.on("roundStarted", onStart);
//     socket.on("roundUpdated", onUpdate);
//     socket.on("roundClosed", onClosed);
//     socket.on("winnerRevealed", onWinner);
//     socket.on("roundEnded", onEnded);
//     socket.on("bet_accepted", onAccepted);
//     socket.on("balanceUpdate", onBalance);
//     socket.on("user_bet_total", onUserBetTotal);
//     socket.on("joinedTotalUsers", onTotalUsersCount);
//     socket.on("get_company_wallet", onCompanyWallet);
//     socket.on("phaseUpdate", phaseUpdate);

//     return () => {
//       socket.off("roundStarted", onStart);
//       socket.off("roundUpdated", onUpdate);
//       socket.off("roundClosed", onClosed);
//       socket.off("winnerRevealed", onWinner);
//       socket.off("roundEnded", onEnded);
//       socket.off("bet_accepted", onAccepted);
//       socket.off("balanceUpdate", onBalance);
//       socket.off("user_bet_total", onUserBetTotal);
//       socket.off("joinedTotalUsers", onTotalUsersCount);
//       socket.off("get_company_wallet", onCompanyWallet);
//       socket.off("phaseUpdate", phaseUpdate);

//       if (phaseUpdateInterval) clearInterval(phaseUpdateInterval);
//       stopTicker();
//     };
//   }, [socket, startTicker, stopTicker]);

//   // fetch static settings data (keep your URL; add guards)
//   useEffect(() => {
//     if (!round.roundId && round.status === "Preparing...") {
//       fetch("https://greedy.stallforest.com/api/v1/settings/retrive")
//         .then((res) => res.json())
//         .then((data) => {
//           if (data?.success && data?.settings?.boxes?.length) {
//             const boxStats: BoxStat[] = data.settings.boxes.map((b: any) => ({
//               box: b.title,
//               totalAmount: 0,
//               bettorsCount: 0,
//               multiplier: b.multiplier,
//             }));
//             setRound((r) => ({
//               ...r,
//               roundNumber: "-",
//               status: "Preparing...",
//               boxStats,
//             }));
//           }
//         })
//         .catch(console.error);
//     }
//   }, [round.roundId, round.status]);


//   const getRoundWinners = useCallback(
//     async (roundId?: string): Promise<RoundWinnerEntry[]> => {
//       const id = roundId ?? currentRoundId;
//       if (!id) {
//         throw new Error("No round id available to fetch winners.");
//       }

//       const cached = winnersCache.current.get(id);
//       if (cached) return cached;

//       const res = await fetch(`${API_BASE}/api/v1/bettings/current-history`, {
//         headers: {
//           Accept: "application/json",
//           ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
//         },
//       });

//       if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         throw new Error(`Failed to fetch winners (${res.status}): ${text || res.statusText}`);
//       }

//       const raw = await res.json();
//       console.log("rawwwwwwwwww",raw)
//       const list: ApiWinner[] = Array.isArray(raw) ? raw : raw?.winners ?? [];
//       const winners: RoundWinnerEntry[] = list.map(w => ({
//         userId: String(w.userId),
//         name: w.name ?? `Player ${String(w.userId).slice(-4).toUpperCase()}`,
//         bet: Number(w.bet ?? 0),
//         win: Number(w.win ?? 0),
//       }));

//       winnersCache.current.set(id, winners);
//       return winners;
//     },
//     [currentRoundId, API_BASE]
//   );


//     const getCurrentHistory = useCallback(
//     async (limit?: number, page?: number) => {
//       const qs = new URLSearchParams();
//       if (limit != null) qs.set("limit", String(limit));
//       if (page != null) qs.set("page", String(page));

//       const token =
//         typeof window !== "undefined"
//           ? localStorage.getItem("auth_token")
//           : null;

//       const res = await fetch(
//         `${API_BASE}/api/v1/bettings/current-history${
//           qs.toString() ? `?${qs}` : ""
//         }`,
//         {
//           headers: {
//             "Content-Type": "application/json",
//             ...(token ? { Authorization: `Bearer ${token}` } : {}),
//           },
//         }
//       );

//       if (!res.ok) {
//         const msg = await res.text().catch(() => "");
//         throw new Error(`history ${res.status}: ${msg || res.statusText}`);
//       }

//       // returns: { status, message, count, bettingHistory: [...] }
//       return res.json();
//     },
//     []
//   );



//   /** ======= API expected by your component ======= */
//   const placeBet = useCallback(
//     async (fruit: FoodsKey, value: number) => {
//       if (!socket) return;
//       if (round.status !== "OPEN") return;

//       const amt = Math.max(50, Number(value) || 0);

//       const res: any = await emitAck(socket as any, "place_bet", {
//         roundId: (round as any)._id || round?.roundId,
//         box: capitalizeFirstLetter(fruit),
//         amount: amt,
//       });

//       if (res && typeof res.balance === "number") {
//         setBalance(res.balance);
//         setUserPersist((u) => ({ ...u, balance: res.balance }));
//       }

//       const betId = uid();
//       setEchoQueue((q) => [
//         ...q,
//         { betId, userId: user.id, fruit, value: amt, roundId: round.roundId },
//       ]);
//     },
//     [socket, round.status, round.roundId, setUserPersist, user.id]
//   );

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
//     setRound((r) => ({ ...r, status: "Preparing...", timeLeftMs: 0, winningBox: undefined }));
//     stopTicker();
//   }, [stopTicker]);

//   // Auto-drain echo if stuck
//   useEffect(() => {
//     if (!echoQueue.length) return;
//     const t = setTimeout(() => setEchoQueue((q) => q.slice(1)), 1800);
//     return () => clearTimeout(t);
//   }, [echoQueue]);

//   // remember last round timestamp (debug)
//   useEffect(() => {
//     try {
//       if (round.roundId) {
//         localStorage.setItem(STORAGE_LAST_ROUND_AT, String(Date.now()));
//       }
//     } catch { }
//   }, [round.roundId]);

//   /** Expose everything you need in App.tsx */
//   return {
//     // core
//     user,
//     round,
//     time,
//     placeBet,
//     echoQueue,
//     shiftEcho,
//     creditWin,
//     updateBalance,
//     startNextRound,
//     getRoundWinners,
//     getCurrentHistory,


//     // extras
//     balance,       // mirrors user.balance (pick one to display)
//     sid,
//     myBetTotal,    // <- your own total bet for current round
//     companyWallet, // <- server wallet/house balance (if applicable)
//   };
// }


// useGame.socket.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FOODS, type FoodsKey } from "./types";
import { useSocket, emitAck } from "./socket";

/** ======= Local persistence keys ======= */
const STORAGE_USER_KEY = "wheel.local.user.v1";
const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

/** ======= Types ======= */
type ServerRoundStatus = "betting" | "revealing" | "completed" | "revealed" | "Preparing...";

const API_BASE = "https://greedy.stallforest.com";
const getAuthToken = () => (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

export type RoundWinnerEntry = {
  userId: string;
  name: string;
  bet: number;
  win: number;
};
type ApiWinner = { userId: string; name?: string; bet?: number; win?: number };

export type BoxStat = {
  box: string;
  totalAmount: number;
  bettorsCount: number;
  multiplier: number;
};

export type RoundModel = {
  // server ids & numbering
  roundId?: string;
  _id?: string;
  roundNumber?: string | number;

  // server status; we'll also expose a client-friendly `status`
  roundStatus: ServerRoundStatus;
  status?: "OPEN" | "CLOSED" | "SETTLED" | "Preparing..."; // <- for App.tsx

  // clocks
  timeLeftMs: number;
  startTime?: string | number;
  endTime?: string | number;
  revealTime?: string | number;
  prepareTime?: string | number;

  // misc
  winningBox?: string;
  boxStats?: BoxStat[];
  totalPool?: number;
  companyCut?: number;
  distributedAmount?: number;
  reserveWallet?: number;
};

export type BetEcho = {
  betId: string;
  userId: string;
  fruit: FoodsKey;
  value: number;
  roundId?: string;
};

export type LocalUser = {
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

/** ======= Small helpers ======= */
const uid = (() => {
  let i = 0;
  return () => {
    try {
      if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    } catch {}
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return `id-${t}-${r}-${i++}`;
  };
})();

function loadUser(): LocalUser {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw) as Partial<LocalUser>;
      return {
        id: u.id ?? "me",
        name: u.name ?? "You",
        balance: typeof u.balance === "number" ? u.balance : 200_000,
        profit: typeof u.profit === "number" ? u.profit : 0,
        loss: typeof u.loss === "number" ? u.loss : 0,
      };
    }
  } catch {}
  return { ...DEFAULT_USER };
}
function saveUser(u: LocalUser) {
  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
  } catch {}
}

/** A safe initial round */
const INITIAL_ROUND: RoundModel = {
  roundStatus: "Preparing...",
  status: "Preparing...",
  timeLeftMs: 0,
};

/** ======= time helpers (use start/end/reveal times) ======= */
const now = () => Date.now();
const parseTs = (v?: string | number) => (typeof v === "number" ? v : v ? Date.parse(v) : 0);

function serverToClientStatus(s?: ServerRoundStatus): RoundModel["status"] {
  switch (s) {
    case "betting":
      return "OPEN";
    case "revealing":
      return "CLOSED"; // spinning/reveal phase for the UI
    case "completed":
    case "revealed":
      return "SETTLED";
    case "Preparing...":
    default:
      return "Preparing...";
  }
}

/** which timestamp should we count down to, given the server status? */
function targetTsFor(d: Partial<RoundModel> & Record<string, any>) {
  const endTs = parseTs(d.endTime);
  const revTs = parseTs(d.revealTime);
  //const prepTs = parseTs(d.prepareTime);

  switch (d.roundStatus) {
    case "betting":
      return endTs; // time left to close betting
    case "revealing":
      // primary countdown to reveal; fallback to endTs if revealTime missing
      return revTs || endTs;
    case "completed":
    case "revealed":
      // round is done; if you want an intermission countdown, use `prepareTime`
      return 0; // or: return prepTs;
    default:
      return 0;
  }
}

function normalizeIncomingRound(patch: any, prev?: RoundModel): RoundModel {
  const roundId = patch._id || patch.roundId || prev?.roundId;
  const roundStatus: ServerRoundStatus = patch.roundStatus || prev?.roundStatus || "Preparing...";
  const status = serverToClientStatus(roundStatus);

  const merged: RoundModel = {
    ...(prev || INITIAL_ROUND),
    ...patch,
    roundId,
    roundStatus,
    status,
  };

  const target = targetTsFor(merged);
  const left = Math.max(0, target - now());

  return {
    ...merged,
    timeLeftMs: left,
  };
}

/** ======= The hook (socket-driven) ======= */
export function useGame() {
  const socket = useSocket();

  // ----- user & simple app state -----
  const [user, setUser] = useState<LocalUser>(() => loadUser());
  const [round, setRound] = useState<RoundModel>(INITIAL_ROUND);
  const [balance, setBalance] = useState<number>(0);
  const [sid, setSid] = useState<string | null>(null);
  const [users, setTotalUsers] = useState(0);
  const [myBetTotal, setMyBetTotal] = useState(0);
  const [companyWallet, setCompanyWallet] = useState(0);
  const [time, setTime] = useState(0); // mirrors round.timeLeftMs if you want separate

 const currentRoundId = round?._id ?? (round as any)?.roundId ?? null;
  const winnersCache = useRef<Map<string, RoundWinnerEntry[]>>(new Map());

  // ----- echo queue (for animations) -----
  const [echoQueue, setEchoQueue] = useState<BetEcho[]>([]);
  const shiftEcho = useCallback(() => {
    setEchoQueue((q) => q.slice(1));
  }, []);

  const setUserPersist = useCallback((updater: (u: LocalUser) => LocalUser) => {
    setUser((prev) => {
      const next = updater(prev);
      saveUser(next);
      return next;
    });
  }, []);

  useMemo(() => new Set(FOODS), []);

  /** ---- ticker helpers (robust to React 18 StrictMode) ---- */
  const phaseIntervalRef = useRef<number | null>(null);
  const phaseEndRef = useRef<number>(0);

  const startTicker = useCallback(() => {
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    phaseIntervalRef.current = window.setInterval(() => {
      if (!phaseEndRef.current) return;
      const left = Math.max(0, phaseEndRef.current - Date.now());
      setRound((r) => ({ ...r, timeLeftMs: left }));
      setTime(left);
      if (left <= 0 && phaseIntervalRef.current) {
        clearInterval(phaseIntervalRef.current);
        phaseIntervalRef.current = null;
      }
    }, 1000) as unknown as number;
  }, []);

  const stopTicker = useCallback(() => {
    if (phaseIntervalRef.current) {
      clearInterval(phaseIntervalRef.current);
      phaseIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTicker(), [stopTicker]); // cleanup on unmount

  /** ---- connect & initial balance ---- */
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setSid(socket.id ?? null);
      socket.emit("join", { room: "table:alpha" }, () => {});
      socket.emit("get_balance", {}, (res: any) => {
        if (res?.success && typeof res.balance === "number") {
          setBalance(res.balance);
          setUserPersist((u) => ({ ...u, balance: res.balance }));
        }
      });
    };

    const onDisconnect = (_reason: string) => {
      setSid(null);
      // keep local UI; server will re-sync on reconnect
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, setUserPersist]);

  /** ---- round lifecycle & timers (using start/end/reveal) ---- */
  useEffect(() => {
    if (!socket) return;

    let localPulseInterval: number | null = null;

    const upsert = (patch: any) => {
      setRound((prev) => {
        const next = normalizeIncomingRound(patch, prev);
        // update the ticking target
        const tgt = targetTsFor(next);
        phaseEndRef.current = tgt || 0;
        return next;
      });

      // ensure the ticker runs while we have a target
      const tgt = targetTsFor(patch);
      if (tgt) startTicker();
    };

    const onStart = (d: any) => upsert(d);
    const onUpdate = (d: any) => upsert(d);
    const onClosed = (d: any) => upsert(d);       // usually flips to "revealing"
    const onWinner = (d: any) => upsert(d);       // still in "revealing" typically
    const onEnded = (d: any) => {
      // fully done
      setRound((prev) => normalizeIncomingRound({ ...d, timeLeftMs: 0 }, prev));
      phaseEndRef.current = 0;
      stopTicker();
    };

    // lightweight phase tick from server (if you send periodic updates)
    const phaseUpdate = (d: any) => upsert(d);

    // bet accepted/down-balance
    const onAccepted = ({ bet }: any) => {
      const amt = bet?.amount || 0;
      setBalance((b) => Math.max(0, b - amt));
    };

    const onBalance = ({ balance }: any) => {
      if (typeof balance === "number") {
        setBalance(balance);
        setUserPersist((u) => ({ ...u, balance }));
      }
    };

    const onTotalUsersCount = ({ count }: any) => setTotalUsers(count);
    const onUserBetTotal = ({ totalUserBet }: any) => setMyBetTotal(totalUserBet);
    const onCompanyWallet = ({ wallet }: any) => setCompanyWallet(wallet);

    socket.on("roundStarted", onStart);
    socket.on("roundUpdated", onUpdate);
    socket.on("roundClosed", onClosed);
    socket.on("winnerRevealed", onWinner);
    socket.on("roundEnded", onEnded);
    socket.on("phaseUpdate", phaseUpdate);

    socket.on("bet_accepted", onAccepted);
    socket.on("balanceUpdate", onBalance);
    socket.on("user_bet_total", onUserBetTotal);
    socket.on("joinedTotalUsers", onTotalUsersCount);
    socket.on("get_company_wallet", onCompanyWallet);

    return () => {
      socket.off("roundStarted", onStart);
      socket.off("roundUpdated", onUpdate);
      socket.off("roundClosed", onClosed);
      socket.off("winnerRevealed", onWinner);
      socket.off("roundEnded", onEnded);
      socket.off("phaseUpdate", phaseUpdate);

      socket.off("bet_accepted", onAccepted);
      socket.off("balanceUpdate", onBalance);
      socket.off("user_bet_total", onUserBetTotal);
      socket.off("joinedTotalUsers", onTotalUsersCount);
      socket.off("get_company_wallet", onCompanyWallet);

      if (localPulseInterval) clearInterval(localPulseInterval);
      stopTicker();
    };
  }, [socket, startTicker, stopTicker]);

  /** ---- bootstrap static settings once (for Preparing state) ---- */
  useEffect(() => {
    if (!round.roundId && round.roundStatus === "Preparing...") {
      fetch(`${API_BASE}/api/v1/settings/retrive`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.settings?.boxes?.length) {
            const boxStats: BoxStat[] = data.settings.boxes.map((b: any) => ({
              box: b.title,
              totalAmount: 0,
              bettorsCount: 0,
              multiplier: b.multiplier,
            }));
            setRound((r) =>
              normalizeIncomingRound(
                {
                  ...r,
                  roundNumber: "-",
                  roundStatus: "Preparing...",
                  boxStats,
                },
                r
              )
            );
          }
        })
        .catch(console.error);
    }
  }, [round.roundId, round.roundStatus]);

  

  /** ======= Winners APIs ======= */
  const getRoundWinners = useCallback(
    async (roundId?: string): Promise<RoundWinnerEntry[]> => {
      const id = roundId ?? currentRoundId;
      if (!id) throw new Error("No round id available to fetch winners.");
console.log("idddddddddddddddddddddddddddddddddddddddddddd",users)
      const cached = winnersCache.current.get(id);
      if (cached) return cached;

      // If your backend expects the DB id in the path:
      const url = `${API_BASE}/api/v1/bettings/top-winners/${encodeURIComponent(String(id))}`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch winners (${res.status}): ${text || res.statusText}`);
      }
      
      const raw = await res.json();
      console.log("resssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss", raw)
      const list: ApiWinner[] = Array.isArray(raw) ? raw : raw?.winners ?? [];
      const winners: RoundWinnerEntry[] = list.map((w) => ({
        userId: String(w.userId),
        name: w.name ?? `Player ${String(w.userId).slice(-4).toUpperCase()}`,
        bet: Number(w.bet ?? 0),
        win: Number(w.win ?? 0),
      }));

      winnersCache.current.set(id, winners);
      return winners;
    },
    [currentRoundId]
  );

  const getCurrentHistory = useCallback(async (limit?: number, page?: number) => {
    const qs = new URLSearchParams();
    if (limit != null) qs.set("limit", String(limit));
    if (page != null) qs.set("page", String(page));

    const token = getAuthToken();

    const res = await fetch(
      `${API_BASE}/api/v1/bettings/current-history${qs.toString() ? `?${qs}` : ""}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`history ${res.status}: ${msg || res.statusText}`);
    }

    // { status, message, count, bettingHistory: [...] }
    return res.json();
  }, []);

  /** ======= Betting API -> also push local echo for instant FX ======= */
  const placeBet = useCallback(
    async (fruit: FoodsKey, value: number) => {
      if (!socket) return;

      // allow only when server says betting
      if (round.roundStatus !== "betting") return;

      const amt = Math.max(50, Number(value) || 0);

      const res: any = await emitAck(socket as any, "place_bet", {
        roundId: (round as any)._id || round?.roundId,
        box: fruit.charAt(0).toUpperCase() + fruit.slice(1),
        amount: amt,
      });

      if (res && typeof res.balance === "number") {
        setBalance(res.balance);
        setUserPersist((u) => ({ ...u, balance: res.balance }));
      }

      // Optimistic local echo (server will usually echo too)
      const betId = uid();
      setEchoQueue((q) => [
        ...q,
        { betId, userId: user.id, fruit, value: amt, roundId: round.roundId },
      ]);
    },
    [socket, round.roundStatus, round.roundId, user.id, setUserPersist]
  );

  /** ======= credit & balance helpers ======= */
  const creditWin = useCallback(
    async (amount: number) => {
      if (amount <= 0) return;
      setBalance((b) => b + amount);
      setUserPersist((u) => ({ ...u, balance: u.balance + amount, profit: u.profit + amount }));
    },
    [setUserPersist]
  );

  const updateBalance = useCallback(
    (delta: number) => {
      if (!delta) return;
      setBalance((b) => b + delta);
      setUserPersist((u) => ({ ...u, balance: u.balance + delta }));
    },
    [setUserPersist]
  );

  /** Server drives next rounds; this just soft-resets UI if needed */
  const startNextRound = useCallback(() => {
    setRound((r) =>
      normalizeIncomingRound(
        { ...r, roundStatus: "Preparing...", status: "Preparing...", timeLeftMs: 0, winningBox: undefined },
        r
      )
    );
    phaseEndRef.current = 0;
    stopTicker();
  }, [stopTicker]);

  /** Auto-drain echo if something gets stuck */
  useEffect(() => {
    if (!echoQueue.length) return;
    const t = setTimeout(() => setEchoQueue((q) => q.slice(1)), 1800);
    return () => clearTimeout(t);
  }, [echoQueue]);

  /** remember last round timestamp (debug) */
  useEffect(() => {
    try {
      if (round.roundId) {
        localStorage.setItem(STORAGE_LAST_ROUND_AT, String(Date.now()));
      }
    } catch {}
  }, [round.roundId]);

  /** Expose everything you need in App.tsx */
  return {
    // core
    user,
    round,         // has .status ("OPEN" | "CLOSED" | "SETTLED"), timeLeftMs, start/end/reveal
    time,          // mirrors timeLeftMs for your progress calc
    placeBet,
    echoQueue,
    shiftEcho,
    creditWin,
    updateBalance,
    startNextRound,
    getRoundWinners,
    getCurrentHistory,

    // extras
    balance,       // mirrors user.balance (pick one to display)
    sid,
    myBetTotal,    // your total bet this round
    companyWallet, // house reserve
  };
}
