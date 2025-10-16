// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
// import { useGame } from "./useGame.socket";
// import { FOODS, type FoodsKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";
// import GameRules from "./GameRules";
// import Record from "./Record";
// import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
// import type { RoundWinnerEntry } from "./RoundWinnersModal";
// import RoundWinnersModal from "./RoundWinnersModal";
// import InitialLoader from "./InitialLoader";
// import LoginPage from "./LoginPage";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// //const MAX_COINS_PER_SLICE = 60;
// const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// // Preferences
// //type SoundPrefs = { master: number; bet: number; reveal: number; win: number; bg: number };
// //const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8, bg: 0.15 };
// const PREFS_KEY = "soundPrefsWheelV1";

// // Visual language
// const EMOJI: Record<FoodsKey, string> = {
//   meat: "🥩",
//   tomato: "🍅",
//   corn: "🌽",
//   sausage: "🌭",
//   lettuce: "🥬",
//   carrot: "🥕",
//   skewer: "🍢",
//   ham: "🍗",
// };

// const LABEL: Record<FoodsKey, string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };

// const MULTIPLIER: Record<FoodsKey, number> = {
//   meat: 45,
//   tomato: 5,
//   corn: 5,
//   sausage: 10,
//   lettuce: 5,
//   carrot: 5,
//   skewer: 15,
//   ham: 25,
// };


// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90;
// const norm360 = (a: number) => ((a % 360) + 360) % 360;

// function indexUnderPointer(rotDeg: number, sliceAngle: number, count: number) {
//   const a = norm360(POINTER_DEG - rotDeg + 90);
//   const i = Math.floor((a + sliceAngle / 2) / sliceAngle) % count;
//   return i;
// }
// function rotationToCenterIndex(i: number, sliceAngle: number) {
//   return POINTER_DEG - i * sliceAngle + 90;
// }

// const formatNumber = (num: number) => {
//   if (num >= 1_000_000) {
//     return `${Math.round(num / 1_000_000)}M`;
//   } else if (num >= 1_000) {
//     return `${Math.round(num / 1_000)}K`;
//   } else {
//     return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
//   }
// };



// // Safe UUID that works on HTTP too
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


// /** ==================== APP ==================== **/
// export default function App() {
//   const game = useGame() as any;
//   const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance } = game;
//   const startNextRound: (() => Promise<void> | void) | undefined =
//     game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
//   const prefersReducedMotion = useReducedMotion();
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

//   // ======= SOFT TOAST (no external lib) =======
//   const [tip, setTip] = useState<string | null>(null);
//   const tipHideAtRef = useRef<number | null>(null);
//   function notify(msg: string, ms = 1500) {
//     setTip(msg);
//     const hideAt = Date.now() + ms;
//     tipHideAtRef.current = hideAt;
//     window.setTimeout(() => {
//       if (tipHideAtRef.current === hideAt) setTip(null);
//     }, ms);
//   }
//   const [userBets, setUserBets] = useState<Record<FoodsKey, number>>({
//     meat: 0,
//     tomato: 0,
//     corn: 0,
//     sausage: 0,
//     lettuce: 0,
//     carrot: 0,
//     skewer: 0,
//     ham: 0,
//   });

//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);
//   const wheelDegRef = useRef(0);

//   // ——— State
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const bettingOpen = round?.state === "betting";
//   const DEFAULT_PHASE_MS = { betting: 30000, revealing: 6000, pause: 3000 } as const;
// const phaseTotal = round ? DEFAULT_PHASE_MS[round.state] : 1000;
//  const progress = round ? Math.min(1, Math.max(0, 1 - round.timeLeftMs / phaseTotal)) : 0;
//   console.log("round-tine",round)
//   const [isLoaded, setIsLoaded] = useState(false);

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // Sidebar / Drawer
//   // const [drawerOpen, setDrawerOpen] = useState(false);
//   const isRoundOver = progress === 0;

//   // ——— Wheel sizing
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const el = phoneRef.current;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize((prev) => (prev === D ? prev : D));
//     });
//     ro.observe(el);
//     return () => ro.unobserve(el);
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   //const studsR = R * 0.92;
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<Prefs>({
//     master: 1,
//     bet: 1,
//     reveal: 1,
//     win: 1,
//     bg: 1,
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   const applyVolumes = useCallback(() => {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   async function primeOne(a?: HTMLAudioElement | null) {
//     if (!a) return;
//     try {
//       a.muted = true;
//       await a.play();
//       a.pause();
//       a.currentTime = 0;
//       a.muted = false;
//     } catch { }
//   }
//   async function primeAllAudio() {
//     await Promise.all([
//       primeOne(betAudioRef.current),
//       primeOne(revealAudioRef.current),
//       primeOne(winAudioRef.current),
//       primeOne(bgAudioRef.current),
//     ]);
//     setAudioReady(true);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     bgAudioRef.current = new Audio(SND_BG_LOOP);
//     if (bgAudioRef.current) {
//       bgAudioRef.current.loop = true;
//       bgAudioRef.current.volume = prefs.master * prefs.bg;
//     }
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     function arm() {
//       primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => { }));
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     }
//     window.addEventListener("pointerdown", arm, { once: true });
//     window.addEventListener("keydown", arm, { once: true });
//     window.addEventListener("touchstart", arm, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     };
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch { }
//   }, [applyVolumes, prefs]);

//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   // balance flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => uid());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance, user, lastBalance]);

//   /** ===== geometry / targets ===== */
//   const getContainerRect = useCallback(() => {
//     return phoneRef.current?.getBoundingClientRect() || null;
//   }, []);
//   const getWheelCenter = useCallback(() => {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }, [getContainerRect]);

//   const slices: readonly FoodsKey[] = FOODS;
//   const sliceAngle = 360 / slices.length;

//   const hash01 = (str: string, s = 0) => {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   };

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter();
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, ringR]
//   );

//   const inButtonOffsetForBet = (betId: string) => {
//     const a = 2 * Math.PI * hash01(betId, 3);
//     const r = 8 + 18 * hash01(betId, 4);
//     return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   };

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       const o = inButtonOffsetForBet(betId);
//       return { x: c.x + o.dx, y: c.y + o.dy };
//     },
//     [sliceButtonCenter]
//   );

//   /** ===== history & leaderboard (per 10 rounds) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FoodsKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
//   const [blockCount, setBlockCount] = useState(0); // 0..10
  

//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//         ? (round as any).indexInBlock
//         : typeof (round as any)?.roundNumber === "number"
//           ? ((round as any).roundNumber % 10) + 1
//           : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? ((blockCount % 10) || 10);

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = uid();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = uid() //crypto.randomUUID();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0];
//     const idx = (slices as FoodsKey[]).indexOf(evt.fruit);
//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current && audioReady) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => { });
//     }

//     if (evt.userId === user?.id) spawnLocalFly(to, evt.value);
//     else spawnRemoteFly(to, evt.value);

//     setStacked((prev) =>
//       prev.some((c) => c.id === evt.betId)
//         ? prev
//         : [...prev, { id: evt.betId, fruit: evt.fruit, value: evt.value, userId: evt.userId }]
//     );

//     shiftEcho();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [echoQueue, round?.roundId]);

//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.state, currentRoundId]);

//   /** ===== spin & settle ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);

//   const [wheelDeg, setWheelDeg] = useState(0);

//   // (A) EXTRA SAFETY: if state flips to revealing, hide transient coins immediately
//   useEffect(() => {
//     if (round?.state === "revealing") {
//       setFlies([]);
//       setRemoteFlies([]);
//     }
//   }, [round?.state]);

//   // (B) Main spin effect
//   useEffect(() => {
//     if (!round || round.state !== "revealing") return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     // Hide any in-flight bet coins immediately before the wheel animation starts
//     setFlies([]);
//     setRemoteFlies([]);

//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => { });
//     }

//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01(round.roundId ?? "seed", 99) * 360;
//     const total = current + base + jitter;

//     (async () => {
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       const idx = indexUnderPointer(total, 360 / FOODS.length, FOODS.length);
//       const ideal = rotationToCenterIndex(idx, 360 / FOODS.length);
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k;

//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       const winner = FOODS[idx] as FoodsKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//       handleWin(winner); // optional hook
//     })();
//   }, [round?.state, round?.roundId, controls, prefersReducedMotion, audioReady]);

//   function doRevealFlights(winner: FoodsKey) {
//     const cont = getContainerRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     /** ===== my winners -> balance ===== */
//     if (user && bal && cont) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => { });
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     /** ===== losers -> bank ===== */
//     if (bank && cont) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     /** ===== history + ranking + block counter ===== */
//     setWinnersHistory((prev) => [...prev, winner].slice(-10));

//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//     // 1) Aggregate bet & win per user for *this round*
//     const perUser: Record<string, { bet: number; win: number }> = {};
//     for (const c of stacked) {
//       // total bet: all coins the user placed this round (any fruit)
//       perUser[c.userId] ??= { bet: 0, win: 0 };
//       perUser[c.userId].bet += c.value;

//       // total win: only coins on the winning fruit times multiplier
//       if (c.fruit === winner) {
//         perUser[c.userId].win += c.value * MULTIPLIER[winner];
//       }
//     }
//     function pseudoName(uid: string) {
//       if (uid === user?.id) return user?.name || "You";
//       const tail = uid.slice(-4).toUpperCase();
//       return `Player ${tail}`;
//     }

//     // 2) Materialize entries and always include *you*, even if you didn’t bet
//     const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
//       userId: uid,
//       name: pseudoName(uid),
//       bet: perUser[uid].bet,
//       win: perUser[uid].win,
//     }));

//     if (!perUser[user?.id ?? ""] && user) {
//       entries.push({
//         userId: user.id,
//         name: user.name || "You",
//         bet: 0,
//         win: 0,
//       });
//     }

//     // 3) Sort by Win desc (then Bet desc as tiebreaker) and keep a reasonable list
//     entries.sort((a, b) => (b.win - a.win) || (b.bet - a.bet));

//     // 4) Save & show
//     setRoundWinners(entries);
//     setShowRoundWinners(true);
//     // increment block count; show leaderboard exactly every 10 rounds
//     setBlockCount((prev) => {
//       const next = prev + 1;
//       if (next >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(INTERMISSION_SECS);
//       }
//       return next >= 10 ? 10 : next;
//     });
//   }

//   // ===== Betting click gating (no external toaster) =====
//   const balance = user?.balance ?? 0;
//   const noCoins = balance <= 0;
//   const cannotAffordChip = balance < (selectedChip || 0);
//   //const hardDisabled = round?.state !== "betting" || showLeaderboard;



//   const onSliceClick = useCallback(
//     async (key: FoodsKey) => {
//       const balance = user?.balance ?? 0;
//       const noCoins = balance <= 0;
//       const cannotAffordChip = balance < (selectedChip || 0);
//       const hardDisabled = round?.state !== "betting" || showLeaderboard;
// console.log('keyyyyyyyy', key)
//       // show message if no coins
//       if (noCoins) {
//         notify("You don't have coin");
//         return;
//       }

//       // show message if can't afford this chip
//       if (cannotAffordChip) {
//         notify("Not enough balance for this chip");
//         return;
//       }

//       // ignore clicks if hard-disabled (betting closed, leaderboard open, or round over)
//       if (hardDisabled || isRoundOver || !selectedChip) return;

//       // proceed with bet
//       setUserBets((prevBets) => ({
//         ...prevBets,
//         [key]: prevBets[key] + selectedChip,
//       }));

//       await placeBet(key, selectedChip);
//     },
//     [user?.balance, round?.state, showLeaderboard, isRoundOver, selectedChip, placeBet]
//   );


//   /*   const counts = useMemo(() => {
//       const m: Record<FoodsKey, number> = {
//         meat: 0,
//         tomato: 0,
//         corn: 0,
//         sausage: 0,
//         lettuce: 0,
//         carrot: 0,
//         skewer: 0,
//         ham: 0,
//       };
//       for (const c of stacked) m[c.fruit] += 1;
//       return m;
//     }, [stacked]);
  
//     const overflowBySlice = useMemo(() => {
//       const map: Partial<Record<FoodsKey, number>> = {};
//       for (const k of FOODS) {
//         const total = stacked.filter((c) => c.fruit === k).length;
//         const overflow = Math.max(0, total - MAX_COINS_PER_SLICE);
//         if (overflow > 0) map[k] = overflow;
//       }
//       return map;
//     }, [stacked]); */

//   // 1a) Compute per-slice total bet *value* from your stacked coins
//   const totalsBySlice = useMemo(() => {
//     const m: Record<FoodsKey, number> = {
//       meat: 0,
//       tomato: 0,
//       corn: 0,
//       sausage: 0,
//       lettuce: 0,
//       carrot: 0,
//       skewer: 0,
//       ham: 0,
//     };
//     for (const c of stacked) m[c.fruit] += c.value; // sum the chip values
//     return m;
//   }, [stacked]);

//   // 1b) If your useGame() exposes server totals, prefer those:
//   const totalsFromServer = (game as any)?.totals as Record<FoodsKey, number> | undefined;
//   const totalsForHot = totalsFromServer ?? totalsBySlice;

//   // 1c) Pick the fruit with the highest total (break ties by first seen)
//   const hotKey = useMemo<FoodsKey | null>(() => {
//     let best: FoodsKey | null = null;
//     let bestVal = 0;
//     for (const k of FOODS) {
//       const v = totalsForHot[k] ?? 0;
//       if (v > bestVal) { bestVal = v; best = k; }
//     }
//     return bestVal > 0 ? best : null; // only mark HOT if there’s at least some bet
//   }, [totalsForHot]);


//   /*   const roundNum = useMemo(() => {
//       if (!round?.roundId) return 0;
//       let h = 0;
//       for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
//       return h % 10000;
//     }, [round?.roundId]); */

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ======== INTERMISSION COUNTDOWN ======== **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;

//     const t = setInterval(() => {
//       setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   // when countdown finishes, auto-close & auto-start next round; also reset the block
//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       // close modal
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);

//       // reset block tallies for the next 10-round block
//       setBlockCount(0);
//       setWinsByPlayer({});
//       setWinnersHistory([]);

//       // tell the game to start the next round if it exposes a method
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => { });
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);


//   useEffect(() => {
//     // Reset the user bets when the round is over
//     if (round?.state === "revealing") {
//       // Reset all bets to 0
//       setUserBets({
//         meat: 0,
//         tomato: 0,
//         corn: 0,
//         sausage: 0,
//         lettuce: 0,
//         carrot: 0,
//         skewer: 0,
//         ham: 0,
//       });
//     }
//   }, [round?.state]);

//   function handleWin(winner: FoodsKey) {
//     const winAmount = userBets[winner] * MULTIPLIER[winner];
//     console.log(`You won ${winAmount} coins on ${LABEL[winner]}!`);
//     if (winAmount > 0) {
//       // Prefer server-side credit if you have it:
//       creditWin?.(winAmount).catch(() => {
//         // fallback optimistic:
//         updateBalance?.(winAmount);
//       });
//     }

//     // Update user's balance or handle win logic here...
//   }



//   // ===== Initial game loader (fixed-time) =====
//   const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0); // 0..1
//   const [loggedIn, setLoggedIn] = useState(false);

// const [token, setToken] = useState<string | null>(null);

// useEffect(() => {
//   setToken(localStorage.getItem("auth_token")); // set by your login
//   setLoggedIn(!!localStorage.getItem("auth_token"));
// }, []);


//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();

//     const tick = (now: number) => {
//       const elapsed = now - start;
//       const p = Math.min(1, elapsed / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) {
//         raf = requestAnimationFrame(tick);
//       } else {
//         // small grace so the bar reaches 100% visually
//         setTimeout(() => setBootLoading(false), 150);
//       }
//     };

//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);

//   /*   if (bootLoading) {
//       return <InitialLoader open={bootLoading} progress={bootProgress} />
  
//     } */

//   function handleLoginSuccess() {
//     // your LoginPage should save token to localStorage
//     setToken(localStorage.getItem("auth_token"));
//     setLoggedIn(true);
//   }

// console.log("roundddddddd",round)
//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* initial loader */}
//       <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//       {/* login page */}
//       {!loggedIn && 
//         <LoginPage onLogin={handleLoginSuccess}/>
//       }
//       {/* Game UI */}
//       <div>
//         <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//         {/* Phone frame */}
//         <div
//           ref={phoneRef}
//           className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//           style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//         >
//           <div className="absolute top-2 left-2 right-2 z-30">
//             <div className="grid grid-cols-2 gap-2">
//               {/* Left Side: Exit + Record */}
//               <div className="flex items-center space-x-2">
//                 <button
//                   aria-label="Exit"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => {
//                     /* exit logic */
//                   }}
//                 >
//                   <X size={18} />
//                 </button>

//                 <button
//                   aria-label="Record"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowRecord(true)}
//                 >
//                   <ScrollText size={18} />
//                 </button>
//               </div>

//               {/* Right Side: Sound + Help */}
//               <div className="flex items-center space-x-2 justify-end">
//                 <button
//                   aria-label="Sound Settings"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setSettingsOpen(true)}
//                 >
//                   <Volume2 size={18} />
//                 </button>

//                 <button
//                   aria-label="Help"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowGameRules(true)}
//                 >
//                   <MessageCircleQuestionMark size={18} />
//                 </button>
//               </div>

//               {/* Left Side: Block + Round Info */}
//               <div className="text-white text-xs opacity-80 leading-tight">
//                 {/*         <div>Today's Round: {roundNum}</div> */}
//                 <div className="font-bold">Round: {displayBlockRound}</div>
//               </div>

//               {/* Right Side: Ping + Leaderboard */}
//               <div className="flex justify-end items-center gap-2">
//                 <div className="flex items-center space-x-1 text-green-500 text-xs">
//                   <Wifi size={14} className="animate-pulse" />
//                   <span>45ms</span>
//                 </div>

//                 <button
//                   ref={bankRef}
//                   aria-label="Leaderboard"
//                   className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
//                   onClick={() => setShowLeaderboard(true)}
//                 >
//                   🏆
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* INLINE TOAST / TIP (no external lib) */}
//           <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
//             <AnimatePresence>
//               {tip && (
//                 <motion.div
//                   key="tip"
//                   initial={{ y: -16, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1 }}
//                   exit={{ y: -16, opacity: 0 }}
//                   transition={{ type: "spring", stiffness: 320, damping: 24 }}
//                   className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
//                   style={{
//                     background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                     border: "1px solid rgba(255,255,255,.25)",
//                     boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
//                   }}
//                 >
//                   {tip}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* WHEEL AREA */}
//           <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//             {/* pointer */}
//             <div className="absolute left-1/2 -translate-x-1/2 z-30">
//               <div
//                 className="w-7 h-10 rounded-[12px] relative"
//                 style={{
//                   background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                   boxShadow:
//                     "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//                 }}
//               >
//                 <div
//                   className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
//                   style={{
//                     width: 0,
//                     height: 0,
//                     borderLeft: "12px solid transparent",
//                     borderRight: "12px solid transparent",
//                     borderTop: "16px solid #f59e0b",
//                     filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                   }}
//                 />
//                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                   <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
//                 </div>
//               </div>
//             </div>

//             {/* wheel disc */}
//             <motion.div
//               ref={wheelRef}
//               className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//               animate={controls}
//               onUpdate={(latest) => {
//                 if (typeof (latest as any).rotate === "number") {
//                   const rot = (latest as any).rotate as number;
//                   setWheelDeg(rot);
//                   wheelDegRef.current = rot;
//                 }
//               }}
//               style={{
//                 top: wheelTop,
//                 width: D,
//                 height: D,
//                 borderRadius: 9999,
//                 background:
//                   "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//                 boxShadow:
//                   "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//                 transformStyle: "preserve-3d",
//                 ["--wheel-rot" as any]: `${wheelDeg}deg`,
//               }}
//             >
//               {/* rim highlight */}
//               <div
//                 className="absolute inset-0 rounded-full opacity-50"
//                 style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//               />

//               {/* spokes */}
//               {FOODS.map((_, i) => (
//                 <div
//                   key={`spoke-${i}`}
//                   className="absolute left-1/2 top-1/2 origin-left"
//                   style={{
//                     width: R,
//                     height: 5,
//                     background: "rgba(255,255,255,.05)",
//                     transform: `rotate(${i * (360 / FOODS.length)}deg)`,
//                   }}
//                 />
//               ))}

//               {/* per-slice buttons */}
//               {FOODS.map((key, i) => {
//                 const angDeg = i * (360 / FOODS.length);
//                 const rad = ((angDeg - 90) * Math.PI) / 180;
//                 const cx = R + ringR * Math.cos(rad);
//                 const cy = R + ringR * Math.sin(rad);

//                 const totalBet = userBets[key];
//                 const studRadius = 5;
//                 const studOffset = btn / 2 + 10;
//                 const tx = -Math.sin(rad);
//                 const ty = Math.cos(rad);
//                 const lx = cx - tx * studOffset;
//                 const ly = cy - ty * studOffset;

//                 const disabled = round?.state !== "betting" || showLeaderboard; // hardDisabled
//                 const isWinner = forcedWinner === key && round?.state !== "betting";

//                 // visual-only disable when noCoins / cannotAffordChip
//                 const visuallyDisabled = disabled || noCoins || cannotAffordChip;

//                 return (
//                   <div key={key}>
//                     {/* Stud */}
//                     <div
//                       className="absolute rounded-full pointer-events-none"
//                       style={{
//                         left: lx - studRadius,
//                         top: ly - studRadius,
//                         width: studRadius * 2,
//                         height: studRadius * 2,
//                         background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                         boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                       }}
//                     />

//                     {/* Slice button */}
//                     <motion.button
//                       whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
//                       whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
//                       onClick={() => {
//                         if (noCoins) {
//                           notify("You don't have coin");
//                           return;
//                         }
//                         if (cannotAffordChip) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         if (disabled || isRoundOver || !selectedChip) return;
//                         onSliceClick(key);
//                       }}
//                       className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
//                       style={{
//                         left: cx,
//                         top: cy,
//                         width: btn,
//                         height: btn,
//                         background:
//                           "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                         borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                         boxShadow: isWinner
//                           ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                           : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                       }}
//                       aria-label={`Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`}
//                       disabled={disabled} // true disable only for hard-closed states
//                       aria-disabled={visuallyDisabled}
//                       title={
//                         noCoins
//                           ? "You don't have coin"
//                           : cannotAffordChip
//                             ? "Not enough balance for this chip"
//                             : `Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`
//                       }
//                     >
//                       {/* Counter-rotated content */}
//                       <div
//                         className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
//                         style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
//                       >
//                         <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                           {EMOJI[key]}
//                         </div>

//                         <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                           win <span className="font-extrabold">x{MULTIPLIER[key]}</span>
//                         </div>

//                         {/* Hot badge */}
//                         {hotKey === key && (
//                           <div
//                             className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
//                             style={{
//                               boxShadow: "0 6px 14px rgba(0,0,0,.45)",
//                               border: "1px solid rgba(255,255,255,.25)",
//                             }}
//                             aria-label={`HOT: ${LABEL[key]} has the highest total bets`}
//                           >
//                             HOT
//                           </div>
//                         )}


//                         {/* Total bet text */}
//                         <div className="text-[10px] text-white">Total: {formatNumber(totalBet)}</div>
//                       </div>
//                     </motion.button>
//                   </div>
//                 );
//               })}
//             </motion.div>

//             {/* Center hub */}
//             <motion.div
//               className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//               style={{
//                 top: hubTop,
//                 width: hubSize,
//                 height: hubSize,
//                 background:
//                   "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//                 border: "1px solid rgba(255,255,255,.25)",
//               }}
//               animate={{
//                 boxShadow: [
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
//                 ]
//               }}
//               transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//             >
//               <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
//               <div className="text-center relative">
//                 <div className="text-[12px] font-semibold tracking-wide mt-9">
//                   {bettingOpen && !showLeaderboard
//                     ? "Place bets"
//                     : round?.state === "revealing"
//                       ? "Revealing…"
//                       : "Next Round"}
//                 </div>
//                 <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
//                   {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//                 </div>
//               </div>
//             </motion.div>
//           </div>

//           {/* Progress & platform */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 z-10"
//             style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//           >
//             <div className="relative w-full h-full">
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div className="absolute -left-8 -right-8 flex justify-between">
//                 {/* Pizza */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
//                     <span className="text-3xl pb-1">🍕</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 400k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
//                     4.37x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute left-3/12 mt-6 ml-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Pizza
//                     </div>
//                   </div>
//                 </div>
//                 {/* Salad */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
//                     <span className="text-3xl">🥗</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 100k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
//                     1.25x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute right-3/12 mt-6 mr-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Salad
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div
//                 className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
//                 style={{
//                   bottom: 0,
//                   width: D * 0.98,
//                   height: 52,
//                   background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                   border: "4px solid #1e40af",
//                   boxShadow: "0 5px 0 #1e3a8a",
//                 }}
//               >
//                 <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
//                   <div
//                     className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
//                     style={{
//                       background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                       border: "1px solid rgba(255,255,255,.25)",
//                       boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
//                     }}
//                   >
//                     Result
//                   </div>

//                   <div className="flex items-center gap-2">
//                     {(winnersHistory.length ? [...winnersHistory].slice(-9).reverse() : []).map((k, idx) => (
//                       <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
//                         <div
//                           className="w-8 h-8 rounded-xl grid place-items-center"
//                           style={{
//                             background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
//                             border: "1px solid #7fb4ff",
//                             boxShadow:
//                               "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
//                           }}
//                           title={LABEL[k]}
//                         >
//                           <span className="text-[16px] leading-none">{EMOJI[k]}</span>
//                         </div>
//                         {idx === 0 && (
//                           <div
//                             className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[7px] font-black"
//                             style={{
//                               background: "linear-gradient(180deg,#ffd84d,#ffb800)",
//                               border: "1px solid rgba(0,0,0,.2)",
//                               boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
//                               color: "#3a2a00",
//                               whiteSpace: "nowrap",
//                             }}
//                           >
//                             NEW
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                     {winnersHistory.length === 0 && (
//                       <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== CHIP BAR ===== */}
//           <div className="px-3 relative">
//             <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Mine 200k
//               </div>
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Total 100M
//               </div>
//             </div>

//             <div
//               className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//               style={{
//                 background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                 borderColor: "rgba(255,255,255,0.35)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//               }}
//             >
//               <div
//                 className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//                 style={{
//                   background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//                 }}
//               >
//                 Select Bet Amount
//               </div>

//               <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//                 {[
//                   { v: 1000, color: "#1fb141" },
//                   { v: 2000, color: "#3b82f6" },
//                   { v: 5000, color: "#fb923c" },
//                   { v: 10000, color: "#ef4444" },
//                   { v: 50000, color: "#c084fc" },
//                 ].map(({ v, color }) => {
//                   const selected = selectedChip === v;
//                   const balance = user?.balance ?? 0;
//                   const afford = balance >= v;

//                   return (
//                     <motion.button
//                       key={v}
//                       ref={(el) => {
//                         chipRefs.current[v] = el;
//                         return undefined;
//                       }}
//                       whileTap={{ scale: 0.95, rotate: -2 }}
//                       whileHover={{ y: -3 }}
//                       onClick={() => {
//                         if (!afford) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         setSelectedChip(v);
//                       }}
//                       className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
//                       style={{
//                         width: 48,
//                         height: 48,
//                         transformStyle: "preserve-3d",
//                         boxShadow: selected
//                           ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                           : "0 8px 16px rgba(0,0,0,.35)",
//                         border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                         background: `
//                       conic-gradient(
//                         #fff 0 15deg, ${color} 15deg 45deg,
//                         #fff 45deg 60deg, ${color} 60deg 90deg,
//                         #fff 90deg 105deg, ${color} 105deg 135deg,
//                         #fff 135deg 150deg, ${color} 150deg 180deg,
//                         #fff 180deg 195deg, ${color} 195deg 225deg,
//                         #fff 225deg 240deg, ${color} 240deg 270deg,
//                         #fff 270deg 285deg, ${color} 285deg 315deg,
//                         #fff 315deg 330deg, ${color} 330deg 360deg
//                       )
//                     `,
//                       }}
//                       title={`${v}`}
//                       aria-label={`Select chip ${v}`}
//                       aria-disabled={!afford}
//                     >
//                       <div
//                         className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                         style={{
//                           width: 34,
//                           height: 34,
//                           background: selected
//                             ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                             : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                           border: "2px solid rgba(0,0,0,.15)",
//                           color: selected ? "#0b3a8e" : "#1f2937",
//                           boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                         }}
//                       >
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>

//                       {selected && (
//                         <div
//                           className="absolute inset-[-4px] rounded-full pointer-events-none"
//                           style={{
//                             border: `2px solid ${color}88`,
//                             boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                           }}
//                         />
//                       )}
//                     </motion.button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* Stats strip */}
//           <div className="px-3 mt-3">



//             <div
//               className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
//               style={{
//                 background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                 borderColor: "#1e40af",
//                 boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//               }}
//             >

//               <div
//                 className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
//                 style={{
//                   background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                 }}
//               >
//                 Stats
//               </div>

//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Coins</div>
//                 <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt(user?.balance ?? 0)}
//                 </div>
//               </div>
//               {/* Avatar */}
//               <div
//                 className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
//                 style={{
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 2px 8px rgba(0,0,0,.25)",
//                   background:
//                     "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
//                 }}
//               >
//                 <span className="text-lg text-black/50">👤</span>
//               </div>
//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Rewards</div>
//                 <div className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* transient & payout flies */}
//           <div className="pointer-events-none absolute inset-0 z-30">
//             <AnimatePresence>
//               {flies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//               {remoteFlies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           <div className="pointer-events-none absolute inset-0">
//             <AnimatePresence>
//               {payoutFlies.map((f) => (
//                 <motion.div
//                   key={`p-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                     y:
//                       (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}

//               {bankFlies.map((f) => (
//                 <motion.div
//                   key={`b-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 5,
//                     y:
//                       (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 5,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* MODALS */}
//           <LeaderboardModal
//             open={showLeaderboard}
//             onClose={() => {
//               setShowLeaderboard(false);
//               setIntermissionSec(undefined);
//             }}
//             onStartNow={() => setIntermissionSec(0)}
//             intermissionSec={intermissionSec}
//             ranking={ranking}
//             user={user ?? undefined}
//           />
//           <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//           <Record open={showRecord} onClose={() => setShowRecord(false)} />

//           {/* Settings bottom sheet */}
//           <SettingsBottomSheet
//             open={settingsOpen}
//             onClose={() => setSettingsOpen(false)}
//             prefs={prefs}
//             setPrefs={setPrefs}
//           />

//           <RoundWinnersModal
//             open={showRoundWinners}
//             onClose={() => setShowRoundWinners(false)}
//             entries={roundWinners}
//             meId={user?.id}
//           />

//         </div>

//         {/* gain flourish */}
//         <div className="pointer-events-none fixed inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = phoneRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const sx = cont ? cont.left + cont.width / 2 : 0;
//               const sy = cont ? cont.top + 520 : 0;
//               const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//               const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                   animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );

// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// /** ==================== UI bits ==================== **/
// /* function IconBtn({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick?: () => void; ariaLabel?: string }) {
//   return (
//     <button
//       aria-label={ariaLabel}
//       onClick={onClick}
//       className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 shadow grid place-items-center text-[18px] hover:bg-white/20 active:scale-95 text-white"
//       style={{ boxShadow: "0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.2)" }}
//     >
//       {children}
//     </button>
//   );
// } */


// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// /** utils */
// function fmt(n: number) {
//   if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
//   if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
// }
// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }








// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
// import { useGame } from "./useGame.local";
// import { FOODS, type FoodsKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";
// import GameRules from "./GameRules";
// import Record from "./Record";
// import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
// import type { RoundWinnerEntry } from "./RoundWinnersModal";
// import RoundWinnersModal from "./RoundWinnersModal";
// import InitialLoader from "./InitialLoader";
// import LoginPage from "./LoginPage";
// import ResponsiveGameWrapper from "./ResponsiveGameWrapper";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// const INTERMISSION_SECS = 8;

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// // Prefs
// const PREFS_KEY = "soundPrefsWheelV1";

// // Visual language
// const EMOJI: Record<FoodsKey, string> = {
//   meat: "🥩",
//   tomato: "🍅",
//   corn: "🌽",
//   sausage: "🌭",
//   lettuce: "🥬",
//   carrot: "🥕",
//   skewer: "🍢",
//   ham: "🍗",
// };
// const LABEL: Record<FoodsKey, string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };
// const MULTIPLIER: Record<FoodsKey, number> = {
//   meat: 45,
//   tomato: 5,
//   corn: 5,
//   sausage: 10,
//   lettuce: 5,
//   carrot: 5,
//   skewer: 15,
//   ham: 25,
// };

// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90;
// const norm360 = (a: number) => ((a % 360) + 360) % 360;

// function indexUnderPointer(rotDeg: number, sliceAngle: number, count: number) {
//   const a = norm360(POINTER_DEG - rotDeg + 90);
//   const i = Math.floor((a + sliceAngle / 2) / sliceAngle) % count;
//   return i;
// }
// function rotationToCenterIndex(i: number, sliceAngle: number) {
//   return POINTER_DEG - i * sliceAngle + 90;
// }

// const formatNumber = (num: number) => {
//   if (num >= 1_000_000) return `${Math.round(num / 1_000_000)}M`;
//   if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
// };

// // Safe UUID
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

// /** ==================== COORD + SCALE HELPERS ==================== **/
// const BASE_W = 360;
// const BASE_H = 700;

// function getCurrentScale(rootEl: HTMLElement | null) {
//   if (!rootEl) return 1;
//   const rr = rootEl.getBoundingClientRect();
//   const sx = rr.width / BASE_W;
//   const sy = rr.height / BASE_H;
//   return Math.max(0.0001, Math.min(sx, sy));
// }
// function toLocalPoint(pageEl: HTMLElement | null, x: number, y: number) {
//   if (!pageEl) return { x, y };
//   const rr = pageEl.getBoundingClientRect();
//   const s = getCurrentScale(pageEl);
//   return { x: (x - rr.left) / s, y: (y - rr.top) / s };
// }
// function centerLocal(pageEl: HTMLElement | null, targetEl: HTMLElement | null) {
//   if (!pageEl || !targetEl) return { x: 0, y: 0 };
//   const tr = targetEl.getBoundingClientRect();
//   return toLocalPoint(pageEl, tr.left + tr.width / 2, tr.top + tr.height / 2);
// }

// /** ==================== RESPONSIVE WRAPPER ==================== **/
// function useResponsiveScale(frameRef: React.RefObject<HTMLDivElement>) {
//   const [scale, setScale] = useState(1);
//   useEffect(() => {
//     const el = frameRef.current;
//     if (!el) return;

//     const update = () => {
//       const rect = el.getBoundingClientRect();
//       const s = Math.min(rect.width / BASE_W, rect.height / BASE_H, 1);
//       setScale(s > 0 ? s : 1);
//     };

//     update();
//     const ro = new ResizeObserver(update);
//     ro.observe(el);
//     window.addEventListener("resize", update);
//     return () => {
//       ro.disconnect();
//       window.removeEventListener("resize", update);
//     };
//   }, [frameRef]);
//   return scale;
// }

// /** ==================== APP ==================== **/
// export default function App() {
//   const game = useGame() as any;
//   const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance } = game;
//   const startNextRound: (() => Promise<void> | void) | undefined =
//     game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
//   const prefersReducedMotion = useReducedMotion();
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

//   // ======= Soft toast =======
//   const [tip, setTip] = useState<string | null>(null);
//   const tipHideAtRef = useRef<number | null>(null);
//   function notify(msg: string, ms = 1500) {
//     setTip(msg);
//     const hideAt = Date.now() + ms;
//     tipHideAtRef.current = hideAt;
//     window.setTimeout(() => {
//       if (tipHideAtRef.current === hideAt) setTip(null);
//     }, ms);
//   }

//   const [userBets, setUserBets] = useState<Record<FoodsKey, number>>({
//     meat: 0,
//     tomato: 0,
//     corn: 0,
//     sausage: 0,
//     lettuce: 0,
//     carrot: 0,
//     skewer: 0,
//     ham: 0,
//   });

//   // ——— Refs
//   const frameRef = useRef<HTMLDivElement | null>(null); // responsive frame
//   const pageRef = useRef<HTMLDivElement | null>(null); // root 360x700
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);
//   const wheelDegRef = useRef(0);

//   // Responsive scale (visual)
//   const scaleVisual = useResponsiveScale(frameRef);

//   // ——— State
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const bettingOpen = round?.state === "betting";
//   const progress = round ? 1 - round.timeLeftMs / 10000 : 0;
//   const [isLoaded, setIsLoaded] = useState(false);

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   const isRoundOver = progress === 0;

//   // ——— Wheel sizing (keep your original math; provides nice relative sizing)
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const el = phoneRef.current;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize((prev) => (prev === D ? prev : D));
//     });
//     ro.observe(el);
//     return () => ro.unobserve(el);
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<Prefs>({ master: 1, bet: 1, reveal: 1, win: 1, bg: 1 });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   const applyVolumes = useCallback(() => {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   async function primeOne(a?: HTMLAudioElement | null) {
//     if (!a) return;
//     try {
//       a.muted = true;
//       await a.play();
//       a.pause();
//       a.currentTime = 0;
//       a.muted = false;
//     } catch {}
//   }
//   async function primeAllAudio() {
//     await Promise.all([
//       primeOne(betAudioRef.current),
//       primeOne(revealAudioRef.current),
//       primeOne(winAudioRef.current),
//       primeOne(bgAudioRef.current),
//     ]);
//     setAudioReady(true);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     bgAudioRef.current = new Audio(SND_BG_LOOP);
//     if (bgAudioRef.current) {
//       bgAudioRef.current.loop = true;
//       bgAudioRef.current.volume = prefs.master * prefs.bg;
//     }
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     function arm() {
//       primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => {}));
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     }
//     window.addEventListener("pointerdown", arm, { once: true });
//     window.addEventListener("keydown", arm, { once: true });
//     window.addEventListener("touchstart", arm, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     };
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch {}
//   }, [applyVolumes, prefs]);

//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   // balance flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => uid());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance, user, lastBalance]);

//   /** ===== geometry / targets (LOCAL COORDS) ===== */
//   const getWheelCenter = useCallback(() => {
//     const c = centerLocal(pageRef.current, wheelRef.current);
//     if (!c.x && !c.y) return { x: BASE_W / 2, y: 280 };
//     return c;
//   }, []);

//   const slices: readonly FoodsKey[] = FOODS;
//   const sliceAngle = 360 / slices.length;

//   const hash01 = (str: string, s = 0) => {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   };

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter(); // already local
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, ringR]
//   );

//   const inButtonOffsetForBet = (betId: string) => {
//     const a = 2 * Math.PI * hash01(betId, 3);
//     const r = 8 + 18 * hash01(betId, 4);
//     return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   };

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       const o = inButtonOffsetForBet(betId);
//       return { x: c.x + o.dx, y: c.y + o.dy }; // local
//     },
//     [sliceButtonCenter]
//   );

//   /** ===== history & leaderboard (per 10 rounds) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FoodsKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
//   const [blockCount, setBlockCount] = useState(0);

//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//       ? (round as any).indexInBlock
//       : typeof (round as any)?.roundNumber === "number"
//       ? ((round as any).roundNumber % 10) + 1
//       : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? (blockCount % 10 || 10);

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const chipEl = chipRefs.current[value];
//       const from = chipEl ? centerLocal(pageRef.current, chipEl) : { x: to.x, y: to.y };
//       const id = uid();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     []
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter(); // local
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = uid();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0];
//     const idx = (slices as FoodsKey[]).indexOf(evt.fruit);
//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current && audioReady) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => {});
//     }

//     if (evt.userId === user?.id) spawnLocalFly(to, evt.value);
//     else spawnRemoteFly(to, evt.value);

//     setStacked((prev) =>
//       prev.some((c) => c.id === evt.betId)
//         ? prev
//         : [...prev, { id: evt.betId, fruit: evt.fruit, value: evt.value, userId: evt.userId }]
//     );

//     shiftEcho();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [echoQueue, round?.roundId]);

//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.state, currentRoundId]);

//   /** ===== spin & settle ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);
//   const [wheelDeg, setWheelDeg] = useState(0);

//   // Safety: hide transient coins when revealing
//   useEffect(() => {
//     if (round?.state === "revealing") {
//       setFlies([]);
//       setRemoteFlies([]);
//     }
//   }, [round?.state]);

//   // Main spin
//   useEffect(() => {
//     if (!round || round.state !== "revealing") return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     setFlies([]);
//     setRemoteFlies([]);
//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }

//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01(round.roundId ?? "seed", 99) * 360;
//     const total = current + base + jitter;

//     (async () => {
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       const idx = indexUnderPointer(total, 360 / FOODS.length, FOODS.length);
//       const ideal = rotationToCenterIndex(idx, 360 / FOODS.length);
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k;

//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       const winner = FOODS[idx] as FoodsKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//       handleWin(winner);
//     })();
//   }, [round?.state, round?.roundId, controls, prefersReducedMotion, audioReady]);

//   function doRevealFlights(winner: FoodsKey) {
//     const balCenter = centerLocal(pageRef.current, balanceRef.current);
//     const bankCenter = centerLocal(pageRef.current, bankRef.current);

//     /** my winners -> balance **/
//     if (user && (balCenter.x || balCenter.y)) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => {});
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     /** losers -> bank **/
//     if (bankCenter.x || bankCenter.y) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     /** history + ranking + block **/
//     setWinnersHistory((prev) => [...prev, winner].slice(-10));
//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }

//     // per-round winners modal aggregation
//     const perUser: Record<string, { bet: number; win: number }> = {};
//     for (const c of stacked) {
//       perUser[c.userId] ??= { bet: 0, win: 0 };
//       perUser[c.userId].bet += c.value;
//       if (c.fruit === winner) perUser[c.userId].win += c.value * MULTIPLIER[winner];
//     }
//     function pseudoName(uid: string) {
//       if (uid === user?.id) return user?.name || "You";
//       const tail = uid.slice(-4).toUpperCase();
//       return `Player ${tail}`;
//     }
//     const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
//       userId: uid,
//       name: pseudoName(uid),
//       bet: perUser[uid].bet,
//       win: perUser[uid].win,
//     }));
//     if (!perUser[user?.id ?? ""] && user) {
//       entries.push({ userId: user.id, name: user.name || "You", bet: 0, win: 0 });
//     }
//     entries.sort((a, b) => b.win - a.win || b.bet - a.bet);
//     setRoundWinners(entries);
//     setShowRoundWinners(true);

//     setBlockCount((prev) => {
//       const next = prev + 1;
//       if (next >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(INTERMISSION_SECS);
//       }
//       return next >= 10 ? 10 : next;
//     });
//   }

//   // ===== Betting gating =====
//   const balance = user?.balance ?? 0;
//   const noCoins = balance <= 0;
//   const cannotAffordChip = balance < (selectedChip || 0);

//   const onSliceClick = useCallback(
//     async (key: FoodsKey) => {
//       const balance = user?.balance ?? 0;
//       const noCoins = balance <= 0;
//       const cannotAffordChip = balance < (selectedChip || 0);
//       const hardDisabled = round?.state !== "betting" || showLeaderboard;

//       if (noCoins) return notify("You don't have coin");
//       if (cannotAffordChip) return notify("Not enough balance for this chip");
//       if (hardDisabled || isRoundOver || !selectedChip) return;

//       setUserBets((prevBets) => ({ ...prevBets, [key]: prevBets[key] + selectedChip }));
//       await placeBet(key, selectedChip);
//     },
//     [user?.balance, round?.state, showLeaderboard, isRoundOver, selectedChip, placeBet]
//   );

//   // Per-slice totals (for HOT badge)
//   const totalsBySlice = useMemo(() => {
//     const m: Record<FoodsKey, number> = {
//       meat: 0, tomato: 0, corn: 0, sausage: 0, lettuce: 0, carrot: 0, skewer: 0, ham: 0,
//     };
//     for (const c of stacked) m[c.fruit] += c.value;
//     return m;
//   }, [stacked]);
//   const totalsFromServer = (game as any)?.totals as Record<FoodsKey, number> | undefined;
//   const totalsForHot = totalsFromServer ?? totalsBySlice;
//   const hotKey = useMemo<FoodsKey | null>(() => {
//     let best: FoodsKey | null = null;
//     let bestVal = 0;
//     for (const k of FOODS) {
//       const v = totalsForHot[k] ?? 0;
//       if (v > bestVal) { bestVal = v; best = k; }
//     }
//     return bestVal > 0 ? best : null;
//   }, [totalsForHot]);

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ======== INTERMISSION COUNTDOWN ======== **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;
//     const t = setInterval(() => {
//       setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
//     }, 1000);
//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);
//       setBlockCount(0);
//       setWinsByPlayer({});
//       setWinnersHistory([]);
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => {});
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);

//   useEffect(() => {
//     if (round?.state === "revealing") {
//       setUserBets({ meat: 0, tomato: 0, corn: 0, sausage: 0, lettuce: 0, carrot: 0, skewer: 0, ham: 0 });
//     }
//   }, [round?.state]);

//   function handleWin(winner: FoodsKey) {
//     const winAmount = userBets[winner] * MULTIPLIER[winner];
//     if (winAmount > 0) {
//       creditWin?.(winAmount).catch(() => updateBalance?.(winAmount));
//     }
//   }

//   // ===== Initial loader (fixed time) =====
//   const LOADER_DURATION_MS = 3000;
//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0);
//   const [loggedIn, setLoggedIn] = useState(false);

//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();
//     const tick = (now: number) => {
//       const elapsed = now - start;
//       const p = Math.min(1, elapsed / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) raf = requestAnimationFrame(tick);
//       else setTimeout(() => setBootLoading(false), 150);
//     };
//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);

//   /** ==================== RENDER ==================== **/
//   // Precompute local centers for payout/bank animate (avoid recomputing inside map)
//   const balCenter = centerLocal(pageRef.current, balanceRef.current);
//   const bankCenter = centerLocal(pageRef.current, bankRef.current);

//   return (
//     // Frame fills iframe area (100% width x 60% height or whatever the host gives)
//         <div style={{ width: "100%", height: "100vh", background: "#000" }}>
//       <ResponsiveGameWrapper>
//     <div ref={frameRef} className="w-full h-full" style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", overflow: "hidden" }}>
//       {/* Scaled root (keeps exact positions), anchored bottom-center */}
//       <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scaleVisual})`, transformOrigin: "bottom center", willChange: "transform" }}>
//         {/* === Your existing 360x700 root container === */}
//         <div
//           ref={pageRef}
//           className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//           style={{
//             boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//             backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//             backgroundSize: "cover",
//             backgroundPosition: "center",
//           }}
//         >
//           {/* Loader */}
//           <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//           {/* Login */}
//           {!loggedIn && <LoginPage onLogin={() => setLoggedIn(true)} />}

//           {/* ===== Game UI ===== */}
//           <div>
//             <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//             {/* Phone frame */}
//             <div
//               ref={phoneRef}
//               className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//               style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//             >
//               <div className="absolute top-2 left-2 right-2 z-30">
//                 <div className="grid grid-cols-2 gap-2">
//                   {/* Left: Exit + Record */}
//                   <div className="flex items-center space-x-2">
//                     <button
//                       aria-label="Exit"
//                       className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                       onClick={() => {}}
//                     >
//                       <X size={18} />
//                     </button>
//                     <button
//                       aria-label="Record"
//                       className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                       onClick={() => setShowRecord(true)}
//                     >
//                       <ScrollText size={18} />
//                     </button>
//                   </div>

//                   {/* Right: Sound + Help */}
//                   <div className="flex items-center space-x-2 justify-end">
//                     <button
//                       aria-label="Sound Settings"
//                       className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                       onClick={() => setSettingsOpen(true)}
//                     >
//                       <Volume2 size={18} />
//                     </button>
//                     <button
//                       aria-label="Help"
//                       className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                       onClick={() => setShowGameRules(true)}
//                     >
//                       <MessageCircleQuestionMark size={18} />
//                     </button>
//                   </div>

//                   {/* Round info */}
//                   <div className="text-white text-xs opacity-80 leading-tight">
//                     <div className="font-bold">Round: {displayBlockRound}</div>
//                   </div>

//                   {/* Ping + Leaderboard */}
//                   <div className="flex justify-end items-center gap-2">
//                     <div className="flex items-center space-x-1 text-green-500 text-xs">
//                       <Wifi size={14} className="animate-pulse" />
//                       <span>45ms</span>
//                     </div>

//                     <button
//                       ref={bankRef}
//                       aria-label="Leaderboard"
//                       className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
//                       onClick={() => setShowLeaderboard(true)}
//                     >
//                       🏆
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {/* Inline Toast */}
//               <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
//                 <AnimatePresence>
//                   {tip && (
//                     <motion.div
//                       key="tip"
//                       initial={{ y: -16, opacity: 0 }}
//                       animate={{ y: 0, opacity: 1 }}
//                       exit={{ y: -16, opacity: 0 }}
//                       transition={{ type: "spring", stiffness: 320, damping: 24 }}
//                       className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
//                       style={{
//                         background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                         border: "1px solid rgba(255,255,255,.25)",
//                         boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
//                       }}
//                     >
//                       {tip}
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>

//               {/* WHEEL AREA */}
//               <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//                 {/* pointer */}
//                 <div className="absolute left-1/2 -translate-x-1/2 z-30">
//                   <div
//                     className="w-7 h-10 rounded-[12px] relative"
//                     style={{
//                       background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                       boxShadow:
//                         "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//                     }}
//                   >
//                     <div
//                       className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
//                       style={{
//                         width: 0,
//                         height: 0,
//                         borderLeft: "12px solid transparent",
//                         borderRight: "12px solid transparent",
//                         borderTop: "16px solid #f59e0b",
//                         filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                       }}
//                     />
//                     <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                       <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
//                     </div>
//                   </div>
//                 </div>

//                 {/* wheel disc */}
//                 <motion.div
//                   ref={wheelRef}
//                   className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//                   animate={controls}
//                   onUpdate={(latest) => {
//                     if (typeof (latest as any).rotate === "number") {
//                       const rot = (latest as any).rotate as number;
//                       setWheelDeg(rot);
//                       wheelDegRef.current = rot;
//                     }
//                   }}
//                   style={{
//                     top: wheelTop,
//                     width: D,
//                     height: D,
//                     borderRadius: 9999,
//                     background:
//                       "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//                     boxShadow:
//                       "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//                     transformStyle: "preserve-3d",
//                     ["--wheel-rot" as any]: `${wheelDeg}deg`,
//                   }}
//                 >
//                   {/* rim */}
//                   <div
//                     className="absolute inset-0 rounded-full opacity-50"
//                     style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//                   />

//                   {/* spokes */}
//                   {FOODS.map((_, i) => (
//                     <div
//                       key={`spoke-${i}`}
//                       className="absolute left-1/2 top-1/2 origin-left"
//                       style={{
//                         width: R,
//                         height: 5,
//                         background: "rgba(255,255,255,.05)",
//                         transform: `rotate(${i * (360 / FOODS.length)}deg)`,
//                       }}
//                     />
//                   ))}

//                   {/* per-slice buttons */}
//                   {FOODS.map((key, i) => {
//                     const angDeg = i * (360 / FOODS.length);
//                     const rad = ((angDeg - 90) * Math.PI) / 180;
//                     const cx = R + ringR * Math.cos(rad);
//                     const cy = R + ringR * Math.sin(rad);

//                     const totalBet = userBets[key];
//                     const studRadius = 5;
//                     const studOffset = btn / 2 + 10;
//                     const tx = -Math.sin(rad);
//                     const ty = Math.cos(rad);
//                     const lx = cx - tx * studOffset;
//                     const ly = cy - ty * studOffset;

//                     const disabled = round?.state !== "betting" || showLeaderboard;
//                     const isWinner = forcedWinner === key && round?.state !== "betting";
//                     const visuallyDisabled = disabled || noCoins || cannotAffordChip;

//                     return (
//                       <div key={key}>
//                         {/* Stud */}
//                         <div
//                           className="absolute rounded-full pointer-events-none"
//                           style={{
//                             left: lx - studRadius,
//                             top: ly - studRadius,
//                             width: studRadius * 2,
//                             height: studRadius * 2,
//                             background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                             boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                           }}
//                         />

//                         {/* Slice button */}
//                         <motion.button
//                           whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
//                           whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
//                           onClick={() => {
//                             if (noCoins) return notify("You don't have coin");
//                             if (cannotAffordChip) return notify("Not enough balance for this chip");
//                             if (disabled || isRoundOver || !selectedChip) return;
//                             onSliceClick(key);
//                           }}
//                           className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
//                           style={{
//                             left: cx,
//                             top: cy,
//                             width: btn,
//                             height: btn,
//                             background:
//                               "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                             borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                             boxShadow: isWinner
//                               ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                               : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                           }}
//                           aria-label={`Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`}
//                           disabled={disabled}
//                           aria-disabled={visuallyDisabled}
//                           title={
//                             noCoins
//                               ? "You don't have coin"
//                               : cannotAffordChip
//                               ? "Not enough balance for this chip"
//                               : `Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`
//                           }
//                         >
//                           <div
//                             className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
//                             style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
//                           >
//                             <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                               {EMOJI[key]}
//                             </div>

//                             <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                               win <span className="font-extrabold">x{MULTIPLIER[key]}</span>
//                             </div>

//                             {/* HOT */}
//                             {hotKey === key && (
//                               <div
//                                 className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
//                                 style={{ boxShadow: "0 6px 14px rgba(0,0,0,.45)", border: "1px solid rgba(255,255,255,.25)" }}
//                                 aria-label={`HOT: ${LABEL[key]} has the highest total bets`}
//                               >
//                                 HOT
//                               </div>
//                             )}

//                             {/* Total bet */}
//                             <div className="text-[10px] text-white">Total: {formatNumber(totalBet)}</div>
//                           </div>
//                         </motion.button>
//                       </div>
//                     );
//                   })}
//                 </motion.div>

//                 {/* Center hub */}
//                 <motion.div
//                   className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//                   style={{
//                     top: hubTop,
//                     width: hubSize,
//                     height: hubSize,
//                     background:
//                       "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//                     boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//                     border: "1px solid rgba(255,255,255,.25)",
//                   }}
//                   animate={{
//                     boxShadow: [
//                       "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                       "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                       "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                     ],
//                   }}
//                   transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//                 >
//                   <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
//                   <div className="text-center relative">
//                     <div className="text-[12px] font-semibold tracking-wide mt-9">
//                       {bettingOpen && !showLeaderboard ? "Place bets" : round?.state === "revealing" ? "Revealing…" : "Next Round"}
//                     </div>
//                     <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
//                       {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//                     </div>
//                   </div>
//                 </motion.div>
//               </div>

//               {/* Progress & platform (unchanged visuals) */}
//               <div
//                 className="absolute left-1/2 -translate-x-1/2 z-10"
//                 style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//               >
//                 <div className="relative w-full h-full">
//                   <div
//                     className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                     style={{
//                       left: "50%",
//                       transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                       width: D * 0.28,
//                       height: Math.max(110, D * 0.28),
//                       boxShadow: "0 4px 0 #2379c9",
//                     }}
//                   />
//                   <div
//                     className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                     style={{
//                       left: "50%",
//                       transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                       width: D * 0.28,
//                       height: Math.max(110, D * 0.28),
//                       boxShadow: "0 4px 0 #2379c9",
//                     }}
//                   />

//                   {/* Cute side chips (kept) */}
//                   <div className="absolute -left-8 -right-8 flex justify-between">
//                     {/* Pizza */}
//                     <div className="flex flex-col items-center w-12">
//                       <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
//                         <span className="text-3xl pb-1">🍕</span>
//                       </div>
//                       <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                         Total 400k
//                       </div>
//                       <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
//                         4.37x
//                       </div>
//                       <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">
//                         <path
//                           d="M20 40
//                           C 110 0, 180 10, 210 60
//                           C 235 105, 175 125, 145 105
//                           C 115 85, 135 55, 200 55
//                           C 285 55, 330 85, 360 110"
//                           fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
//                         />
//                         <path d="M360 110 L 395 110" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
//                         <path d="M395 110 L 372 95 M395 110 L 372 125" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
//                       </svg>
//                       <div className="absolute left-3/12 mt-6 ml-3">
//                         <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                           Pizza
//                         </div>
//                       </div>
//                     </div>
//                     {/* Salad */}
//                     <div className="flex flex-col items-center w-12">
//                       <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
//                         <span className="text-3xl">🥗</span>
//                       </div>
//                       <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                         Total 100k
//                       </div>
//                       <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
//                         1.25x
//                       </div>
//                       <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">
//                         <path
//                           d="M20 40
//                           C 110 0, 180 10, 210 60
//                           C 235 105, 175 125, 145 105
//                           C 115 85, 135 55, 200 55
//                           C 285 55, 330 85, 360 110"
//                           fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
//                         />
//                         <path d="M360 110 L 395 110" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
//                         <path d="M395 110 L 372 95 M395 110 L 372 125" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
//                       </svg>
//                       <div className="absolute right-3/12 mt-6 mr-3">
//                         <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                           Salad
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <div
//                     className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
//                     style={{
//                       bottom: 0,
//                       width: D * 0.98,
//                       height: 52,
//                       background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                       border: "4px solid #1e40af",
//                       boxShadow: "0 5px 0 #1e3a8a",
//                     }}
//                   >
//                     <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
//                       <div
//                         className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
//                         style={{
//                           background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                           border: "1px solid rgba(255,255,255,.25)",
//                           boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
//                         }}
//                       >
//                         Result
//                       </div>

//                       <div className="flex items-center gap-2">
//                         {(winnersHistory.length ? [...winnersHistory].slice(-9).reverse() : []).map((k, idx) => (
//                           <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
//                             <div
//                               className="w-8 h-8 rounded-xl grid place-items-center"
//                               style={{
//                                 background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
//                                 border: "1px solid #7fb4ff",
//                                 boxShadow:
//                                   "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
//                               }}
//                               title={LABEL[k]}
//                             >
//                               <span className="text-[16px] leading-none">{EMOJI[k]}</span>
//                             </div>
//                             {idx === 0 && (
//                               <div
//                                 className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[7px] font-black"
//                                 style={{
//                                   background: "linear-gradient(180deg,#ffd84d,#ffb800)",
//                                   border: "1px solid rgba(0,0,0,.2)",
//                                   boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
//                                   color: "#3a2a00",
//                                   whiteSpace: "nowrap",
//                                 }}
//                               >
//                                 NEW
//                               </div>
//                             )}
//                           </div>
//                         ))}
//                         {winnersHistory.length === 0 && (
//                           <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* ===== CHIP BAR ===== */}
//               <div className="px-3 relative">
//                 <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
//                   <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                     Mine 200k
//                   </div>
//                   <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                     Total 100M
//                   </div>
//                 </div>

//                 <div
//                   className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//                   style={{
//                     background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                     borderColor: "rgba(255,255,255,0.35)",
//                     boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//                   }}
//                 >
//                   <div
//                     className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//                     style={{
//                       background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                       borderColor: "rgba(255,255,255,.25)",
//                       boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//                     }}
//                   >
//                     Select Bet Amount
//                   </div>

//                   <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//                     {[
//                       { v: 1000, color: "#1fb141" },
//                       { v: 2000, color: "#3b82f6" },
//                       { v: 5000, color: "#fb923c" },
//                       { v: 10000, color: "#ef4444" },
//                       { v: 50000, color: "#c084fc" },
//                     ].map(({ v, color }) => {
//                       const selected = selectedChip === v;
//                       const balance = user?.balance ?? 0;
//                       const afford = balance >= v;

//                       return (
//                         <motion.button
//                           key={v}
//                           ref={(el) => {
//                             chipRefs.current[v] = el;
//                             return undefined;
//                           }}
//                           whileTap={{ scale: 0.95, rotate: -2 }}
//                           whileHover={{ y: -3 }}
//                           onClick={() => {
//                             if (!afford) return notify("Not enough balance for this chip");
//                             setSelectedChip(v);
//                           }}
//                           className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
//                           style={{
//                             width: 48,
//                             height: 48,
//                             transformStyle: "preserve-3d",
//                             boxShadow: selected
//                               ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                               : "0 8px 16px rgba(0,0,0,.35)",
//                             border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                             background: `
//                               conic-gradient(
//                                 #fff 0 15deg, ${color} 15deg 45deg,
//                                 #fff 45deg 60deg, ${color} 60deg 90deg,
//                                 #fff 90deg 105deg, ${color} 105deg 135deg,
//                                 #fff 135deg 150deg, ${color} 150deg 180deg,
//                                 #fff 180deg 195deg, ${color} 195deg 225deg,
//                                 #fff 225deg 240deg, ${color} 240deg 270deg,
//                                 #fff 270deg 285deg, ${color} 285deg 315deg,
//                                 #fff 315deg 330deg, ${color} 330deg 360deg
//                               )
//                             `,
//                           }}
//                           title={`${v}`}
//                           aria-label={`Select chip ${v}`}
//                           aria-disabled={!afford}
//                         >
//                           <div
//                             className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                             style={{
//                               width: 34,
//                               height: 34,
//                               background: selected
//                                 ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                                 : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                               border: "2px solid rgba(0,0,0,.15)",
//                               color: selected ? "#0b3a8e" : "#1f2937",
//                               boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                             }}
//                           >
//                             {v >= 1000 ? v / 1000 + "K" : v}
//                           </div>

//                           {selected && (
//                             <div
//                               className="absolute inset-[-4px] rounded-full pointer-events-none"
//                               style={{
//                                 border: `2px solid ${color}88`,
//                                 boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                               }}
//                             />
//                           )}
//                         </motion.button>
//                       );
//                     })}
//                   </div>
//                 </div>
//               </div>

//               {/* Stats strip */}
//               <div className="px-3 mt-3">
//                 <div
//                   className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
//                   style={{
//                     background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                     borderColor: "#1e40af",
//                     boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                   }}
//                 >
//                   <div
//                     className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
//                     style={{
//                       background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                       borderColor: "rgba(255,255,255,.25)",
//                       boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                     }}
//                   >
//                     Stats
//                   </div>

//                   <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                     <div className="text-[11px] opacity-90 leading-none">Coins</div>
//                     <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
//                       💎 {fmt(user?.balance ?? 0)}
//                     </div>
//                   </div>

//                   {/* Avatar dot */}
//                   <div
//                     className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
//                     style={{
//                       borderColor: "rgba(255,255,255,.25)",
//                       boxShadow: "0 2px 8px rgba(0,0,0,.25)",
//                       background: "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
//                     }}
//                   >
//                     <span className="text-lg text-black/50">👤</span>
//                   </div>

//                   <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                     <div className="text-[11px] opacity-90 leading-none">Rewards</div>
//                     <div className="text-[14px] font-bold tabular-nums leading-tight">
//                       💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* transient & payout flies */}
//               <div className="pointer-events-none absolute inset-0 z-30">
//                 <AnimatePresence>
//                   {flies.map((f) => (
//                     <motion.div
//                       key={f.id}
//                       initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                       animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
//                       exit={{ opacity: 0, scale: 0.7 }}
//                       transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                       className="absolute"
//                     >
//                       <Coin />
//                     </motion.div>
//                   ))}
//                   {remoteFlies.map((f) => (
//                     <motion.div
//                       key={f.id}
//                       initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                       animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
//                       exit={{ opacity: 0, scale: 0.7 }}
//                       transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                       className="absolute w-10 h-10"
//                     >
//                       <Coin />
//                     </motion.div>
//                   ))}
//                 </AnimatePresence>
//               </div>

//               <div className="pointer-events-none absolute inset-0">
//                 <AnimatePresence>
//                   {payoutFlies.map((f) => (
//                     <motion.div
//                       key={`p-${f.id}`}
//                       initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                       animate={{
//                         x: balCenter.x,
//                         y: balCenter.y,
//                         opacity: 1,
//                         scale: 1,
//                         rotate: 360,
//                       }}
//                       exit={{ opacity: 0, scale: 0.7 }}
//                       transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                       className="absolute w-10 h-10"
//                     >
//                       <Coin />
//                     </motion.div>
//                   ))}

//                   {bankFlies.map((f) => (
//                     <motion.div
//                       key={`b-${f.id}`}
//                       initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                       animate={{
//                         x: bankCenter.x,
//                         y: bankCenter.y,
//                         opacity: 1,
//                         scale: 1,
//                         rotate: 360,
//                       }}
//                       exit={{ opacity: 0, scale: 0.7 }}
//                       transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                       className="absolute w-10 h-10"
//                     >
//                       <Coin />
//                     </motion.div>
//                   ))}
//                 </AnimatePresence>
//               </div>

//               {/* MODALS */}
//               <LeaderboardModal
//                 open={showLeaderboard}
//                 onClose={() => {
//                   setShowLeaderboard(false);
//                   setIntermissionSec(undefined);
//                 }}
//                 onStartNow={() => setIntermissionSec(0)}
//                 intermissionSec={intermissionSec}
//                 ranking={ranking}
//                 user={user ?? undefined}
//               />
//               <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//               <Record open={showRecord} onClose={() => setShowRecord(false)} />

//               {/* Settings bottom sheet */}
//               <SettingsBottomSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} prefs={prefs} setPrefs={setPrefs} />

//               <RoundWinnersModal open={showRoundWinners} onClose={() => setShowRoundWinners(false)} entries={roundWinners} meId={user?.id} />
//             </div>

//             {/* gain flourish */}
//             <div className="pointer-events-none fixed inset-0">
//               <AnimatePresence>
//                 {gainCoins.map((id, i) => {
//                   const start = { x: BASE_W / 2, y: 520 }; // local design point
//                   const target = (balCenter.x || balCenter.y) ? balCenter : start;
//                   return (
//                     <motion.div
//                       key={id}
//                       initial={{ x: start.x, y: start.y, opacity: 0, scale: 0.85 }}
//                       animate={{ x: target.x, y: target.y, opacity: 1, scale: 1, rotate: 360 }}
//                       exit={{ opacity: 0, scale: 0.7 }}
//                       transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                       className="absolute w-10 h-10"
//                     >
//                       <Coin />
//                     </motion.div>
//                   );
//                 })}
//               </AnimatePresence>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//     </ResponsiveGameWrapper>
//     </div>
//   );
// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// /** ==================== UI bits ==================== **/
// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// /** utils */
// function fmt(n: number) {
//   if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
//   if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
// }
// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }




////////////////////////////

// import React, { useEffect, useRef, useState } from "react";
// import { motion, AnimatePresence, useAnimation } from "framer-motion";

// /* ========= CONFIG ========= */
// const BASE_W = 360;
// const BASE_H = 700;

// // Background image — put your file in /public and set this path:
// const BG_URL = "/fruitsbg-image.jpg";// e.g. copy your background to public/bg.jpg

// type FruitKey = "lemon" | "watermelon" | "apple";
// const FRUITS: FruitKey[] = ["lemon", "watermelon", "apple"];

// const EMOJI: Record<FruitKey, string> = { lemon: "🍋", watermelon: "🍉", apple: "🍎" };
// const COLORS: Record<FruitKey, string> = { lemon: "#facc15", watermelon: "#22c55e", apple: "#ef4444" };
// const MULT: Record<FruitKey, number> = { lemon: 3, watermelon: 3, apple: 3 };

// // Chips colors to match screenshot: 100=green, 500=blue, 1K=orange, 5K=pink
// const CHIPS = [100, 500, 1000, 5000] as const;
// const CHIP_COLORS: Record<(typeof CHIPS)[number], { base: string; border: string; inner: string }> = {
//   100: { base: "#35c97d", border: "#d5ffe9", inner: "#dfffee" },
//   500: { base: "#3fa7ff", border: "#d6edff", inner: "#e8f5ff" },
//   1000: { base: "#ff8a2b", border: "#ffe3c8", inner: "#fff2e7" },
//   5000: { base: "#ff4fb8", border: "#ffd2ef", inner: "#ffe8f7" },
// };

// /* ========= UTIL ========= */
// const uid = (() => { let i = 0; return () => `id_${Date.now().toString(36)}_${i++}`; })();

// function useScale(ref: React.RefObject<HTMLDivElement>) {
//   const [scale, setScale] = useState(1);
//   useEffect(() => {
//     const el = ref.current;
//     if (!el) return;
//     const ro = new ResizeObserver(() => {
//       const r = el.getBoundingClientRect();
//       const s = Math.min(r.width / BASE_W, r.height / BASE_H);
//       setScale(Math.max(0.1, Math.min(1, s)));
//     });
//     ro.observe(el);
//     return () => ro.disconnect();
//   }, [ref]);
//   return scale;
// }
// function centerOf(page: HTMLElement | null, el: HTMLElement | null) {
//   if (!page || !el) return { x: 0, y: 0 };
//   const pr = page.getBoundingClientRect();
//   const er = el.getBoundingClientRect();
//   const sx = (er.left - pr.left) + er.width / 2;
//   const sy = (er.top - pr.top) + er.height / 2;
//   return { x: sx, y: sy };
// }
// function fmt(n: number) {
//   if (n >= 1_000_000) return Math.round(n / 1_000_000) + "M";
//   if (n >= 1_000) return Math.round(n / 1_000) + "K";
//   return n.toString();
// }

// /* ========= MAIN ========= */
// export default function FruitLoopsGame() {
//   const frameRef = useRef<HTMLDivElement | null>(null);
//   const scale = useScale(frameRef);
//   const pageRef = useRef<HTMLDivElement | null>(null);

//   // simple state
//   const [balance, setBalance] = useState(63000);
//   const [selectedChip, setSelectedChip] = useState<(typeof CHIPS)[number]>(CHIPS[0]);
//   const [bets, setBets] = useState<Record<FruitKey, number>>({ lemon: 0, watermelon: 0, apple: 0 });
//   const [history, setHistory] = useState<FruitKey[]>([]);

//   // wheel
//   const wheelControls = useAnimation();
//   const [wheelRot, setWheelRot] = useState(0);
//   const [state, setState] = useState<"betting" | "revealing">("betting");
//   const [timeLeft, setTimeLeft] = useState(9);
//   const [winner, setWinner] = useState<FruitKey | null>(null);

//   // refs for animations
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const betCardRef: Record<FruitKey, React.RefObject<HTMLDivElement>> = {
//     lemon: useRef(null),
//     watermelon: useRef(null),
//     apple: useRef(null),
//   };
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});

//   // toast
//   const [toast, setToast] = useState<string | null>(null);
//   const tip = (msg: string, ms = 1200) => { setToast(msg); setTimeout(() => setToast(null), ms); };

//   // coin flies
//   const [flies, setFlies] = useState<Array<{ id: string, from: { x: number, y: number }, to: { x: number, y: number } }>>([]);
//   const addFly = (from: { x: number, y: number }, to: { x: number, y: number }) => {
//     const id = uid();
//     setFlies(f => [...f, { id, from, to }]);
//     setTimeout(() => setFlies(f => f.filter(x => x.id !== id)), 1000);
//   };
//   const onPlace = (k: FruitKey) => {
//     if (state !== "betting") return tip("Wait for next round");
//     if (selectedChip > balance) return tip("Not enough coins");
//     const from = chipRefs.current[selectedChip] ? centerOf(pageRef.current, chipRefs.current[selectedChip]) : { x: BASE_W / 2, y: BASE_H - 60 };
//     const to = centerOf(pageRef.current, betCardRef[k].current);
//     addFly(from, to);
//     setBets(s => ({ ...s, [k]: s[k] + selectedChip }));
//     setBalance(v => v - selectedChip);
//   };

//   // countdown
//   useEffect(() => {
//     if (state !== "betting") return;
//     setTimeLeft(9);
//     const t = setInterval(() => {
//       setTimeLeft(s => {
//         if (s <= 1) { clearInterval(t); setState("revealing"); }
//         return Math.max(0, s - 1);
//       });
//     }, 1000);
//     return () => clearInterval(t);
//   }, [state]);

//   // spin
//   useEffect(() => {
//     if (state !== "revealing") return;

//     const nextWinner = ((): FruitKey => {
//       const arr: Array<FruitKey> = [];
//       const max = Math.max(bets.lemon, bets.watermelon, bets.apple, 1);
//       FRUITS.forEach(k => {
//         const count = 1 + Math.round(5 * (bets[k] / max));
//         for (let i = 0; i < count; i++) arr.push(k);
//       });
//       return arr[Math.floor(Math.random() * arr.length)];
//     })();

//     const wheelSlices: FruitKey[] = ["apple", "lemon", "watermelon", "apple", "lemon", "watermelon"];
//     const sliceAngle = 360 / wheelSlices.length;
//     const targetIndex = wheelSlices.findIndex(f => f === nextWinner);

//     // pointer is at BOTTOM (triangle under center)
//     const pointerDeg = 270;
//     const ideal = pointerDeg - targetIndex * sliceAngle;

//     const k = Math.ceil((wheelRot - ideal + 720) / 360);
//     const settle = ideal + 360 * (k + 4) + Math.round(Math.random() * 10 - 5);

//     (async () => {
//       await wheelControls.start({
//         rotate: settle - 8, rotateX: 6, rotateY: -4,
//         transition: { duration: 0.25, ease: [0.22, 0.9, 0.18, 1] }
//       });
//       await wheelControls.start({
//         rotate: settle, rotateX: 3, rotateY: -2,
//         transition: { duration: 0.35, ease: [0.22, 0.9, 0.18, 1] }
//       });
//       setWheelRot(settle);
//       setWinner(nextWinner);
//       setTimeout(() => {
//         payout(nextWinner);
//         setHistory(h => [nextWinner, ...h].slice(0, 12));
//         setBets({ lemon: 0, watermelon: 0, apple: 0 });
//         wheelControls.start({ rotateX: 0, rotateY: 0, transition: { duration: 0.4 } });
//         setState("betting");
//       }, 300);
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [state]);

//   // payout
//   const [payoutFlies, setPayoutFlies] = useState<Array<{ id: string, from: { x: number, y: number }, to: { x: number, y: number } }>>([]);
//   function payout(w: FruitKey) {
//     const win = bets[w] * MULT[w];
//     if (win <= 0) return;
//     const from = centerOf(pageRef.current, betCardRef[w].current);
//     const to = centerOf(pageRef.current, balanceRef.current);
//     const ids = Array.from({ length: Math.min(10, Math.max(3, Math.floor(win / 1000))) }, () => uid());
//     const pack = ids.map((id) => ({
//       id,
//       from: { x: from.x + (Math.random() - 0.5) * 20, y: from.y + (Math.random() - 0.5) * 10 },
//       to: { x: to.x + (Math.random() - 0.5) * 8, y: to.y + (Math.random() - 0.5) * 8 }
//     }));
//     setPayoutFlies(p => [...p, ...pack]);
//     setTimeout(() => setPayoutFlies(p => p.filter(x => !ids.includes(x.id))), 1100);
//     setBalance(v => v + win);
//     tip(`You won +${fmt(win)}`);
//   }

//   const items: FruitKey[] = ["apple", "lemon", "watermelon", "apple", "lemon", "watermelon"];
//   const n = items.length;

//   return (
//     <div ref={frameRef} className="w-full h-full flex items-end justify-center overflow-hidden">
//       {/* small keyframes */}
//       <style>{`
//         @keyframes orbShine { 0%,100%{ transform: translateY(0); opacity:.55 } 50%{ transform: translateY(1px); opacity:.9 } }
//         .frost { backdrop-filter: blur(10px) saturate(1.15); }
//       `}</style>

//       <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: "bottom center" }}>
//         <div ref={pageRef} className="relative w-[360px] h-[700px] overflow-hidden">
//           {/* BACKGROUND IMAGE */}
//           <div className="absolute inset-0">
//             <img
//               src={BG_URL}
//               alt="bg"
//               className="w-full h-full object-cover scale-[1.05]"
//               style={{ filter: "saturate(1.08) brightness(1.05)" }}
//             />
//             {/* subtle vignette */}
//             <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.2) 0, rgba(255,255,255,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,.08) 100%)" }} />
//           </div>

//           {/* TOP RIBBON */}
//           <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
//             <div className="relative px-8 py-[10px] rounded-full text-white font-extrabold text-[16px] tracking-wide"
//               style={{
//                 background: "linear-gradient(180deg,#bf3af3,#9222ce)",
//                 border: "3px solid rgba(255,215,128,.9)",
//                 boxShadow: "0 8px 24px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.35)",
//                 textShadow: "0 2px 0 rgba(98,0,140,.6)"
//               }}
//             >
//               FRUIT LOOPS
//               {/* gold end caps */}
//               <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-0 h-0"
//                 style={{ borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderRight: "14px solid #f9c45c", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }} />
//               <span className="absolute -right-6 top-1/2 -translate-y-1/2 w-0 h-0"
//                 style={{ borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: "14px solid #f9c45c", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }} />
//             </div>
//           </div>

//           {/* SIDE BUTTONS (pink-gold) */}
//           <div className="absolute left-3 top-20 grid gap-3 z-10">
//             {["↩", "?", "🔊"].map((t, i) => (
//               <div key={i} className="grid place-items-center w-10 h-10 rounded-full text-lg"
//                 style={{
//                   background: "linear-gradient(180deg,#ffb2f4,#ff7bd9)",
//                   border: "3px solid #ffd6f6",
//                   boxShadow: "0 6px 14px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)"
//                 }}
//               >{t}</div>
//             ))}
//           </div>
//           <div className="absolute right-3 top-20 grid gap-3 z-10">
//             {["👤", "📊", "🧾"].map((t, i) => (
//               <div key={i} className="grid place-items-center w-10 h-10 rounded-full text-lg"
//                 style={{
//                   background: "linear-gradient(180deg,#ffb2f4,#ff7bd9)",
//                   border: "3px solid #ffd6f6",
//                   boxShadow: "0 6px 14px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)"
//                 }}
//               >{t}</div>
//             ))}
//           </div>

//           {/* WHEEL */}
//           <div className="absolute left-1/2 -translate-x-1/2 top-[90px]">
//             <div className="relative" style={{ width: 260, height: 260 }}>
//               {/* ring */}
//               <div className="absolute inset-0 rounded-full"
//                 style={{ background: "radial-gradient(circle at 50% 50%, #ffd45e 0 70%, #ffb02e 71% 100%)", boxShadow: "0 14px 42px rgba(0,0,0,.35)" }}
//               />
//               {/* disc with 6 slices (2 of each) purely visual; pointer at top */}
//               <motion.div
//                 className="absolute inset-3 rounded-full overflow-hidden"
//                 animate={wheelControls}
//                 style={{ background: "#3b82f6" }}
//               >
//                 {/* slices */}
//                 {["apple", "lemon", "watermelon", "apple", "lemon", "watermelon"].map((k, i, arr) => (
//                   <div
//                     key={i}
//                     className="absolute inset-0"
//                     style={{
//                       clipPath: "polygon(50% 50%, 0% 0%, 100% 0%)",
//                       transformOrigin: "50% 50%",
//                       transform: `rotate(${(360 / arr.length) * i}deg)`,
//                       background: i % 2 ? "#7aa7ff" : "#80b0ff"
//                     }}
//                   />
//                 ))}
//                 {/* fruit icons */}
//                 {["apple", "lemon", "watermelon", "apple", "lemon", "watermelon"].map((k, i, arr) => (
//                   <div key={`ico-${i}`} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
//                     style={{
//                       transform: `rotate(${(360 / arr.length) * i}deg) translateY(-80px) rotate(-${(360 / arr.length) * i}deg)`
//                     }}
//                   >
//                     <div className="text-3xl drop-shadow">{EMOJI[k as FruitKey]}</div>
//                   </div>
//                 ))}
//               </motion.div>

//               {/* pointer & timer */}
//               <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
//                 <div className="w-24 h-24 rounded-full grid place-items-center text-amber-900 font-black text-3xl"
//                   style={{ background: "radial-gradient(circle,#ffd45e,#ffb02e)", border: "4px solid #fff" }}
//                 >
//                   {state === "betting" ? timeLeft : " "}
//                 </div>
//                 {/* pointer triangle */}
//                 <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-0 h-0"
//                   style={{ borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "16px solid #ffb02e" }}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* RESULT STRIP (frosted capsules with emojis) */}
//           <div className="absolute left-1/2 -translate-x-1/2 top=[390px] top-[390px] w-[332px] z-10">
//             <div className="px-3 py-2 rounded-2xl frost"
//               style={{ background: "rgba(180,220,110,.22)", border: "1px solid rgba(255,255,255,.6)", boxShadow: "0 8px 20px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.5)" }}>
//               <div className="flex items-center gap-2 text-sm">
//                 <span className="text-white/90 drop-shadow">Result:</span>
//                 <div className="flex gap-2 overflow-hidden">
//                   {history.length ? history.map((f, idx) => (
//                     <div key={idx} className="px-2 h-7 rounded-full grid place-items-center"
//                       style={{ background: "linear-gradient(180deg,#fff,#f0f5ff)", border: "1px solid #ffffff", boxShadow: "0 4px 8px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.8)" }}>
//                       <span>{EMOJI[f]}</span>
//                     </div>
//                   )) : <span className="text-black/50 text-xs">—</span>}
//                 </div>
//                 <div className="ml-auto flex items-center gap-1 text-amber-900 bg-white/80 px-2 rounded-full border border-white">
//                   <span>📶</span><span className="text-[11px]">470ms</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* BET CARDS PANEL (emojis) */}
//           <div className="absolute left-1/2 -translate-x-1/2 top-[440px] w-[340px]">
//             <div className="rounded-3xl p-3 frost"
//               style={{ background: "rgba(140,220,255,.25)", border: "1px solid rgba(255,255,255,.7)", boxShadow: "0 10px 30px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)" }}>
//               <div className="grid grid-cols-3 gap-3">
//                 {FRUITS.map((k, idx) => {
//                   const cardGrad = [
//                     "linear-gradient(180deg,#ffe6a3,#ffc86a)", // yellow
//                     "linear-gradient(180deg,#b9f1c7,#61d38b)", // green
//                     "linear-gradient(180deg,#ffb2a6,#ff6a57)", // red
//                   ][idx];
//                   return (
//                     <div key={k} ref={betCardRef[k]} className="relative rounded-2xl border text-center pt-6 pb-3"
//                       style={{ background: cardGrad, borderColor: "#ffffff", boxShadow: "0 10px 18px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.8)" }}>
//                       <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full grid place-items-center"
//                         style={{ background: "#ffffff", border: "3px solid #ffffffaa", boxShadow: "0 6px 12px rgba(0,0,0,.25)" }}>
//                         <span className="text-xl">{EMOJI[k]}</span>
//                       </div>
//                       <div className="mt-2 text-xs text-black/60">Total</div>
//                       <div className="text-2xl font-extrabold" style={{ color: COLORS[k] }}>{fmt(bets[k])}</div>
//                       <div className="mt-1 text-base font-black text-amber-900">X{MULT[k]}</div>
//                       <div className="text-xs text-black/70">You: {fmt(bets[k])}</div>
//                       <button onClick={() => onPlace(k)} className="absolute inset-0 rounded-2xl" title={`Bet ${selectedChip} on ${k}`} />
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* BOTTOM BAR: balance + chips */}
//           <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[340px]">
//             <div className="flex items-center gap-3">
//               <div ref={balanceRef} className="flex  items-center gap-2 px-2 py-1 rounded-xl text-sm frost"
//                 style={{ background: "rgba(255,255,255,.7)", border: "1px solid #fff", boxShadow: "0 6px 16px rgba(0,0,0,.15)" }}>
//                 <div className="w-7 h-7 rounded-full grid place-items-center bg-white border">👤</div>
//                 <div>
//                   <div className="font-semibold text-purple-800">Samuel</div>
//                   <div className="text-pink-700 font-black">💰 {fmt(balance)}</div>
//                 </div>
//               </div>

//               <div className="flex-1 flex justify-end gap-2">
//                 {CHIPS.map(v => {
//                   const c = CHIP_COLORS[v];
//                   return (
//                     <button
//                       key={v}
//                       ref={el => { chipRefs.current[v] = el; return; }}
//                       onClick={() => setSelectedChip(v)}
//                       className={`w-12 h-12 rounded-full grid place-items-center font-black text-sm ${selectedChip === v ? "ring-4 ring-yellow-300" : ""}`}
//                       style={{
//                         background: `radial-gradient(circle at 50% 35%, #fff 0 24%, ${c.inner} 25% 60%, ${c.base} 61% 100%)`,
//                         border: `3px solid ${c.border}`,
//                         boxShadow: "0 8px 18px rgba(0,0,0,.25)"
//                       }}
//                       title={`${v}`}
//                     >
//                       <div className="w-9 h-9 rounded-full grid place-items-center bg-white border text-sky-900">
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* COIN FLIES (betting) */}
//           <div className="pointer-events-none absolute inset-0 z-50">
//             <AnimatePresence>
//               {flies.map(f => (
//                 <motion.div key={f.id}
//                   initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.9 }}
//                   animate={{ x: f.to.x, y: f.to.y, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 20 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* PAYOUT FLIES */}
//           <div className="pointer-events-none absolute inset-0 z-50">
//             <AnimatePresence>
//               {payoutFlies.map(f => (
//                 <motion.div key={f.id}
//                   initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.9 }}
//                   animate={{ x: f.to.x, y: f.to.y, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 20 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* TOAST */}
//           <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-16">
//             <AnimatePresence>
//               {toast && (
//                 <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
//                   className="px-3 py-1 rounded-full text-white text-[12px] font-semibold"
//                   style={{ background: "linear-gradient(180deg,#1d4ed8,#2563eb)", boxShadow: "0 10px 20px rgba(0,0,0,.25)" }}>
//                   {toast}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ========= Tiny Coin ========= */
// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }





// import React, { useEffect, useRef, useState } from "react";
// import { motion, AnimatePresence, useAnimation } from "framer-motion";

// /* ========= CONFIG ========= */
// const BASE_W = 360;
// const BASE_H = 700;

// // Background image — put your file in /public and set this path:
// const BG_URL = "/fruitsbg-image.jpg";// e.g. copy your background to public/bg.jpg

// type FruitKey = "lemon" | "watermelon" | "apple";
// const FRUITS: FruitKey[] = ["lemon", "watermelon", "apple"];

// const EMOJI: Record<FruitKey, string> = { lemon: "🍋", watermelon: "🍉", apple: "🍎" };
// const COLORS: Record<FruitKey, string> = { lemon: "#facc15", watermelon: "#22c55e", apple: "#ef4444" };
// const MULT: Record<FruitKey, number> = { lemon: 3, watermelon: 3, apple: 3 };

// // Chips colors to match screenshot: 100=green, 500=blue, 1K=orange, 5K=pink
// const CHIPS = [100, 500, 1000, 5000] as const;
// const CHIP_COLORS: Record<(typeof CHIPS)[number], { base: string; border: string; inner: string }> = {
//   100: { base: "#35c97d", border: "#d5ffe9", inner: "#dfffee" },
//   500: { base: "#3fa7ff", border: "#d6edff", inner: "#e8f5ff" },
//   1000: { base: "#ff8a2b", border: "#ffe3c8", inner: "#fff2e7" },
//   5000: { base: "#ff4fb8", border: "#ffd2ef", inner: "#ffe8f7" },
// };

// /* ========= UTIL ========= */
// const uid = (() => { let i = 0; return () => `id_${Date.now().toString(36)}_${i++}`; })();

// function useScale(ref: React.RefObject<HTMLDivElement>) {
//   const [scale, setScale] = useState(1);
//   useEffect(() => {
//     const el = ref.current;
//     if (!el) return;
//     const ro = new ResizeObserver(() => {
//       const r = el.getBoundingClientRect();
//       const s = Math.min(r.width / BASE_W, r.height / BASE_H);
//       setScale(Math.max(0.1, Math.min(1, s)));
//     });
//     ro.observe(el);
//     return () => ro.disconnect();
//   }, [ref]);
//   return scale;
// }
// function centerOf(page: HTMLElement | null, el: HTMLElement | null) {
//   if (!page || !el) return { x: 0, y: 0 };
//   const pr = page.getBoundingClientRect();
//   const er = el.getBoundingClientRect();
//   const sx = (er.left - pr.left) + er.width / 2;
//   const sy = (er.top - pr.top) + er.height / 2;
//   return { x: sx, y: sy };
// }
// function fmt(n: number) {
//   if (n >= 1_000_000) return Math.round(n / 1_000_000) + "M";
//   if (n >= 1_000) return Math.round(n / 1_000) + "K";
//   return n.toString();
// }

// /* ========= MAIN ========= */
// export default function FruitLoopsGame() {
//   const frameRef = useRef<HTMLDivElement | null>(null);
//   const scale = useScale(frameRef);
//   const pageRef = useRef<HTMLDivElement | null>(null);

//   // simple state
//   const [balance, setBalance] = useState(63000);
//   const [selectedChip, setSelectedChip] = useState<(typeof CHIPS)[number]>(CHIPS[0]);
//   const [bets, setBets] = useState<Record<FruitKey, number>>({ lemon: 0, watermelon: 0, apple: 0 });
//   const [history, setHistory] = useState<FruitKey[]>([]);

//   // wheel
//   const wheelControls = useAnimation();
//   const [wheelRot, setWheelRot] = useState(0);
//   const [state, setState] = useState<"betting" | "revealing">("betting");
//   const [timeLeft, setTimeLeft] = useState(9);
//   const [winner, setWinner] = useState<FruitKey | null>(null);

//   // refs for animations
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const betCardRef: Record<FruitKey, React.RefObject<HTMLDivElement>> = {
//     lemon: useRef(null),
//     watermelon: useRef(null),
//     apple: useRef(null),
//   };
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});

//   // toast
//   const [toast, setToast] = useState<string | null>(null);
//   const tip = (msg: string, ms = 1200) => { setToast(msg); setTimeout(() => setToast(null), ms); };

//   // coin flies
//   const [flies, setFlies] = useState<Array<{ id: string, from: { x: number, y: number }, to: { x: number, y: number } }>>([]);
//   const addFly = (from: { x: number, y: number }, to: { x: number, y: number }) => {
//     const id = uid();
//     setFlies(f => [...f, { id, from, to }]);
//     setTimeout(() => setFlies(f => f.filter(x => x.id !== id)), 1000);
//   };
//   const onPlace = (k: FruitKey) => {
//     if (state !== "betting") return tip("Wait for next round");
//     if (selectedChip > balance) return tip("Not enough coins");
//     const from = chipRefs.current[selectedChip] ? centerOf(pageRef.current, chipRefs.current[selectedChip]) : { x: BASE_W / 2, y: BASE_H - 60 };
//     const to = centerOf(pageRef.current, betCardRef[k].current);
//     addFly(from, to);
//     setBets(s => ({ ...s, [k]: s[k] + selectedChip }));
//     setBalance(v => v - selectedChip);
//   };

//   // countdown
//   useEffect(() => {
//     if (state !== "betting") return;
//     setTimeLeft(9);
//     const t = setInterval(() => {
//       setTimeLeft(s => {
//         if (s <= 1) { clearInterval(t); setState("revealing"); }
//         return Math.max(0, s - 1);
//       });
//     }, 1000);
//     return () => clearInterval(t);
//   }, [state]);

//   // spin
//   useEffect(() => {
//     if (state !== "revealing") return;

//     const nextWinner = ((): FruitKey => {
//       const arr: Array<FruitKey> = [];
//       const max = Math.max(bets.lemon, bets.watermelon, bets.apple, 1);
//       FRUITS.forEach(k => {
//         const count = 1 + Math.round(5 * (bets[k] / max));
//         for (let i = 0; i < count; i++) arr.push(k);
//       });
//       return arr[Math.floor(Math.random() * arr.length)];
//     })();

//     const wheelSlices: FruitKey[] = ["apple", "lemon", "watermelon", "apple", "lemon", "watermelon"];
//     const sliceAngle = 360 / wheelSlices.length;
//     const targetIndex = wheelSlices.findIndex(f => f === nextWinner);

//     // pointer is at BOTTOM (triangle under center)
//     const pointerDeg = 270;
//     const ideal = pointerDeg - targetIndex * sliceAngle;

//     const k = Math.ceil((wheelRot - ideal + 720) / 360);
//     const settle = ideal + 360 * (k + 4) + Math.round(Math.random() * 10 - 5);

//     (async () => {
//       await wheelControls.start({
//         rotate: settle - 8, rotateX: 6, rotateY: -4,
//         transition: { duration: 0.25, ease: [0.22, 0.9, 0.18, 1] }
//       });
//       await wheelControls.start({
//         rotate: settle, rotateX: 3, rotateY: -2,
//         transition: { duration: 0.35, ease: [0.22, 0.9, 0.18, 1] }
//       });
//       setWheelRot(settle);
//       setWinner(nextWinner);
//       setTimeout(() => {
//         payout(nextWinner);
//         setHistory(h => [nextWinner, ...h].slice(0, 12));
//         setBets({ lemon: 0, watermelon: 0, apple: 0 });
//         wheelControls.start({ rotateX: 0, rotateY: 0, transition: { duration: 0.4 } });
//         setState("betting");
//       }, 300);
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [state]);

//   // payout
//   const [payoutFlies, setPayoutFlies] = useState<Array<{ id: string, from: { x: number, y: number }, to: { x: number, y: number } }>>([]);
//   function payout(w: FruitKey) {
//     const win = bets[w] * MULT[w];
//     if (win <= 0) return;
//     const from = centerOf(pageRef.current, betCardRef[w].current);
//     const to = centerOf(pageRef.current, balanceRef.current);
//     const ids = Array.from({ length: Math.min(10, Math.max(3, Math.floor(win / 1000))) }, () => uid());
//     const pack = ids.map((id) => ({
//       id,
//       from: { x: from.x + (Math.random() - 0.5) * 20, y: from.y + (Math.random() - 0.5) * 10 },
//       to: { x: to.x + (Math.random() - 0.5) * 8, y: to.y + (Math.random() - 0.5) * 8 }
//     }));
//     setPayoutFlies(p => [...p, ...pack]);
//     setTimeout(() => setPayoutFlies(p => p.filter(x => !ids.includes(x.id))), 1100);
//     setBalance(v => v + win);
//     tip(`You won +${fmt(win)}`);
//   }

//   const items: FruitKey[] = ["apple", "lemon", "watermelon", "apple", "lemon", "watermelon"];
//   const n = items.length;

//   return (
//     <div ref={frameRef} className="w-full h-full flex items-end justify-center overflow-hidden">
//       {/* small keyframes */}
//       <style>{`
//         @keyframes orbShine { 0%,100%{ transform: translateY(0); opacity:.55 } 50%{ transform: translateY(1px); opacity:.9 } }
//         .frost { backdrop-filter: blur(10px) saturate(1.15); }
//       `}</style>

//       <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: "bottom center" }}>
//         <div ref={pageRef} className="relative w-[360px] h-[700px] overflow-hidden">
//           {/* BACKGROUND IMAGE */}
//           <div className="absolute inset-0">
//             <img
//               src={BG_URL}
//               alt="bg"
//               className="w-full h-full object-cover scale-[1.05]"
//               style={{ filter: "saturate(1.08) brightness(1.05)" }}
//             />
//             {/* subtle vignette */}
//             <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.2) 0, rgba(255,255,255,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,.08) 100%)" }} />
//           </div>

//           {/* TOP RIBBON */}
//           <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
//             <div className="relative px-8 py-[10px] rounded-full text-white font-extrabold text-[16px] tracking-wide"
//               style={{
//                 background: "linear-gradient(180deg,#bf3af3,#9222ce)",
//                 border: "3px solid rgba(255,215,128,.9)",
//                 boxShadow: "0 8px 24px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.35)",
//                 textShadow: "0 2px 0 rgba(98,0,140,.6)"
//               }}
//             >
//               FRUIT LOOPS
//               {/* gold end caps */}
//               <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-0 h-0"
//                 style={{ borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderRight: "14px solid #f9c45c", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }} />
//               <span className="absolute -right-6 top-1/2 -translate-y-1/2 w-0 h-0"
//                 style={{ borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: "14px solid #f9c45c", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }} />
//             </div>
//           </div>

//           {/* SIDE BUTTONS (pink-gold) */}
//           <div className="absolute left-3 top-20 grid gap-3 z-10">
//             {["↩", "?", "🔊"].map((t, i) => (
//               <div key={i} className="grid place-items-center w-10 h-10 rounded-full text-lg"
//                 style={{
//                   background: "linear-gradient(180deg,#ffb2f4,#ff7bd9)",
//                   border: "3px solid #ffd6f6",
//                   boxShadow: "0 6px 14px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)"
//                 }}
//               >{t}</div>
//             ))}
//           </div>
//           <div className="absolute right-3 top-20 grid gap-3 z-10">
//             {["👤", "📊", "🧾"].map((t, i) => (
//               <div key={i} className="grid place-items-center w-10 h-10 rounded-full text-lg"
//                 style={{
//                   background: "linear-gradient(180deg,#ffb2f4,#ff7bd9)",
//                   border: "3px solid #ffd6f6",
//                   boxShadow: "0 6px 14px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)"
//                 }}
//               >{t}</div>
//             ))}
//           </div>

//           {/* WHEEL */}
//           <div className="absolute left-1/2 -translate-x-1/2 top-[90px]">
//             <div className="relative w-56 h-56">
//               {/* Rim of the wheel */}
//               <div className="absolute inset-0 rounded-full"
//                 style={{
//                   background: "radial-gradient(circle at 30% 25%, #ffe487 0 35%, #ffc64a 55%, #e98a13 75%, #b45a00 100%)",
//                   boxShadow: "0 14px 42px rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,255,255,.35), inset 0 12px 20px rgba(255,255,255,.18)",
//                 }}
//               >
//                 {/* Studs around the wheel */}
//                 {Array.from({ length: 18 }).map((_, i) => (
//                   <div
//                     key={i}
//                     className="absolute rounded-full"
//                     style={{
//                       width: 5,
//                       height: 5,
//                       left: "50%",
//                       top: "50%",
//                       transform: `translate(-50%,-50%) rotate(${(360 / 18) * i}deg) translateY(-106px)`,
//                       background: "radial-gradient(circle at 30% 30%, #fff 0 25%, #f3b83b 26% 60%, #a85f08 61% 100%)",
//                     }}
//                   />
//                 ))}
//               </div>

//               {/* Disc with slices */}
//               <motion.div
//                 className="absolute inset-3 rounded-full overflow-hidden"
//                 animate={wheelControls}
//                 style={{
//                   background: "radial-gradient(140% 100% at 30% 20%, #8ac0ff 0 30%, #6ea6ff 55%, #4f86f7 100%)",
//                   boxShadow: "inset 0 3px 10px rgba(255,255,255,.6), inset 0 -8px 18px rgba(0,0,0,.35), inset 0 0 36px rgba(0,0,0,.22)",
//                 }}
//               >
//                 {/* Slices with repeating conic gradient to separate using borders */}
//                 <div
//                   className="absolute inset-0 rounded-full"
//                   style={{
//                     background: `repeating-conic-gradient(
//                     #ffffff 0deg 1deg,
//                     transparent 1deg ${360 / items.length}deg
//                   )`,
//                   }}
//                 />

//                 {/* Fruit Positions */}
//                 {items.map((fruit, i) => (
//                   <div
//                     key={i}
//                     className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
//                     style={{
//                       transform: `rotate(${((360 / items.length) * i) + 32}deg) translateY(-70px) rotate(-${(360 / items.length) * i}deg)`,
//                       filter: "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
//                     }}
//                   >
//                     <div
//                       className="text-3xl"
//                       style={{
//                         textShadow: "0 1px 0 rgba(255,255,255,.6)",
//                       }}
//                       aria-label={fruit}
//                     >
//                       {EMOJI[fruit]}
//                     </div>
//                   </div>
//                 ))}
//               </motion.div>


//               {/* Center Timer + Pointer */}
//               <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
//                 <div
//                   className="w-16 h-16 rounded-full grid place-items-center text-amber-900 font-black text-3xl relative"
//                   style={{
//                     background: "radial-gradient(circle at 35% 30%, #fff2c1 0 18%, #ffd45e 19% 52%, #ffb02e 53% 75%, #d8790a 100%)",
//                     border: "4px solid #fff",
//                     boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 2px 8px rgba(255,255,255,.6), inset 0 -8px 16px rgba(0,0,0,.25)",
//                   }}
//                 >
//                   {state === "betting" ? timeLeft : ""}
//                   {/* Timer overlay */}
//                   <div
//                     className="absolute top-2 left-3 right-3 h-1/3 rounded-[999px] pointer-events-none"
//                     style={{
//                       background: "linear-gradient(180deg, rgba(255,255,255,.8), rgba(255,255,255,.35) 40%, rgba(255,255,255,0))",
//                       mixBlendMode: "screen",
//                     }}
//                   />
//                 </div>
//                 {/* Pointer Triangle */}
//                 <div
//                   className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-0 h-0"
//                   style={{
//                     borderLeft: "12px solid transparent",
//                     borderRight: "12px solid transparent",
//                     borderTop: "16px solid #ffb02e",
//                     filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))",
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//           {/* RESULT STRIP (frosted capsules with emojis) */}
//           <div className="absolute left-1/2 -translate-x-1/2 top=[390px] top-[390px] w-[332px] z-10">
//             <div className="px-3 py-2 rounded-2xl frost"
//               style={{ background: "rgba(180,220,110,.22)", border: "1px solid rgba(255,255,255,.6)", boxShadow: "0 8px 20px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.5)" }}>
//               <div className="flex items-center gap-2 text-sm">
//                 <span className="text-white/90 drop-shadow">Result:</span>
//                 <div className="flex gap-2 overflow-hidden">
//                   {history.length ? history.map((f, idx) => (
//                     <div key={idx} className="px-2 h-7 rounded-full grid place-items-center"
//                       style={{ background: "linear-gradient(180deg,#fff,#f0f5ff)", border: "1px solid #ffffff", boxShadow: "0 4px 8px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.8)" }}>
//                       <span>{EMOJI[f]}</span>
//                     </div>
//                   )) : <span className="text-black/50 text-xs">—</span>}
//                 </div>
//                 <div className="ml-auto flex items-center gap-1 text-amber-900 bg-white/80 px-2 rounded-full border border-white">
//                   <span>📶</span><span className="text-[11px]">470ms</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* BET CARDS PANEL (emojis) */}
//           <div className="absolute left-1/2 -translate-x-1/2 top-[440px] w-[340px]">
//             <div className="rounded-3xl p-3 frost"
//               style={{ background: "rgba(140,220,255,.25)", border: "1px solid rgba(255,255,255,.7)", boxShadow: "0 10px 30px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)" }}>
//               <div className="grid grid-cols-3 gap-3">
//                 {FRUITS.map((k, idx) => {
//                   const cardGrad = [
//                     "linear-gradient(180deg,#ffe6a3,#ffc86a)", // yellow
//                     "linear-gradient(180deg,#b9f1c7,#61d38b)", // green
//                     "linear-gradient(180deg,#ffb2a6,#ff6a57)", // red
//                   ][idx];
//                   return (
//                     <div key={k} ref={betCardRef[k]} className="relative rounded-2xl border text-center pt-6 pb-3"
//                       style={{ background: cardGrad, borderColor: "#ffffff", boxShadow: "0 10px 18px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.8)" }}>
//                       <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full grid place-items-center"
//                         style={{ background: "#ffffff", border: "3px solid #ffffffaa", boxShadow: "0 6px 12px rgba(0,0,0,.25)" }}>
//                         <span className="text-xl">{EMOJI[k]}</span>
//                       </div>
//                       <div className="mt-2 text-xs text-black/60">Total</div>
//                       <div className="text-2xl font-extrabold" style={{ color: COLORS[k] }}>{fmt(bets[k])}</div>
//                       <div className="mt-1 text-base font-black text-amber-900">X{MULT[k]}</div>
//                       <div className="text-xs text-black/70">You: {fmt(bets[k])}</div>
//                       <button onClick={() => onPlace(k)} className="absolute inset-0 rounded-2xl" title={`Bet ${selectedChip} on ${k}`} />
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* BOTTOM BAR: balance + chips */}
//           <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[340px]">
//             <div className="flex items-center gap-3">
//               <div ref={balanceRef} className="flex  items-center gap-2 px-2 py-1 rounded-xl text-sm frost"
//                 style={{ background: "rgba(255,255,255,.7)", border: "1px solid #fff", boxShadow: "0 6px 16px rgba(0,0,0,.15)" }}>
//                 <div className="w-7 h-7 rounded-full grid place-items-center bg-white border">👤</div>
//                 <div>
//                   <div className="font-semibold text-purple-800">Samuel</div>
//                   <div className="text-pink-700 font-black">💰 {fmt(balance)}</div>
//                 </div>
//               </div>

//               <div className="flex-1 flex justify-end gap-2">
//                 {CHIPS.map(v => {
//                   const c = CHIP_COLORS[v];
//                   return (
//                     <button
//                       key={v}
//                       ref={el => { chipRefs.current[v] = el; return; }}
//                       onClick={() => setSelectedChip(v)}
//                       className={`w-12 h-12 rounded-full grid place-items-center font-black text-sm ${selectedChip === v ? "ring-4 ring-yellow-300" : ""}`}
//                       style={{
//                         background: `radial-gradient(circle at 50% 35%, #fff 0 24%, ${c.inner} 25% 60%, ${c.base} 61% 100%)`,
//                         border: `3px solid ${c.border}`,
//                         boxShadow: "0 8px 18px rgba(0,0,0,.25)"
//                       }}
//                       title={`${v}`}
//                     >
//                       <div className="w-9 h-9 rounded-full grid place-items-center bg-white border text-sky-900">
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* COIN FLIES (betting) */}
//           <div className="pointer-events-none absolute inset-0 z-50">
//             <AnimatePresence>
//               {flies.map(f => (
//                 <motion.div key={f.id}
//                   initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.9 }}
//                   animate={{ x: f.to.x, y: f.to.y, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 20 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* PAYOUT FLIES */}
//           <div className="pointer-events-none absolute inset-0 z-50">
//             <AnimatePresence>
//               {payoutFlies.map(f => (
//                 <motion.div key={f.id}
//                   initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.9 }}
//                   animate={{ x: f.to.x, y: f.to.y, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 20 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* TOAST */}
//           <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-16">
//             <AnimatePresence>
//               {toast && (
//                 <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
//                   className="px-3 py-1 rounded-full text-white text-[12px] font-semibold"
//                   style={{ background: "linear-gradient(180deg,#1d4ed8,#2563eb)", boxShadow: "0 10px 20px rgba(0,0,0,.25)" }}>
//                   {toast}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ========= Tiny Coin ========= */
// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

/////////////////


// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
// import { useGame } from "./useGame.socket";
// import { FOODS, type FoodsKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";
// import GameRules from "./GameRules";
// import Record from "./Record";
// import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
// import type { RoundWinnerEntry } from "./RoundWinnersModal";
// import RoundWinnersModal from "./RoundWinnersModal";
// import InitialLoader from "./InitialLoader";
// import LoginPage from "./LoginPage";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// // Preferences
// const PREFS_KEY = "soundPrefsWheelV1";

// // Visual language
// const EMOJI: Record<FoodsKey, string> = {
//   meat: "🥩",
//   tomato: "🍅",
//   corn: "🌽",
//   sausage: "🌭",
//   lettuce: "🥬",
//   carrot: "🥕",
//   skewer: "🍢",
//   ham: "🍗",
// };

// const LABEL: Record<FoodsKey, string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };

// const MULTIPLIER: Record<FoodsKey, number> = {
//   meat: 45,
//   tomato: 5,
//   corn: 5,
//   sausage: 10,
//   lettuce: 5,
//   carrot: 5,
//   skewer: 15,
//   ham: 25,
// };

// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90;
// const norm360 = (a: number) => ((a % 360) + 360) % 360;

// function indexUnderPointer(rotDeg: number, sliceAngle: number, count: number) {
//   const a = norm360(POINTER_DEG - rotDeg + 90);
//   const i = Math.floor((a + sliceAngle / 2) / sliceAngle) % count;
//   return i;
// }
// function rotationToCenterIndex(i: number, sliceAngle: number) {
//   return POINTER_DEG - i * sliceAngle + 90;
// }

// const formatNumber = (num: number) => {
//   if (num >= 1_000_000) {
//     return `${Math.round(num / 1_000_000)}M`;
//   } else if (num >= 1_000) {
//     return `${Math.round(num / 1_000)}K`;
//   } else {
//     return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
//   }
// };

// // Safe UUID that works on HTTP too
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

// /** ==================== APP ==================== **/
// export default function App() {
//   const game = useGame() as any;
//   const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance } = game;
//   const startNextRound: (() => Promise<void> | void) | undefined =
//     game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
//   const prefersReducedMotion = useReducedMotion();
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

//   // ======= SOFT TOAST (no external lib) =======
//   const [tip, setTip] = useState<string | null>(null);
//   const tipHideAtRef = useRef<number | null>(null);
//   function notify(msg: string, ms = 1500) {
//     setTip(msg);
//     const hideAt = Date.now() + ms;
//     tipHideAtRef.current = hideAt;
//     window.setTimeout(() => {
//       if (tipHideAtRef.current === hideAt) setTip(null);
//     }, ms);
//   }
//   const [userBets, setUserBets] = useState<Record<FoodsKey, number>>({
//     meat: 0,
//     tomato: 0,
//     corn: 0,
//     sausage: 0,
//     lettuce: 0,
//     carrot: 0,
//     skewer: 0,
//     ham: 0,
//   });

//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);
//   const wheelDegRef = useRef(0);

//   // ——— State
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const bettingOpen = round?.state === "betting";
//   const DEFAULT_PHASE_MS: Record<"betting" | "revealing" | "pause", number> = { betting: 30000, revealing: 6000, pause: 3000 };
//   const phaseTotal = round ? DEFAULT_PHASE_MS[round.state as keyof typeof DEFAULT_PHASE_MS] : 1000;
//   const progress = round ? Math.min(1, Math.max(0, 1 - round.timeLeftMs / phaseTotal)) : 0;
//   const [isLoaded, setIsLoaded] = useState(false);

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   const isRoundOver = progress === 0;

//   // ——— Wheel sizing
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const el = phoneRef.current;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize((prev) => (prev === D ? prev : D));
//     });
//     ro.observe(el);
//     return () => ro.unobserve(el);
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<Prefs>({
//     master: 1,
//     bet: 1,
//     reveal: 1,
//     win: 1,
//     bg: 1,
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   // load saved sound prefs once
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) {
//         const parsed = JSON.parse(raw) as Prefs;
//         setPrefs((p) => ({ ...p, ...parsed }));
//       }
//     } catch {}
//   }, []);

//   const applyVolumes = useCallback(() => {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   async function primeOne(a?: HTMLAudioElement | null) {
//     if (!a) return;
//     try {
//       a.muted = true;
//       await a.play();
//       a.pause();
//       a.currentTime = 0;
//       a.muted = false;
//     } catch {}
//   }
//   async function primeAllAudio() {
//     await Promise.all([
//       primeOne(betAudioRef.current),
//       primeOne(revealAudioRef.current),
//       primeOne(winAudioRef.current),
//       primeOne(bgAudioRef.current),
//     ]);
//     setAudioReady(true);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     bgAudioRef.current = new Audio(SND_BG_LOOP);
//     if (bgAudioRef.current) {
//       bgAudioRef.current.loop = true;
//       bgAudioRef.current.volume = prefs.master * prefs.bg;
//     }
//     applyVolumes();
//     return () => {
//       // cleanup on unmount
//       betAudioRef.current?.pause();
//       revealAudioRef.current?.pause();
//       winAudioRef.current?.pause();
//       bgAudioRef.current?.pause();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     function arm() {
//       primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => {}));
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     }
//     window.addEventListener("pointerdown", arm, { once: true });
//     window.addEventListener("keydown", arm, { once: true });
//     window.addEventListener("touchstart", arm, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     };
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch {}
//   }, [applyVolumes, prefs]);

//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   // balance flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => uid());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance, user, lastBalance]);

//   /** ===== geometry / targets ===== */
//   const getContainerRect = useCallback(() => {
//     return phoneRef.current?.getBoundingClientRect() || null;
//   }, []);
//   const getWheelCenter = useCallback(() => {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }, [getContainerRect]);

//   const slices: readonly FoodsKey[] = FOODS;
//   const sliceAngle = 360 / slices.length;

//   const hash01 = (str: string, s = 0) => {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   };

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter();
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, ringR]
//   );

//   const inButtonOffsetForBet = (betId: string) => {
//     const a = 2 * Math.PI * hash01(betId, 3);
//     const r = 8 + 18 * hash01(betId, 4);
//     return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   };

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       const o = inButtonOffsetForBet(betId);
//       return { x: c.x + o.dx, y: c.y + o.dy };
//     },
//     [sliceButtonCenter]
//   );

//   /** ===== history & leaderboard (per 10 rounds) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FoodsKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
//   const [blockCount, setBlockCount] = useState(0); // 0..10

//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//       ? (round as any).indexInBlock
//       : typeof (round as any)?.roundNumber === "number"
//       ? ((round as any).roundNumber % 10) + 1
//       : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? (blockCount % 10 || 10);

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = uid();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = uid();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   // // fetch static settings data (fix URL as needed)
//   // useEffect(() => {
//   //   const controller = new AbortController();
//   //   const API_BASE = "http://192.168.68.121:5000"; // ← adjust for your env
//   //   fetch(`${API_BASE}/api/v1/settings/retrieve`, { signal: controller.signal })
//   //     .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
//   //     .then((data) => {
//   //       if (data?.success) {
//   //         // console.log(data);
//   //       }
//   //     })
//   //     .catch(() => {})
//   //     .finally(() => {});
//   //   return () => controller.abort();
//   // }, [round]);

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue?.length || !round) return;
//     const evt = echoQueue[0];
//     const idx = (slices as FoodsKey[]).indexOf(evt.fruit);
//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current && audioReady) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => {});
//     }

//     if (evt.userId === user?.id) spawnLocalFly(to, evt.value);
//     else spawnRemoteFly(to, evt.value);

//     setStacked((prev) =>
//       prev.some((c) => c.id === evt.betId)
//         ? prev
//         : [...prev, { id: evt.betId, fruit: evt.fruit, value: evt.value, userId: evt.userId }]
//     );

//     shiftEcho();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [echoQueue, round?.roundId]);

//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.state, currentRoundId]);

//   /** ===== spin & settle ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);

//   const [wheelDeg, setWheelDeg] = useState(0);

//   // (A) EXTRA SAFETY: if state flips to revealing, hide transient coins immediately
//   useEffect(() => {
//     if (round?.state === "revealing") {
//       setFlies([]);
//       setRemoteFlies([]);
//     }
//   }, [round?.state]);

//   // (B) Main spin effect
//   useEffect(() => {
//     if (!round || round.state !== "revealing") return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     // Hide any in-flight bet coins immediately before the wheel animation starts
//     setFlies([]);
//     setRemoteFlies([]);

//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }

//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01(round.roundId ?? "seed", 99) * 360;
//     const total = current + base + jitter;

//     (async () => {
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       const idx = indexUnderPointer(total, 360 / FOODS.length, FOODS.length);
//       const ideal = rotationToCenterIndex(idx, 360 / FOODS.length);
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k;

//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       const winner = FOODS[idx] as FoodsKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//       handleWin(winner); // optional hook
//     })();
//   }, [round?.state, round?.roundId, controls, prefersReducedMotion, audioReady]);

//   function doRevealFlights(winner: FoodsKey) {
//     const cont = getContainerRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     /** ===== my winners -> balance ===== */
//     if (user && bal && cont) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => {});
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     /** ===== losers -> bank ===== */
//     if (bank && cont) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     /** ===== history + ranking + block counter ===== */
//     setWinnersHistory((prev) => [...prev, winner].slice(-10));

//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//     // 1) Aggregate bet & win per user for *this round*
//     const perUser: Record<string, { bet: number; win: number }> = {};
//     for (const c of stacked) {
//       // total bet: all coins the user placed this round (any fruit)
//       perUser[c.userId] ??= { bet: 0, win: 0 };
//       perUser[c.userId].bet += c.value;

//       // total win: only coins on the winning fruit times multiplier
//       if (c.fruit === winner) {
//         perUser[c.userId].win += c.value * MULTIPLIER[winner];
//       }
//     }
//     function pseudoName(uid: string) {
//       if (uid === user?.id) return user?.name || "You";
//       const tail = uid.slice(-4).toUpperCase();
//       return `Player ${tail}`;
//     }

//     // 2) Materialize entries and always include *you*, even if you didn’t bet
//     const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
//       userId: uid,
//       name: pseudoName(uid),
//       bet: perUser[uid].bet,
//       win: perUser[uid].win,
//     }));

//     if (!perUser[user?.id ?? ""] && user) {
//       entries.push({
//         userId: user.id,
//         name: user.name || "You",
//         bet: 0,
//         win: 0,
//       });
//     }

//     // 3) Sort by Win desc (then Bet desc as tiebreaker) and keep a reasonable list
//     entries.sort((a, b) => b.win - a.win || b.bet - a.bet);

//     // 4) Save & show
//     setRoundWinners(entries);
//     setShowRoundWinners(true);
//     // increment block count; show leaderboard exactly every 10 rounds
//     setBlockCount((prev) => {
//       const next = prev + 1;
//       if (next >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(INTERMISSION_SECS);
//       }
//       return next >= 10 ? 10 : next;
//     });
//   }

//   // ===== Betting click gating =====
//   const balance = user?.balance ?? 0;
//   const noCoins = balance <= 0;
//   const cannotAffordChip = balance < (selectedChip || 0);

//   const onSliceClick = useCallback(
//     async (key: FoodsKey) => {
//       const balance = user?.balance ?? 0;
//       const noCoins = balance <= 0;
//       const cannotAffordChip = balance < (selectedChip || 0);
//       const hardDisabled = round?.state !== "betting" || showLeaderboard;

//       // show message if no coins
//       if (noCoins) {
//         notify("You don't have coin");
//         return;
//       }

//       // show message if can't afford this chip
//       if (cannotAffordChip) {
//         notify("Not enough balance for this chip");
//         return;
//       }

//       // ignore clicks if hard-disabled (betting closed, leaderboard open, or round over)
//       if (hardDisabled || isRoundOver || !selectedChip) return;

//       // proceed with bet
//       setUserBets((prevBets) => ({
//         ...prevBets,
//         [key]: prevBets[key] + selectedChip,
//       }));

//       await placeBet(key, selectedChip);
//     },
//     [user?.balance, round?.state, showLeaderboard, isRoundOver, selectedChip, placeBet]
//   );

//   // 1a) Compute per-slice total bet *value* from your stacked coins
//   const totalsBySlice = useMemo(() => {
//     const m: Record<FoodsKey, number> = {
//       meat: 0,
//       tomato: 0,
//       corn: 0,
//       sausage: 0,
//       lettuce: 0,
//       carrot: 0,
//       skewer: 0,
//       ham: 0,
//     };
//     for (const c of stacked) m[c.fruit] += c.value; // sum the chip values
//     return m;
//   }, [stacked]);

//   // 1b) If your useGame() exposes server totals, prefer those:
//   const totalsFromServer = (game as any)?.totals as Record<FoodsKey, number> | undefined;
//   const totalsForHot = totalsFromServer ?? totalsBySlice;

//   // 1c) Pick the fruit with the highest total (break ties by first seen)
//   const hotKey = useMemo<FoodsKey | null>(() => {
//     let best: FoodsKey | null = null;
//     let bestVal = 0;
//     for (const k of FOODS) {
//       const v = totalsForHot[k] ?? 0;
//       if (v > bestVal) {
//         bestVal = v;
//         best = k;
//       }
//     }
//     return bestVal > 0 ? best : null; // only mark HOT if there’s at least some bet
//   }, [totalsForHot]);

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ======== INTERMISSION COUNTDOWN ======== **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;

//     const t = setInterval(() => {
//       setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   // when countdown finishes, auto-close & auto-start next round; also reset the block
//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       // close modal
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);

//       // reset block tallies for the next 10-round block
//       setBlockCount(0);
//       setWinsByPlayer({});
//       setWinnersHistory([]);

//       // tell the game to start the next round if it exposes a method
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => {});
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);

//   useEffect(() => {
//     // Reset the user bets when the round is revealing
//     if (round?.state === "revealing") {
//       setUserBets({
//         meat: 0,
//         tomato: 0,
//         corn: 0,
//         sausage: 0,
//         lettuce: 0,
//         carrot: 0,
//         skewer: 0,
//         ham: 0,
//       });
//     }
//   }, [round?.state]);

//   function handleWin(winner: FoodsKey) {
//     const winAmount = userBets[winner] * MULTIPLIER[winner];
//     if (winAmount > 0) {
//       // Prefer server-side credit if you have it:
//       creditWin?.(winAmount).catch(() => {
//         // fallback optimistic:
//         updateBalance?.(winAmount);
//       });
//     }
//   }

//   // ===== Initial game loader (fixed-time) =====
//   const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0); // 0..1
//   const [loggedIn, setLoggedIn] = useState(false);

//   const [token, setToken] = useState<string | null>(null);

//   useEffect(() => {
//     const t = localStorage.getItem("auth_token");
//     setToken(t);
//     setLoggedIn(!!t);
//   }, []);

//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();

//     const tick = (now: number) => {
//       const elapsed = now - start;
//       const p = Math.min(1, elapsed / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) {
//         raf = requestAnimationFrame(tick);
//       } else {
//         // small grace so the bar reaches 100% visually
//         setTimeout(() => setBootLoading(false), 150);
//       }
//     };

//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);

//   function handleLoginSuccess() {
//     // your LoginPage should save token to localStorage
//     const t = localStorage.getItem("auth_token");
//     setToken(t);
//     setLoggedIn(!!t);
//   }


// console.log("roundddddddd",round)
//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* initial loader */}
//       <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//       {/* login page */}
//       {!loggedIn && 
//         <LoginPage onLogin={handleLoginSuccess}/>
//       }
//       {/* Game UI */}
//       <div>
//         <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//         {/* Phone frame */}
//         <div
//           ref={phoneRef}
//           className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//           style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//         >
//           <div className="absolute top-2 left-2 right-2 z-30">
//             <div className="grid grid-cols-2 gap-2">
//               {/* Left Side: Exit + Record */}
//               <div className="flex items-center space-x-2">
//                 <button
//                   aria-label="Exit"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => {
//                     /* exit logic */
//                   }}
//                 >
//                   <X size={18} />
//                 </button>

//                 <button
//                   aria-label="Record"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowRecord(true)}
//                 >
//                   <ScrollText size={18} />
//                 </button>
//               </div>

//               {/* Right Side: Sound + Help */}
//               <div className="flex items-center space-x-2 justify-end">
//                 <button
//                   aria-label="Sound Settings"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setSettingsOpen(true)}
//                 >
//                   <Volume2 size={18} />
//                 </button>

//                 <button
//                   aria-label="Help"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowGameRules(true)}
//                 >
//                   <MessageCircleQuestionMark size={18} />
//                 </button>
//               </div>

//               {/* Left Side: Block + Round Info */}
//               <div className="text-white text-xs opacity-80 leading-tight">
//                 {/*         <div>Today's Round: {roundNum}</div> */}
//                 <div className="font-bold">Round: {displayBlockRound}</div>
//               </div>

//               {/* Right Side: Ping + Leaderboard */}
//               <div className="flex justify-end items-center gap-2">
//                 <div className="flex items-center space-x-1 text-green-500 text-xs">
//                   <Wifi size={14} className="animate-pulse" />
//                   <span>45ms</span>
//                 </div>

//                 <button
//                   ref={bankRef}
//                   aria-label="Leaderboard"
//                   className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
//                   onClick={() => setShowLeaderboard(true)}
//                 >
//                   🏆
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* INLINE TOAST / TIP (no external lib) */}
//           <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
//             <AnimatePresence>
//               {tip && (
//                 <motion.div
//                   key="tip"
//                   initial={{ y: -16, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1 }}
//                   exit={{ y: -16, opacity: 0 }}
//                   transition={{ type: "spring", stiffness: 320, damping: 24 }}
//                   className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
//                   style={{
//                     background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                     border: "1px solid rgba(255,255,255,.25)",
//                     boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
//                   }}
//                 >
//                   {tip}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* WHEEL AREA */}
//           <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//             {/* pointer */}
//             <div className="absolute left-1/2 -translate-x-1/2 z-30">
//               <div
//                 className="w-7 h-10 rounded-[12px] relative"
//                 style={{
//                   background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                   boxShadow:
//                     "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//                 }}
//               >
//                 <div
//                   className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
//                   style={{
//                     width: 0,
//                     height: 0,
//                     borderLeft: "12px solid transparent",
//                     borderRight: "12px solid transparent",
//                     borderTop: "16px solid #f59e0b",
//                     filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                   }}
//                 />
//                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                   <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
//                 </div>
//               </div>
//             </div>

//             {/* wheel disc */}
//             <motion.div
//               ref={wheelRef}
//               className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//               animate={controls}
//               onUpdate={(latest) => {
//                 if (typeof (latest as any).rotate === "number") {
//                   const rot = (latest as any).rotate as number;
//                   setWheelDeg(rot);
//                   wheelDegRef.current = rot;
//                 }
//               }}
//               style={{
//                 top: wheelTop,
//                 width: D,
//                 height: D,
//                 borderRadius: 9999,
//                 background:
//                   "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//                 boxShadow:
//                   "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//                 transformStyle: "preserve-3d",
//                 ["--wheel-rot" as any]: `${wheelDeg}deg`,
//               }}
//             >
//               {/* rim highlight */}
//               <div
//                 className="absolute inset-0 rounded-full opacity-50"
//                 style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//               />

//               {/* spokes */}
//               {FOODS.map((_, i) => (
//                 <div
//                   key={`spoke-${i}`}
//                   className="absolute left-1/2 top-1/2 origin-left"
//                   style={{
//                     width: R,
//                     height: 5,
//                     background: "rgba(255,255,255,.05)",
//                     transform: `rotate(${i * (360 / FOODS.length)}deg)`,
//                   }}
//                 />
//               ))}

//               {/* per-slice buttons */}
//               {FOODS.map((key, i) => {
//                 const angDeg = i * (360 / FOODS.length);
//                 const rad = ((angDeg - 90) * Math.PI) / 180;
//                 const cx = R + ringR * Math.cos(rad);
//                 const cy = R + ringR * Math.sin(rad);

//                 const totalBet = userBets[key];
//                 const studRadius = 5;
//                 const studOffset = btn / 2 + 10;
//                 const tx = -Math.sin(rad);
//                 const ty = Math.cos(rad);
//                 const lx = cx - tx * studOffset;
//                 const ly = cy - ty * studOffset;

//                 const disabled = round?.state !== "betting" || showLeaderboard; // hardDisabled
//                 const isWinner = forcedWinner === key && round?.state !== "betting";

//                 // visual-only disable when noCoins / cannotAffordChip
//                 const visuallyDisabled = disabled || noCoins || cannotAffordChip;

//                 return (
//                   <div key={key}>
//                     {/* Stud */}
//                     <div
//                       className="absolute rounded-full pointer-events-none"
//                       style={{
//                         left: lx - studRadius,
//                         top: ly - studRadius,
//                         width: studRadius * 2,
//                         height: studRadius * 2,
//                         background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                         boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                       }}
//                     />

//                     {/* Slice button */}
//                     <motion.button
//                       whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
//                       whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
//                       onClick={() => {
//                         if (noCoins) {
//                           notify("You don't have coin");
//                           return;
//                         }
//                         if (cannotAffordChip) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         if (disabled || isRoundOver || !selectedChip) return;
//                         onSliceClick(key);
//                       }}
//                       className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
//                       style={{
//                         left: cx,
//                         top: cy,
//                         width: btn,
//                         height: btn,
//                         background:
//                           "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                         borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                         boxShadow: isWinner
//                           ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                           : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                       }}
//                       aria-label={`Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`}
//                       disabled={disabled} // true disable only for hard-closed states
//                       aria-disabled={visuallyDisabled}
//                       title={
//                         noCoins
//                           ? "You don't have coin"
//                           : cannotAffordChip
//                             ? "Not enough balance for this chip"
//                             : `Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`
//                       }
//                     >
//                       {/* Counter-rotated content */}
//                       <div
//                         className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
//                         style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
//                       >
//                         <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                           {EMOJI[key]}
//                         </div>

//                         <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                           win <span className="font-extrabold">x{MULTIPLIER[key]}</span>
//                         </div>

//                         {/* Hot badge */}
//                         {hotKey === key && (
//                           <div
//                             className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
//                             style={{
//                               boxShadow: "0 6px 14px rgba(0,0,0,.45)",
//                               border: "1px solid rgba(255,255,255,.25)",
//                             }}
//                             aria-label={`HOT: ${LABEL[key]} has the highest total bets`}
//                           >
//                             HOT
//                           </div>
//                         )}


//                         {/* Total bet text */}
//                         <div className="text-[10px] text-white">Total: {formatNumber(totalBet)}</div>
//                       </div>
//                     </motion.button>
//                   </div>
//                 );
//               })}
//             </motion.div>

//             {/* Center hub */}
//             <motion.div
//               className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//               style={{
//                 top: hubTop,
//                 width: hubSize,
//                 height: hubSize,
//                 background:
//                   "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//                 border: "1px solid rgba(255,255,255,.25)",
//               }}
//               animate={{
//                 boxShadow: [
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
//                 ]
//               }}
//               transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//             >
//               <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
//               <div className="text-center relative">
//                 <div className="text-[12px] font-semibold tracking-wide mt-9">
//                   {bettingOpen && !showLeaderboard
//                     ? "Place bets"
//                     : round?.state === "revealing"
//                       ? "Revealing…"
//                       : "Next Round"}
//                 </div>
//                 <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
//                   {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//                 </div>
//               </div>
//             </motion.div>
//           </div>

//           {/* Progress & platform */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 z-10"
//             style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//           >
//             <div className="relative w-full h-full">
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div className="absolute -left-8 -right-8 flex justify-between">
//                 {/* Pizza */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
//                     <span className="text-3xl pb-1">🍕</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 400k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
//                     4.37x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute left-3/12 mt-6 ml-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Pizza
//                     </div>
//                   </div>
//                 </div>
//                 {/* Salad */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
//                     <span className="text-3xl">🥗</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 100k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
//                     1.25x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute right-3/12 mt-6 mr-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Salad
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div
//                 className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
//                 style={{
//                   bottom: 0,
//                   width: D * 0.98,
//                   height: 52,
//                   background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                   border: "4px solid #1e40af",
//                   boxShadow: "0 5px 0 #1e3a8a",
//                 }}
//               >
//                 <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
//                   <div
//                     className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
//                     style={{
//                       background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                       border: "1px solid rgba(255,255,255,.25)",
//                       boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
//                     }}
//                   >
//                     Result
//                   </div>

//                   <div className="flex items-center gap-2">
//                     {(winnersHistory.length ? [...winnersHistory].slice(-9).reverse() : []).map((k, idx) => (
//                       <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
//                         <div
//                           className="w-8 h-8 rounded-xl grid place-items-center"
//                           style={{
//                             background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
//                             border: "1px solid #7fb4ff",
//                             boxShadow:
//                               "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
//                           }}
//                           title={LABEL[k]}
//                         >
//                           <span className="text-[16px] leading-none">{EMOJI[k]}</span>
//                         </div>
//                         {idx === 0 && (
//                           <div
//                             className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[7px] font-black"
//                             style={{
//                               background: "linear-gradient(180deg,#ffd84d,#ffb800)",
//                               border: "1px solid rgba(0,0,0,.2)",
//                               boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
//                               color: "#3a2a00",
//                               whiteSpace: "nowrap",
//                             }}
//                           >
//                             NEW
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                     {winnersHistory.length === 0 && (
//                       <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== CHIP BAR ===== */}
//           <div className="px-3 relative">
//             <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Mine 200k
//               </div>
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Total 100M
//               </div>
//             </div>

//             <div
//               className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//               style={{
//                 background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                 borderColor: "rgba(255,255,255,0.35)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//               }}
//             >
//               <div
//                 className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//                 style={{
//                   background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//                 }}
//               >
//                 Select Bet Amount
//               </div>

//               <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//                 {[
//                   { v: 1000, color: "#1fb141" },
//                   { v: 2000, color: "#3b82f6" },
//                   { v: 5000, color: "#fb923c" },
//                   { v: 10000, color: "#ef4444" },
//                   { v: 50000, color: "#c084fc" },
//                 ].map(({ v, color }) => {
//                   const selected = selectedChip === v;
//                   const balance = user?.balance ?? 0;
//                   const afford = balance >= v;

//                   return (
//                     <motion.button
//                       key={v}
//                       ref={(el) => {
//                         chipRefs.current[v] = el;
//                         return undefined;
//                       }}
//                       whileTap={{ scale: 0.95, rotate: -2 }}
//                       whileHover={{ y: -3 }}
//                       onClick={() => {
//                         if (!afford) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         setSelectedChip(v);
//                       }}
//                       className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
//                       style={{
//                         width: 48,
//                         height: 48,
//                         transformStyle: "preserve-3d",
//                         boxShadow: selected
//                           ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                           : "0 8px 16px rgba(0,0,0,.35)",
//                         border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                         background: `
//                       conic-gradient(
//                         #fff 0 15deg, ${color} 15deg 45deg,
//                         #fff 45deg 60deg, ${color} 60deg 90deg,
//                         #fff 90deg 105deg, ${color} 105deg 135deg,
//                         #fff 135deg 150deg, ${color} 150deg 180deg,
//                         #fff 180deg 195deg, ${color} 195deg 225deg,
//                         #fff 225deg 240deg, ${color} 240deg 270deg,
//                         #fff 270deg 285deg, ${color} 285deg 315deg,
//                         #fff 315deg 330deg, ${color} 330deg 360deg
//                       )
//                     `,
//                       }}
//                       title={`${v}`}
//                       aria-label={`Select chip ${v}`}
//                       aria-disabled={!afford}
//                     >
//                       <div
//                         className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                         style={{
//                           width: 34,
//                           height: 34,
//                           background: selected
//                             ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                             : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                           border: "2px solid rgba(0,0,0,.15)",
//                           color: selected ? "#0b3a8e" : "#1f2937",
//                           boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                         }}
//                       >
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>

//                       {selected && (
//                         <div
//                           className="absolute inset-[-4px] rounded-full pointer-events-none"
//                           style={{
//                             border: `2px solid ${color}88`,
//                             boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                           }}
//                         />
//                       )}
//                     </motion.button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* Stats strip */}
//           <div className="px-3 mt-3">



//             <div
//               className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
//               style={{
//                 background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                 borderColor: "#1e40af",
//                 boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//               }}
//             >

//               <div
//                 className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
//                 style={{
//                   background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                 }}
//               >
//                 Stats
//               </div>

//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Coins</div>
//                 <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt(user?.balance ?? 0)}
//                 </div>
//               </div>
//               {/* Avatar */}
//               <div
//                 className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
//                 style={{
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 2px 8px rgba(0,0,0,.25)",
//                   background:
//                     "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
//                 }}
//               >
//                 <span className="text-lg text-black/50">👤</span>
//               </div>
//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Rewards</div>
//                 <div className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* transient & payout flies */}
//           <div className="pointer-events-none absolute inset-0 z-30">
//             <AnimatePresence>
//               {flies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//               {remoteFlies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           <div className="pointer-events-none absolute inset-0">
//             <AnimatePresence>
//               {payoutFlies.map((f) => (
//                 <motion.div
//                   key={`p-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                     y:
//                       (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}

//               {bankFlies.map((f) => (
//                 <motion.div
//                   key={`b-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 5,
//                     y:
//                       (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 5,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* MODALS */}
//           <LeaderboardModal
//             open={showLeaderboard}
//             onClose={() => {
//               setShowLeaderboard(false);
//               setIntermissionSec(undefined);
//             }}
//             onStartNow={() => setIntermissionSec(0)}
//             intermissionSec={intermissionSec}
//             ranking={ranking}
//             user={user ?? undefined}
//           />
//           <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//           <Record open={showRecord} onClose={() => setShowRecord(false)} />

//           {/* Settings bottom sheet */}
//           <SettingsBottomSheet
//             open={settingsOpen}
//             onClose={() => setSettingsOpen(false)}
//             prefs={prefs}
//             setPrefs={setPrefs}
//           />

//           <RoundWinnersModal
//             open={showRoundWinners}
//             onClose={() => setShowRoundWinners(false)}
//             entries={roundWinners}
//             meId={user?.id}
//           />

//         </div>

//         {/* gain flourish */}
//         <div className="pointer-events-none fixed inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = phoneRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const sx = cont ? cont.left + cont.width / 2 : 0;
//               const sy = cont ? cont.top + 520 : 0;
//               const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//               const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                   animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );

// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// /** ==================== UI bits ==================== **/
// /* function IconBtn({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick?: () => void; ariaLabel?: string }) {
//   return (
//     <button
//       aria-label={ariaLabel}
//       onClick={onClick}
//       className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 shadow grid place-items-center text-[18px] hover:bg-white/20 active:scale-95 text-white"
//       style={{ boxShadow: "0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.2)" }}
//     >
//       {children}
//     </button>
//   );
// } */


// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// /** utils */
// function fmt(n: number) {
//   if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
//   if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
// }
// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }

// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
// import { useGame } from "./useGame.socket";
// import { FOODS, type FoodsKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";
// import GameRules from "./GameRules";
// import Record from "./Record";
// import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
// import type { RoundWinnerEntry } from "./RoundWinnersModal";
// import RoundWinnersModal from "./RoundWinnersModal";
// import InitialLoader from "./InitialLoader";
// import LoginPage from "./LoginPage";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// //const MAX_COINS_PER_SLICE = 60;
// const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";
// const PREFS_KEY = "soundPrefsWheelV1";


// const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
// const resolveEventKey = (e: any) =>
//   e?.key ?? e?.box ?? e?.fruit ?? e?.title ?? e?.name ?? "";


// // Visual language
// const EMOJI: Record<FoodsKey, string> = {
//   meat: "🥩",
//   tomato: "🍅",
//   corn: "🌽",
//   sausage: "🌭",
//   lettuce: "🥬",
//   carrot: "🥕",
//   skewer: "🍢",
//   ham: "🍗",
// };

// const LABEL: Record<FoodsKey, string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };

// const MULTIPLIER: Record<FoodsKey, number> = {
//   meat: 45,
//   tomato: 5,
//   corn: 5,
//   sausage: 10,
//   lettuce: 5,
//   carrot: 5,
//   skewer: 15,
//   ham: 25,
// };


// const CORE_ORDER = ["meat", "tomato", "corn", "sausage", "lettuce", "carrot", "skewer", "ham"] as const;
// const CORE_LABEL: Record<(typeof CORE_ORDER)[number], string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };


// type BoxKey = string;

// type LiveBox = {
//   key: BoxKey;          // unique id; using title for now
//   title: string;
//   icon?: string;        // emoji/icon if provided
//   multiplier: number;
//   total: number;        // totalAmount (boxStats) or totalBet (boxes)
//   bettors?: number;     // optional
// };
// type BoxStat = { box?: string; title?: string; icon?: string; multiplier?: number; totalAmount?: number; bettorsCount?: number };
// type BoxDef = { title?: string; icon?: string; multiplier?: number; totalBet?: number; userCount?: number };



// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90;
// //const norm360 = (a: number) => ((a % 360) + 360) % 360;

// // function indexUnderPointer(rotDeg: number, sliceAngle: number, count: number) {
// //   const a = norm360(POINTER_DEG - rotDeg + 90);
// //   const i = Math.floor((a + sliceAngle / 2) / sliceAngle) % count;
// //   return i;
// // }
// // function rotationToCenterIndex(i: number, sliceAngle: number) {
// //   return POINTER_DEG - i * sliceAngle + 90;
// // }

// const formatNumber = (num: number) => {
//   if (num >= 1_000_000) {
//     return `${Math.round(num / 1_000_000)}M`;
//   } else if (num >= 1_000) {
//     return `${Math.round(num / 1_000)}K`;
//   } else {
//     return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
//   }
// };



// // Safe UUID that works on HTTP too
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


// /** ==================== APP ==================== **/
// export default function  App () {
//   const game = useGame() as any;
//   const { user, round, time, placeBet, echoQueue, shiftEcho, creditWin, updateBalance, balance, getRoundWinners } = game;
//   const startNextRound: (() => Promise<void> | void) | undefined =
//     game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
//   const prefersReducedMotion = useReducedMotion();
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

//   // ======= SOFT TOAST (no external lib) =======
//   const [tip, setTip] = useState<string | null>(null);
//   const tipHideAtRef = useRef<number | null>(null);
//   function notify(msg: string, ms = 1500) {
//     setTip(msg);
//     const hideAt = Date.now() + ms;
//     tipHideAtRef.current = hideAt;
//     window.setTimeout(() => {
//       if (tipHideAtRef.current === hideAt) setTip(null);
//     }, ms);
//   }
//   const [userBets, setUserBets] = useState<Record<BoxKey, number>>({});
//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);
//   const wheelDegRef = useRef(0);

//   // ——— State
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const bettingOpen = round?.status === "OPEN";
//   const DEFAULT_PHASE_MS = { OPEN: 30000, CLOSED: 6000, SETTLED: 3000 } as const;
//   const phaseTotal = round ? (DEFAULT_PHASE_MS as any)[round.status] ?? 1000 : 1000;
//   const progress = round ? Math.min(1, Math.max(0, 1 - time / phaseTotal)) : 0;

//   console.log("roundddddddddddddddddd", round)
//   const [isLoaded, setIsLoaded] = useState(false);

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // Sidebar / Drawer
//   // const [drawerOpen, setDrawerOpen] = useState(false);
//   const isRoundOver = progress === 0;

//   // ——— Wheel sizing
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const el = phoneRef.current;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize((prev) => (prev === D ? prev : D));
//     });
//     ro.observe(el);
//     return () => ro.unobserve(el);
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   //const studsR = R * 0.92;
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<Prefs>({
//     master: 1,
//     bet: 1,
//     reveal: 1,
//     win: 1,
//     bg: 1,
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   const applyVolumes = useCallback(() => {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   async function primeOne(a?: HTMLAudioElement | null) {
//     if (!a) return;
//     try {
//       a.muted = true;
//       await a.play();
//       a.pause();
//       a.currentTime = 0;
//       a.muted = false;
//     } catch { }
//   }
//   async function primeAllAudio() {
//     await Promise.all([
//       primeOne(betAudioRef.current),
//       primeOne(revealAudioRef.current),
//       primeOne(winAudioRef.current),
//       primeOne(bgAudioRef.current),
//     ]);
//     setAudioReady(true);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     bgAudioRef.current = new Audio(SND_BG_LOOP);
//     if (bgAudioRef.current) {
//       bgAudioRef.current.loop = true;
//       bgAudioRef.current.volume = prefs.master * prefs.bg;
//     }
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     function arm() {
//       primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => { }));
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     }
//     window.addEventListener("pointerdown", arm, { once: true });
//     window.addEventListener("keydown", arm, { once: true });
//     window.addEventListener("touchstart", arm, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     };
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch { }
//   }, [applyVolumes, prefs]);

//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   function buildLiveBoxes(payload: { boxStats?: BoxStat[]; boxes?: BoxDef[] }): LiveBox[] {
//     const src = (payload.boxStats?.length ? payload.boxStats : payload.boxes) ?? [];

//     // Map raw → keyed record (last one wins, but we’ll only keep CORE)
//     const tmpMap = new Map<string, LiveBox>();

//     for (const it of src as any[]) {
//       // server can send "box" or "title"
//       const rawTitle = it.box ?? it.title ?? "";
//       const key = norm(rawTitle); // e.g. "Meat" → "meat"
//       if (!CORE_ORDER.includes(key as any)) continue; // drop pizza/salad/others

//       const title = CORE_LABEL[key as keyof typeof CORE_LABEL];
//       const multiplier = Number(it.multiplier ?? 0);
//       const total = Number((it.totalAmount ?? it.totalBet) ?? 0);
//       const bettors = Number((it.bettorsCount ?? it.userCount) ?? 0);

//       tmpMap.set(key, {
//         key,
//         title,
//         icon: it.icon,       // emoji if server provides
//         multiplier: isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
//         total: isFinite(total) && total >= 0 ? total : 0,
//         bettors: isFinite(bettors) && bettors >= 0 ? bettors : 0,
//       });
//     }

//     // Return in fixed order; if some are missing, still create placeholders (multiplier 1, totals 0)
//     return CORE_ORDER.map(k => {
//       const v = tmpMap.get(k);
//       return (
//         v ?? {
//           key: k,
//           title: CORE_LABEL[k],
//           icon: undefined,
//           multiplier: 1,
//           total: 0,
//           bettors: 0,
//         }
//       );
//     });
//   }

//   const liveBoxes = useMemo(
//     () => buildLiveBoxes(round ?? {}),
//     [round?.boxStats, round?.boxes]
//   );




//   const sliceCount = liveBoxes.length || 1;


//   // function indexUnderPointer(rotDeg: number) {
//   //   const a = (((POINTER_DEG - rotDeg + 90) % 360) + 360) % 360;
//   //   return Math.floor((a + sliceAngle / 2) / sliceAngle) % sliceCount;
//   // }
//   // function rotationToCenterIndex(i: number) {
//   //   return POINTER_DEG - i * sliceAngle + 90;
//   // }


//   // balance flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => uid());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance, user, lastBalance]);

//   /** ===== geometry / targets ===== */
//   const getContainerRect = useCallback(() => {
//     return phoneRef.current?.getBoundingClientRect() || null;
//   }, []);
//   const getWheelCenter = useCallback(() => {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }, [getContainerRect]);

//   const slices: readonly FoodsKey[] = FOODS;
//   const sliceAngle = 360 / slices.length;

//   const hash01 = (str: string, s = 0) => {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   };

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter();
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, ringR]
//   );
//   // const inButtonOffsetForBet = (betId: string) => {
//   //   const a = 2 * Math.PI * hash01(betId, 3);
//   //   const r = 8 + 18 * hash01(betId, 4);
//   //   return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   // };

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       const a = 2 * Math.PI * hash01(betId, 3);
//       const r = 8 + 18 * hash01(betId, 4);
//       return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
//     },
//     [sliceButtonCenter]
//   );

//   /** ===== history & leaderboard (per 10 rounds) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FoodsKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
//   const [blockCount, setBlockCount] = useState(0); // 0..10


//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//         ? (round as any).indexInBlock
//         : typeof (round as any)?.roundNumber === "number"
//           ? ((round as any).roundNumber % 10) + 1
//           : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? ((blockCount % 10) || 10);

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = uid();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = uid() //crypto.randomUUID();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;

//     const evt = echoQueue[0];

//     // Make sure this returns a core key like "meat" | "tomato" | ... | "ham"
//     const keyRaw = resolveEventKey(evt) as FoodsKey;

//     const idx = liveBoxes.findIndex(b => norm(b.key) === norm(keyRaw));
//     if (idx < 0) {
//       shiftEcho();
//       return;
//     }

//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current && audioReady) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => { });
//     }

//     if (evt.userId === user?.id) spawnLocalFly(to, evt.value);
//     else spawnRemoteFly(to, evt.value);

//     // ✅ push a StackedCoin with `fruit`, not `boxKey`
//     setStacked(prev =>
//       prev.some(c => c.id === evt.betId)
//         ? prev
//         : [
//           ...prev,
//           {
//             id: evt.betId,
//             fruit: keyRaw,        // <-- match StackedCoin type
//             value: evt.value,
//             userId: evt.userId,
//           },
//         ]
//     );

//     shiftEcho();
//     // depend on liveBoxes so idx tracks layout changes
//   }, [echoQueue, round?.roundId,
//     liveBoxes,
//     audioReady,
//     user?.id,
//     spawnLocalFly,
//     spawnRemoteFly,
//     shiftEcho,
//     targetForBet,
//   ]);



//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round?.status === "SETTLED") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.status, currentRoundId]);

//   /** ===== spin & settle ===== */
//   const controls = useAnimation();
//   //const lastSpinRoundRef = useRef<string | null>(null);

//   const [wheelDeg, setWheelDeg] = useState(0);

//   // (A) EXTRA SAFETY: if state flips to CLOSED, hide transient coins immediately
//   // useEffect(() => {
//   //   if (round?.status === "SETTLED") {
//   //     setFlies([]);
//   //     setRemoteFlies([]);
//   //   }
//   // }, [round?.status]);

//   useEffect(() => {
//     if (round?.status === "CLOSED") {
//       setFlies([]); setRemoteFlies([]);
//     }
//   }, [round?.status]);

//   // Clear per round when SETTLED (after reveal is done)
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) { /* clear arrays ... */ }
//     setCurrentRoundId(round.roundId);
//     if (round.status === "SETTLED") {
//       setStacked([]); setFlies([]); setRemoteFlies([]);
//       setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.status, currentRoundId]);

//   // (B) Main spin effect
//   // useEffect(() => {
//   //   if (!round || round?.status !== "SETTLED") return;
//   //   if (lastSpinRoundRef.current === round.roundId) return;
//   //   lastSpinRoundRef.current = round.roundId;

//   //   // Hide any in-flight bet coins immediately before the wheel animation starts
//   //   setFlies([]);
//   //   setRemoteFlies([]);

//   //   setForcedWinner(null);

//   //   if (revealAudioRef.current && audioReady) {
//   //     revealAudioRef.current.pause();
//   //     revealAudioRef.current.currentTime = 0;
//   //     revealAudioRef.current.play().catch(() => { });
//   //   }

//   //   const current = wheelDegRef.current || 0;
//   //   const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//   //   const jitter = hash01(round.roundId ?? "seed", 99) * 360;
//   //   const total = current + base + jitter;

//   //   (async () => {
//   //     await controls.start({
//   //       rotate: total,
//   //       transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//   //     });

//   //     const idx = indexUnderPointer(total, 360 / FOODS.length, FOODS.length);
//   //     const ideal = rotationToCenterIndex(idx, 360 / FOODS.length);
//   //     const k = Math.round((total - ideal) / 360);
//   //     const settleRot = ideal + 360 * k;

//   //     await controls.start({
//   //       rotate: settleRot,
//   //       transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//   //     });

//   //     const winner = FOODS[idx] as FoodsKey;
//   //     setForcedWinner(winner);
//   //     doRevealFlights(winner);
//   //     handleWin(winner); // optional hook
//   //   })();
//   // }, [round?.status, round, controls, prefersReducedMotion, audioReady]);


//   // Track previous status to detect OPEN -> CLOSED edge
//   const prevStatusRef = useRef<string | null>(null);

//   useEffect(() => {
//     const status = round?.status ?? null;
//     const prev = prevStatusRef.current;

//     // Fire exactly once per round when betting closes (reveal/spin phase begins)
//     const shouldSpin = prev !== "CLOSED" && status === "CLOSED";

//     if (!shouldSpin) {
//       prevStatusRef.current = status;
//       return;
//     }
//     prevStatusRef.current = status;

//     // Hide transient coins
//     setFlies([]);
//     setRemoteFlies([]);
//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => { });
//     }


//     function indexUnderPointerDynamic(rotDeg: number) {
//       const a = (((POINTER_DEG - rotDeg + 90) % 360) + 360) % 360;
//       return Math.floor((a + sliceAngle / 2) / sliceAngle) % sliceCount;
//     }
//     function rotationToCenterIndexDynamic(i: number) {
//       return POINTER_DEG - i * sliceAngle + 90;
//     }
//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01((round?.roundId ?? "seed") + Date.now().toString(), 99) * 360; // make sure we don't get same angle if id repeats
//     const total = current + base + jitter;

//     (async () => {
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       const idx = indexUnderPointerDynamic(total);
//       const ideal = rotationToCenterIndexDynamic(idx);
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k;

//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       const winner = FOODS[idx] as FoodsKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//       handleWin(winner);
//     })();
//   }, [round?.status, controls, prefersReducedMotion, audioReady, round?.roundId]);
//   //////

//   function doRevealFlights(winner: FoodsKey) {
//     const cont = getContainerRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     /** ===== my winners -> balance ===== */
//     if (user && bal && cont) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => { });
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     /** ===== losers -> bank ===== */
//     if (bank && cont) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     /** ===== history + ranking + block counter ===== */
//     setWinnersHistory((prev) => [...prev, winner].slice(-10));

//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//     // 1) Aggregate bet & win per user for *this round*
//     const perUser: Record<string, { bet: number; win: number }> = {};
//     for (const c of stacked) {
//       // total bet: all coins the user placed this round (any fruit)
//       perUser[c.userId] ??= { bet: 0, win: 0 };
//       perUser[c.userId].bet += c.value;

//       // total win: only coins on the winning fruit times multiplier
//       if (c.fruit === winner) {
//         perUser[c.userId].win += c.value * MULTIPLIER[winner];
//       }
//     }
//     function pseudoName(uid: string) {
//       if (uid === user?.id) return user?.name || "You";
//       const tail = uid.slice(-4).toUpperCase();
//       return `Player ${tail}`;
//     }

//     // 2) Materialize entries and always include *you*, even if you didn’t bet
//     const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
//       userId: uid,
//       name: pseudoName(uid),
//       bet: perUser[uid].bet,
//       win: perUser[uid].win,
//     }));

//     if (!perUser[user?.id ?? ""] && user) {
//       entries.push({
//         userId: user.id,
//         name: user.name || "You",
//         bet: 0,
//         win: 0,
//       });
//     }

//     // 3) Sort by Win desc (then Bet desc as tiebreaker) and keep a reasonable list
//     entries.sort((a, b) => (b.win - a.win) || (b.bet - a.bet));

//     // 4) Save & show
//     setRoundWinners(entries);
//     setShowRoundWinners(true);
//     // increment block count; show leaderboard exactly every 10 rounds
//     setBlockCount((prev) => {
//       console.log("prevvvvvvvvvvvvvvvvvvvvvvv",prev)
//       const next = prev + 1;
//       if (displayBlockRound >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(INTERMISSION_SECS);
//       }
//       return next >= 10 ? 10 : next;
//     });
//   }

//   // ===== Betting click gating (no external toaster) =====
//   //const balance = user?.balance ?? 0;
//   //const noCoins = balance <= 0;
//   //const cannotAffordChip = balance < (selectedChip || 0);

//   const onSliceClick = useCallback(
//     async (key: BoxKey) => {
//       console.log("keyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", key)
//       const balance = user?.balance ?? 0;
//       const noCoins = balance <= 0;
//       const cannotAffordChip = balance < (selectedChip || 0);
//       const hardDisabled = round?.status !== "OPEN" || showLeaderboard;

//       if (noCoins) return notify("You don't have coin");
//       if (cannotAffordChip) return notify("Not enough balance for this chip");
//       if (hardDisabled || isRoundOver || !selectedChip) return;

//       setUserBets(prev => ({ ...prev, [key]: (prev[key] ?? 0) + selectedChip }));
//       await placeBet(key, selectedChip);   // server expects the box name/key
//     },
//     [user?.balance, round?.status, showLeaderboard, isRoundOver, selectedChip, placeBet]
//   );


//   // 1a) Compute per-slice total bet *value* from your stacked coins
//   // const totalsBySlice = useMemo(() => {
//   //   const m: Record<FoodsKey, number> = {
//   //     meat: 0,
//   //     tomato: 0,
//   //     corn: 0,
//   //     sausage: 0,
//   //     lettuce: 0,
//   //     carrot: 0,
//   //     skewer: 0,
//   //     ham: 0,
//   //   };
//   //   for (const c of stacked) m[c.fruit] += c.value; // sum the chip values
//   //   return m;
//   // }, [stacked]);

//   // 1b) If your useGame() exposes server totals, prefer those:
//   // const totalsFromServer = (game as any)?.totals as Record<FoodsKey, number> | undefined;
//   const totalsForHot = useMemo(() => {
//     const m: Record<BoxKey, number> = {};
//     for (const bx of liveBoxes) m[bx.key] = bx.total ?? 0;
//     return m;
//   }, [liveBoxes]);

//   const hotKey = useMemo<BoxKey | null>(() => {
//     let best: BoxKey | null = null;
//     let bestVal = 0;
//     for (const bx of liveBoxes) {
//       const v = totalsForHot[bx.key] ?? 0;
//       if (v > bestVal) { bestVal = v; best = bx.key; }
//     }
//     return bestVal > 0 ? best : null;
//   }, [liveBoxes, totalsForHot]);


//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ======== INTERMISSION COUNTDOWN ======== **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;

//     const t = setInterval(() => {
//       setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   // when countdown finishes, auto-close & auto-start next round; also reset the block
//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       // close modal
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);

//       // reset block tallies for the next 10-round block
//       setBlockCount(0);
//       setWinsByPlayer({});
//       setWinnersHistory([]);

//       // tell the game to start the next round if it exposes a method
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => { });
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);


//   useEffect(() => {
//     // Reset the user bets when the round is over
//     if (round?.status === "CLOSED") {
//       // Reset all bets to 0
//       setUserBets({
//         meat: 0,
//         tomato: 0,
//         corn: 0,
//         sausage: 0,
//         lettuce: 0,
//         carrot: 0,
//         skewer: 0,
//         ham: 0,
//       });
//     }
//   }, [round?.status]);

//   function handleWin(winner: FoodsKey) {
//     const winAmount = userBets[winner] * MULTIPLIER[winner];
//     console.log(`You won ${winAmount} coins on ${LABEL[winner]}!`);
//     if (winAmount > 0) {
//       // Prefer server-side credit if you have it:
//       creditWin?.(winAmount).catch(() => {
//         // fallback optimistic:
//         updateBalance?.(winAmount);
//       });
//     }

//   }

//   // ===== Initial game loader (fixed-time) =====
//   const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0); // 0..1
//   const [loggedIn, setLoggedIn] = useState(false);

//   const [token, setToken] = useState<string | null>(null);

//   useEffect(() => {
//     setToken(localStorage.getItem("auth_token")); // set by your login
//     setLoggedIn(!!localStorage.getItem("auth_token"));
//   }, []);
// console.log(token)

//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();

//     const tick = (now: number) => {
//       const elapsed = now - start;
//       const p = Math.min(1, elapsed / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) {
//         raf = requestAnimationFrame(tick);
//       } else {
//         // small grace so the bar reaches 100% visually
//         setTimeout(() => setBootLoading(false), 150);
//       }
//     };

//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);


//   function handleLoginSuccess() {
//     // your LoginPage should save token to localStorage
//     setToken(localStorage.getItem("auth_token"));
//     setLoggedIn(true);
//   }

// useEffect(() => {
//   if (!showRoundWinners) return;

//   let alive = true;
//   (async () => {
//     try {
//       const data = await getRoundWinners();
//       console.log("rounddddddd winnerrrrrrrrrr", data) // no arg uses current round id
//       if (alive) setRoundWinners(data);
//     } catch (err) {
//       console.error(err);
//     }
//   })();

//   return () => { alive = false; };
// }, [showRoundWinners, getRoundWinners]);

//   //console.log("roundddddddd",round)
//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* initial loader */}
//       <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//       {/* login page */}
//       {!loggedIn &&
//         <LoginPage onLogin={handleLoginSuccess} />
//       }
//       {/* Game UI */}
//       <div>
//         <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//         {/* Phone frame */}
//         <div
//           ref={phoneRef}
//           className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//           style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//         >
//           <div className="absolute top-2 left-2 right-2 z-30">
//             <div className="grid grid-cols-2 gap-2">
//               {/* Left Side: Exit + Record */}
//               <div className="flex items-center space-x-2">
//                 <button
//                   aria-label="Exit"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => {
//                     /* exit logic */
//                   }}
//                 >
//                   <X size={18} />
//                 </button>

//                 <button
//                   aria-label="Record"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowRecord(true)}
//                 >
//                   <ScrollText size={18} />
//                 </button>
//               </div>

//               {/* Right Side: Sound + Help */}
//               <div className="flex items-center space-x-2 justify-end">
//                 <button
//                   aria-label="Sound Settings"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setSettingsOpen(true)}
//                 >
//                   <Volume2 size={18} />
//                 </button>

//                 <button
//                   aria-label="Help"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowGameRules(true)}
//                 >
//                   <MessageCircleQuestionMark size={18} />
//                 </button>
//               </div>

//               {/* Left Side: Block + Round Info */}
//               <div className="text-white text-xs opacity-80 leading-tight">
//                 {/*         <div>Today's Round: {roundNum}</div> */}
//                 <div className="font-bold">Round: {displayBlockRound}</div>
//               </div>

//               {/* Right Side: Ping + Leaderboard */}
//               <div className="flex justify-end items-center gap-2">
//                 <div className="flex items-center space-x-1 text-green-500 text-xs">
//                   <Wifi size={14} className="animate-pulse" />
//                   <span>45ms</span>
//                 </div>

//                 <button
//                   ref={bankRef}
//                   aria-label="Leaderboard"
//                   className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
//                   onClick={() => setShowLeaderboard(true)}
//                 >
//                   🏆
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* INLINE TOAST / TIP (no external lib) */}
//           <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
//             <AnimatePresence>
//               {tip && (
//                 <motion.div
//                   key="tip"
//                   initial={{ y: -16, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1 }}
//                   exit={{ y: -16, opacity: 0 }}
//                   transition={{ type: "spring", stiffness: 320, damping: 24 }}
//                   className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
//                   style={{
//                     background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                     border: "1px solid rgba(255,255,255,.25)",
//                     boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
//                   }}
//                 >
//                   {tip}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* WHEEL AREA */}
//           <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//             {/* pointer */}
//             <div className="absolute left-1/2 -translate-x-1/2 z-30">
//               <div
//                 className="w-7 h-10 rounded-[12px] relative"
//                 style={{
//                   background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                   boxShadow:
//                     "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//                 }}
//               >
//                 <div
//                   className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
//                   style={{
//                     width: 0,
//                     height: 0,
//                     borderLeft: "12px solid transparent",
//                     borderRight: "12px solid transparent",
//                     borderTop: "16px solid #f59e0b",
//                     filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                   }}
//                 />
//                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                   <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
//                 </div>
//               </div>
//             </div>

//             {/* wheel disc */}
//             <motion.div
//               ref={wheelRef}
//               className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//               animate={controls}
//               onUpdate={(latest) => {
//                 if (typeof (latest as any).rotate === "number") {
//                   const rot = (latest as any).rotate as number;
//                   setWheelDeg(rot);
//                   wheelDegRef.current = rot;
//                 }
//               }}
//               style={{
//                 top: wheelTop,
//                 width: D,
//                 height: D,
//                 borderRadius: 9999,
//                 background:
//                   "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//                 boxShadow:
//                   "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//                 transformStyle: "preserve-3d",
//                 ["--wheel-rot" as any]: `${wheelDeg}deg`,
//               }}
//             >
//               {/* rim highlight */}
//               <div
//                 className="absolute inset-0 rounded-full opacity-50"
//                 style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//               />

//               {/* spokes */}
//               {FOODS.map((_, i) => (
//                 <div
//                   key={`spoke-${i}`}
//                   className="absolute left-1/2 top-1/2 origin-left"
//                   style={{
//                     width: R,
//                     height: 5,
//                     background: "rgba(255,255,255,.05)",
//                     transform: `rotate(${i * (360 / FOODS.length)}deg)`,
//                   }}
//                 />
//               ))}

//               {/* per-slice buttons */}
//               {liveBoxes.map((bx, i) => {
//                 // geometry
//                 const angDeg = i * sliceAngle;
//                 const rad = ((angDeg - 90) * Math.PI) / 180;
//                 const cx = R + ringR * Math.cos(rad);
//                 const cy = R + ringR * Math.sin(rad);
//                 // const totalBet = userBets[bx.key] ?? 0;

//                 const disabled = round?.status !== "OPEN" || showLeaderboard;
//                 const isWinner = forcedWinner === bx.key && round?.status !== "OPEN";

//                 const studRadius = 5;
//                 const studOffset = btn / 2 + 10;
//                 const tx = -Math.sin(rad);
//                 const ty = Math.cos(rad);
//                 const lx = cx - tx * studOffset;
//                 const ly = cy - ty * studOffset;

//                 // for hover/tap gating
//                 const balanceNow = user?.balance ?? 0;
//                 const noCoins = balanceNow <= 0;
//                 const cannotAffordChip = balanceNow < (selectedChip || 0);
//                 const visuallyDisabled = disabled || noCoins || cannotAffordChip;

//                 return (
//                   <div key={bx.key}>
//                     {/* Stud */}
//                     <div
//                       className="absolute rounded-full pointer-events-none"
//                       style={{
//                         left: lx - studRadius,
//                         top: ly - studRadius,
//                         width: studRadius * 2,
//                         height: studRadius * 2,
//                         background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                         boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                       }}
//                     />

//                     {/* Slice button */}
//                     <motion.button
//                       whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
//                       whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
//                       onClick={() => {
//                         if (noCoins) return notify("You don't have coin");
//                         if (cannotAffordChip) return notify("Not enough balance for this chip");
//                         if (disabled || isRoundOver || !selectedChip) return;
//                         onSliceClick(bx.key);
//                       }}
//                       className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
//                       style={{
//                         left: cx,
//                         top: cy,
//                         width: btn,
//                         height: btn,
//                         background:
//                           "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                         borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                         boxShadow: isWinner
//                           ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                           : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                       }}
//                       aria-label={`Bet on ${bx.title} (pays x${bx.multiplier})`}
//                       disabled={disabled}
//                       aria-disabled={visuallyDisabled}
//                       title={`Bet on ${bx.title} (pays x${bx.multiplier})`}
//                     >
//                       {/* Counter-rotated content */}
//                       <div
//                         className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
//                         style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
//                       >
//                         <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                           {bx.icon ?? (Object.prototype.hasOwnProperty.call(EMOJI, bx.key) ? EMOJI[bx.key as FoodsKey] : "❓")}
//                         </div>

//                         <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                           win <span className="font-extrabold">x{bx.multiplier}</span>
//                         </div>

//                         {/* Hot badge */}
//                         {hotKey === bx.key && (
//                           <div
//                             className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
//                             style={{
//                               boxShadow: "0 6px 14px rgba(0,0,0,.45)",
//                               border: "1px solid rgba(255,255,255,.25)",
//                             }}
//                             aria-label={`HOT: ${bx.title} has the highest total bets`}
//                           >
//                             HOT
//                           </div>
//                         )}

//                         {/* Total bet text (your local bet amount or show server total if preferred) */}
//                         <div className="text-[10px] text-white">
//                           Total: {formatNumber(bx.total)}
//                         </div>
//                       </div>
//                     </motion.button>
//                   </div>
//                 );
//               })}

//             </motion.div>

//             {/* Center hub */}
//             <motion.div
//               className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//               style={{
//                 top: hubTop,
//                 width: hubSize,
//                 height: hubSize,
//                 background:
//                   "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//                 border: "1px solid rgba(255,255,255,.25)",
//               }}
//               animate={{
//                 boxShadow: [
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
//                 ]
//               }}
//               transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//             >
//               <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
//               <div className="text-center relative">
//                 <div className="text-[12px] font-semibold tracking-wide mt-9">
//                   {bettingOpen && !showLeaderboard ? "Place bets"
//                     : round?.status === "CLOSED" ? "Revealing…" : "Next Round"}
//                 </div>
//                 <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
//                   {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//                 </div>
//               </div>
//             </motion.div>
//           </div>

//           {/* Progress & platform */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 z-10"
//             style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//           >
//             <div className="relative w-full h-full">
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div className="absolute -left-8 -right-8 flex justify-between">
//                 {/* Pizza */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
//                     <span className="text-3xl pb-1">🍕</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 400k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
//                     4.37x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute left-3/12 mt-6 ml-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Pizza
//                     </div>
//                   </div>
//                 </div>
//                 {/* Salad */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
//                     <span className="text-3xl">🥗</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 100k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
//                     1.25x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute right-3/12 mt-6 mr-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Salad
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div
//                 className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
//                 style={{
//                   bottom: 0,
//                   width: D * 0.98,
//                   height: 52,
//                   background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                   border: "4px solid #1e40af",
//                   boxShadow: "0 5px 0 #1e3a8a",
//                 }}
//               >
//                 <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
//                   <div
//                     className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
//                     style={{
//                       background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                       border: "1px solid rgba(255,255,255,.25)",
//                       boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
//                     }}
//                   >
//                     Result
//                   </div>

//                   <div className="flex items-center gap-2">
//                     {(winnersHistory.length ? [...winnersHistory].slice(-9).reverse() : []).map((k, idx) => (
//                       <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
//                         <div
//                           className="w-8 h-8 rounded-xl grid place-items-center"
//                           style={{
//                             background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
//                             border: "1px solid #7fb4ff",
//                             boxShadow:
//                               "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
//                           }}
//                           title={LABEL[k]}
//                         >
//                           <span className="text-[16px] leading-none">{EMOJI[k]}</span>
//                         </div>
//                         {idx === 0 && (
//                           <div
//                             className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[7px] font-black"
//                             style={{
//                               background: "linear-gradient(180deg,#ffd84d,#ffb800)",
//                               border: "1px solid rgba(0,0,0,.2)",
//                               boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
//                               color: "#3a2a00",
//                               whiteSpace: "nowrap",
//                             }}
//                           >
//                             NEW
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                     {winnersHistory.length === 0 && (
//                       <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== CHIP BAR ===== */}
//           <div className="px-3 relative">
//             <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Mine 200k
//               </div>
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Total 100M
//               </div>
//             </div>

//             <div
//               className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//               style={{
//                 background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                 borderColor: "rgba(255,255,255,0.35)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//               }}
//             >
//               <div
//                 className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//                 style={{
//                   background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//                 }}
//               >
//                 Select Bet Amount
//               </div>

//               <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//                 {[
//                   { v: 1000, color: "#1fb141" },
//                   { v: 2000, color: "#3b82f6" },
//                   { v: 5000, color: "#fb923c" },
//                   { v: 10000, color: "#ef4444" },
//                   { v: 50000, color: "#c084fc" },
//                 ].map(({ v, color }) => {
//                   const selected = selectedChip === v;
//                   const balance = user?.balance ?? 0;
//                   const afford = balance >= v;

//                   return (
//                     <motion.button
//                       key={v}
//                       ref={(el) => {
//                         chipRefs.current[v] = el;
//                         return undefined;
//                       }}
//                       whileTap={{ scale: 0.95, rotate: -2 }}
//                       whileHover={{ y: -3 }}
//                       onClick={() => {
//                         if (!afford) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         setSelectedChip(v);
//                       }}
//                       className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
//                       style={{
//                         width: 48,
//                         height: 48,
//                         transformStyle: "preserve-3d",
//                         boxShadow: selected
//                           ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                           : "0 8px 16px rgba(0,0,0,.35)",
//                         border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                         background: `
//                       conic-gradient(
//                         #fff 0 15deg, ${color} 15deg 45deg,
//                         #fff 45deg 60deg, ${color} 60deg 90deg,
//                         #fff 90deg 105deg, ${color} 105deg 135deg,
//                         #fff 135deg 150deg, ${color} 150deg 180deg,
//                         #fff 180deg 195deg, ${color} 195deg 225deg,
//                         #fff 225deg 240deg, ${color} 240deg 270deg,
//                         #fff 270deg 285deg, ${color} 285deg 315deg,
//                         #fff 315deg 330deg, ${color} 330deg 360deg
//                       )
//                     `,
//                       }}
//                       title={`${v}`}
//                       aria-label={`Select chip ${v}`}
//                       aria-disabled={!afford}
//                     >
//                       <div
//                         className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                         style={{
//                           width: 34,
//                           height: 34,
//                           background: selected
//                             ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                             : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                           border: "2px solid rgba(0,0,0,.15)",
//                           color: selected ? "#0b3a8e" : "#1f2937",
//                           boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                         }}
//                       >
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>

//                       {selected && (
//                         <div
//                           className="absolute inset-[-4px] rounded-full pointer-events-none"
//                           style={{
//                             border: `2px solid ${color}88`,
//                             boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                           }}
//                         />
//                       )}
//                     </motion.button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* Stats strip */}
//           <div className="px-3 mt-3">



//             <div
//               className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
//               style={{
//                 background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                 borderColor: "#1e40af",
//                 boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//               }}
//             >

//               <div
//                 className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
//                 style={{
//                   background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                 }}
//               >
//                 Stats
//               </div>

//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Coins</div>
//                 <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt(balance ?? 0)}
//                 </div>
//               </div>
//               {/* Avatar */}
//               <div
//                 className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
//                 style={{
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 2px 8px rgba(0,0,0,.25)",
//                   background:
//                     "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
//                 }}
//               >
//                 <span className="text-lg text-black/50">👤</span>
//               </div>
//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Rewards</div>
//                 <div className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* transient & payout flies */}
//           <div className="pointer-events-none absolute inset-0 z-30">
//             <AnimatePresence>
//               {flies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//               {remoteFlies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           <div className="pointer-events-none absolute inset-0">
//             <AnimatePresence>
//               {payoutFlies.map((f) => (
//                 <motion.div
//                   key={`p-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                     y:
//                       (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}

//               {bankFlies.map((f) => (
//                 <motion.div
//                   key={`b-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 5,
//                     y:
//                       (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 5,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* MODALS */}
//           <LeaderboardModal
//             open={showLeaderboard}
//             onClose={() => {
//               setShowLeaderboard(false);
//               setIntermissionSec(undefined);
//             }}
//             onStartNow={() => setIntermissionSec(0)}
//             intermissionSec={intermissionSec}
//             ranking={ranking}
//             user={user ?? undefined}
//           />
//           <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//           <Record open={showRecord} onClose={() => setShowRecord(false)} />

//           {/* Settings bottom sheet */}
//           <SettingsBottomSheet
//             open={settingsOpen}
//             onClose={() => setSettingsOpen(false)}
//             prefs={prefs}
//             setPrefs={setPrefs}
//           />

//           <RoundWinnersModal
//             open={showRoundWinners}
//             onClose={() => setShowRoundWinners(false)}
//             entries={roundWinners}
//             meId={user?.id}
//           />

//         </div>

//         {/* gain flourish */}
//         <div className="pointer-events-none fixed inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = phoneRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const sx = cont ? cont.left + cont.width / 2 : 0;
//               const sy = cont ? cont.top + 520 : 0;
//               const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//               const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                   animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );

// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };



// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// /** utils */
// function fmt(n: number) {
//   if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
//   if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
// }
// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }
























////////////////////////////////////////////////



// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
// import { useGame } from "./useGame.socket";
// import { FOODS, type FoodsKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";
// import GameRules from "./GameRules";
// import Record from "./Record";
// import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
// import type { RoundWinnerEntry } from "./RoundWinnersModal";
// import RoundWinnersModal from "./RoundWinnersModal";
// import InitialLoader from "./InitialLoader";
// import LoginPage from "./LoginPage";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// //const MAX_COINS_PER_SLICE = 60;
// const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";
// const PREFS_KEY = "soundPrefsWheelV1";


// const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
// const resolveEventKey = (e: any) =>
//   e?.key ?? e?.box ?? e?.fruit ?? e?.title ?? e?.name ?? "";


// // Visual language
// const EMOJI: Record<FoodsKey, string> = {
//   meat: "🥩",
//   tomato: "🍅",
//   corn: "🌽",
//   sausage: "🌭",
//   lettuce: "🥬",
//   carrot: "🥕",
//   skewer: "🍢",
//   ham: "🍗",
// };

// const LABEL: Record<FoodsKey, string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };

// const MULTIPLIER: Record<FoodsKey, number> = {
//   meat: 45,
//   tomato: 5,
//   corn: 5,
//   sausage: 10,
//   lettuce: 5,
//   carrot: 5,
//   skewer: 15,
//   ham: 25,
// };


// const CORE_ORDER = ["meat", "tomato", "corn", "sausage", "lettuce", "carrot", "skewer", "ham"] as const;
// const CORE_LABEL: Record<(typeof CORE_ORDER)[number], string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };


// type BoxKey = string;

// type LiveBox = {
//   key: BoxKey;          // unique id; using title for now
//   title: string;
//   icon?: string;        // emoji/icon if provided
//   multiplier: number;
//   total: number;        // totalAmount (boxStats) or totalBet (boxes)
//   bettors?: number;     // optional
// };
// type BoxStat = { box?: string; title?: string; icon?: string; multiplier?: number; totalAmount?: number; bettorsCount?: number };
// type BoxDef = { title?: string; icon?: string; multiplier?: number; totalBet?: number; userCount?: number };



// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90;

// const formatNumber = (num: number) => {
//   if (num >= 1_000_000) {
//     return `${Math.round(num / 1_000_000)}M`;
//   } else if (num >= 1_000) {
//     return `${Math.round(num / 1_000)}K`;
//   } else {
//     return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
//   }
// };


// // Safe UUID that works on HTTP too
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




// /** ==================== APP ==================== **/
// export default function App() {
//   const game = useGame() as any;
//   const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance, balance, getRoundWinners } = game;
//   const startNextRound: (() => Promise<void> | void) | undefined =
//     game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
//   const prefersReducedMotion = useReducedMotion();
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

//   // ======= SOFT TOAST (no external lib) =======
//   const [tip, setTip] = useState<string | null>(null);
//   const tipHideAtRef = useRef<number | null>(null);
//   function notify(msg: string, ms = 1500) {
//     setTip(msg);
//     const hideAt = Date.now() + ms;
//     tipHideAtRef.current = hideAt;
//     window.setTimeout(() => {
//       if (tipHideAtRef.current === hideAt) setTip(null);
//     }, ms);
//   }

//   // parse helper
//   const parseTs = (v?: string | number) =>
//     typeof v === "number" ? v : v ? Date.parse(v) : 0;

//   // decide which timestamp ends the *current* phase
//   const phaseEndAt = useMemo(() => {
//     const s = round?.roundStatus;

//     if (s === "betting") return parseTs(round?.endTime);       // betting → endTime
//     if (s === "revealing") return parseTs(round?.revealTime);    // revealing → revealTime
//     if (s === "revealed" || s === "completed") {
//       // pause/intermission → prefer prepareTime, else fall back to startTime (or 0)
//       return parseTs(round?.prepareTime) || parseTs(round?.startTime);
//     }
//     return 0;
//   }, [
//     round?.roundStatus,
//     round?.endTime,
//     round?.revealTime,
//     round?.prepareTime,
//     round?.startTime,
//   ]);

//   // local UI countdown for the hub
//   const [uiLeftMs, setUiLeftMs] = useState(0);
//   useEffect(() => {
//     const tick = () => setUiLeftMs(Math.max(0, phaseEndAt - Date.now()));
//     tick(); // set immediately
//     if (!phaseEndAt) { setUiLeftMs(0); return; }
//     const id = setInterval(tick, 1000);
//     return () => clearInterval(id);
//   }, [phaseEndAt, round?.roundStatus]);


//   const [userBets, setUserBets] = useState<Record<BoxKey, number>>({});
//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);
//   const wheelDegRef = useRef(0);

//   // ——— State

//   // derive total length of the current phase from timestamps
//   const phaseTotalMs = useMemo(() => {
//     const s = round?.roundStatus;
//     const parse = (v?: string | number) =>
//       typeof v === "number" ? v : v ? Date.parse(v) : 0;

//     if (s === "betting") {
//       const start = parse(round?.startTime);
//       const end = parse(round?.endTime);
//       return Math.max(1000, end - start);
//     }
//     if (s === "revealing") {
//       const end = parse(round?.endTime);
//       const reveal = parse(round?.revealTime);
//       return Math.max(600, reveal - end);
//     }
//     return 1; // revealed/completed/preparing
//   }, [round?.roundStatus, round?.startTime, round?.endTime, round?.revealTime]);
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const bettingOpen = round?.roundStatus === "betting";
//   const DEFAULT_PHASE_MS = { OPEN: 30000, CLOSED: 6000, SETTLED: 3000 } as const;
//   const phaseTotal = round ? (DEFAULT_PHASE_MS as any)[round.roundStatus] ?? 1000 : 1000;
//   const progress = useMemo(() => {
//     const left = round?.timeLeftMs ?? 0;
//     if (!phaseTotalMs || phaseTotalMs <= 0) return 0;
//     return Math.min(1, Math.max(0, 1 - left / phaseTotalMs));
//   }, [round?.timeLeftMs, phaseTotalMs]);

//   console.log("winning boxxxxxxxxxxxxxxxxxxxxxx", phaseTotal,progress,)
//   const [isLoaded, setIsLoaded] = useState(false);

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // Sidebar / Drawer
//   // const [drawerOpen, setDrawerOpen] = useState(false);
//   // round-over is when the server has finished the reveal
//   const isRoundOver = round?.roundStatus === "revealed" || round?.roundStatus === "completed";

//   // ——— Wheel sizing
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const el = phoneRef.current;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize((prev) => (prev === D ? prev : D));
//     });
//     ro.observe(el);
//     return () => ro.unobserve(el);
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   //const studsR = R * 0.92;
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<Prefs>({
//     master: 1,
//     bet: 1,
//     reveal: 1,
//     win: 1,
//     bg: 1,
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   const applyVolumes = useCallback(() => {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   async function primeOne(a?: HTMLAudioElement | null) {
//     if (!a) return;
//     try {
//       a.muted = true;
//       await a.play();
//       a.pause();
//       a.currentTime = 0;
//       a.muted = false;
//     } catch { }
//   }
//   async function primeAllAudio() {
//     await Promise.all([
//       primeOne(betAudioRef.current),
//       primeOne(revealAudioRef.current),
//       primeOne(winAudioRef.current),
//       primeOne(bgAudioRef.current),
//     ]);
//     setAudioReady(true);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     bgAudioRef.current = new Audio(SND_BG_LOOP);
//     if (bgAudioRef.current) {
//       bgAudioRef.current.loop = true;
//       bgAudioRef.current.volume = prefs.master * prefs.bg;
//     }
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     function arm() {
//       primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => { }));
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     }
//     window.addEventListener("pointerdown", arm, { once: true });
//     window.addEventListener("keydown", arm, { once: true });
//     window.addEventListener("touchstart", arm, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     };
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch { }
//   }, [applyVolumes, prefs]);

//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   function buildLiveBoxes(payload: { boxStats?: BoxStat[]; boxes?: BoxDef[] }): LiveBox[] {
//     const src = (payload.boxStats?.length ? payload.boxStats : payload.boxes) ?? [];

//     // Map raw → keyed record (last one wins, but we’ll only keep CORE)
//     const tmpMap = new Map<string, LiveBox>();

//     for (const it of src as any[]) {
//       // server can send "box" or "title"
//       const rawTitle = it.box ?? it.title ?? "";
//       const key = norm(rawTitle); // e.g. "Meat" → "meat"
//       if (!CORE_ORDER.includes(key as any)) continue; // drop pizza/salad/others

//       const title = CORE_LABEL[key as keyof typeof CORE_LABEL];
//       const multiplier = Number(it.multiplier ?? 0);
//       const total = Number((it.totalAmount ?? it.totalBet) ?? 0);
//       const bettors = Number((it.bettorsCount ?? it.userCount) ?? 0);

//       tmpMap.set(key, {
//         key,
//         title,
//         icon: it.icon,       // emoji if server provides
//         multiplier: isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
//         total: isFinite(total) && total >= 0 ? total : 0,
//         bettors: isFinite(bettors) && bettors >= 0 ? bettors : 0,
//       });
//     }

//     // Return in fixed order; if some are missing, still create placeholders (multiplier 1, totals 0)
//     return CORE_ORDER.map(k => {
//       const v = tmpMap.get(k);
//       return (
//         v ?? {
//           key: k,
//           title: CORE_LABEL[k],
//           icon: undefined,
//           multiplier: 1,
//           total: 0,
//           bettors: 0,
//         }
//       );
//     });
//   }

//   const liveBoxes = useMemo(
//     () => buildLiveBoxes(round ?? {}),
//     [round?.boxStats, round?.boxes]
//   );

//   const sliceCount = liveBoxes.length || 1;

//   // balance flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => uid());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance, user, lastBalance]);

//   /** ===== geometry / targets ===== */
//   const getContainerRect = useCallback(() => {
//     return phoneRef.current?.getBoundingClientRect() || null;
//   }, []);
//   const getWheelCenter = useCallback(() => {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }, [getContainerRect]);

//   const slices: readonly FoodsKey[] = FOODS;
//   const sliceAngle = 360 / slices.length;

//   const hash01 = (str: string, s = 0) => {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   };

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter();
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, ringR]
//   );

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       const a = 2 * Math.PI * hash01(betId, 3);
//       const r = 8 + 18 * hash01(betId, 4);
//       return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
//     },
//     [sliceButtonCenter]
//   );

//   /** ===== history & leaderboard (per 10 rounds) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FoodsKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
//   const [blockCount, setBlockCount] = useState(0); // 0..10


//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//         ? (round as any).indexInBlock
//         : typeof (round as any)?.roundNumber === "number"
//           ? ((round as any).roundNumber % 10) + 1
//           : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? ((blockCount % 10) || 10);

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = uid();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = uid() //crypto.randomUUID();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */


//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round?.roundStatus === "revealed") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.roundStatus, currentRoundId]);

//   /** ===== spin & settle ===== */
//   const controls = useAnimation();
//   //const lastSpinRoundRef = useRef<string | null>(null);

//   const [wheelDeg, setWheelDeg] = useState(0);

//   // when betting closes, hide transient flies
//   useEffect(() => {
//     if (round?.roundStatus === "revealing") {
//       setFlies([]); setRemoteFlies([]);
//     }
//   }, [round?.roundStatus]);

//   // after the reveal is finished, hard reset per round
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) { /* (optional) */ }
//     setCurrentRoundId(round.roundId);
//     if (round.roundStatus === "revealed" || round.roundStatus === "completed") {
//       setStacked([]); setFlies([]); setRemoteFlies([]);
//       setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.roundStatus, currentRoundId]);


//   // Clear per round when SETTLED (after reveal is done)
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) { /* clear arrays ... */ }
//     setCurrentRoundId(round.roundId);
//     if (round.roundStatus === "revealed") {
//       setStacked([]); setFlies([]); setRemoteFlies([]);
//       setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.roundStatus, currentRoundId]);


//   // Track previous status to detect OPEN -> CLOSED edge
//   const prevStatusRef = useRef<string | null>(null);

//   useEffect(() => {
//     const status = round?.roundStatus ?? null;
//     const prev = prevStatusRef.current;

//     // Fire exactly once per round when betting closes (reveal/spin phase begins)
//     const shouldSpin = prev === "betting" && status === "revealing";

//     if (!shouldSpin) {
//       prevStatusRef.current = status;
//       return;
//     }
//     prevStatusRef.current = status;

//     // Hide transient coins
//     setFlies([]);
//     setRemoteFlies([]);
//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => { });
//     }


//     function indexUnderPointerDynamic(rotDeg: number) {
//       const a = (((POINTER_DEG - rotDeg + 90) % 360) + 360) % 360;
//       return Math.floor((a + sliceAngle / 2) / sliceAngle) % sliceCount;
//     }
//     function rotationToCenterIndexDynamic(i: number) {
//       return POINTER_DEG - i * sliceAngle + 90;
//     }
//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01((round?.roundId ?? "seed") + Date.now().toString(), 99) * 360; // make sure we don't get same angle if id repeats
//     const total = current + base + jitter;

//     (async () => {
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       const idx = indexUnderPointerDynamic(total);
//       const ideal = rotationToCenterIndexDynamic(idx);
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k;

//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       const winner = FOODS[idx] as FoodsKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//       handleWin(winner);
//     })();
//   }, [round?.roundStatus, controls, prefersReducedMotion, audioReady, round?.roundId]);
//   //////

//   function doRevealFlights(winner: FoodsKey) {
//     const cont = getContainerRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     /** ===== my winners -> balance ===== */
//     if (user && bal && cont) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => { });
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     /** ===== losers -> bank ===== */
//     if (bank && cont) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     /** ===== history + ranking + block counter ===== */
//     setWinnersHistory((prev) => [...prev, winner].slice(-10));

//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//     // 1) Aggregate bet & win per user for *this round*
//     const perUser: Record<string, { bet: number; win: number }> = {};
//     for (const c of stacked) {
//       // total bet: all coins the user placed this round (any fruit)
//       perUser[c.userId] ??= { bet: 0, win: 0 };
//       perUser[c.userId].bet += c.value;

//       // total win: only coins on the winning fruit times multiplier
//       if (c.fruit === winner) {
//         perUser[c.userId].win += c.value * MULTIPLIER[winner];
//       }
//     }
//     function pseudoName(uid: string) {
//       if (uid === user?.id) return user?.name || "You";
//       const tail = uid.slice(-4).toUpperCase();
//       return `Player ${tail}`;
//     }

//     // 2) Materialize entries and always include *you*, even if you didn’t bet
//     const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
//       userId: uid,
//       name: pseudoName(uid),
//       bet: perUser[uid].bet,
//       win: perUser[uid].win,
//     }));

//     if (!perUser[user?.id ?? ""] && user) {
//       entries.push({
//         userId: user.id,
//         name: user.name || "You",
//         bet: 0,
//         win: 0,
//       });
//     }

//     // 3) Sort by Win desc (then Bet desc as tiebreaker) and keep a reasonable list
//     entries.sort((a, b) => (b.win - a.win) || (b.bet - a.bet));

//     // 4) Save & show
//     setRoundWinners(entries);
//     setShowRoundWinners(true);
//     // increment block count; show leaderboard exactly every 10 rounds
//     setBlockCount((prev) => {
//       console.log("prevvvvvvvvvvvvvvvvvvvvvvv", prev)
//       const next = prev + 1;
//       if (displayBlockRound >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(INTERMISSION_SECS);
//       }
//       return next >= 10 ? 10 : next;
//     });
//   }


//   // track echo events we've already processed by betId
//   const pendingLocalBetRef = useRef<Array<{ key: BoxKey; value: number; until: number }>>([]);
//   function markPendingLocal(key: BoxKey, value: number, ms = 700) {
//     const now = Date.now();
//     pendingLocalBetRef.current.push({ key, value, until: now + ms });
//     // cleanup old
//     pendingLocalBetRef.current = pendingLocalBetRef.current.filter(x => x.until > now);
//   }
//   function shouldSuppressEcho(key: BoxKey, value: number) {
//     const now = Date.now();
//     const i = pendingLocalBetRef.current.findIndex(x => x.key === key && x.value === value && x.until > now);
//     if (i >= 0) {
//       pendingLocalBetRef.current.splice(i, 1); // consume
//       return true;
//     }
//     return false;
//   }


//   const onSliceClick = useCallback(
//     async (key: BoxKey) => {
//       console.log("fruittttttttttttttttttttttttttttttttttttt", key)
//       const bal = user?.balance ?? 0;
//       if (bal <= 0) return notify("You don't have coin");
//       if (bal < (selectedChip || 0)) return notify("Not enough balance for this chip");
//       if (round?.roundStatus !== "betting" || showLeaderboard || !selectedChip) return;

//       // 🔹 Instant local fly (no wait)
//       const idx = liveBoxes.findIndex(b => b.key === key);
//       if (idx >= 0) {
//         const to = targetForBet(idx, uid()); // use a temp id just for offset variance
//         spawnLocalFly(to, selectedChip);
//         markPendingLocal(key, selectedChip); // so echo won't duplicate
//       }

//       // optimistic local total
//       setUserBets(prev => ({ ...prev, [key]: (prev[key] ?? 0) + selectedChip }));

//       // fire the request (no need to block UI)
//       try {
//         await placeBet(key, selectedChip);
//       } catch (e) {
//         // optional: rollback optimistic userBets or show toast
//         notify("Bet failed");
//       }
//     },
//     [user?.balance, round?.roundStatus, showLeaderboard, isRoundOver, selectedChip, placeBet, liveBoxes, targetForBet, spawnLocalFly]
//   );


//   // add near other refs:
//   const seenEchoIdsRef = useRef<Set<string>>(new Set());
//   //Suppress duplicate fly on echo
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;

//     const evt = echoQueue[0];
//     // suppress exact duplicates by betId
//     if (evt.betId && seenEchoIdsRef.current.has(evt.betId)) {
//       shiftEcho();
//       return;
//     }
//     if (evt.betId) seenEchoIdsRef.current.add(evt.betId);
//     const keyRaw = resolveEventKey(evt) as BoxKey;

//     const idx = liveBoxes.findIndex(b => norm(b.key) === norm(keyRaw));
//     if (idx < 0) { shiftEcho(); return; }

//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current && audioReady) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => { });
//     }

//     // 🔹 Don’t double-spawn for your own just-clicked bet
//     const isMine = evt.userId === user?.id;
//     const suppress = isMine && shouldSuppressEcho(keyRaw, evt.value);

//     if (!suppress) {
//       if (isMine) spawnLocalFly(to, evt.value);
//       else spawnRemoteFly(to, evt.value);
//     }

//     // keep stacked with server betId (no change)
//     setStacked(prev =>
//       prev.some(c => c.id === evt.betId)
//         ? prev
//         : [...prev, { id: evt.betId, fruit: keyRaw as any, value: evt.value, userId: evt.userId }]
//     );

//     shiftEcho();
//   }, [
//     echoQueue, round?.roundId, liveBoxes, audioReady, user?.id,
//     spawnLocalFly, spawnRemoteFly, shiftEcho, targetForBet
//   ]);



//   const totalsForHot = useMemo(() => {
//     const m: Record<BoxKey, number> = {};
//     for (const bx of liveBoxes) m[bx.key] = bx.total ?? 0;
//     return m;
//   }, [liveBoxes]);

//   const hotKey = useMemo<BoxKey | null>(() => {
//     let best: BoxKey | null = null;
//     let bestVal = 0;
//     for (const bx of liveBoxes) {
//       const v = totalsForHot[bx.key] ?? 0;
//       if (v > bestVal) { bestVal = v; best = bx.key; }
//     }
//     return bestVal > 0 ? best : null;
//   }, [liveBoxes, totalsForHot]);


//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ======== INTERMISSION COUNTDOWN ======== **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;

//     const t = setInterval(() => {
//       setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   // when countdown finishes, auto-close & auto-start next round; also reset the block
//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       // close modal
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);

//       // reset block tallies for the next 10-round block
//       setBlockCount(0);
//       setWinsByPlayer({});
//       setWinnersHistory([]);

//       // tell the game to start the next round if it exposes a method
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => { });
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);


//   useEffect(() => {
//     // Reset the user bets when the round is over
//     if (round?.roundStatus === "revealed" || round?.roundStatus === "completed") {
//       // Reset all bets to 0
//       setUserBets({
//         meat: 0,
//         tomato: 0,
//         corn: 0,
//         sausage: 0,
//         lettuce: 0,
//         carrot: 0,
//         skewer: 0,
//         ham: 0,
//       });
//     }
//   }, [round?.roundStatus]);

//   function handleWin(winner: FoodsKey) {
//     const winAmount = userBets[winner] * MULTIPLIER[winner];
//     console.log(`You won ${winAmount} coins on ${LABEL[winner]}!`);
//     if (winAmount > 0) {
//       // Prefer server-side credit if you have it:
//       creditWin?.(winAmount).catch(() => {
//         // fallback optimistic:
//         updateBalance?.(winAmount);
//       });
//     }

//   }

//   // ===== Initial game loader (fixed-time) =====
//   const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0); // 0..1
//   const [loggedIn, setLoggedIn] = useState(false);

//   const [token, setToken] = useState<string | null>(null);
// console.log(token)
//   useEffect(() => {
//     setToken(localStorage.getItem("auth_token")); // set by your login
//     setLoggedIn(!!localStorage.getItem("auth_token"));
//   }, []);

//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();

//     const tick = (now: number) => {
//       const elapsed = now - start;
//       const p = Math.min(1, elapsed / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) {
//         raf = requestAnimationFrame(tick);
//       } else {
//         // small grace so the bar reaches 100% visually
//         setTimeout(() => setBootLoading(false), 150);
//       }
//     };

//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);


//   function handleLoginSuccess() {
//     // your LoginPage should save token to localStorage
//     setToken(localStorage.getItem("auth_token"));
//     setLoggedIn(true);
//   }

//   useEffect(() => {
//     if (!showRoundWinners) return;

//     let alive = true;
//     (async () => {
//       try {
//         const data = await getRoundWinners();
//         // console.log("rounddddddd winnerrrrrrrrrr", data) // no arg uses current round id
//         if (alive) setRoundWinners(data);
//       } catch (err) {
//         console.error(err);
//       }
//     })();

//     return () => { alive = false; };
//   }, [showRoundWinners, getRoundWinners]);



//   useEffect(() => {
//     const fetchWinners = async () => {
//       try {
//         const data = await getRoundWinners();
//         setRoundWinners(data);
//         console.log("dataaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", data);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchWinners();
//   }, [round, showRoundWinners]);


//   //console.log("roundddddddd",round)
//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* initial loader */}
//       <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//       {/* login page */}
//       {!loggedIn &&
//         <LoginPage onLogin={handleLoginSuccess} />
//       }
//       {/* Game UI */}
//       <div>
//         <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//         {/* Phone frame */}
//         <div
//           ref={phoneRef}
//           className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//           style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//         >
//           <div className="absolute top-2 left-2 right-2 z-30">
//             <div className="grid grid-cols-2 gap-2">
//               {/* Left Side: Exit + Record */}
//               <div className="flex items-center space-x-2">
//                 <button
//                   aria-label="Exit"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => {
//                     /* exit logic */
//                   }}
//                 >
//                   <X size={18} />
//                 </button>

//                 <button
//                   aria-label="Record"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowRecord(true)}
//                 >
//                   <ScrollText size={18} />
//                 </button>
//               </div>

//               {/* Right Side: Sound + Help */}
//               <div className="flex items-center space-x-2 justify-end">
//                 <button
//                   aria-label="Sound Settings"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setSettingsOpen(true)}
//                 >
//                   <Volume2 size={18} />
//                 </button>

//                 <button
//                   aria-label="Help"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowGameRules(true)}
//                 >
//                   <MessageCircleQuestionMark size={18} />
//                 </button>
//               </div>

//               {/* Left Side: Block + Round Info */}
//               <div className="text-white text-xs opacity-80 leading-tight">
//                 {/*         <div>Today's Round: {roundNum}</div> */}
//                 <div className="font-bold">Round: {displayBlockRound}</div>
//               </div>

//               {/* Right Side: Ping + Leaderboard */}
//               <div className="flex justify-end items-center gap-2">
//                 <div className="flex items-center space-x-1 text-green-500 text-xs">
//                   <Wifi size={14} className="animate-pulse" />
//                   <span>45ms</span>
//                 </div>

//                 <button
//                   ref={bankRef}
//                   aria-label="Leaderboard"
//                   className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
//                   onClick={() => setShowLeaderboard(true)}
//                 >
//                   🏆
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* INLINE TOAST / TIP (no external lib) */}
//           <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
//             <AnimatePresence>
//               {tip && (
//                 <motion.div
//                   key="tip"
//                   initial={{ y: -16, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1 }}
//                   exit={{ y: -16, opacity: 0 }}
//                   transition={{ type: "spring", stiffness: 320, damping: 24 }}
//                   className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
//                   style={{
//                     background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                     border: "1px solid rgba(255,255,255,.25)",
//                     boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
//                   }}
//                 >
//                   {tip}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* WHEEL AREA */}
//           <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//             {/* pointer */}
//             <div className="absolute left-1/2 -translate-x-1/2 z-30">
//               <div
//                 className="w-7 h-10 rounded-[12px] relative"
//                 style={{
//                   background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                   boxShadow:
//                     "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//                 }}
//               >
//                 <div
//                   className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
//                   style={{
//                     width: 0,
//                     height: 0,
//                     borderLeft: "12px solid transparent",
//                     borderRight: "12px solid transparent",
//                     borderTop: "16px solid #f59e0b",
//                     filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                   }}
//                 />
//                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                   <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
//                 </div>
//               </div>
//             </div>

//             {/* wheel disc */}
//             <motion.div
//               ref={wheelRef}
//               className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//               animate={controls}
//               onUpdate={(latest) => {
//                 if (typeof (latest as any).rotate === "number") {
//                   const rot = (latest as any).rotate as number;
//                   setWheelDeg(rot);
//                   wheelDegRef.current = rot;
//                 }
//               }}
//               style={{
//                 top: wheelTop,
//                 width: D,
//                 height: D,
//                 borderRadius: 9999,
//                 background:
//                   "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//                 boxShadow:
//                   "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//                 transformStyle: "preserve-3d",
//                 ["--wheel-rot" as any]: `${wheelDeg}deg`,
//               }}
//             >
//               {/* rim highlight */}
//               <div
//                 className="absolute inset-0 rounded-full opacity-50"
//                 style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//               />

//               {/* spokes */}
//               {FOODS.map((_, i) => (
//                 <div
//                   key={`spoke-${i}`}
//                   className="absolute left-1/2 top-1/2 origin-left"
//                   style={{
//                     width: R,
//                     height: 5,
//                     background: "rgba(255,255,255,.05)",
//                     transform: `rotate(${i * (360 / FOODS.length)}deg)`,
//                   }}
//                 />
//               ))}

//               {/* per-slice buttons */}
//               {liveBoxes.map((bx, i) => {
//                 // geometry
//                 const angDeg = i * sliceAngle;
//                 const rad = ((angDeg - 90) * Math.PI) / 180;
//                 const cx = R + ringR * Math.cos(rad);
//                 const cy = R + ringR * Math.sin(rad);
//                 // const totalBet = userBets[bx.key] ?? 0;

//                 const disabled = round?.roundStatus !== "betting" || showLeaderboard;
//                 const isWinner = forcedWinner === bx.key && round?.roundStatus !== "betting";

//                 const studRadius = 5;
//                 const studOffset = btn / 2 + 10;
//                 const tx = -Math.sin(rad);
//                 const ty = Math.cos(rad);
//                 const lx = cx - tx * studOffset;
//                 const ly = cy - ty * studOffset;

//                 // for hover/tap gating
//                 const balanceNow = user?.balance ?? 0;
//                 const noCoins = balanceNow <= 0;
//                 const cannotAffordChip = balanceNow < (selectedChip || 0);
//                 const visuallyDisabled = disabled || noCoins || cannotAffordChip;

//                 return (
//                   <div key={bx.key}>
//                     {/* Stud */}
//                     <div
//                       className="absolute rounded-full pointer-events-none"
//                       style={{
//                         left: lx - studRadius,
//                         top: ly - studRadius,
//                         width: studRadius * 2,
//                         height: studRadius * 2,
//                         background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                         boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                       }}
//                     />

//                     {/* Slice button */}
//                     <motion.button
//                       whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
//                       whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
//                       onClick={() => {
//                         if (noCoins) return notify("You don't have coin");
//                         if (cannotAffordChip) return notify("Not enough balance for this chip");
//                         if (disabled || !selectedChip) return;
//                         onSliceClick(bx.key);
//                       }}
//                       className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
//                       style={{
//                         left: cx,
//                         top: cy,
//                         width: btn,
//                         height: btn,
//                         background:
//                           "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                         borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                         boxShadow: isWinner
//                           ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                           : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                       }}
//                       aria-label={`Bet on ${bx.title} (pays x${bx.multiplier})`}
//                       disabled={disabled}
//                       aria-disabled={visuallyDisabled}
//                       title={`Bet on ${bx.title} (pays x${bx.multiplier})`}
//                     >
//                       {/* Counter-rotated content */}
//                       <div
//                         className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
//                         style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
//                       >
//                         <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                           {bx.icon ?? (Object.prototype.hasOwnProperty.call(EMOJI, bx.key) ? EMOJI[bx.key as FoodsKey] : "❓")}
//                         </div>

//                         <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                           win <span className="font-extrabold">x{bx.multiplier}</span>
//                         </div>

//                         {/* Hot badge */}
//                         {hotKey === bx.key && (
//                           <div
//                             className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
//                             style={{
//                               boxShadow: "0 6px 14px rgba(0,0,0,.45)",
//                               border: "1px solid rgba(255,255,255,.25)",
//                             }}
//                             aria-label={`HOT: ${bx.title} has the highest total bets`}
//                           >
//                             HOT
//                           </div>
//                         )}

//                         {/* Total bet text (your local bet amount or show server total if preferred) */}
//                         <div className="text-[10px] text-white">
//                           Total: {formatNumber(bx.total)}
//                         </div>
//                       </div>
//                     </motion.button>
//                   </div>
//                 );
//               })}

//             </motion.div>

//             {/* Center hub */}
//             <motion.div
//               className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//               style={{
//                 top: hubTop,
//                 width: hubSize,
//                 height: hubSize,
//                 background:
//                   "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//                 border: "1px solid rgba(255,255,255,.25)",
//               }}
//               animate={{
//                 boxShadow: [
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
//                 ]
//               }}
//               transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//             >
//               <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
//               <div className="text-center relative">
//                 <div className="text-[12px] font-semibold tracking-wide mt-9">
//                   {bettingOpen && !showLeaderboard
//                     ? "Place bets"
//                     : round?.roundStatus === "revealing"
//                       ? "Revealing…"
//                       : (round?.roundStatus === "revealed" || round?.roundStatus === "completed")
//                         ? "Next round in"
//                         : "Preparing…"}
//                 </div>

//                 <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
//                   {`${Math.floor(uiLeftMs / 1000)}s`}
//                 </div>
//               </div>

//             </motion.div>
//           </div>

//           {/* Progress & platform */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 z-10"
//             style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//           >
//             <div className="relative w-full h-full">
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div className="absolute -left-8 -right-8 flex justify-between">
//                 {/* Pizza */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
//                     <span className="text-3xl pb-1">🍕</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 400k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
//                     4.37x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute left-3/12 mt-6 ml-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Pizza
//                     </div>
//                   </div>
//                 </div>
//                 {/* Salad */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
//                     <span className="text-3xl">🥗</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 100k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
//                     1.25x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute right-3/12 mt-6 mr-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Salad
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div
//                 className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
//                 style={{
//                   bottom: 0,
//                   width: D * 0.98,
//                   height: 52,
//                   background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                   border: "4px solid #1e40af",
//                   boxShadow: "0 5px 0 #1e3a8a",
//                 }}
//               >
//                 <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
//                   <div
//                     className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
//                     style={{
//                       background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                       border: "1px solid rgba(255,255,255,.25)",
//                       boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
//                     }}
//                   >
//                     Result
//                   </div>

//                   <div className="flex items-center gap-2">
//                     {(winnersHistory.length ? [...winnersHistory].slice(-9).reverse() : []).map((k, idx) => (
//                       <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
//                         <div
//                           className="w-8 h-8 rounded-xl grid place-items-center"
//                           style={{
//                             background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
//                             border: "1px solid #7fb4ff",
//                             boxShadow:
//                               "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
//                           }}
//                           title={LABEL[k]}
//                         >
//                           <span className="text-[16px] leading-none">{EMOJI[k]}</span>
//                         </div>
//                         {idx === 0 && (
//                           <div
//                             className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[7px] font-black"
//                             style={{
//                               background: "linear-gradient(180deg,#ffd84d,#ffb800)",
//                               border: "1px solid rgba(0,0,0,.2)",
//                               boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
//                               color: "#3a2a00",
//                               whiteSpace: "nowrap",
//                             }}
//                           >
//                             NEW
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                     {winnersHistory.length === 0 && (
//                       <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== CHIP BAR ===== */}
//           <div className="px-3 relative">
//             <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Mine 200k
//               </div>
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Total 100M
//               </div>
//             </div>

//             <div
//               className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//               style={{
//                 background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                 borderColor: "rgba(255,255,255,0.35)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//               }}
//             >
//               <div
//                 className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//                 style={{
//                   background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//                 }}
//               >
//                 Select Bet Amount
//               </div>

//               <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//                 {[
//                   { v: 1000, color: "#1fb141" },
//                   { v: 2000, color: "#3b82f6" },
//                   { v: 5000, color: "#fb923c" },
//                   { v: 10000, color: "#ef4444" },
//                   { v: 50000, color: "#c084fc" },
//                 ].map(({ v, color }) => {
//                   const selected = selectedChip === v;

//                   const afford = balance >= v;

//                   return (
//                     <motion.button
//                       key={v}
//                       ref={(el) => {
//                         chipRefs.current[v] = el;
//                         return undefined;
//                       }}
//                       whileTap={{ scale: 0.95, rotate: -2 }}
//                       whileHover={{ y: -3 }}
//                       onClick={() => {
//                         if (!afford) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         setSelectedChip(v);
//                       }}
//                       className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
//                       style={{
//                         width: 48,
//                         height: 48,
//                         transformStyle: "preserve-3d",
//                         boxShadow: selected
//                           ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                           : "0 8px 16px rgba(0,0,0,.35)",
//                         border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                         background: `
//                       conic-gradient(
//                         #fff 0 15deg, ${color} 15deg 45deg,
//                         #fff 45deg 60deg, ${color} 60deg 90deg,
//                         #fff 90deg 105deg, ${color} 105deg 135deg,
//                         #fff 135deg 150deg, ${color} 150deg 180deg,
//                         #fff 180deg 195deg, ${color} 195deg 225deg,
//                         #fff 225deg 240deg, ${color} 240deg 270deg,
//                         #fff 270deg 285deg, ${color} 285deg 315deg,
//                         #fff 315deg 330deg, ${color} 330deg 360deg
//                       )
//                     `,
//                       }}
//                       title={`${v}`}
//                       aria-label={`Select chip ${v}`}
//                       aria-disabled={!afford}
//                     >
//                       <div
//                         className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                         style={{
//                           width: 34,
//                           height: 34,
//                           background: selected
//                             ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                             : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                           border: "2px solid rgba(0,0,0,.15)",
//                           color: selected ? "#0b3a8e" : "#1f2937",
//                           boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                         }}
//                       >
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>

//                       {selected && (
//                         <div
//                           className="absolute inset-[-4px] rounded-full pointer-events-none"
//                           style={{
//                             border: `2px solid ${color}88`,
//                             boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                           }}
//                         />
//                       )}
//                     </motion.button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* Stats strip */}
//           <div className="px-3 mt-3">
//             <div
//               className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
//               style={{
//                 background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                 borderColor: "#1e40af",
//                 boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//               }}
//             >

//               <div
//                 className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
//                 style={{
//                   background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                 }}
//               >
//                 Stats
//               </div>

//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Coins</div>
//                 <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt(balance ?? 0)}
//                 </div>
//               </div>
//               {/* Avatar */}
//               <div
//                 className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
//                 style={{
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 2px 8px rgba(0,0,0,.25)",
//                   background:
//                     "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
//                 }}
//               >
//                 <span className="text-lg text-black/50">👤</span>
//               </div>
//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Rewards</div>
//                 <div className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* transient & payout flies */}
//           <div className="pointer-events-none absolute inset-0 z-30">
//             <AnimatePresence>
//               {flies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//               {remoteFlies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           <div className="pointer-events-none absolute inset-0">
//             <AnimatePresence>
//               {payoutFlies.map((f) => (
//                 <motion.div
//                   key={`p-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                     y:
//                       (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}

//               {bankFlies.map((f) => (
//                 <motion.div
//                   key={`b-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 5,
//                     y:
//                       (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 5,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* MODALS */}
//           <LeaderboardModal
//             open={showLeaderboard}
//             onClose={() => {
//               setShowLeaderboard(false);
//               setIntermissionSec(undefined);
//             }}
//             onStartNow={() => setIntermissionSec(0)}
//             intermissionSec={intermissionSec}
//             ranking={ranking}
//             user={user ?? undefined}
//           />
//           <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//           <Record open={showRecord} onClose={() => setShowRecord(false)} />

//           {/* Settings bottom sheet */}
//           <SettingsBottomSheet
//             open={settingsOpen}
//             onClose={() => setSettingsOpen(false)}
//             prefs={prefs}
//             setPrefs={setPrefs}
//           />

//           <RoundWinnersModal
//             open={showRoundWinners}
//             onClose={() => setShowRoundWinners(false)}
//             entries={roundWinners}
//             meId={user?.id}
//           />

//         </div>

//         {/* gain flourish */}
//         <div className="pointer-events-none fixed inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = phoneRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const sx = cont ? cont.left + cont.width / 2 : 0;
//               const sy = cont ? cont.top + 520 : 0;
//               const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//               const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                   animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );

// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };



// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// /** utils */
// function fmt(n: number) {
//   const format = (num: number, suffix: string) => {
//     const formatted = (num).toFixed(1);
//     return formatted.endsWith('.0') ? `${parseInt(formatted)}${suffix}` : `${formatted}${suffix}`;
//   };

//   if (n >= 1_000_000) return format(n / 1_000_000, 'M');
//   if (n >= 1_000) return format(n / 1_000, 'K');
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
// }


// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }




//////////////////////////////////////////////////////////////



// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
// import { useGame, type ApiHistoryItem } from "./useGame.socket";
// import { FOODS, type FoodsKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";
// import GameRules from "./GameRules";
// import Record from "./Record";
// import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
// import type { RoundWinnerEntry } from "./RoundWinnersModal";
// import RoundWinnersModal from "./RoundWinnersModal";
// import InitialLoader from "./InitialLoader";
// import LoginPage from "./LoginPage";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// //const MAX_COINS_PER_SLICE = 60;
// const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";
// const PREFS_KEY = "soundPrefsWheelV1";


// const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
// const resolveEventKey = (e: any) =>
//   e?.key ?? e?.box ?? e?.fruit ?? e?.title ?? e?.name ?? "";


// // Visual language
// const EMOJI: Record<FoodsKey, string> = {
//   meat: "🥩",
//   tomato: "🍅",
//   corn: "🌽",
//   sausage: "🌭",
//   lettuce: "🥬",
//   carrot: "🥕",
//   skewer: "🍢",
//   ham: "🍗",
// };

// const LABEL: Record<FoodsKey, string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };

// const MULTIPLIER: Record<FoodsKey, number> = {
//   meat: 45,
//   tomato: 5,
//   corn: 5,
//   sausage: 10,
//   lettuce: 5,
//   carrot: 5,
//   skewer: 15,
//   ham: 25,
// };


// // Define chip colors based on value
// const chipColorMap: Record<number, string> = {
//   500: "#16a34a",    // green
//   1000: "#1fb141",   // slightly different green
//   2000: "#3b82f6",   // blue
//   5000: "#fb923c",   // orange
//   10000: "#ef4444",  // red
//   50000: "#c084fc",  // purple (in case more are added)
// };



// const CORE_ORDER = ["meat", "tomato", "corn", "sausage", "lettuce", "carrot", "skewer", "ham"] as const;
// const CORE_LABEL: Record<(typeof CORE_ORDER)[number], string> = {
//   meat: "Meat",
//   tomato: "Tomato",
//   corn: "Corn",
//   sausage: "Sausage",
//   lettuce: "Lettuce",
//   carrot: "Carrot",
//   skewer: "Skewer",
//   ham: "Ham",
// };


// type BoxKey = string;

// type LiveBox = {
//   key: BoxKey;          // unique id; using title for now
//   title: string;
//   icon?: string;        // emoji/icon if provided
//   multiplier: number;
//   total: number;        // totalAmount (boxStats) or totalBet (boxes)
//   bettors?: number;     // optional
// };
// type BoxStat = { box?: string; title?: string; icon?: string; multiplier?: number; totalAmount?: number; bettorsCount?: number };
// type BoxDef = { title?: string; icon?: string; multiplier?: number; totalBet?: number; userCount?: number };



// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90;

// const formatNumber = (num: number) => {
//   if (num >= 1_000_000) {
//     return `${Math.round(num / 1_000_000)}M`;
//   } else if (num >= 1_000) {
//     return `${Math.round(num / 1_000)}K`;
//   } else {
//     return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
//   }
// };


// // Safe UUID that works on HTTP too
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




// /** ==================== APP ==================== **/
// export default function App() {
//   const game = useGame() as any;
//   const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance, balance, getRoundWinners, getCurrentHistory, myBetTotal, setting } = game;
//   const startNextRound: (() => Promise<void> | void) | undefined =
//     game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
//   const prefersReducedMotion = useReducedMotion();
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

//   // ======= SOFT TOAST (no external lib) =======
//   const [tip, setTip] = useState<string | null>(null);
//   const tipHideAtRef = useRef<number | null>(null);
//   function notify(msg: string, ms = 1500) {
//     setTip(msg);
//     const hideAt = Date.now() + ms;
//     tipHideAtRef.current = hideAt;
//     window.setTimeout(() => {
//       if (tipHideAtRef.current === hideAt) setTip(null);
//     }, ms);
//   }

//   // parse helper
//   const parseTs = (v?: string | number) =>
//     typeof v === "number" ? v : v ? Date.parse(v) : 0;

//   // decide which timestamp ends the *current* phase
//   const phaseEndAt = useMemo(() => {
//     const s = round?.roundStatus;

//     if (s === "betting") return parseTs(round?.endTime);       // betting → endTime
//     if (s === "revealing") return parseTs(round?.revealTime);    // revealing → revealTime
//     if (s === "revealed" || s === "completed") {
//       // pause/intermission → prefer prepareTime, else fall back to startTime (or 0)
//       return parseTs(round?.prepareTime) || parseTs(round?.startTime);
//     }
//     return 0;
//   }, [
//     round?.roundStatus,
//     round?.endTime,
//     round?.revealTime,
//     round?.prepareTime,
//     round?.startTime,
//   ]);

//   // local UI countdown for the hub
//   const [uiLeftMs, setUiLeftMs] = useState(0);
//   useEffect(() => {
//     const tick = () => setUiLeftMs(Math.max(0, phaseEndAt - Date.now()));
//     tick(); // set immediately
//     if (!phaseEndAt) { setUiLeftMs(0); return; }
//     const id = setInterval(tick, 1000);
//     return () => clearInterval(id);
//   }, [phaseEndAt, round?.roundStatus]);


//   const [userBets, setUserBets] = useState<Record<BoxKey, number>>({});
//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);
//   const wheelDegRef = useRef(0);

//   // ——— State

//   // derive total length of the current phase from timestamps
//   const phaseTotalMs = useMemo(() => {
//     const s = round?.roundStatus;
//     const parse = (v?: string | number) =>
//       typeof v === "number" ? v : v ? Date.parse(v) : 0;

//     if (s === "betting") {
//       const start = parse(round?.startTime);
//       const end = parse(round?.endTime);
//       return Math.max(1000, end - start);
//     }
//     if (s === "revealing") {
//       const end = parse(round?.endTime);
//       const reveal = parse(round?.revealTime);
//       return Math.max(600, reveal - end);
//     }
//     return 1; // revealed/completed/preparing
//   }, [round?.roundStatus, round?.startTime, round?.endTime, round?.revealTime]);
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const bettingOpen = round?.roundStatus === "betting";
//   //const DEFAULT_PHASE_MS = { OPEN: 30000, CLOSED: 6000, SETTLED: 3000 } as const;
//   ///const phaseTotal = round ? (DEFAULT_PHASE_MS as any)[round.roundStatus] ?? 1000 : 1000;
//   const progress = useMemo(() => {
//     const left = round?.timeLeftMs ?? 0;
//     if (!phaseTotalMs || phaseTotalMs <= 0) return 0;
//     return Math.min(1, Math.max(0, 1 - left / phaseTotalMs));
//   }, [round?.timeLeftMs, phaseTotalMs]);

//   const [isLoaded, setIsLoaded] = useState(false);

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // Sidebar / Drawer
//   // const [drawerOpen, setDrawerOpen] = useState(false);
//   // round-over is when the server has finished the reveal
//   const isRoundOver = round?.roundStatus === "revealed" || round?.roundStatus === "completed";

//   // ——— Wheel sizing
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const el = phoneRef.current;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize((prev) => (prev === D ? prev : D));
//     });
//     ro.observe(el);
//     return () => ro.unobserve(el);
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   //const studsR = R * 0.92;
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<Prefs>({
//     master: 1,
//     bet: 1,
//     reveal: 1,
//     win: 1,
//     bg: 1,
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   const applyVolumes = useCallback(() => {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   async function primeOne(a?: HTMLAudioElement | null) {
//     if (!a) return;
//     try {
//       a.muted = true;
//       await a.play();
//       a.pause();
//       a.currentTime = 0;
//       a.muted = false;
//     } catch { }
//   }
//   async function primeAllAudio() {
//     await Promise.all([
//       primeOne(betAudioRef.current),
//       primeOne(revealAudioRef.current),
//       primeOne(winAudioRef.current),
//       primeOne(bgAudioRef.current),
//     ]);
//     setAudioReady(true);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     bgAudioRef.current = new Audio(SND_BG_LOOP);
//     if (bgAudioRef.current) {
//       bgAudioRef.current.loop = true;
//       bgAudioRef.current.volume = prefs.master * prefs.bg;
//     }
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     function arm() {
//       primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => { }));
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     }
//     window.addEventListener("pointerdown", arm, { once: true });
//     window.addEventListener("keydown", arm, { once: true });
//     window.addEventListener("touchstart", arm, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", arm);
//       window.removeEventListener("keydown", arm);
//       window.removeEventListener("touchstart", arm);
//     };
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch { }
//   }, [applyVolumes, prefs]);

//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   function buildLiveBoxes(payload: { boxStats?: BoxStat[]; boxes?: BoxDef[] }): LiveBox[] {
//     const src = (payload.boxStats?.length ? payload.boxStats : payload.boxes) ?? [];

//     // Map raw → keyed record (last one wins, but we’ll only keep CORE)
//     const tmpMap = new Map<string, LiveBox>();

//     for (const it of src as any[]) {
//       // server can send "box" or "title"
//       const rawTitle = it.box ?? it.title ?? "";
//       const key = norm(rawTitle); // e.g. "Meat" → "meat"
//       if (!CORE_ORDER.includes(key as any)) continue; // drop pizza/salad/others

//       const title = CORE_LABEL[key as keyof typeof CORE_LABEL];
//       const multiplier = Number(it.multiplier ?? 0);
//       const total = Number((it.totalAmount ?? it.totalBet) ?? 0);
//       const bettors = Number((it.bettorsCount ?? it.userCount) ?? 0);

//       tmpMap.set(key, {
//         key,
//         title,
//         icon: it.icon,       // emoji if server provides
//         multiplier: isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
//         total: isFinite(total) && total >= 0 ? total : 0,
//         bettors: isFinite(bettors) && bettors >= 0 ? bettors : 0,
//       });
//     }

//     // Return in fixed order; if some are missing, still create placeholders (multiplier 1, totals 0)
//     return CORE_ORDER.map(k => {
//       const v = tmpMap.get(k);
//       return (
//         v ?? {
//           key: k,
//           title: CORE_LABEL[k],
//           icon: undefined,
//           multiplier: 1,
//           total: 0,
//           bettors: 0,
//         }
//       );
//     });
//   }

//   const liveBoxes = useMemo(
//     () => buildLiveBoxes(round ?? {}),
//     [round?.boxStats, round?.boxes]
//   );

//   const sliceCount = liveBoxes.length || 1;

//   // balance flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => uid());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance, user, lastBalance]);

//   /** ===== geometry / targets ===== */
//   const getContainerRect = useCallback(() => {
//     return phoneRef.current?.getBoundingClientRect() || null;
//   }, []);
//   const getWheelCenter = useCallback(() => {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }, [getContainerRect]);

//   const slices: readonly FoodsKey[] = FOODS;
//   const sliceAngle = 360 / slices.length;

//   const hash01 = (str: string, s = 0) => {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   };

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter();
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, ringR]
//   );

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       const a = 2 * Math.PI * hash01(betId, 3);
//       const r = 8 + 18 * hash01(betId, 4);
//       return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
//     },
//     [sliceButtonCenter]
//   );

//   /** ===== history & leaderboard (per 10 rounds) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<ApiHistoryItem[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
//   const [blockCount, setBlockCount] = useState(0); // 0..10


//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//         ? (round as any).indexInBlock
//         : typeof (round as any)?.roundNumber === "number"
//           ? ((round as any).roundNumber % 10) + 1
//           : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? ((blockCount % 10) || 10);

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = uid();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = uid() //crypto.randomUUID();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */


//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round?.roundStatus === "revealed") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//       setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.roundStatus, currentRoundId]);

//   /** ===== spin & settle ===== */
//   const controls = useAnimation();
//   //const lastSpinRoundRef = useRef<string | null>(null);

//   const [wheelDeg, setWheelDeg] = useState(0);

//   // when betting closes, hide transient flies
//   useEffect(() => {
//     if (round?.roundStatus === "revealing") {
//       setFlies([]); setRemoteFlies([]);
//     }
//   }, [round?.roundStatus]);

//   // after the reveal is finished, hard reset per round
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) { /* (optional) */ }
//     setCurrentRoundId(round.roundId);
//     if (round.roundStatus === "revealed" || round.roundStatus === "completed") {
//       setStacked([]); setFlies([]); setRemoteFlies([]);
//       setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.roundStatus, currentRoundId]);


//   // Clear per round when SETTLED (after reveal is done)
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) { /* clear arrays ... */ }
//     setCurrentRoundId(round.roundId);
//     if (round.roundStatus === "revealed") {
//       setStacked([]); setFlies([]); setRemoteFlies([]);
//       setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
//       setShowRoundWinners(false);
//     }
//   }, [round?.roundId, round?.roundStatus, currentRoundId]);


//   // Track previous status to detect OPEN -> CLOSED edge
//   const prevStatusRef = useRef<string | null>(null);

//   useEffect(() => {
//     const status = round?.roundStatus ?? null;
//     const prev = prevStatusRef.current;

//     // Fire exactly once per round when betting closes (reveal/spin phase begins)
//     const shouldSpin = prev === "betting" && status === "revealing";

//     if (!shouldSpin) {
//       prevStatusRef.current = status;
//       return;
//     }
//     prevStatusRef.current = status;

//     // Hide transient coins
//     setFlies([]);
//     setRemoteFlies([]);
//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => { });
//     }


//     function indexUnderPointerDynamic(rotDeg: number) {
//       const a = (((POINTER_DEG - rotDeg + 90) % 360) + 360) % 360;
//       return Math.floor((a + sliceAngle / 2) / sliceAngle) % sliceCount;
//     }
//     function rotationToCenterIndexDynamic(i: number) {
//       return POINTER_DEG - i * sliceAngle + 90;
//     }
//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01((round?.roundId ?? "seed") + Date.now().toString(), 99) * 360; // make sure we don't get same angle if id repeats
//     const total = current + base + jitter;

//     (async () => {
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       const idx = indexUnderPointerDynamic(total);
//       const ideal = rotationToCenterIndexDynamic(idx);
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k;

//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       const winner = FOODS[idx] as FoodsKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//       handleWin(winner);
//     })();
//   }, [round?.roundStatus, controls, prefersReducedMotion, audioReady, round?.roundId]);
//   //////

//   function doRevealFlights(winner: FoodsKey) {
//     const cont = getContainerRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     /** ===== my winners -> balance ===== */
//     if (user && bal && cont) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => { });
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     /** ===== losers -> bank ===== */
//     if (bank && cont) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FoodsKey[]).indexOf(c.fruit);
//           const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     /** ===== history + ranking + block counter ===== */
//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//     // 1) Aggregate bet & win per user for *this round*
//     const perUser: Record<string, { bet: number; win: number }> = {};
//     for (const c of stacked) {
//       // total bet: all coins the user placed this round (any fruit)
//       perUser[c.userId] ??= { bet: 0, win: 0 };
//       perUser[c.userId].bet += c.value;

//       // total win: only coins on the winning fruit times multiplier
//       if (c.fruit === winner) {
//         perUser[c.userId].win += c.value * MULTIPLIER[winner];
//       }
//     }
//     function pseudoName(uid: string) {
//       if (uid === user?.id) return user?.name || "You";
//       const tail = uid.slice(-4).toUpperCase();
//       return `Player ${tail}`;
//     }

//     // 2) Materialize entries and always include *you*, even if you didn’t bet
//     const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
//       userId: uid,
//       name: pseudoName(uid),
//       bet: perUser[uid].bet,
//       win: perUser[uid].win,
//     }));

//     if (!perUser[user?.id ?? ""] && user) {
//       entries.push({
//         userId: user.id,
//         name: user.name || "You",
//         bet: 0,
//         win: 0,
//       });
//     }

//     // 3) Sort by Win desc (then Bet desc as tiebreaker) and keep a reasonable list
//     entries.sort((a, b) => (b.win - a.win) || (b.bet - a.bet));

//     // 4) Save & show
//     setRoundWinners(entries);
//     setShowRoundWinners(true);
//     // increment block count; show leaderboard exactly every 10 rounds
//     setBlockCount((prev) => {
//       console.log("prevvvvvvvvvvvvvvvvvvvvvvv", prev)
//       const next = prev + 1;
//       if (displayBlockRound >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(INTERMISSION_SECS);
//       }
//       return next >= 10 ? 10 : next;
//     });
//   }


//   // track echo events we've already processed by betId
//   const pendingLocalBetRef = useRef<Array<{ key: BoxKey; value: number; until: number }>>([]);
//   function markPendingLocal(key: BoxKey, value: number, ms = 700) {
//     const now = Date.now();
//     pendingLocalBetRef.current.push({ key, value, until: now + ms });
//     // cleanup old
//     pendingLocalBetRef.current = pendingLocalBetRef.current.filter(x => x.until > now);
//   }
//   function shouldSuppressEcho(key: BoxKey, value: number) {
//     const now = Date.now();
//     const i = pendingLocalBetRef.current.findIndex(x => x.key === key && x.value === value && x.until > now);
//     if (i >= 0) {
//       pendingLocalBetRef.current.splice(i, 1); // consume
//       return true;
//     }
//     return false;
//   }

//   console.log("roundddddddddddddddddddd", setting, progress)


//   const onSliceClick = useCallback(
//     async (key: BoxKey) => {
//       console.log("fruittttttttttttttttttttttttttttttttttttt", key)
//       const bal = user?.balance ?? 0;
//       if (bal <= 0) return notify("You don't have coin");
//       if (bal < (selectedChip || 0)) return notify("Not enough balance for this chip");
//       if (round?.roundStatus !== "betting" || showLeaderboard || !selectedChip) return;

//       // 🔹 Instant local fly (no wait)
//       const idx = liveBoxes.findIndex(b => b.key === key);
//       if (idx >= 0) {
//         const to = targetForBet(idx, uid()); // use a temp id just for offset variance
//         spawnLocalFly(to, selectedChip);
//         markPendingLocal(key, selectedChip); // so echo won't duplicate
//       }

//       // optimistic local total
//       setUserBets(prev => ({ ...prev, [key]: (prev[key] ?? 0) + selectedChip }));

//       // fire the request (no need to block UI)
//       try {
//         await placeBet(key, selectedChip);
//       } catch (e) {
//         // optional: rollback optimistic userBets or show toast
//         notify("Bet failed");
//       }
//     },
//     [user?.balance, round?.roundStatus, showLeaderboard, isRoundOver, selectedChip, placeBet, liveBoxes, targetForBet, spawnLocalFly]
//   );


//   // add near other refs:
//   const seenEchoIdsRef = useRef<Set<string>>(new Set());
//   //Suppress duplicate fly on echo
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;

//     const evt = echoQueue[0];
//     // suppress exact duplicates by betId
//     if (evt.betId && seenEchoIdsRef.current.has(evt.betId)) {
//       shiftEcho();
//       return;
//     }
//     if (evt.betId) seenEchoIdsRef.current.add(evt.betId);
//     const keyRaw = resolveEventKey(evt) as BoxKey;

//     const idx = liveBoxes.findIndex(b => norm(b.key) === norm(keyRaw));
//     if (idx < 0) { shiftEcho(); return; }

//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current && audioReady) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => { });
//     }

//     // 🔹 Don’t double-spawn for your own just-clicked bet
//     const isMine = evt.userId === user?.id;
//     const suppress = isMine && shouldSuppressEcho(keyRaw, evt.value);

//     if (!suppress) {
//       if (isMine) spawnLocalFly(to, evt.value);
//       else spawnRemoteFly(to, evt.value);
//     }

//     // keep stacked with server betId (no change)
//     setStacked(prev =>
//       prev.some(c => c.id === evt.betId)
//         ? prev
//         : [...prev, { id: evt.betId, fruit: keyRaw as any, value: evt.value, userId: evt.userId }]
//     );

//     shiftEcho();
//   }, [
//     echoQueue, round?.roundId, liveBoxes, audioReady, user?.id,
//     spawnLocalFly, spawnRemoteFly, shiftEcho, targetForBet
//   ]);



//   const totalsForHot = useMemo(() => {
//     const m: Record<BoxKey, number> = {};
//     for (const bx of liveBoxes) m[bx.key] = bx.total ?? 0;
//     return m;
//   }, [liveBoxes]);

//   const hotKey = useMemo<BoxKey | null>(() => {
//     let best: BoxKey | null = null;
//     let bestVal = 0;
//     for (const bx of liveBoxes) {
//       const v = totalsForHot[bx.key] ?? 0;
//       if (v > bestVal) { bestVal = v; best = bx.key; }
//     }
//     return bestVal > 0 ? best : null;
//   }, [liveBoxes, totalsForHot]);


//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ======== INTERMISSION COUNTDOWN ======== **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;

//     const t = setInterval(() => {
//       setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
//     }, 1000);

//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   // when countdown finishes, auto-close & auto-start next round; also reset the block
//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       // close modal
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);

//       // reset block tallies for the next 10-round block
//       setBlockCount(0);
//       setWinsByPlayer({});
//       //  setWinnersHistory([]);

//       // tell the game to start the next round if it exposes a method
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => { });
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);


//   useEffect(() => {
//     // Reset the user bets when the round is over
//     if (round?.roundStatus === "revealed" || round?.roundStatus === "completed") {
//       // Reset all bets to 0
//       setUserBets({
//         meat: 0,
//         tomato: 0,
//         corn: 0,
//         sausage: 0,
//         lettuce: 0,
//         carrot: 0,
//         skewer: 0,
//         ham: 0,
//       });
//     }
//   }, [round?.roundStatus]);

//   function handleWin(winner: FoodsKey) {
//     const winAmount = userBets[winner] * MULTIPLIER[winner];
//     console.log(`You won ${winAmount} coins on ${LABEL[winner]}!`);
//     if (winAmount > 0) {
//       // Prefer server-side credit if you have it:
//       creditWin?.(winAmount).catch(() => {
//         // fallback optimistic:
//         updateBalance?.(winAmount);
//       });
//     }

//   }

//   // ===== Initial game loader (fixed-time) =====
//   const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0); // 0..1
//   const [loggedIn, setLoggedIn] = useState(false);

//   const [token, setToken] = useState<string | null>(null);
//   useEffect(() => {
//     setToken(localStorage.getItem("auth_token")); // set by your login
//     setLoggedIn(!!localStorage.getItem("auth_token"));
//   }, []);

//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();

//     const tick = (now: number) => {
//       const elapsed = now - start;
//       const p = Math.min(1, elapsed / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) {
//         raf = requestAnimationFrame(tick);
//       } else {
//         // small grace so the bar reaches 100% visually
//         setTimeout(() => setBootLoading(false), 150);
//       }
//     };

//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);


//   function handleLoginSuccess() {
//     // your LoginPage should save token to localStorage
//     setToken(localStorage.getItem("auth_token"));
//     setLoggedIn(true);
//   }

//   useEffect(() => {
//     if (!showRoundWinners) return;

//     let alive = true;
//     (async () => {
//       try {
//         const data = await getRoundWinners();
//         // console.log("rounddddddd winnerrrrrrrrrr", data) // no arg uses current round id
//         if (alive) setRoundWinners(data);
//       } catch (err) {
//         console.error(err);
//       }
//     })();

//     return () => { alive = false; };
//   }, [showRoundWinners, getRoundWinners]);



//   useEffect(() => {
//     if (!showRoundWinners) return;
//     let alive = true;

//     (async () => {
//       try {
//         const rid = (round as any)?._id || round?.roundId || currentRoundId;
//         const data = await getRoundWinners(rid);
//         console.log("dataaaaaaaaaaaaaaaaaaaaaa", data)
//         if (alive) setRoundWinners(data);
//       } catch (err) {
//         console.error(err);
//       }
//     })();

//     return () => { alive = false; };
//   }, [showRoundWinners, getRoundWinners, (round as any)?._id, round?.roundId, currentRoundId]);



//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const items = await getCurrentHistory(); // ← call it
//         if (!alive) return;
//         setWinnersHistory(items.slice().sort((a: ApiHistoryItem, b: ApiHistoryItem) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//         ));
//       } catch (e: any) {
//         if (!alive) return;
//         console.log(e?.message || "Failed to load history");
//       }
//     })();

//     return () => { alive = false; };
//   }, [getCurrentHistory, round]);

//   console.log("winHistoryyyyyyyyyyyyyyyyyyyyyyyyyy", token)


//   //console.log("roundddddddd",round)
//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* initial loader */}
//       <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//       {/* login page */}
//       {!loggedIn &&
//         <LoginPage onLogin={handleLoginSuccess} />
//       }
//       {/* Game UI */}
//       <div>
//         <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//         {/* Phone frame */}
//         <div
//           ref={phoneRef}
//           className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//           style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//         >
//           <div className="absolute top-2 left-2 right-2 z-30">
//             <div className="grid grid-cols-2 gap-2">
//               {/* Left Side: Exit + Record */}
//               <div className="flex items-center space-x-2">
//                 <button
//                   aria-label="Exit"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => {
//                     /* exit logic */
//                   }}
//                 >
//                   <X size={18} />
//                 </button>

//                 <button
//                   aria-label="Record"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowRecord(true)}
//                 >
//                   <ScrollText size={18} />
//                 </button>
//               </div>

//               {/* Right Side: Sound + Help */}
//               <div className="flex items-center space-x-2 justify-end">
//                 <button
//                   aria-label="Sound Settings"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setSettingsOpen(true)}
//                 >
//                   <Volume2 size={18} />
//                 </button>

//                 <button
//                   aria-label="Help"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
//                   onClick={() => setShowGameRules(true)}
//                 >
//                   <MessageCircleQuestionMark size={18} />
//                 </button>
//               </div>

//               {/* Left Side: Block + Round Info */}
//               <div className="text-white text-xs opacity-80 leading-tight">
//                 {/*         <div>Today's Round: {roundNum}</div> */}
//                 <div className="font-bold">Round: {displayBlockRound}</div>
//               </div>

//               {/* Right Side: Ping + Leaderboard */}
//               <div className="flex justify-end items-center gap-2">
//                 <div className="flex items-center space-x-1 text-green-500 text-xs">
//                   <Wifi size={14} className="animate-pulse" />
//                   <span>45ms</span>
//                 </div>

//                 <button
//                   ref={bankRef}
//                   aria-label="Leaderboard"
//                   className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
//                   onClick={() => setShowLeaderboard(true)}
//                 >
//                   🏆
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* INLINE TOAST / TIP (no external lib) */}
//           <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
//             <AnimatePresence>
//               {tip && (
//                 <motion.div
//                   key="tip"
//                   initial={{ y: -16, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1 }}
//                   exit={{ y: -16, opacity: 0 }}
//                   transition={{ type: "spring", stiffness: 320, damping: 24 }}
//                   className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
//                   style={{
//                     background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                     border: "1px solid rgba(255,255,255,.25)",
//                     boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
//                   }}
//                 >
//                   {tip}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* WHEEL AREA */}
//           <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//             {/* pointer */}
//             <div className="absolute left-1/2 -translate-x-1/2 z-30">
//               <div
//                 className="w-7 h-10 rounded-[12px] relative"
//                 style={{
//                   background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                   boxShadow:
//                     "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//                 }}
//               >
//                 <div
//                   className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
//                   style={{
//                     width: 0,
//                     height: 0,
//                     borderLeft: "12px solid transparent",
//                     borderRight: "12px solid transparent",
//                     borderTop: "16px solid #f59e0b",
//                     filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                   }}
//                 />
//                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                   <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
//                 </div>
//               </div>
//             </div>

//             {/* wheel disc */}
//             <motion.div
//               ref={wheelRef}
//               className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//               animate={controls}
//               onUpdate={(latest) => {
//                 if (typeof (latest as any).rotate === "number") {
//                   const rot = (latest as any).rotate as number;
//                   setWheelDeg(rot);
//                   wheelDegRef.current = rot;
//                 }
//               }}
//               style={{
//                 top: wheelTop,
//                 width: D,
//                 height: D,
//                 borderRadius: 9999,
//                 background:
//                   "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//                 boxShadow:
//                   "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//                 transformStyle: "preserve-3d",
//                 ["--wheel-rot" as any]: `${wheelDeg}deg`,
//               }}
//             >
//               {/* rim highlight */}
//               <div
//                 className="absolute inset-0 rounded-full opacity-50"
//                 style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//               />

//               {/* spokes */}
//               {FOODS.map((_, i) => (
//                 <div
//                   key={`spoke-${i}`}
//                   className="absolute left-1/2 top-1/2 origin-left"
//                   style={{
//                     width: R,
//                     height: 5,
//                     background: "rgba(255,255,255,.05)",
//                     transform: `rotate(${i * (360 / FOODS.length)}deg)`,
//                   }}
//                 />
//               ))}

//               {/* per-slice buttons */}
//               {liveBoxes.map((bx, i) => {
//                 // geometry
//                 const angDeg = i * sliceAngle;
//                 const rad = ((angDeg - 90) * Math.PI) / 180;
//                 const cx = R + ringR * Math.cos(rad);
//                 const cy = R + ringR * Math.sin(rad);
//                 // const totalBet = userBets[bx.key] ?? 0;

//                 const disabled = round?.roundStatus !== "betting" || showLeaderboard;
//                 const isWinner = forcedWinner === bx.key && round?.roundStatus !== "betting";

//                 const studRadius = 5;
//                 const studOffset = btn / 2 + 10;
//                 const tx = -Math.sin(rad);
//                 const ty = Math.cos(rad);
//                 const lx = cx - tx * studOffset;
//                 const ly = cy - ty * studOffset;

//                 // for hover/tap gating
//                 const balanceNow = user?.balance ?? 0;
//                 const noCoins = balanceNow <= 0;
//                 const cannotAffordChip = balanceNow < (selectedChip || 0);
//                 const visuallyDisabled = disabled || noCoins || cannotAffordChip;

//                 return (
//                   <div key={bx.key}>
//                     {/* Stud */}
//                     <div
//                       className="absolute rounded-full pointer-events-none"
//                       style={{
//                         left: lx - studRadius,
//                         top: ly - studRadius,
//                         width: studRadius * 2,
//                         height: studRadius * 2,
//                         background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                         boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                       }}
//                     />

//                     {/* Slice button */}
//                     <motion.button
//                       whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
//                       whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
//                       onClick={() => {
//                         if (noCoins) return notify("You don't have coin");
//                         if (cannotAffordChip) return notify("Not enough balance for this chip");
//                         if (disabled || !selectedChip) return;
//                         onSliceClick(bx.key);
//                       }}
//                       className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
//                       style={{
//                         left: cx,
//                         top: cy,
//                         width: btn,
//                         height: btn,
//                         background:
//                           "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                         borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                         boxShadow: isWinner
//                           ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                           : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                       }}
//                       aria-label={`Bet on ${bx.title} (pays x${bx.multiplier})`}
//                       disabled={disabled}
//                       aria-disabled={visuallyDisabled}
//                       title={`Bet on ${bx.title} (pays x${bx.multiplier})`}
//                     >
//                       {/* Counter-rotated content */}
//                       <div
//                         className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
//                         style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
//                       >
//                         <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                           {bx.icon ?? (Object.prototype.hasOwnProperty.call(EMOJI, bx.key) ? EMOJI[bx.key as FoodsKey] : "❓")}
//                         </div>

//                         <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                           win <span className="font-extrabold">x{bx.multiplier}</span>
//                         </div>

//                         {/* Hot badge */}
//                         {hotKey === bx.key && (
//                           <div
//                             className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
//                             style={{
//                               boxShadow: "0 6px 14px rgba(0,0,0,.45)",
//                               border: "1px solid rgba(255,255,255,.25)",
//                             }}
//                             aria-label={`HOT: ${bx.title} has the highest total bets`}
//                           >
//                             HOT
//                           </div>
//                         )}

//                         {/* Total bet text (your local bet amount or show server total if preferred) */}
//                         <div className="text-[10px] text-white">
//                           Total: {formatNumber(bx.total)}
//                         </div>
//                       </div>
//                     </motion.button>
//                   </div>
//                 );
//               })}

//             </motion.div>

//             {/* Center hub */}
//             <motion.div
//               className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//               style={{
//                 top: hubTop,
//                 width: hubSize,
//                 height: hubSize,
//                 background:
//                   "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//                 border: "1px solid rgba(255,255,255,.25)",
//               }}
//               animate={{
//                 boxShadow: [
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                   "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
//                 ]
//               }}
//               transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//             >
//               <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
//               <div className="text-center relative">
//                 <div className="text-[12px] font-semibold tracking-wide mt-9">
//                   {bettingOpen && !showLeaderboard
//                     ? "Place bets"
//                     : round?.roundStatus === "revealing"
//                       ? "Revealing…"
//                       : (round?.roundStatus === "revealed" || round?.roundStatus === "completed")
//                         ? "Next round in"
//                         : "Preparing…"}
//                 </div>

//                 <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
//                   {`${Math.floor(uiLeftMs / 1000)}s`}
//                 </div>
//               </div>

//             </motion.div>
//           </div>

//           {/* Progress & platform */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 z-10"
//             style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//           >
//             <div className="relative w-full h-full">
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div
//                 className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//                 style={{
//                   left: "50%",
//                   transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                   width: D * 0.28,
//                   height: Math.max(110, D * 0.28),
//                   boxShadow: "0 4px 0 #2379c9",
//                 }}
//               />
//               <div className="absolute -left-8 -right-8 flex justify-between">
//                 {/* Pizza */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
//                     <span className="text-3xl pb-1">🍕</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 400k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
//                     4.37x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute left-3/12 mt-6 ml-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Pizza
//                     </div>
//                   </div>
//                 </div>
//                 {/* Salad */}
//                 <div className="flex flex-col items-center w-12">
//                   <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
//                     <span className="text-3xl">🥗</span>
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
//                     Total 100k
//                   </div>
//                   <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
//                     1.25x
//                   </div>
//                   <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">

//                     <path
//                       d="M20 40
//        C 110 0, 180 10, 210 60
//        C 235 105, 175 125, 145 105
//        C 115 85, 135 55, 200 55
//        C 285 55, 330 85, 360 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />

//                     <path
//                       d="M360 110 L 395 110"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                     <path
//                       d="M395 110 L 372 95 M395 110 L 372 125"
//                       fill="none"
//                       stroke="currentColor"
//                       stroke-width="10"
//                       stroke-linecap="round"
//                       stroke-linejoin="round"
//                     />
//                   </svg>
//                   <div className="absolute right-3/12 mt-6 mr-3">
//                     <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
//                       Salad
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div
//                 className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
//                 style={{
//                   bottom: 0,
//                   width: D * 1.15,
//                   height: 52,
//                   background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                   border: "4px solid #1e40af",
//                   boxShadow: "0 5px 0 #1e3a8a",
//                 }}
//               >
//                 <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
//                   <div
//                     className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
//                     style={{
//                       background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                       border: "1px solid rgba(255,255,255,.25)",
//                       boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
//                     }}
//                   >
//                     Result
//                   </div>

//                   <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
//                     {(winnersHistory.length ? [...winnersHistory] : []).map((k, idx) => {
//                       const boxKey = (norm((k as any).box ?? (k as any).title) as FoodsKey);
//                       const emoji = EMOJI[boxKey] ?? "❓";
//                       const labelText = LABEL[boxKey] ?? ((k as any).box ?? (k as any).title ?? "");
//                       return (
//                         <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
//                           <div
//                             className="w-7 h-7 rounded-xl grid place-items-center"
//                             style={{
//                               background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
//                               border: "1px solid #7fb4ff",
//                               boxShadow:
//                                 "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
//                             }}
//                             title={labelText}
//                           >
//                             <span className="text-[16px] leading-none">{emoji}</span>
//                           </div>
//                           {idx === 0 && (
//                             <div
//                               className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[6px] font-black"
//                               style={{
//                                 background: "linear-gradient(180deg,#ffd84d,#ffb800)",
//                                 border: "1px solid rgba(0,0,0,.2)",
//                                 boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
//                                 color: "#3a2a00",
//                                 whiteSpace: "nowrap",
//                               }}
//                             >
//                               NEW
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                     {winnersHistory.length === 0 && (
//                       <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== CHIP BAR ===== */}
//           <div className="px-3 relative">
//             <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Mine {"" + fmt(myBetTotal)}
//               </div>
//               <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
//                 Total 100M
//               </div>
//             </div>

//             <div
//               className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//               style={{
//                 background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                 borderColor: "rgba(255,255,255,0.35)",
//                 boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//               }}
//             >
//               <div
//                 className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//                 style={{
//                   background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//                 }}
//               >
//                 Select Bet Amount
//               </div>

//               <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//                 {setting?.chips.map((v: any) => {
//                   const color = chipColorMap[v] || "#6b7280"; // default gray if no color mapped
//                   const selected = selectedChip === v;
//                   const afford = balance >= v;

//                   return (
//                     <motion.button
//                       key={v}
//                       ref={(el) => {
//                         chipRefs.current[v] = el;
//                         return undefined;
//                       }}
//                       whileTap={{ scale: 0.95, rotate: -2 }}
//                       onClick={() => {
//                         if (!afford) {
//                           notify("Not enough balance for this chip");
//                           return;
//                         }
//                         setSelectedChip(v);
//                       }}
//                       className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
//                       style={{
//                         width: 48,
//                         height: 48,
//                         transformStyle: "preserve-3d",
//                         boxShadow: selected
//                           ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                           : "0 8px 16px rgba(0,0,0,.35)",
//                         border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                         background: `
//             conic-gradient(
//               #fff 0 15deg, ${color} 15deg 45deg,
//               #fff 45deg 60deg, ${color} 60deg 90deg,
//               #fff 90deg 105deg, ${color} 105deg 135deg,
//               #fff 135deg 150deg, ${color} 150deg 180deg,
//               #fff 180deg 195deg, ${color} 195deg 225deg,
//               #fff 225deg 240deg, ${color} 240deg 270deg,
//               #fff 270deg 285deg, ${color} 285deg 315deg,
//               #fff 315deg 330deg, ${color} 330deg 360deg
//             )
//           `,
//                       }}
//                       title={`${v}`}
//                       aria-label={`Select chip ${v}`}
//                       aria-disabled={!afford}
//                     >
//                       <div
//                         className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                         style={{
//                           width: 34,
//                           height: 34,
//                           background: selected
//                             ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                             : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                           border: "2px solid rgba(0,0,0,.15)",
//                           color: selected ? "#0b3a8e" : "#1f2937",
//                           boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                         }}
//                       >
//                         {v >= 1000 ? v / 1000 + "K" : v}
//                       </div>

//                       {selected && (
//                         <div
//                           className="absolute inset-[-4px] rounded-full pointer-events-none"
//                           style={{
//                             border: `2px solid ${color}88`,
//                             boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                           }}
//                         />
//                       )}
//                     </motion.button>
//                   );
//                 })}
//               </div>

//             </div>
//           </div>

//           {/* Stats strip */}
//           <div className="px-3 mt-3">
//             <div
//               className="relative rounded-xl border shadow-lg text-white px-2 py-2 grid grid-cols-2 gap-2"
//               style={{
//                 background: "linear-gradient(180deg, #36a2ff, #2379c9)",
//                 borderColor: "#1e40af",
//                 boxShadow: "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//               }}
//             >

//               <div
//                 className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
//                 style={{
//                   background: "linear-gradient(180deg,#2f63c7,#1f4290)",
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//                 }}
//               >
//                 Stats
//               </div>

//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Coins</div>
//                 <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt(balance ?? 0)}
//                 </div>
//               </div>
//               {/* Avatar */}
//               <div
//                 className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
//                 style={{
//                   borderColor: "rgba(255,255,255,.25)",
//                   boxShadow: "0 2px 8px rgba(0,0,0,.25)",
//                   background:
//                     "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
//                 }}
//               >
//                 <span className="text-lg text-black/50">👤</span>
//               </div>
//               <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
//                 <div className="text-[11px] opacity-90 leading-none">Rewards</div>
//                 <div className="text-[14px] font-bold tabular-nums leading-tight">
//                   💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* transient & payout flies */}
//           <div className="pointer-events-none absolute inset-0 z-30">
//             <AnimatePresence>
//               {flies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//               {remoteFlies.map((f) => (
//                 <motion.div
//                   key={f.id}
//                   initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
//                   animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           <div className="pointer-events-none absolute inset-0">
//             <AnimatePresence>
//               {payoutFlies.map((f) => (
//                 <motion.div
//                   key={`p-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                     y:
//                       (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}

//               {bankFlies.map((f) => (
//                 <motion.div
//                   key={`b-${f.id}`}
//                   initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                   animate={{
//                     x:
//                       (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 5,
//                     y:
//                       (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
//                       (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
//                       (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 5,
//                     opacity: 1,
//                     scale: 1,
//                     rotate: 360,
//                   }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           </div>

//           {/* MODALS */}
//           <LeaderboardModal
//             open={showLeaderboard}
//             onClose={() => {
//               setShowLeaderboard(false);
//               setIntermissionSec(undefined);
//             }}
//             onStartNow={() => setIntermissionSec(0)}
//             intermissionSec={intermissionSec}
//             ranking={ranking}
//             user={user ?? undefined}
//           />
//           <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//           <Record open={showRecord} onClose={() => setShowRecord(false)} />

//           {/* Settings bottom sheet */}
//           <SettingsBottomSheet
//             open={settingsOpen}
//             onClose={() => setSettingsOpen(false)}
//             prefs={prefs}
//             setPrefs={setPrefs}
//           />

//           <RoundWinnersModal
//             open={showRoundWinners}
//             onClose={() => setShowRoundWinners(false)}
//             entries={roundWinners}
//             meId={user?.id}
//           />

//         </div>

//         {/* gain flourish */}
//         <div className="pointer-events-none fixed inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = phoneRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const sx = cont ? cont.left + cont.width / 2 : 0;
//               const sy = cont ? cont.top + 520 : 0;
//               const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//               const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                   animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );

// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };



// function Coin() {
//   return (
//     <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-5 h-5 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[5px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// /** utils */
// function fmt(n: number) {
//   const format = (num: number, suffix: string) => {
//     const formatted = (num).toFixed(1);
//     return formatted.endsWith('.0') ? `${parseInt(formatted)}${suffix}` : `${formatted}${suffix}`;
//   };

//   if (n >= 1_000_000) return format(n / 1_000_000, 'M');
//   if (n >= 1_000) return format(n / 1_000, 'K');
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
// }


// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }









import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
import { useGame, type ApiHistoryItem } from "./useGame.socket";
import { FOODS, type FoodsKey } from "./types";
import LeaderboardModal from "./LeaderboardModal";
import GameRules from "./GameRules";
import Record from "./Record";
import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
import type { RoundWinnerEntry } from "./RoundWinnersModal";
import RoundWinnersModal from "./RoundWinnersModal";
import InitialLoader from "./InitialLoader";
import LoginPage from "./LoginPage";

/** ==================== CONFIG ==================== **/
const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
//const MAX_COINS_PER_SLICE = 60;
const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts

// Sounds
const SND_BET = "/mixkit-clinking-coins-1993.wav";
const SND_REVEAL = "/video-game-bonus-retro-sparkle-gamemaster-audio-lower-tone-1-00-00.mp3";
const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";
const PREFS_KEY = "soundPrefsWheelV1";


const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
const resolveEventKey = (e: any) =>
  e?.key ?? e?.box ?? e?.fruit ?? e?.title ?? e?.name ?? "";


// Visual language
const EMOJI: Record<FoodsKey, string> = {
  meat: "🥩",
  tomato: "🍅",
  corn: "🌽",
  sausage: "🌭",
  lettuce: "🥬",
  carrot: "🥕",
  skewer: "🍢",
  ham: "🍗",
};

const LABEL: Record<FoodsKey, string> = {
  meat: "Meat",
  tomato: "Tomato",
  corn: "Corn",
  sausage: "Sausage",
  lettuce: "Lettuce",
  carrot: "Carrot",
  skewer: "Skewer",
  ham: "Ham",
};

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


// Define chip colors based on value
const chipColorMap: Record<number, string> = {
  500: "#16a34a",    // green
  1000: "#1fb141",   // slightly different green
  2000: "#3b82f6",   // blue
  5000: "#fb923c",   // orange
  10000: "#ef4444",  // red
  50000: "#c084fc",  // purple (in case more are added)
};



const CORE_ORDER = ["meat", "tomato", "corn", "sausage", "lettuce", "carrot", "skewer", "ham"] as const;
const CORE_LABEL: Record<(typeof CORE_ORDER)[number], string> = {
  meat: "Meat",
  tomato: "Tomato",
  corn: "Corn",
  sausage: "Sausage",
  lettuce: "Lettuce",
  carrot: "Carrot",
  skewer: "Skewer",
  ham: "Ham",
};


type BoxKey = string;

type LiveBox = {
  key: BoxKey;          // unique id; using title for now
  title: string;
  icon?: string;        // emoji/icon if provided
  multiplier: number;
  total: number;        // totalAmount (boxStats) or totalBet (boxes)
  bettors?: number;     // optional
};
type BoxStat = { box?: string; title?: string; icon?: string; multiplier?: number; totalAmount?: number; bettorsCount?: number };
type BoxDef = { title?: string; icon?: string; multiplier?: number; totalBet?: number; userCount?: number };



/** ==================== ANGLE HELPERS ==================== **/
//const POINTER_DEG = -90;

const formatNumber = (num: number) => {
  if (num >= 1_000_000) {
    return `${Math.round(num / 1_000_000)}M`;
  } else if (num >= 1_000) {
    return `${Math.round(num / 1_000)}K`;
  } else {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
  }
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




/** ==================== APP ==================== **/
export default function App() {
  const game = useGame() as any;
  const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance, balance, getRoundWinners, getCurrentHistory, myBetTotal, setting } = game;
  const startNextRound: (() => Promise<void> | void) | undefined =
    game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
  const prefersReducedMotion = useReducedMotion();
  const [showRoundWinners, setShowRoundWinners] = useState(false);
  const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);


  // --- Cursor/highlight (replaces spinning) ---
const [hlIndex, setHlIndex] = useState<number | null>(null);
const [hlColor, setHlColor] = useState<string>("#22c55e");
const cursorIntervalRef = useRef<number | null>(null);
const decelTimeoutRef = useRef<number | null>(null);
const cursorRunningRef = useRef(false);
const landedOnceRef = useRef(false);




// Use whichever sound you prefer for the hop per move:
const SND_HOP = SND_REVEAL; // or SND_BET if you like that sound better

const HOP_POOL_SIZE = 6;
const hopPoolRef = useRef<HTMLAudioElement[]>([]);
const hopIndexRef = useRef(0);

function playHop() {
  const pool = hopPoolRef.current;
  if (!pool.length || !audioReady) return;
  const i = (hopIndexRef.current++ % pool.length);
  try {
    const a = pool[i];
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}


const colorPalette = [
  "#22c55e", // green
  "#eab308", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#3b82f6", // blue
];
const randColor = () => colorPalette[(Math.random() * colorPalette.length) | 0];

function clearCursorTimers() {
  if (cursorIntervalRef.current) {
    clearInterval(cursorIntervalRef.current);
    cursorIntervalRef.current = null;
  }
  if (decelTimeoutRef.current) {
    clearTimeout(decelTimeoutRef.current);
    decelTimeoutRef.current = null;
  }
}

function stopCursor() {
  clearCursorTimers();
  cursorRunningRef.current = false;
}


function startCursor(speedMs = 70) {
  if (!sliceCount) return;
  stopCursor();
  cursorRunningRef.current = true;

  setHlIndex((prev) => (prev == null ? 0 : prev));
  setHlColor(randColor());

  cursorIntervalRef.current = window.setInterval(() => {
    setHlIndex((idx) => {
      const next = ((idx ?? 0) + 1) % sliceCount;
      setHlColor(randColor());
      playHop(); // 🔊 tick each hop
      return next;
    });
  }, Math.max(25, speedMs)) as unknown as number;
}


/**
 * Decelerate the highlight and land on a target slice index.
 * Adds a couple of extra laps to look natural.
 */
function settleOnWinner(targetIndex: number) {
  if (!sliceCount) return;
  if (targetIndex < 0 || targetIndex >= sliceCount) {
    stopCursor();
    return;
  }

  clearCursorTimers();

  let idx = hlIndex ?? 0;
  let stepsLeft = ((targetIndex - idx + sliceCount) % sliceCount) + sliceCount * 2;
  let delay = 60;

  const step = () => {
    if (stepsLeft <= 0) {
      stopCursor();
      if (!landedOnceRef.current) {
        landedOnceRef.current = true;
        const winnerKey = (liveBoxes[targetIndex]?.key ?? "") as FoodsKey;
        setForcedWinner(winnerKey);
        doRevealFlights(winnerKey);
        handleWin(winnerKey);
        if (winAudioRef.current && audioReady) {
          winAudioRef.current.currentTime = 0;
          winAudioRef.current.play().catch(() => {});
        }
      }
      return;
    }

    idx = (idx + 1) % sliceCount;
    setHlIndex(idx);
    setHlColor(randColor());
    playHop(); // 🔊 tick each hop during decel
    stepsLeft--;

    delay = Math.min(260, delay + 12);
    decelTimeoutRef.current = window.setTimeout(step, delay) as unknown as number;
  };

  step();
}


  // ======= SOFT TOAST (no external lib) =======
  const [tip, setTip] = useState<string | null>(null);
  const tipHideAtRef = useRef<number | null>(null);
  function notify(msg: string, ms = 1500) {
    setTip(msg);
    const hideAt = Date.now() + ms;
    tipHideAtRef.current = hideAt;
    window.setTimeout(() => {
      if (tipHideAtRef.current === hideAt) setTip(null);
    }, ms);
  }

  // parse helper
  const parseTs = (v?: string | number) =>
    typeof v === "number" ? v : v ? Date.parse(v) : 0;

  // decide which timestamp ends the *current* phase
  const phaseEndAt = useMemo(() => {
    const s = round?.roundStatus;

    if (s === "betting") return parseTs(round?.endTime);       // betting → endTime
    if (s === "revealing") return parseTs(round?.revealTime);    // revealing → revealTime
    if (s === "revealed" || s === "completed") {
      // pause/intermission → prefer prepareTime, else fall back to startTime (or 0)
      return parseTs(round?.prepareTime) || parseTs(round?.startTime);
    }
    return 0;
  }, [
    round?.roundStatus,
    round?.endTime,
    round?.revealTime,
    round?.prepareTime,
    round?.startTime,
  ]);

  // local UI countdown for the hub
  const [uiLeftMs, setUiLeftMs] = useState(0);
  useEffect(() => {
    const tick = () => setUiLeftMs(Math.max(0, phaseEndAt - Date.now()));
    tick(); // set immediately
    if (!phaseEndAt) { setUiLeftMs(0); return; }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndAt, round?.roundStatus]);


  const [userBets, setUserBets] = useState<Record<BoxKey, number>>({});
  // ——— Refs
  const pageRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const bankRef = useRef<HTMLButtonElement | null>(null);
  const wheelDegRef = useRef(0);

  // ——— State

  // derive total length of the current phase from timestamps
  const phaseTotalMs = useMemo(() => {
    const s = round?.roundStatus;
    const parse = (v?: string | number) =>
      typeof v === "number" ? v : v ? Date.parse(v) : 0;

    if (s === "betting") {
      const start = parse(round?.startTime);
      const end = parse(round?.endTime);
      return Math.max(1000, end - start);
    }
    if (s === "revealing") {
      const end = parse(round?.endTime);
      const reveal = parse(round?.revealTime);
      return Math.max(600, reveal - end);
    }
    return 1; // revealed/completed/preparing
  }, [round?.roundStatus, round?.startTime, round?.endTime, round?.revealTime]);
  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
  const bettingOpen = round?.roundStatus === "betting";
  //const DEFAULT_PHASE_MS = { OPEN: 30000, CLOSED: 6000, SETTLED: 3000 } as const;
  ///const phaseTotal = round ? (DEFAULT_PHASE_MS as any)[round.roundStatus] ?? 1000 : 1000;
  const progress = useMemo(() => {
    const left = round?.timeLeftMs ?? 0;
    if (!phaseTotalMs || phaseTotalMs <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - left / phaseTotalMs));
  }, [round?.timeLeftMs, phaseTotalMs]);

  const [isLoaded, setIsLoaded] = useState(false);

  const [stacked, setStacked] = useState<StackedCoin[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

  const [flies, setFlies] = useState<Fly[]>([]);
  const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
  const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
  const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

  // Sidebar / Drawer
  // const [drawerOpen, setDrawerOpen] = useState(false);
  // round-over is when the server has finished the reveal
  const isRoundOver = round?.roundStatus === "revealed" || round?.roundStatus === "completed";

  // ——— Wheel sizing
  const [wheelSize, setWheelSize] = useState(360);
  useEffect(() => {
    if (!phoneRef.current) return;
    const el = phoneRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
      setWheelSize((prev) => (prev === D ? prev : D));
    });
    ro.observe(el);
    return () => ro.unobserve(el);
  }, []);
  const D = wheelSize;
  const R = D / 2;
  const ringR = R * 0.78;
  const btn = Math.round(D * 0.24);
  //const studsR = R * 0.92;
  const wheelTop = 35;
  const hubSize = Math.round(D * 0.32);
  const hubTop = wheelTop + R;

  // ——— Sounds
  const [prefs, setPrefs] = useState<Prefs>({
    master: 1,
    bet: 1,
    reveal: 1,
    win: 1,
    bg: 1,
  });
  const betAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);

const applyVolumes = useCallback(() => {
  const m = clamp01(prefs.master);
  if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
  if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
  if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
  if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);

  // hop pool uses "reveal" slider by default
  hopPoolRef.current.forEach(a => { a.volume = m * clamp01(prefs.reveal); });
}, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);


/*   async function primeOne(a?: HTMLAudioElement | null) {
    if (!a) return;
    try {
      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    } catch { }
  } */
async function primeAllAudio() {
  const primeOne = async (a?: HTMLAudioElement | null) => {
    if (!a) return;
    try {
      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    } catch {}
  };

  await Promise.all([
    primeOne(betAudioRef.current),
    primeOne(revealAudioRef.current),
    primeOne(winAudioRef.current),
    primeOne(bgAudioRef.current),
    ...hopPoolRef.current.map(a => primeOne(a)),
  ]);
  setAudioReady(true);
}


useEffect(() => {
  betAudioRef.current = new Audio(SND_BET);
  revealAudioRef.current = new Audio(SND_REVEAL);
  winAudioRef.current = new Audio(SND_WIN);
  bgAudioRef.current = new Audio(SND_BG_LOOP);

  // 🔊 build hop pool
  hopPoolRef.current = Array.from({ length: HOP_POOL_SIZE }, () => {
    const a = new Audio(SND_HOP);
    a.preload = "auto";
    return a;
  });

  if (bgAudioRef.current) {
    bgAudioRef.current.loop = true;
    bgAudioRef.current.volume = prefs.master * prefs.bg;
  }
  applyVolumes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  useEffect(() => {
    function arm() {
      primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => { }));
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("touchstart", arm);
    }
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    window.addEventListener("touchstart", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("touchstart", arm);
    };
  }, []);

  useEffect(() => {
    applyVolumes();
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { }
  }, [applyVolumes, prefs]);

  useEffect(() => {
    if (round && !isLoaded) setIsLoaded(true);
  }, [round, isLoaded]);
  useEffect(() => {
    const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
    return () => clearTimeout(t);
  }, [isLoaded]);

  function buildLiveBoxes(payload: { boxStats?: BoxStat[]; boxes?: BoxDef[] }): LiveBox[] {
    const src = (payload.boxStats?.length ? payload.boxStats : payload.boxes) ?? [];

    // Map raw → keyed record (last one wins, but we’ll only keep CORE)
    const tmpMap = new Map<string, LiveBox>();

    for (const it of src as any[]) {
      // server can send "box" or "title"
      const rawTitle = it.box ?? it.title ?? "";
      const key = norm(rawTitle); // e.g. "Meat" → "meat"
      if (!CORE_ORDER.includes(key as any)) continue; // drop pizza/salad/others

      const title = CORE_LABEL[key as keyof typeof CORE_LABEL];
      const multiplier = Number(it.multiplier ?? 0);
      const total = Number((it.totalAmount ?? it.totalBet) ?? 0);
      const bettors = Number((it.bettorsCount ?? it.userCount) ?? 0);

      tmpMap.set(key, {
        key,
        title,
        icon: it.icon,       // emoji if server provides
        multiplier: isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
        total: isFinite(total) && total >= 0 ? total : 0,
        bettors: isFinite(bettors) && bettors >= 0 ? bettors : 0,
      });
    }

    // Return in fixed order; if some are missing, still create placeholders (multiplier 1, totals 0)
    return CORE_ORDER.map(k => {
      const v = tmpMap.get(k);
      return (
        v ?? {
          key: k,
          title: CORE_LABEL[k],
          icon: undefined,
          multiplier: 1,
          total: 0,
          bettors: 0,
        }
      );
    });
  }

  const liveBoxes = useMemo(
    () => buildLiveBoxes(round ?? {}),
    [round?.boxStats, round?.boxes]
  );

  const sliceCount = liveBoxes.length || 1;

  // balance flourish
  const [lastBalance, setLastBalance] = useState<number | null>(null);
  const [gainCoins, setGainCoins] = useState<string[]>([]);
  useEffect(() => {
    if (!user) return;
    if (lastBalance !== null) {
      const delta = user.balance - lastBalance;
      if (delta > 0) {
        const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
        const ids = Array.from({ length: n }, () => uid());
        setGainCoins((p) => [...p, ...ids]);
        setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
      }
    }
    setLastBalance(user.balance);
  }, [user?.balance, user, lastBalance]);

  /** ===== geometry / targets ===== */
  const getContainerRect = useCallback(() => {
    return phoneRef.current?.getBoundingClientRect() || null;
  }, []);
  const getWheelCenter = useCallback(() => {
    const cont = getContainerRect();
    const wheel = wheelRef.current?.getBoundingClientRect();
    if (cont && wheel) {
      return {
        x: wheel.left - cont.left + wheel.width / 2,
        y: wheel.top - cont.top + wheel.height / 2,
      };
    }
    return { x: (cont?.width ?? 0) / 2, y: 280 };
  }, [getContainerRect]);

  const slices: readonly FoodsKey[] = FOODS;
  const sliceAngle = 360 / slices.length;

  const hash01 = (str: string, s = 0) => {
    let h = 2166136261 ^ s;
    for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
    return ((h >>> 0) % 10000) / 10000;
  };

  const sliceButtonCenter = useCallback(
    (sliceIndex: number) => {
      const { x: cx, y: cy } = getWheelCenter();
      const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
      const ang = (angDeg * Math.PI) / 180;
      return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
    },
    [getWheelCenter, sliceAngle, ringR]
  );

  const targetForBet = useCallback(
    (sliceIndex: number, betId: string) => {
      const c = sliceButtonCenter(sliceIndex);
      const a = 2 * Math.PI * hash01(betId, 3);
      const r = 8 + 18 * hash01(betId, 4);
      return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
    },
    [sliceButtonCenter]
  );

  /** ===== history & leaderboard (per 10 rounds) ===== */
  const [winnersHistory, setWinnersHistory] = useState<ApiHistoryItem[]>([]);
  const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [intermissionSec, setIntermissionSec] = useState<number | undefined>(undefined);
  const [blockCount, setBlockCount] = useState(0); // 0..10


  const serverBlockRound =
    (typeof (round as any)?.blockRound === "number"
      ? (round as any).blockRound
      : typeof (round as any)?.indexInBlock === "number"
        ? (round as any).indexInBlock
        : typeof (round as any)?.roundNumber === "number"
          ? ((round as any).roundNumber % 10) + 1
          : undefined) as number | undefined;

  const displayBlockRound = serverBlockRound ?? ((blockCount % 10) || 10);

  /** ===== flies ===== */
  const spawnLocalFly = useCallback(
    (to: { x: number; y: number }, value: number) => {
      const cont = getContainerRect();
      const chip = chipRefs.current[value]?.getBoundingClientRect();
      const from =
        chip && cont
          ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
          : { x: to.x, y: to.y };
      const id = uid();
      setFlies((p) => [...p, { id, from, to, value }]);
      setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
    },
    [getContainerRect]
  );

  const spawnRemoteFly = useCallback(
    (to: { x: number; y: number }, value: number) => {
      const c = getWheelCenter();
      const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
      const id = uid() //crypto.randomUUID();
      setRemoteFlies((p) => [...p, { id, from, to, value }]);
      setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
    },
    [getWheelCenter]
  );

  /** ===== on bet echo ===== */


  /** ===== local pointer-decided winner ===== */
  const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

  /** ===== clear per round / pause ===== */
  useEffect(() => {
    if (!round) return;
    if (currentRoundId && currentRoundId !== round.roundId) {
      setStacked([]);
      setFlies([]);
      setRemoteFlies([]);
      setPayoutFlies([]);
      setBankFlies([]);
      setForcedWinner(null);
    }
    setCurrentRoundId(round.roundId);
    if (round?.roundStatus === "revealed") {
      setStacked([]);
      setFlies([]);
      setRemoteFlies([]);
      setPayoutFlies([]);
      setBankFlies([]);
      setForcedWinner(null);
      setShowRoundWinners(false);
    }
  }, [round?.roundId, round?.roundStatus, currentRoundId]);

  /** ===== spin & settle ===== */
  const controls = useAnimation();
  //const lastSpinRoundRef = useRef<string | null>(null);

  const [wheelDeg, setWheelDeg] = useState(0);

  // when betting closes, hide transient flies
  useEffect(() => {
    if (round?.roundStatus === "revealing") {
      setFlies([]); setRemoteFlies([]);
    }
  }, [round?.roundStatus]);

  // after the reveal is finished, hard reset per round
  useEffect(() => {
    if (!round) return;
    if (currentRoundId && currentRoundId !== round.roundId) { /* (optional) */ }
    setCurrentRoundId(round.roundId);
    if (round.roundStatus === "revealed" || round.roundStatus === "completed") {
      setStacked([]); setFlies([]); setRemoteFlies([]);
      setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
      setShowRoundWinners(false);
    }
  }, [round?.roundId, round?.roundStatus, currentRoundId]);


  // Clear per round when SETTLED (after reveal is done)
  useEffect(() => {
    if (!round) return;
    if (currentRoundId && currentRoundId !== round.roundId) { /* clear arrays ... */ }
    setCurrentRoundId(round.roundId);
    if (round.roundStatus === "revealed") {
      setStacked([]); setFlies([]); setRemoteFlies([]);
      setPayoutFlies([]); setBankFlies([]); setForcedWinner(null);
      setShowRoundWinners(false);
    }
  }, [round?.roundId, round?.roundStatus, currentRoundId]);


  // Track previous status to detect OPEN -> CLOSED edge
 // const prevStatusRef = useRef<string | null>(null);

  // useEffect(() => {
  //   const status = round?.roundStatus ?? null;
  //   const prev = prevStatusRef.current;

  //   // Fire exactly once per round when betting closes (reveal/spin phase begins)
  //   const shouldSpin = prev === "betting" && status === "revealing";

  //   if (!shouldSpin) {
  //     prevStatusRef.current = status;
  //     return;
  //   }
  //   prevStatusRef.current = status;

  //   // Hide transient coins
  //   setFlies([]);
  //   setRemoteFlies([]);
  //   setForcedWinner(null);

  //   if (revealAudioRef.current && audioReady) {
  //     revealAudioRef.current.pause();
  //     revealAudioRef.current.currentTime = 0;
  //     revealAudioRef.current.play().catch(() => { });
  //   }


  //   function indexUnderPointerDynamic(rotDeg: number) {
  //     const a = (((POINTER_DEG - rotDeg + 90) % 360) + 360) % 360;
  //     return Math.floor((a + sliceAngle / 2) / sliceAngle) % sliceCount;
  //   }
  //   function rotationToCenterIndexDynamic(i: number) {
  //     return POINTER_DEG - i * sliceAngle + 90;
  //   }
  //   const current = wheelDegRef.current || 0;
  //   const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
  //   const jitter = hash01((round?.roundId ?? "seed") + Date.now().toString(), 99) * 360; // make sure we don't get same angle if id repeats
  //   const total = current + base + jitter;

  //   (async () => {
  //     await controls.start({
  //       rotate: total,
  //       transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
  //     });

  //     const idx = indexUnderPointerDynamic(total);
  //     const ideal = rotationToCenterIndexDynamic(idx);
  //     const k = Math.round((total - ideal) / 360);
  //     const settleRot = ideal + 360 * k;

  //     await controls.start({
  //       rotate: settleRot,
  //       transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
  //     });

  //     const winner = FOODS[idx] as FoodsKey;
  //     setForcedWinner(winner);
  //     doRevealFlights(winner);
  //     handleWin(winner);
  //   })();
  // }, [round?.roundStatus, controls, prefersReducedMotion, audioReady, round?.roundId]);
  // //////



// Start fast highlight when we enter revealing
useEffect(() => {
  if (!sliceCount) return;

  if (round?.roundStatus === "revealing") {
    landedOnceRef.current = false;
    startCursor(70); // hop speed
  } else if (round?.roundStatus !== "revealed") {
    // any other phase (betting, completed, preparing) — stop the cursor
    stopCursor();
    setHlIndex(null);
  }

  return () => { /* no-op */ };
}, [round?.roundStatus, sliceCount]);

// When server reveals the winner, decelerate and land on that slice
useEffect(() => {
  if (!sliceCount) return;
  if (round?.roundStatus !== "revealed") return;

  const raw = (round as any)?.winnerBox ?? (round as any)?.winningBox;
  const winnerKey = norm(raw);
  const target = liveBoxes.findIndex((b) => norm(b.key) === winnerKey);

  if (target >= 0) {
    settleOnWinner(target);
  } else {
    // unknown key → just stop gracefully
    stopCursor();
  }
}, [round?.roundStatus, (round as any)?.winnerBox, (round as any)?.winningBox, liveBoxes, sliceCount]);

// Cleanup on unmount
useEffect(() => () => stopCursor(), []);



  function doRevealFlights(winner: FoodsKey) {
    const cont = getContainerRect();
    const bal = balanceRef.current?.getBoundingClientRect();
    const bank = bankRef.current?.getBoundingClientRect();

    /** ===== my winners -> balance ===== */
    if (user && bal && cont) {
      const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
      if (myWins.length) {
        if (winAudioRef.current && audioReady) {
          winAudioRef.current.pause();
          winAudioRef.current.currentTime = 0;
          winAudioRef.current.play().catch(() => { });
        }
        const flies = myWins.map((c, i) => {
          const idx = (slices as FoodsKey[]).indexOf(c.fruit);
          const p = targetForBet(idx, c.id);
          return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
        });
        setPayoutFlies(flies);
        setTimeout(() => {
          setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
          setPayoutFlies([]);
        }, 1200 + myWins.length * 50);
      }
    }

    /** ===== losers -> bank ===== */
    if (bank && cont) {
      const losers = stacked.filter((c) => c.fruit !== winner);
      if (losers.length) {
        const bflies = losers.map((c, i) => {
          const idx = (slices as FoodsKey[]).indexOf(c.fruit);
          const p = targetForBet(idx, c.id);
          return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
        });
        setBankFlies(bflies);
        setTimeout(() => {
          setStacked((prev) => prev.filter((c) => c.fruit === winner));
          setBankFlies([]);
        }, 1100 + losers.length * 30);
      }
    }

    /** ===== history + ranking + block counter ===== */
    const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
    if (winnersThisRound.size) {
      setWinsByPlayer((prev) => {
        const next = { ...prev } as Record<string, number>;
        for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
        return next;
      });
    }
    // 1) Aggregate bet & win per user for *this round*
    const perUser: Record<string, { bet: number; win: number }> = {};
    for (const c of stacked) {
      // total bet: all coins the user placed this round (any fruit)
      perUser[c.userId] ??= { bet: 0, win: 0 };
      perUser[c.userId].bet += c.value;

      // total win: only coins on the winning fruit times multiplier
      if (c.fruit === winner) {
        perUser[c.userId].win += c.value * MULTIPLIER[winner];
      }
    }
    function pseudoName(uid: string) {
      if (uid === user?.id) return user?.name || "You";
      const tail = uid.slice(-4).toUpperCase();
      return `Player ${tail}`;
    }

    // 2) Materialize entries and always include *you*, even if you didn’t bet
    const entries: RoundWinnerEntry[] = Object.keys(perUser).map((uid) => ({
      userId: uid,
      name: pseudoName(uid),
      bet: perUser[uid].bet,
      win: perUser[uid].win,
    }));

    if (!perUser[user?.id ?? ""] && user) {
      entries.push({
        userId: user.id,
        name: user.name || "You",
        bet: 0,
        win: 0,
      });
    }

    // 3) Sort by Win desc (then Bet desc as tiebreaker) and keep a reasonable list
    entries.sort((a, b) => (b.win - a.win) || (b.bet - a.bet));

    // 4) Save & show
    setRoundWinners(entries);
    setShowRoundWinners(true);
    // increment block count; show leaderboard exactly every 10 rounds
    setBlockCount((prev) => {
      console.log("prevvvvvvvvvvvvvvvvvvvvvvv", prev)
      const next = prev + 1;
      if (displayBlockRound >= 10) {
        setShowLeaderboard(true);
        setIntermissionSec(INTERMISSION_SECS);
      }
      return next >= 10 ? 10 : next;
    });
  }


  // track echo events we've already processed by betId
  const pendingLocalBetRef = useRef<Array<{ key: BoxKey; value: number; until: number }>>([]);
  function markPendingLocal(key: BoxKey, value: number, ms = 700) {
    const now = Date.now();
    pendingLocalBetRef.current.push({ key, value, until: now + ms });
    // cleanup old
    pendingLocalBetRef.current = pendingLocalBetRef.current.filter(x => x.until > now);
  }
  function shouldSuppressEcho(key: BoxKey, value: number) {
    const now = Date.now();
    const i = pendingLocalBetRef.current.findIndex(x => x.key === key && x.value === value && x.until > now);
    if (i >= 0) {
      pendingLocalBetRef.current.splice(i, 1); // consume
      return true;
    }
    return false;
  }

  console.log("roundddddddddddddddddddd", progress)


  const onSliceClick = useCallback(
    async (key: BoxKey) => {
      console.log("fruittttttttttttttttttttttttttttttttttttt", key)
      const bal = user?.balance ?? 0;
      if (bal <= 0) return notify("You don't have coin");
      if (bal < (selectedChip || 0)) return notify("Not enough balance for this chip");
      if (round?.roundStatus !== "betting" || showLeaderboard || !selectedChip) return;

      // 🔹 Instant local fly (no wait)
      const idx = liveBoxes.findIndex(b => b.key === key);
      if (idx >= 0) {
        const to = targetForBet(idx, uid()); // use a temp id just for offset variance
        spawnLocalFly(to, selectedChip);
        markPendingLocal(key, selectedChip); // so echo won't duplicate
      }

      // optimistic local total
      setUserBets(prev => ({ ...prev, [key]: (prev[key] ?? 0) + selectedChip }));

      // fire the request (no need to block UI)
      try {
        await placeBet(key, selectedChip);
      } catch (e) {
        // optional: rollback optimistic userBets or show toast
        notify("Bet failed");
      }
    },
    [user?.balance, round?.roundStatus, showLeaderboard, isRoundOver, selectedChip, placeBet, liveBoxes, targetForBet, spawnLocalFly]
  );


  // add near other refs:
  const seenEchoIdsRef = useRef<Set<string>>(new Set());
  //Suppress duplicate fly on echo
  useEffect(() => {
    if (!echoQueue.length || !round) return;

    const evt = echoQueue[0];
    // suppress exact duplicates by betId
    if (evt.betId && seenEchoIdsRef.current.has(evt.betId)) {
      shiftEcho();
      return;
    }
    if (evt.betId) seenEchoIdsRef.current.add(evt.betId);
    const keyRaw = resolveEventKey(evt) as BoxKey;

    const idx = liveBoxes.findIndex(b => norm(b.key) === norm(keyRaw));
    if (idx < 0) { shiftEcho(); return; }

    const to = targetForBet(idx, evt.betId);

    if (betAudioRef.current && audioReady) {
      betAudioRef.current.pause();
      betAudioRef.current.currentTime = 0;
      betAudioRef.current.play().catch(() => { });
    }

    // 🔹 Don’t double-spawn for your own just-clicked bet
    const isMine = evt.userId === user?.id;
    const suppress = isMine && shouldSuppressEcho(keyRaw, evt.value);

    if (!suppress) {
      if (isMine) spawnLocalFly(to, evt.value);
      else spawnRemoteFly(to, evt.value);
    }

    // keep stacked with server betId (no change)
    setStacked(prev =>
      prev.some(c => c.id === evt.betId)
        ? prev
        : [...prev, { id: evt.betId, fruit: keyRaw as any, value: evt.value, userId: evt.userId }]
    );

    shiftEcho();
  }, [
    echoQueue, round?.roundId, liveBoxes, audioReady, user?.id,
    spawnLocalFly, spawnRemoteFly, shiftEcho, targetForBet
  ]);



  const totalsForHot = useMemo(() => {
    const m: Record<BoxKey, number> = {};
    for (const bx of liveBoxes) m[bx.key] = bx.total ?? 0;
    return m;
  }, [liveBoxes]);

  const hotKey = useMemo<BoxKey | null>(() => {
    let best: BoxKey | null = null;
    let bestVal = 0;
    for (const bx of liveBoxes) {
      const v = totalsForHot[bx.key] ?? 0;
      if (v > bestVal) { bestVal = v; best = bx.key; }
    }
    return bestVal > 0 ? best : null;
  }, [liveBoxes, totalsForHot]);


  const ranking = useMemo(() => {
    const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
    arr.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
    return arr;
  }, [winsByPlayer]);

  // settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  /** ======== INTERMISSION COUNTDOWN ======== **/
  useEffect(() => {
    if (!showLeaderboard) return;
    if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;

    const t = setInterval(() => {
      setIntermissionSec((s) => (typeof s === "number" && s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [showLeaderboard, intermissionSec]);

  // when countdown finishes, auto-close & auto-start next round; also reset the block
  useEffect(() => {
    if (showLeaderboard && intermissionSec === 0) {
      // close modal
      setShowLeaderboard(false);
      setIntermissionSec(undefined);

      // reset block tallies for the next 10-round block
      setBlockCount(0);
      setWinsByPlayer({});
      //  setWinnersHistory([]);

      // tell the game to start the next round if it exposes a method
      if (typeof startNextRound === "function") {
        Promise.resolve(startNextRound()).catch(() => { });
      }
    }
  }, [showLeaderboard, intermissionSec, startNextRound]);


  useEffect(() => {
    // Reset the user bets when the round is over
    if (round?.roundStatus === "revealed" || round?.roundStatus === "completed") {
      // Reset all bets to 0
      setUserBets({
        meat: 0,
        tomato: 0,
        corn: 0,
        sausage: 0,
        lettuce: 0,
        carrot: 0,
        skewer: 0,
        ham: 0,
      });
    }
  }, [round?.roundStatus]);

  function handleWin(winner: FoodsKey) {
    const winAmount = userBets[winner] * MULTIPLIER[winner];
    console.log(`You won ${winAmount} coins on ${LABEL[winner]}!`);
    if (winAmount > 0) {
      // Prefer server-side credit if you have it:
      creditWin?.(winAmount).catch(() => {
        // fallback optimistic:
        updateBalance?.(winAmount);
      });
    }

  }

  // ===== Initial game loader (fixed-time) =====
  const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

  const [bootLoading, setBootLoading] = useState(true);
  const [bootProgress, setBootProgress] = useState(0); // 0..1
  const [loggedIn, setLoggedIn] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem("auth_token")); // set by your login
    setLoggedIn(!!localStorage.getItem("auth_token"));
  }, []);

  useEffect(() => {
    if (!bootLoading) return;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / LOADER_DURATION_MS);
      setBootProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // small grace so the bar reaches 100% visually
        setTimeout(() => setBootLoading(false), 150);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bootLoading]);


  function handleLoginSuccess() {
    // your LoginPage should save token to localStorage
    setToken(localStorage.getItem("auth_token"));
    setLoggedIn(true);
  }

  useEffect(() => {
    if (!showRoundWinners) return;

    let alive = true;
    (async () => {
      try {
        const data = await getRoundWinners();
        // console.log("rounddddddd winnerrrrrrrrrr", data) // no arg uses current round id
        if (alive) setRoundWinners(data);
      } catch (err) {
        console.error(err);
      }
    })();

    return () => { alive = false; };
  }, [showRoundWinners, getRoundWinners]);



  useEffect(() => {
    if (!showRoundWinners) return;
    let alive = true;

    (async () => {
      try {
        const rid = (round as any)?._id || round?.roundId || currentRoundId;
        const data = await getRoundWinners(rid);
        console.log("dataaaaaaaaaaaaaaaaaaaaaa", data)
        if (alive) setRoundWinners(data);
      } catch (err) {
        console.error(err);
      }
    })();

    return () => { alive = false; };
  }, [showRoundWinners, getRoundWinners, (round as any)?._id, round?.roundId, currentRoundId]);



  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await getCurrentHistory(); // ← call it
        if (!alive) return;
        setWinnersHistory(items.slice().sort((a: ApiHistoryItem, b: ApiHistoryItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } catch (e: any) {
        if (!alive) return;
        console.log(e?.message || "Failed to load history");
      }
    })();

    return () => { alive = false; };
  }, [getCurrentHistory, round]);

  console.log("winHistoryyyyyyyyyyyyyyyyyyyyyyyyyy", token)


  //console.log("roundddddddd",round)
  /** ==================== RENDER ==================== **/
  return (
    <div
      ref={pageRef}
      className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
      style={{
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* initial loader */}
      <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
      {/* login page */}
      {!loggedIn &&
        <LoginPage onLogin={handleLoginSuccess} />
      }
      {/* Game UI */}
      <div>
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* Phone frame */}
        <div
          ref={phoneRef}
          className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
          style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
        >
          <div className="absolute top-2 left-2 right-2 z-30">
            <div className="grid grid-cols-2 gap-2">
              {/* Left Side: Exit + Record */}
              <div className="flex items-center space-x-2">
                <button
                  aria-label="Exit"
                  className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                  onClick={() => {
                    /* exit logic */
                  }}
                >
                  <X size={18} />
                </button>

                <button
                  aria-label="Record"
                  className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                  onClick={() => setShowRecord(true)}
                >
                  <ScrollText size={18} />
                </button>
              </div>

              {/* Right Side: Sound + Help */}
              <div className="flex items-center space-x-2 justify-end">
                <button
                  aria-label="Sound Settings"
                  className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Volume2 size={18} />
                </button>

                <button
                  aria-label="Help"
                  className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                  onClick={() => setShowGameRules(true)}
                >
                  <MessageCircleQuestionMark size={18} />
                </button>
              </div>

              {/* Left Side: Block + Round Info */}
              <div className="text-white text-xs opacity-80 leading-tight">
                {/*         <div>Today's Round: {roundNum}</div> */}
                <div className="font-bold">Round: {displayBlockRound}</div>
              </div>

              {/* Right Side: Ping + Leaderboard */}
              <div className="flex justify-end items-center gap-2">
                <div className="flex items-center space-x-1 text-green-500 text-xs">
                  <Wifi size={14} className="animate-pulse" />
                  <span>45ms</span>
                </div>

                <button
                  ref={bankRef}
                  aria-label="Leaderboard"
                  className="p-1 rounded-full bg-white/10 border border-white/20 text-orange-300 hover:bg-white/20 transition"
                  onClick={() => setShowLeaderboard(true)}
                >
                  🏆
                </button>
              </div>
            </div>
          </div>

          {/* INLINE TOAST / TIP (no external lib) */}
          <div className="pointer-events-none absolute inset-x-0 top-14 z-[60]" aria-live="polite" aria-atomic="true">
            <AnimatePresence>
              {tip && (
                <motion.div
                  key="tip"
                  initial={{ y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="mx-auto w-max max-w-[85%] rounded-full px-3 py-1.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur-md"
                  style={{
                    background: "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
                    border: "1px solid rgba(255,255,255,.25)",
                    boxShadow: "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
                  }}
                >
                  {tip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* WHEEL AREA */}
          <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
            {/* pointer */}
            {/* <div className="absolute left-1/2 -translate-x-1/2 z-30">
              <div
                className="w-7 h-10 rounded-[12px] relative"
                style={{
                  background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
                }}
              >
                <div
                  className="absolute left-1/2 -bottom-[10px] -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "12px solid transparent",
                    borderRight: "12px solid transparent",
                    borderTop: "16px solid #f59e0b",
                    filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
                  }}
                />
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
                  <div className="absolute -inset-y-8 -left-16 w-12 rotate-[25deg] shimmer" />
                </div>
              </div>
            </div> */}

            {/* wheel disc */}
            <motion.div
              ref={wheelRef}
              className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
              animate={controls}
              onUpdate={(latest) => {
                if (typeof (latest as any).rotate === "number") {
                  const rot = (latest as any).rotate as number;
                  setWheelDeg(rot);
                  wheelDegRef.current = rot;
                }
              }}
              style={{
                top: wheelTop,
                width: D,
                height: D,
                borderRadius: 9999,
                background:
                  "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
                boxShadow:
                  "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
                transformStyle: "preserve-3d",
                ["--wheel-rot" as any]: `${wheelDeg}deg`,
              }}
            >
              {/* rim highlight */}
              <div
                className="absolute inset-0 rounded-full opacity-50"
                style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
              />

              {/* spokes */}
              {FOODS.map((_, i) => (
                <div
                  key={`spoke-${i}`}
                  className="absolute left-1/2 top-1/2 origin-left"
                  style={{
                    width: R,
                    height: 5,
                    background: "rgba(255,255,255,.05)",
                    transform: `rotate(${i * (360 / FOODS.length)}deg)`,
                  }}
                />
              ))}

              {/* per-slice buttons */}
              {liveBoxes.map((bx, i) => {
                // geometry
                const angDeg = i * sliceAngle;
                const rad = ((angDeg - 90) * Math.PI) / 180;
                const cx = R + ringR * Math.cos(rad);
                const cy = R + ringR * Math.sin(rad);
                // const totalBet = userBets[bx.key] ?? 0;

                const disabled = round?.roundStatus !== "betting" || showLeaderboard;
                const isWinner = forcedWinner === bx.key && round?.roundStatus !== "betting";

                const studRadius = 5;
                const studOffset = btn / 2 + 10;
                const tx = -Math.sin(rad);
                const ty = Math.cos(rad);
                const lx = cx - tx * studOffset;
                const ly = cy - ty * studOffset;

                // for hover/tap gating
                const balanceNow = user?.balance ?? 0;
                const noCoins = balanceNow <= 0;
                const cannotAffordChip = balanceNow < (selectedChip || 0);
                const visuallyDisabled = disabled || noCoins || cannotAffordChip;
const isActive = hlIndex === i; // add this near where you compute isWinner, disabled, etc.
const ACTIVE_RING_PX = 4; // thickness of the moving border
                return (
                  <div key={bx.key}>
                    {/* Stud */}
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: lx - studRadius,
                        top: ly - studRadius,
                        width: studRadius * 2,
                        height: studRadius * 2,
                        background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
                        boxShadow: "0 2px 4px rgba(0,0,0,.5)",
                      }}
                    />

                    {/* Slice button */}
                    <motion.button
                      whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
                      whileHover={prefersReducedMotion || visuallyDisabled ? {} : { translateZ: 10 }}
                      onClick={() => {
                        if (noCoins) return notify("You don't have coin");
                        if (cannotAffordChip) return notify("Not enough balance for this chip");
                        if (disabled || !selectedChip) return;
                        onSliceClick(bx.key);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
style={{
  left: cx,
  top: cy,
  width: btn,
  height: btn,

  // keep your background or change if you like; this doesn't affect glassiness of the border
  background:
    "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",

  // make the moving border thick & solid
  borderStyle: "solid",
  borderWidth: isActive ? ACTIVE_RING_PX : 1,
  borderColor: isWinner
    ? "#22c55e"
    : isActive
      ? hlColor
      : "rgba(255,255,255,.15)",

  // bold outer glow for active; remove the glassy inset highlight
  boxShadow: isWinner
    ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45)"
    : isActive
      ? `0 0 0 2px ${hlColor}, 0 0 10px ${hlColor}cc, 0 0 22px ${hlColor}88`
      : "0 12px 28px rgba(0,0,0,.45)",

  // snappy transitions so the ring feels crisp while moving
  transition: "border-color 80ms linear, border-width 80ms linear, box-shadow 80ms linear",
}}

                      aria-label={`Bet on ${bx.title} (pays x${bx.multiplier})`}
                      disabled={disabled}
                      aria-disabled={visuallyDisabled}
                      title={`Bet on ${bx.title} (pays x${bx.multiplier})`}
                    >
                      {/* Counter-rotated content */}
                      <div
                        className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
                        style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
                      >
                        <div aria-hidden className="text-[28px] leading-none drop-shadow">
                          {bx.icon ?? (Object.prototype.hasOwnProperty.call(EMOJI, bx.key) ? EMOJI[bx.key as FoodsKey] : "❓")}
                        </div>

                        <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
                          win <span className="font-extrabold">x{bx.multiplier}</span>
                        </div>

                        {/* Hot badge */}
                        {hotKey === bx.key && (
                          <div
                            className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
                            style={{
                              boxShadow: "0 6px 14px rgba(0,0,0,.45)",
                              border: "1px solid rgba(255,255,255,.25)",
                            }}
                            aria-label={`HOT: ${bx.title} has the highest total bets`}
                          >
                            HOT
                          </div>
                        )}

                        {/* Total bet text (your local bet amount or show server total if preferred) */}
                        <div className="text-[10px] text-white">
                          Total: {formatNumber(bx.total)}
                        </div>
                      </div>
                    </motion.button>
                  </div>
                );
              })}

            </motion.div>

            {/* Center hub */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
              style={{
                top: hubTop,
                width: hubSize,
                height: hubSize,
                background:
                  "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
                boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.25)",
              }}
              animate={{
                boxShadow: [
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            >
              <img src="/cat_anomation.gif" className="w-64 absolute -top-8" />
              <div className="text-center relative">
                <div className="text-[12px] font-semibold tracking-wide mt-9">
                  {bettingOpen && !showLeaderboard
                    ? "Place bets"
                    : round?.roundStatus === "revealing"
                      ? "Revealing…"
                      : (round?.roundStatus === "revealed" || round?.roundStatus === "completed")
                        ? "Next round in"
                        : "Preparing…"}
                </div>

                <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
                  {`${Math.floor(uiLeftMs / 1000)}s`}
                </div>
              </div>

            </motion.div>
          </div>

          {/* Progress & platform */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: wheelTop + R * 2.2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
          >
            <div className="relative w-full h-full">
              <div
                className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
                style={{
                  left: "50%",
                  transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
                  width: D * 0.28,
                  height: Math.max(110, D * 0.28),
                  boxShadow: "0 4px 0 #2379c9",
                }}
              />
              <div
                className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
                style={{
                  left: "50%",
                  transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
                  width: D * 0.28,
                  height: Math.max(110, D * 0.28),
                  boxShadow: "0 4px 0 #2379c9",
                }}
              />
              <div className="absolute -left-8 -right-8 flex justify-between">
                {/* Pizza */}
                <div className="flex flex-col items-center w-12">
                  <div className="bg-yellow-400 rounded-full p-1 shadow-md border-2 border-orange-500 z-30">
                    <span className="text-3xl pb-1">🍕</span>
                  </div>
                  <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
                    Total 400k
                  </div>
                  <div className="bg-[#0864b4] text-white text-[10px] font-bold px-1 rounded-md  -bottom-2 shadow absolute z-30">
                    4.37x
                  </div>
                  <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-yellow-400  border-orange-500 absolute ml-20 z-20 mt-3">

                    <path
                      d="M20 40
       C 110 0, 180 10, 210 60
       C 235 105, 175 125, 145 105
       C 115 85, 135 55, 200 55
       C 285 55, 330 85, 360 110"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />

                    <path
                      d="M360 110 L 395 110"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M395 110 L 372 95 M395 110 L 372 125"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <div className="absolute left-3/12 mt-6 ml-3">
                    <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
                      Pizza
                    </div>
                  </div>
                </div>
                {/* Salad */}
                <div className="flex flex-col items-center w-12">
                  <div className="bg-green-400 rounded-full p-1 shadow-md border-2 border-green-600 z-30">
                    <span className="text-3xl">🥗</span>
                  </div>
                  <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md -mt-2 shadow absolute z-30">
                    Total 100k
                  </div>
                  <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md -mr-3 -bottom-2 shadow absolute z-30">
                    1.25x
                  </div>
                  <svg viewBox="0 0 420 180" className="w-[60px] h-[40px] text-green-400  border-green-600 absolute mr-22 z-20 -scale-x-100 mt-2">

                    <path
                      d="M20 40
       C 110 0, 180 10, 210 60
       C 235 105, 175 125, 145 105
       C 115 85, 135 55, 200 55
       C 285 55, 330 85, 360 110"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />

                    <path
                      d="M360 110 L 395 110"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M395 110 L 372 95 M395 110 L 372 125"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <div className="absolute right-3/12 mt-6 mr-3">
                    <div className=" text-white text-[8px] font-bold shadow-md shadow-black/40 bg-[#36a2ff] backdrop-blur-sm p-1 rounded-sm">
                      Salad
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold"
                style={{
                  bottom: 0,
                  width: D * 1.15,
                  height: 52,
                  background: "linear-gradient(180deg, #36a2ff, #2379c9)",
                  border: "4px solid #1e40af",
                  boxShadow: "0 5px 0 #1e3a8a",
                }}
              >
                <div className="h-full w-full flex items-center gap-2 px-2 overflow-hidden">
                  <div
                    className="shrink-0 rounded-xl px-3 py-1 text-[12px] font-bold"
                    style={{
                      background: "linear-gradient(180deg,#2f63c7,#1f4290)",
                      border: "1px solid rgba(255,255,255,.25)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
                    }}
                  >
                    Result
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {(winnersHistory.length ? [...winnersHistory] : []).map((k, idx) => {
                      const boxKey = (norm((k as any).box ?? (k as any).title) as FoodsKey);
                      const emoji = EMOJI[boxKey] ?? "❓";
                      const labelText = LABEL[boxKey] ?? ((k as any).box ?? (k as any).title ?? "");
                      return (
                        <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
                          <div
                            className="w-7 h-7 rounded-xl grid place-items-center"
                            style={{
                              background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
                              border: "1px solid #7fb4ff",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
                            }}
                            title={labelText}
                          >
                            <span className="text-[16px] leading-none">{emoji}</span>
                          </div>
                          {idx === 0 && (
                            <div
                              className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[6px] font-black"
                              style={{
                                background: "linear-gradient(180deg,#ffd84d,#ffb800)",
                                border: "1px solid rgba(0,0,0,.2)",
                                boxShadow: "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
                                color: "#3a2a00",
                                whiteSpace: "nowrap",
                              }}
                            >
                              NEW
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {winnersHistory.length === 0 && (
                      <div className="text-[11px] font-semibold text-white/90 opacity-90">No results yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CHIP BAR ===== */}
          <div className="px-3 relative">
            <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
              <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
                Mine {"" + fmt(myBetTotal)}
              </div>
              <div className="px-2 rounded-full bg-blue-400/40 backdrop-blur-md border border-white/20 shadow">
                Total 100M
              </div>
            </div>

            <div
              className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
              style={{
                background: "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
                borderColor: "rgba(255,255,255,0.35)",
                boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
              }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
                style={{
                  background: "linear-gradient(180deg,#60a5fa,#2563eb)",
                  borderColor: "rgba(255,255,255,.25)",
                  boxShadow: "0 8px 18px rgba(37,99,235,.45)",
                }}
              >
                Select Bet Amount
              </div>

              <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
                {setting?.chips.map((v: any) => {
                  const color = chipColorMap[v] || "#6b7280"; // default gray if no color mapped
                  const selected = selectedChip === v;
                  const afford = balance >= v;

                  return (
                    <motion.button
                      key={v}
                      ref={(el) => {
                        chipRefs.current[v] = el;
                        return undefined;
                      }}
                      whileTap={{ scale: 0.95, rotate: -2 }}
                      onClick={() => {
                        if (!afford) {
                          notify("Not enough balance for this chip");
                          return;
                        }
                        setSelectedChip(v);
                      }}
                      className={`relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none`}
                      style={{
                        width: 48,
                        height: 48,
                        transformStyle: "preserve-3d",
                        boxShadow: selected
                          ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
                          : "0 8px 16px rgba(0,0,0,.35)",
                        border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
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
            )
          `,
                      }}
                      title={`${v}`}
                      aria-label={`Select chip ${v}`}
                      aria-disabled={!afford}
                    >
                      <div
                        className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
                        style={{
                          width: 34,
                          height: 34,
                          background: selected
                            ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
                            : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
                          border: "2px solid rgba(0,0,0,.15)",
                          color: selected ? "#0b3a8e" : "#1f2937",
                          boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
                        }}
                      >
                        {v >= 1000 ? v / 1000 + "K" : v}
                      </div>

                      {selected && (
                        <div
                          className="absolute inset-[-4px] rounded-full pointer-events-none"
                          style={{
                            border: `2px solid ${color}88`,
                            boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Stats strip */}
          <div className="px-3 mt-3">
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
                <div ref={balanceRef} className="text-[14px] font-bold tabular-nums leading-tight">
                  💎 {fmt(balance ?? 0)}
                </div>
              </div>
              {/* Avatar */}
              <div
                className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border ring-0 absolute top-4 left-1/2 -translate-x-1/2"
                style={{
                  borderColor: "rgba(255,255,255,.25)",
                  boxShadow: "0 2px 8px rgba(0,0,0,.25)",
                  background:
                    "linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.7))",
                }}
              >
                <span className="text-lg text-black/50">👤</span>
              </div>
              <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
                <div className="text-[11px] opacity-90 leading-none">Rewards</div>
                <div className="text-[14px] font-bold tabular-nums leading-tight">
                  💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}
                </div>
              </div>
            </div>
          </div>

          {/* transient & payout flies */}
          <div className="pointer-events-none absolute inset-0 z-30">
            <AnimatePresence>
              {flies.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
                  animate={{ x: f.to.x - 10, y: f.to.y - 8, opacity: 1, scale: 1, rotate: 360 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                  className="absolute"
                >
                  <Coin />
                </motion.div>
              ))}
              {remoteFlies.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ x: f.from.x - 1, y: f.from.y - 1, opacity: 0, scale: 0.85 }}
                  animate={{ x: f.to.x - 10, y: f.to.y - 10, opacity: 1, scale: 1, rotate: 360 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                  className="absolute w-10 h-10"
                >
                  <Coin />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute inset-0">
            <AnimatePresence>
              {payoutFlies.map((f) => (
                <motion.div
                  key={`p-${f.id}`}
                  initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
                  animate={{
                    x:
                      (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
                      (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
                    y:
                      (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
                      (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
                  className="absolute w-10 h-10"
                >
                  <Coin />
                </motion.div>
              ))}

              {bankFlies.map((f) => (
                <motion.div
                  key={`b-${f.id}`}
                  initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
                  animate={{
                    x:
                      (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
                      (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 5,
                    y:
                      (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
                      (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 5,
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
                  className="absolute w-10 h-10"
                >
                  <Coin />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* MODALS */}
          <LeaderboardModal
            open={showLeaderboard}
            onClose={() => {
              setShowLeaderboard(false);
              setIntermissionSec(undefined);
            }}
            onStartNow={() => setIntermissionSec(0)}
            intermissionSec={intermissionSec}
            ranking={ranking}
            user={user ?? undefined}
          />
          <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
          <Record open={showRecord} onClose={() => setShowRecord(false)} />

          {/* Settings bottom sheet */}
          <SettingsBottomSheet
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            prefs={prefs}
            setPrefs={setPrefs}
          />

          <RoundWinnersModal
            open={showRoundWinners}
            onClose={() => setShowRoundWinners(false)}
            entries={roundWinners}
            meId={user?.id}
          />

        </div>

        {/* gain flourish */}
        <div className="pointer-events-none fixed inset-0">
          <AnimatePresence>
            {gainCoins.map((id, i) => {
              const cont = phoneRef.current?.getBoundingClientRect();
              const bal = balanceRef.current?.getBoundingClientRect();
              const sx = cont ? cont.left + cont.width / 2 : 0;
              const sy = cont ? cont.top + 520 : 0;
              const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
              const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
              return (
                <motion.div
                  key={id}
                  initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
                  animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
                  className="absolute w-10 h-10"
                >
                  <Coin />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

}

/** ==================== Types ==================== **/
type StackedCoin = { id: string; fruit: FoodsKey; value: number; userId: string };
type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
type BankFly = { id: string; fromX: number; fromY: number; delay: number };



function Coin() {
  return (
    <div className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
      style={{
        background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
        borderColor: "#fbbf24",
        boxShadow: "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
      }}
    >
      <div className="w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
      >
        <span className="text-amber-900 text-[5px] font-extrabold">$</span>
      </div>
    </div>
  );
}

/** utils */
function fmt(n: number) {
  const format = (num: number, suffix: string) => {
    const formatted = (num).toFixed(1);
    return formatted.endsWith('.0') ? `${parseInt(formatted)}${suffix}` : `${formatted}${suffix}`;
  };

  if (n >= 1_000_000) return format(n / 1_000_000, 'M');
  if (n >= 1_000) return format(n / 1_000, 'K');
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
}


function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}











