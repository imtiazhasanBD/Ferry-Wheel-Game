// import { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";

// const CHIPS = [1000, 2000, 3000, 4000, 5000] as const;

// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };

// // persistent coin placed on a fruit (relative coords inside the fruit box)
// type StackedCoin = { id: string; fruit: FruitKey; relX: number; relY: number; value: number; userId: string };

// // winner payout flies (from a stacked coin’s absolute position → balance)
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };

// // losers’ coins → bank
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// const MAX_COINS_PER_FRUIT = 60;

// /** tiny base64 blips so you don’t need hosting */
// const SND_BET =
//   "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQAAAP8AAP8A//8A/wAAAP8A//8A/wAAAP8AAP8A";
// const SND_REVEAL =
//   "data:audio/wav;base64,UklGRoAAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQAAAAAAAP8AAP//AAD//wAA//8AAP//AAD/";

// type SoundPrefs = {
//   master: number; // 0..1
//   bet: number;    // 0..1
//   reveal: number; // 0..1
// };

// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8 };
// const PREFS_KEY = "soundPrefsV1";

// export default function App() {
//   const { user, round, totals, placeBet, echoQueue, shiftEcho } = useGame();

//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const fruitRefs = useRef<Record<FruitKey, HTMLDivElement | null>>({
//     cherry: null, lemon: null, grape: null, watermelon: null,
//     apple: null, pineapple: null, blueberry: null, strawberry: null,
//   });
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);

//   const bettingOpen = round?.state === "betting";
//   const progress = round ? 1 - round.timeLeftMs / 10000 : 0;

//   const [selectedChip, setSelectedChip] = useState<number>(1000);

//   // transient flying coins
//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);

//   // persistent stacked coins (stay visible until pause/new round)
//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   // payout flies (your winning coins → balance)
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   // losers’ coins → bank
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // Balance gain animation (minor flourish)
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);

//   // Sounds + settings
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);

//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) return JSON.parse(raw);
//     } catch {}
//     return DEFAULT_PREFS;
//   });
//   const [showSettings, setShowSettings] = useState(false);

//   function applyVolumes() {
//     const master = clamp01(prefs.master);
//     const bet = clamp01(prefs.bet);
//     const reveal = clamp01(prefs.reveal);
//     if (betAudioRef.current) betAudioRef.current.volume = master * bet;
//     if (revealAudioRef.current) revealAudioRef.current.volume = master * reveal;
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch {}
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefs.master, prefs.bet, prefs.reveal]);

//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const count = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: count }, () => crypto.randomUUID());
//         setGainCoins((prev) => [...prev, ...ids]);
//         setTimeout(() => setGainCoins((prev) => prev.slice(count)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance]);

//   // --- geometry helpers ---
//   function getCenter(el: HTMLElement | null) {
//     const container = containerRef.current?.getBoundingClientRect();
//     const r = el?.getBoundingClientRect();
//     if (!r || !container) return { x: 0, y: 0 };
//     return { x: r.left + r.width / 2 - container.left, y: r.top + r.height / 2 - container.top };
//   }

//   function fruitRect(key: FruitKey) {
//     const cont = containerRef.current?.getBoundingClientRect();
//     const r = fruitRefs.current[key]?.getBoundingClientRect();
//     if (!cont || !r) return null;
//     return { x: r.left - cont.left, y: r.top - cont.top, w: r.width, h: r.height };
//   }

//   function hash01(str: string, salt = 0) {
//     // simple deterministic hash -> [0,1)
//     let h = 2166136261 ^ salt;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   }

//   // deterministic relative position inside a fruit box from betId
//   function relPosFromBet(betId: string): { rx: number; ry: number } {
//     const rx = 0.2 + 0.6 * hash01(betId, 1);
//     const ry = 0.25 + 0.5 * hash01(betId, 2);
//     return { rx, ry };
//   }

//   function absFromRel(key: FruitKey, rx: number, ry: number) {
//     const rect = fruitRect(key);
//     if (!rect) return { x: 0, y: 0 };
//     const pad = 16;
//     const x = rect.x + pad + (rect.w - 2 * pad) * rx;
//     const y = rect.y + pad + (rect.h - 2 * pad) * ry;
//     return { x, y };
//   }

//   // remote origin for other users (near top center with jitter)
//   function getRemoteOrigin() {
//     const cont = containerRef.current?.getBoundingClientRect();
//     if (!cont) return { x: 0, y: 0 };
//     const x = cont.width * 0.5 + (Math.random() - 0.5) * 120;
//     const y = 24 + Math.random() * 36;
//     return { x, y };
//   }

//   // --- spawning helpers ---
//   function spawnLocalFlyTo(to: { x: number; y: number }, value: number) {
//     const from = getCenter(chipRefs.current[value]!);
//     const id = crypto.randomUUID();
//     setFlies((prev) => [...prev, { id, from, to, value }]);
//     setTimeout(() => setFlies((prev) => prev.filter((f) => f.id !== id)), 1200);
//   }

//   function spawnRemoteFlyTo(to: { x: number; y: number }, value: number) {
//     const from = getRemoteOrigin();
//     const id = crypto.randomUUID();
//     setRemoteFlies((prev) => [...prev, { id, from, to, value }]);
//     setTimeout(() => setRemoteFlies((prev) => prev.filter((f) => f.id !== id)), 1200);
//   }

//   // --- handle incoming bet echoes: animate + persist + SOUND ---
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;

//     const evt = echoQueue[0]; // { betId, userId, fruit, value }
//     const { rx, ry } = relPosFromBet(evt.betId);
//     const to = absFromRel(evt.fruit, rx, ry);

//     // sound: soft blip on each bet
//     if (betAudioRef.current) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => {});
//     }

//     if (evt.userId === user?.id) spawnLocalFlyTo(to, evt.value);
//     else spawnRemoteFlyTo(to, evt.value);

//     // persist stacked coin (relative coords) so it remains visible
//     setStacked((prev) => {
//       if (prev.some((c) => c.id === evt.betId)) return prev;
//       return [...prev, { id: evt.betId, fruit: evt.fruit, relX: rx, relY: ry, value: evt.value, userId: evt.userId }];
//     });

//     // shift queue
//     shiftEcho();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [echoQueue, round?.roundId]);

//   // track round id and clear on new round or pause
//   useEffect(() => {
//     if (!round) return;

//     // New round started?
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//     setCurrentRoundId(round.roundId);

//     // Hard clear at pause; we keep coins during revealing for clarity
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//   }, [round?.roundId, round?.state]);

//   // --- on REVEAL: animate YOUR winning coins → balance + losers’ coins → bank + SOUND ---
//   const revealHandledRef = useRef<string | null>(null); // roundId we already reacted to
//   useEffect(() => {
//     if (!round) return;
//     if (round.state !== "revealing" || !round.winner) return;
//     if (revealHandledRef.current === round.roundId) return; // only once per round
//     revealHandledRef.current = round.roundId;

//     // play reveal sound
//     if (revealAudioRef.current) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }

//     const cont = containerRef.current?.getBoundingClientRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();
//     if (!cont || !bank) return;

//     // My winning coins → balance
//     if (user && bal) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === round.winner);
//       if (myWins.length) {
//         const toX = bal.left - cont.left + bal.width / 2 - 20;
//         const toY = bal.top - cont.top + bal.height / 2 - 20;
//         const flies: PayoutFly[] = myWins.map((c, i) => {
//           const { x, y } = absFromRel(c.fruit, c.relX, c.relY);
//           return { id: c.id, fromX: x - 20, fromY: y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         // remove my winning coins after animation
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === round.winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     // All losing coins (any user, fruit !== winner) → bank
//     const losers = stacked.filter((c) => c.fruit !== round.winner);
//     if (losers.length) {
//       const toX = bank.left - cont.left + bank.width / 2 - 20;
//       const toY = bank.top - cont.top + bank.height / 2 - 20;
//       const bflies: BankFly[] = losers.map((c, i) => {
//         const { x, y } = absFromRel(c.fruit, c.relX, c.relY);
//         return { id: c.id, fromX: x - 20, fromY: y - 20, delay: i * 0.03 };
//       });
//       setBankFlies(bflies);
//       // remove losing coins after animation
//       setTimeout(() => {
//         setStacked((prev) => prev.filter((c) => c.fruit === round.winner));
//         setBankFlies([]);
//       }, 1100 + losers.length * 30);
//     }
//   }, [round?.state, round?.winner, round?.roundId, stacked, user]);

//   async function onFruitClick(key: FruitKey) {
//     if (!bettingOpen || !selectedChip) return;
//     const resp = await placeBet(key, selectedChip);
//     if (!resp.ok) {
//       // nothing; rejected (we wait for echo to add coins deterministically)
//     }
//   }

//   // counts & clustering per fruit
//   const counts = useMemo(() => {
//     const map: Record<FruitKey, number> = {
//       cherry: 0, lemon: 0, grape: 0, watermelon: 0, apple: 0, pineapple: 0, blueberry: 0, strawberry: 0,
//     };
//     for (const c of stacked) map[c.fruit] += 1;
//     return map;
//   }, [stacked]);

//   return (
//     <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
//       <div
//         ref={containerRef}
//         className="relative w-full max-w-6xl rounded-2xl bg-white/5 backdrop-blur p-5 ring-1 ring-white/10 shadow-2xl overflow-hidden"
//       >
//         {/* Top bar: title + settings button */}
//         <div className="flex items-center justify-between">
//           <div className="flex flex-col gap-1">
//             <h1 className="text-white text-xl font-semibold tracking-wide">Fruit Betting — Live</h1>
//             <p className="text-white/60 text-xs">Click a fruit to place your bet while the timer runs.</p>
//           </div>
//           <button
//             onClick={() => setShowSettings((s) => !s)}
//             className="text-white/80 text-xs rounded-full px-3 py-1.5 border border-white/20 hover:bg-white/10"
//             aria-label="Settings"
//             title="Sound Settings"
//           >
//             ⚙️ Settings
//           </button>
//         </div>

//         {/* Timer */}
//         <div className="w-full sm:w-72 mt-3">
//           <div className="flex items-center justify-between text-white/80 text-xs mb-1">
//             <span>{round?.state === "betting" ? "Betting Open" : round?.state === "revealing" ? "Revealing" : "Next round soon"}</span>
//             <span className="tabular-nums">{round ? (round.timeLeftMs / 1000).toFixed(1) : "0.0"}s</span>
//           </div>
//           <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
//             <motion.div
//               className="h-full bg-emerald-400"
//               initial={{ width: 0 }}
//               animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
//               transition={{ type: "tween", ease: "linear", duration: 0.05 }}
//             />
//           </div>
//         </div>

//         {/* Bank icon (house sink) */}
//         <div
//           ref={bankRef}
//           className="absolute right-3 top-3 rounded-xl bg-white/8 border border-white/20 text-white/90 px-3 py-2 text-xs flex items-center gap-2"
//           title="House bank"
//         >
//           🏦 <span className="hidden sm:inline">House Bank</span>
//         </div>

//         {/* Chips */}
//         <div className="mt-4 flex items-center gap-3">
//           <span className="text-white/70 text-xs">Select chip:</span>
//           {CHIPS.map((v) => (
//             <motion.button
//               key={v}
//               ref={(el) => {
//                 chipRefs.current[v] = el;
//                 return undefined;
//               }}
//               onClick={() => setSelectedChip(v)}
//               whileTap={{ scale: 0.92 }}
//               className={`h-10 px-4 rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
//                 selectedChip === v
//                   ? "bg-emerald-400 text-emerald-900 border-emerald-300 shadow-lg"
//                   : "bg-white/10 text-white border-white/20 hover:bg-white/15"
//               }`}
//             >
//               <span className="text-sm font-semibold">{v / 1000}k</span>
//             </motion.button>
//           ))}
//         </div>

//         {/* Fruits grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
//           {FRUITS.map((key) => (
//             <FruitBox
//               key={key}
//               refEl={(el) => (fruitRefs.current[key] = el)}
//               fruitKey={key}
//               total={totals[key]}
//               highlighted={round?.winner === key && round?.state !== "betting"}
//               disabled={round?.state !== "betting"}
//               onClick={() => onFruitClick(key)}
//               count={counts[key]}
//               max={MAX_COINS_PER_FRUIT}
//               extra={Math.max(0, stacked.filter((c) => c.fruit === key).length - MAX_COINS_PER_FRUIT)}
//             />
//           ))}
//         </div>

//         {/* Transient flying coins (local + remote) */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {flies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//             {remoteFlies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* PERSISTENT stacked coins (cap & cluster) */}
//         <div className="pointer-events-none absolute inset-0">
//           {FRUITS.map((fruit) => {
//             const coins = stacked.filter((c) => c.fruit === fruit);
//             const render = coins.slice(0, MAX_COINS_PER_FRUIT); // cap
//             return render.map((c) => {
//               const abs = absFromRel(c.fruit, c.relX, c.relY);
//               return (
//                 <div
//                   key={c.id}
//                   className="absolute w-10 h-10"
//                   style={{ transform: `translate(${abs.x - 20}px, ${abs.y - 20}px)` }}
//                 >
//                   <Coin />
//                 </div>
//               );
//             });
//           })}
//         </div>

//         {/* Payout flies (your winning coins → balance) */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {payoutFlies.map((p) => {
//               const cont = containerRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const toX = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : 0;
//               const toY = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : 0;
//               return (
//                 <motion.div
//                   key={p.id}
//                   initial={{ x: p.fromX, y: p.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: p.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>

//         {/* Bank flies (losers’ coins → house bank) */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {bankFlies.map((b) => {
//               const cont = containerRef.current?.getBoundingClientRect();
//               const bank = bankRef.current?.getBoundingClientRect();
//               const toX = cont && bank ? bank.left - cont.left + bank.width / 2 - 20 : 0;
//               const toY = cont && bank ? bank.top - cont.top + bank.height / 2 - 20 : 0;
//               return (
//                 <motion.div
//                   key={b.id}
//                   initial={{ x: b.fromX, y: b.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: b.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>

//         {/* Balance + P/L */}
//         <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
//           <div className="text-white/70 text-xs">You</div>
//           <div ref={balanceRef} className="text-white text-base tabular-nums">
//             Balance: {fmt(user?.balance ?? 0)}
//           </div>
//           <div className="text-emerald-300 text-base tabular-nums">Profit: +{fmt(user?.profit ?? 0)}</div>
//           <div className="text-rose-300 text-base tabular-nums">Loss: -{fmt(user?.loss ?? 0)}</div>
//         </div>

//         {/* Coins flying to balance on (general) win spike */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = containerRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const startX = cont ? cont.width / 2 : 0;
//               const startY = cont ? cont.height / 2 : 0;
//               const toX = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : startX;
//               const toY = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : startY;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: startX, y: startY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
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

//         {/* Settings panel (volume sliders, persistent) */}
//         <AnimatePresence>
//           {showSettings && (
//             <motion.div
//               initial={{ opacity: 0, y: -6 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -6 }}
//               className="absolute right-3 top-14 w-64 rounded-xl bg-black/60 backdrop-blur border border-white/15 p-3 text-white"
//             >
//               <div className="text-sm font-semibold mb-2">Sound Settings</div>
//               <Slider
//                 label="Master"
//                 value={prefs.master}
//                 onChange={(v) => setPrefs((p) => ({ ...p, master: v }))}
//               />
//               <Slider
//                 label="Bet"
//                 value={prefs.bet}
//                 onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))}
//               />
//               <Slider
//                 label="Reveal"
//                 value={prefs.reveal}
//                 onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))}
//               />

//               <div className="flex justify-end mt-2">
//                 <button
//                   onClick={() => setShowSettings(false)}
//                   className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15"
//                 >
//                   Close
//                 </button>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }

// function Slider({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: number;
//   onChange: (v: number) => void;
// }) {
//   return (
//     <div className="mb-2">
//       <div className="flex items-center justify-between text-xs mb-1">
//         <span className="text-white/80">{label}</span>
//         <span className="text-white/60 tabular-nums">{Math.round(value * 100)}%</span>
//       </div>
//       <input
//         type="range"
//         min={0}
//         max={1}
//         step={0.01}
//         value={value}
//         onChange={(e) => onChange(parseFloat(e.target.value))}
//         className="w-full accent-emerald-400"
//       />
//     </div>
//   );
// }

// function FruitBox({
//   refEl,
//   fruitKey,
//   total,
//   highlighted,
//   disabled,
//   onClick,
//   count,
//   max,
//   extra,
// }: {
//   refEl: (el: HTMLDivElement | null) => void;
//   fruitKey: FruitKey;
//   total: number;
//   highlighted: boolean | undefined;
//   disabled: boolean | undefined;
//   onClick: () => void;
//   count: number;
//   max: number;
//   extra: number;
// }) {
//   const emoji = useMemo(
//     () =>
//       ({
//         cherry: "🍒",
//         lemon: "🍋",
//         grape: "🍇",
//         watermelon: "🍉",
//         apple: "🍎",
//         pineapple: "🍍",
//         blueberry: "🫐",
//         strawberry: "🍓",
//       } as Record<FruitKey, string>)[fruitKey],
//     [fruitKey]
//   );
//   const title = fruitKey.charAt(0).toUpperCase() + fruitKey.slice(1);
//   return (
//     <div
//       ref={refEl}
//       onClick={() => !disabled && onClick()}
//       className={`relative min-h-[160px] rounded-2xl p-4 border transition-all select-none cursor-pointer ${
//         highlighted
//           ? "bg-emerald-500/15 border-emerald-400/50 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
//           : disabled
//           ? "bg-white/5 border-white/10 opacity-80"
//           : "bg-white/5 border-white/10 hover:bg-white/10"
//       }`}
//     >
//       {/* Count badge (top-left) */}
//       <div className="absolute -left-2 -top-2">
//         <div className="flex items-center gap-1">
//           <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tabular-nums">
//             {count}
//           </span>
//           {extra > 0 && (
//             <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px]">+{extra}</span>
//           )}
//         </div>
//       </div>

//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <span className="text-2xl">{emoji}</span>
//           <div className="text-white text-base font-semibold tracking-wide">{title}</div>
//         </div>
//         <div className="text-right">
//           <div className="text-white/70 text-xs">Total Bet</div>
//           <div className="text-white text-lg font-bold tabular-nums">{fmt(total)}</div>
//         </div>
//       </div>

//       <div className="absolute inset-x-4 bottom-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
//         <motion.div
//           className="h-full bg-white/30"
//           initial={{ width: 0 }}
//           animate={{ width: `${Math.min(100, (total / 60_000) * 100)}%` }}
//           transition={{ type: "spring", stiffness: 90, damping: 18 }}
//         />
//       </div>

//       <div className="absolute right-3 top-3 text-[10px] uppercase tracking-wider text-white/50">
//         {disabled ? "Closed" : "Place Bet"}
//       </div>
//     </div>
//   );
// }

// function Coin() {
//   return (
//     <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-400 shadow-xl flex items-center justify-center">
//       <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-300 flex items-center justify-center">
//         <span className="text-amber-900 text-[10px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// function fmt(n: number) {
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
// }

// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }
////////////////////////////////////////////////////////////////////////////////////////////

// import { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence, useAnimation } from "framer-motion";
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";

// /** ==================== CONFIG ==================== **/

// // Pixel-perfect chip stops (matches screenshot vibe)
// const CHIPS = [500, 1000, 10_000, 100_000, 1_000_000] as const;

// // show-only amount under each slice icon
// const SLICE_DISPLAY_AMOUNT = 5000;

// // payout multipliers copy from screenshot feel
// const MULTIPLIER: Record<FruitKey, number> = {
//   apple: 10,
//   lemon: 10,
//   blueberry: 15,   // burger
//   watermelon: 10,  // strawberry
//   grape: 25,
//   strawberry: 35,  // taco (high)
//   pineapple: 10,   // pizza
//   cherry: 15,
// };

// // persistent bet state (for counts & payouts only; no visual stacking)
// type StackedCoin = { id: string; fruit: FruitKey; value: number; userId: string };

// // transient flies
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// const MAX_COINS_PER_SLICE = 60;

// /** sounds */
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// type SoundPrefs = { master: number; bet: number; reveal: number; win: number; bg: number };
// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8, bg: 0.15 };
// const PREFS_KEY = "soundPrefsWheelV1";

// /** visual: 8 foods reused from your FruitKey */
// const EMOJI: Record<FruitKey, string> = {
//   cherry: "🍒",
//   lemon: "🥕",
//   grape: "🍇",
//   watermelon: "🍓",
//   apple: "🍎",
//   pineapple: "🍕",
//   blueberry: "🍔",
//   strawberry: "🌮",
// };
// const LABEL: Record<FruitKey, string> = {
//   cherry: "Cherry",
//   lemon: "Carrot",
//   grape: "Grapes",
//   watermelon: "Strawberry",
//   apple: "Apple",
//   pineapple: "Pizza",
//   blueberry: "Burger",
//   strawberry: "Taco",
// };

// /** ==================== APP ==================== **/

// export default function App() {
//   const { user, round, placeBet, echoQueue, shiftEcho } = useGame();

//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);
//   const wheelDegRef = useRef(0); // current absolute rotation in degrees

//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]); // default 1k
//   const bettingOpen = round?.state === "betting";
//   const progress = round ? 1 - round.timeLeftMs / 10000 : 0;

//   // Loader (auto-join; no tap)
//   const [isLoaded, setIsLoaded] = useState(false);

//   // bets for counts & payouts
//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   // transient flies
//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // sounds
//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
//     } catch {}
//     return DEFAULT_PREFS;
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);

//   // sound gating
//   const [audioReady, setAudioReady] = useState(false);
//   const [showSoundNudge, setShowSoundNudge] = useState(false);

//   function applyVolumes() {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }
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
//   async function startBgIfPossible() {
//     if (!bgAudioRef.current) return;
//     try {
//       await bgAudioRef.current.play();
//       setShowSoundNudge(false);
//     } catch {
//       setShowSoundNudge(true);
//     }
//   }
//   function fadeBg(toVol: number, ms = 300) {
//     const a = bgAudioRef.current;
//     if (!a) return;
//     const start = a.volume;
//     const end = clamp01(prefs.master * clamp01(toVol));
//     const t0 = performance.now();
//     function step(t: number) {
//       const k = Math.min(1, (t - t0) / ms);
//       a.volume = start + (end - start) * k;
//       if (k < 1) requestAnimationFrame(step);
//     }
//     requestAnimationFrame(step);
//   }

//   // create audio
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
//   }, []);

//   // prime on first gesture
//   useEffect(() => {
//     function onFirstInteract() {
//       primeAllAudio().then(startBgIfPossible);
//       window.removeEventListener("pointerdown", onFirstInteract);
//       window.removeEventListener("keydown", onFirstInteract);
//       window.removeEventListener("touchstart", onFirstInteract);
//     }
//     window.addEventListener("pointerdown", onFirstInteract, { once: true });
//     window.addEventListener("keydown", onFirstInteract, { once: true });
//     window.addEventListener("touchstart", onFirstInteract, { once: true });
//     return () => {
//       window.removeEventListener("pointerdown", onFirstInteract);
//       window.removeEventListener("keydown", onFirstInteract);
//       window.removeEventListener("touchstart", onFirstInteract);
//     };
//   }, []);

//   // start BG after loader too
//   useEffect(() => {
//     if (isLoaded) startBgIfPossible();
//   }, [isLoaded]);

//   // resume BG when tab visible
//   useEffect(() => {
//     function onVis() {
//       if (document.visibilityState === "visible") startBgIfPossible();
//     }
//     document.addEventListener("visibilitychange", onVis);
//     return () => document.removeEventListener("visibilitychange", onVis);
//   }, []);

//   // persist prefs + volumes
//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch {}
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   // loader: mark loaded when round arrives or after short delay
//   useEffect(() => {
//     if (round && !isLoaded) setIsLoaded(true);
//   }, [round, isLoaded]);
//   useEffect(() => {
//     const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
//     return () => clearTimeout(t);
//   }, [isLoaded]);

//   // gain flourish on balance increase
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => crypto.randomUUID());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance]);
// console.log(gainCoins)
//   /** ===== geometry & target helpers ===== */
//   function getContainerRect() {
//     return containerRef.current?.getBoundingClientRect() || null;
//   }
//   function getWheelCenter() {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }
//   const slices: readonly FruitKey[] = FRUITS;
//   const sliceAngle = 360 / slices.length;

//   function hash01(str: string, s = 0) {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   }
//   function sliceButtonCenter(sliceIndex: number) {
//     const { x: cx, y: cy } = getWheelCenter();
//     const rad = 160;
//     const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//     const ang = (angDeg * Math.PI) / 180;
//     return { x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) };
//   }
//   function inButtonOffsetForBet(betId: string) {
//     const a = 2 * Math.PI * hash01(betId, 3);
//     const r = 8 + 18 * hash01(betId, 4); // 8..26px
//     return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   }
//   function targetForBet(sliceIndex: number, betId: string) {
//     const c = sliceButtonCenter(sliceIndex);
//     const o = inButtonOffsetForBet(betId);
//     return { x: c.x + o.dx, y: c.y + o.dy };
//   }

//   /** ===== winners history & leaderboard (10-round blocks) ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FruitKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | null>(null);

//   // try to honor a server-side index so new joiners see current cycle
//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//       ? (round as any).indexInBlock
//       : typeof (round as any)?.roundNumber === "number"
//       ? ((round as any).roundNumber % 10) + 1
//       : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? winnersHistory.length;

//   /** ===== bet fly spawners ===== */
//   function spawnLocalFly(to: { x: number; y: number }, value: number) {
//     const cont = getContainerRect();
//     const chip = chipRefs.current[value]?.getBoundingClientRect();
//     const from =
//       chip && cont
//         ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//         : { x: to.x, y: to.y };
//     const id = crypto.randomUUID();
//     setFlies((p) => [...p, { id, from, to, value }]);
//     setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//   }
//   function spawnRemoteFly(to: { x: number; y: number }, value: number) {
//     const c = getWheelCenter();
//     const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//     const id = crypto.randomUUID();
//     setRemoteFlies((p) => [...p, { id, from, to, value }]);
//     setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//   }

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0]; // { betId, userId, fruit, value }
//     const idx = (slices as FruitKey[]).indexOf(evt.fruit);
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

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//   }, [round?.roundId, round?.state]);

//   /** ===== spin to winner ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);

//   useEffect(() => {
//     if (!round || round.state !== "revealing" || !round.winner) return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     const w = round.winner as FruitKey;
//     const winnerIdx = (slices as FruitKey[]).indexOf(w);
//     const pointerAt = -90;
//     const targetSliceAngle = winnerIdx * sliceAngle;

//     const base = 360 * 10;
//     const current = wheelDegRef.current || 0;
//     const desiredMod = ((pointerAt - targetSliceAngle) % 360 + 360) % 360;
//     const currentMod = ((current % 360) + 360) % 360;

//     let extra = desiredMod - currentMod;
//     if (extra < 0) extra += 360;

//     const total = current + base + extra;

//     fadeBg(prefs.bg * 0.35, 250);

//     wheelDegRef.current = total;
//     controls.start({
//       rotate: total,
//       transition: { duration: 1.1, ease: [0.2, 0.85, 0.25, 1] },
//     });

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }

//     setTimeout(() => {
//       doRevealFlights(w);
//       setTimeout(() => fadeBg(prefs.bg, 350), 500);
//     }, 1100);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [round?.state, round?.winner, round?.roundId]);

//   function doRevealFlights(winner: FruitKey) {
//     const cont = getContainerRect();
//     if (!cont) return;

//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     // my winners -> balance
//     if (user && bal) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => {});
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     // losers -> bank
//     if (bank) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     // history row
//     setWinnersHistory((prev) => {
//       const next = [...prev, winner].slice(-10);
//       if (next.length >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(10);
//       }
//       return next;
//     });

//     // winners count per player for leaderboard
//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev };
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//   }

//   // intermission between blocks
//   useEffect(() => {
//     if (intermissionSec === null) return;
//     if (intermissionSec <= 0) {
//       setShowLeaderboard(false);
//       resetBlock();
//       setIntermissionSec(null);
//       return;
//     }
//     const id = setTimeout(() => setIntermissionSec((s) => (s === null ? null : s - 1)), 1000);
//     return () => clearTimeout(id);
//   }, [intermissionSec]);

//   function resetBlock() {
//     setWinsByPlayer({});
//     setWinnersHistory([]);
//   }

//   /** ===== UI helpers ===== */
//   async function onSliceClick(key: FruitKey) {
//     if (!bettingOpen || !selectedChip) return;
//     const resp = await placeBet(key, selectedChip);
//     if (!resp.ok) {
//       // rely on server echo
//     }
//   }

//   const counts = useMemo(() => {
//     const m: Record<FruitKey, number> = {
//       cherry: 0,
//       lemon: 0,
//       grape: 0,
//       watermelon: 0,
//       apple: 0,
//       pineapple: 0,
//       blueberry: 0,
//       strawberry: 0,
//     };
//     for (const c of stacked) m[c.fruit] += 1;
//     return m;
//   }, [stacked]);

//   const roundNum = useMemo(() => {
//     if (!round?.roundId) return 0;
//     let h = 0;
//     for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
//     return h % 10000;
//   }, [round?.roundId]);

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => b.wins - a.wins);
//     return arr;
//   }, [winsByPlayer]);

//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       className="min-h-screen w-full flex items-start justify-center"
//       style={{
//         background:
//           "radial-gradient(circle at 50% -10%, #134a66 0%, #0a2a3a 55%, #051926 100%)",
//       }}
//     >
//       {/* dotted backdrop to match app feel */}
//       <div className="fixed inset-0 pointer-events-none opacity-[0.12]" style={{
//         backgroundImage:
//           "radial-gradient(#ffffff 1px, rgba(255,255,255,0) 1px)",
//         backgroundSize: "14px 14px",
//       }} />

//       {/* Loader */}
//       {!isLoaded && (
//         <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,25,38,.95)] text-white">
//           <div className="text-center">
//             <div className="text-2xl font-bold mb-2">Loading Game…</div>
//             <div className="text-sm opacity-80">Preparing tables and music</div>
//             <div className="mt-6 h-2 w-64 bg-white/10 rounded overflow-hidden">
//               <div className="h-full w-1/2 animate-pulse bg-white/60" />
//             </div>
//           </div>
//         </div>
//       )}

//       <div ref={containerRef} className="relative w-full max-w-[420px] sm:max-w-[520px] px-3 pb-28">
//         {/* Header bar */}
//         <div className="mt-3 flex items-center justify-between">
//           <div className="rounded-full bg-white/10 border border-white/15 text-white px-3 py-1 text-xs flex items-center gap-2 shadow">
//             <span className="opacity-80">Round:</span>
//             <span className="font-semibold tabular-nums">{roundNum}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <button className="rounded-full bg-white/10 border border-white/15 text-yellow-300 px-3 py-1 text-sm shadow">🏆</button>
//             <button className="rounded-full bg-white/10 border border-white/15 text-white px-3 py-1 text-sm shadow">⚙️</button>
//           </div>
//         </div>

//         {/* Bank badge */}
//         <div
//           ref={bankRef}
//           className="absolute right-3 top-14 rounded-xl bg-white/10 border border-white/15 text-white/90 px-3 py-1.5 text-[11px] shadow"
//         >
//           🏦 House Bank
//         </div>

//         {/* Wheel card */}
//         <div className="relative mt-4">
//           <div className="relative h-[650px] rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02))] shadow-[0_12px_30px_rgba(0,0,0,.35)] overflow-hidden">
//             {/* pointer */}
//             <div className="absolute left-1/2 -translate-x-1/2 top-6 z-20">
//               <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[18px] border-l-transparent border-r-transparent border-b-[#ff6aa3] drop-shadow" />
//             </div>

//             {/* support arms (three) */}
//             <div className="absolute left-1/2 top-[300px] -translate-x-1/2 -translate-y-1/2 w-0 h-0 z-0">
//               {/* center arm */}
//               <div className="absolute -translate-x-1/2 -translate-y-[2px] w-[140px] h-[70px] origin-bottom"
//                    style={{ transform: "translate(-50%, -2px) rotate(0deg)" }}>
//                 <div className="w-full h-full rounded-b-[32px] bg-[linear-gradient(180deg,#d7eefc,#b9dbf3)] border border-white/70 shadow-[0_8px_18px_rgba(0,0,0,.25)]" />
//               </div>
//               {/* left arm */}
//               <div className="absolute -translate-x-[120%] -translate-y-[2px] w-[140px] h-[70px] origin-bottom"
//                    style={{ transform: "translate(-120%, -2px) rotate(-25deg)" }}>
//                 <div className="w-full h-full rounded-b-[32px] bg-[linear-gradient(180deg,#d7eefc,#b9dbf3)] border border-white/70 shadow-[0_8px_18px_rgba(0,0,0,.25)]" />
//               </div>
//               {/* right arm */}
//               <div className="absolute translate-x-[20%] -translate-y-[2px] w-[140px] h-[70px] origin-bottom"
//                    style={{ transform: "translate(20%, -2px) rotate(25deg)" }}>
//                 <div className="w-full h-full rounded-b-[32px] bg-[linear-gradient(180deg,#d7eefc,#b9dbf3)] border border-white/70 shadow-[0_8px_18px_rgba(0,0,0,.25)]" />
//               </div>
//             </div>

//             {/* rotating disc */}
//             <motion.div
//               ref={wheelRef}
//               className="absolute left-1/2 top-[90px] -translate-x-1/2"
//               animate={controls}
//               style={{
//                 width: 400,
//                 height: 400,
//                 borderRadius: 9999,
//                 background:
//                   "radial-gradient(circle at 50% 45%, rgba(255,255,255,.18), rgba(255,255,255,0) 60%), linear-gradient(180deg,#0e6aa8,#0a4f7a)",
//                 boxShadow: "inset 0 0 0 12px rgba(255, 183, 58, .88), 0 10px 40px rgba(0,0,0,.35)",
//               }}
//             >
//               {/* tiny studs around rim */}
//               {[...Array(24)].map((_, i) => {
//                 const a = (i * 15 * Math.PI) / 180;
//                 const x = 200 + 178 * Math.cos(a) - 3;
//                 const y = 200 + 178 * Math.sin(a) - 3;
//                 return <div key={i} className="absolute w-[6px] h-[6px] rounded-full bg-[#ffcf5f] shadow" style={{ left: x, top: y }} />;
//               })}

//               {/* spokes */}
//               {[...Array(slices.length)].map((_, i) => (
//                 <div
//                   key={i}
//                   className="absolute left-1/2 top-1/2 origin-left h-[6px] bg-white/28"
//                   style={{ width: 200, transform: `rotate(${i * sliceAngle}deg)` }}
//                 />
//               ))}

//               {/* buttons */}
//               {(slices as FruitKey[]).map((key, i) => {
//                 const ang = i * sliceAngle;
//                 const rad = 160;
//                 const x = 200 + rad * Math.cos(((ang - 90) * Math.PI) / 180);
//                 const y = 200 + rad * Math.sin(((ang - 90) * Math.PI) / 180);

//                 const highlighted = round?.winner === key && round?.state !== "betting";
//                 const disabled = round?.state !== "betting";

//                 return (
//                   <button
//                     key={key}
//                     onClick={() => !disabled && onSliceClick(key)}
//                     className={`absolute -translate-x-1/2 -translate-y-1/2 w-[96px] h-[96px] rounded-full border flex flex-col items-center justify-center ${
//                       highlighted
//                         ? "border-emerald-400 ring-4 ring-emerald-300/30 bg-white"
//                         : "border-white/70 bg-[linear-gradient(180deg,#ffffff,#eaf7ff)]"
//                     } shadow-[0_8px_18px_rgba(0,0,0,.25)]`}
//                     style={{ left: x, top: y }}
//                   >
//                     <div className="text-[30px] leading-none">{EMOJI[key]}</div>
//                     <div className="text-[10px] text-sky-700 -mt-0.5">{LABEL[key]}</div>
//                     <div className="mt-0.5 text-[10px] text-sky-900/80 leading-none font-semibold">
//                       {SLICE_DISPLAY_AMOUNT.toLocaleString()} <span className="text-amber-600 font-extrabold ml-1">X{MULTIPLIER[key]}</span>
//                     </div>

//                     {/* count badge */}
//                     <div className="absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-[10px] bg-sky-600 text-white tabular-nums shadow">
//                       {counts[key]}
//                       {Math.max(0, stacked.filter((c) => c.fruit === key).length - MAX_COINS_PER_SLICE) > 0 && (
//                         <span className="ml-1 opacity-80">
//                           +{Math.max(0, stacked.filter((c) => c.fruit === key).length - MAX_COINS_PER_SLICE)}
//                         </span>
//                       )}
//                     </div>
//                   </button>
//                 );
//               })}
//             </motion.div>

//             {/* center hub (non-rotating) */}
//             <div
//               className="absolute left-1/2 top-[290px] -translate-x-1/2 -translate-y-1/2 w-[172px] h-[172px] rounded-full grid place-items-center"
//               style={{
//                 background: "radial-gradient(circle at 50% 30%, #ff7a59, #e63a17 60%)",
//                 boxShadow: "0 8px 20px rgba(0,0,0,.35), inset 0 0 0 12px #ffcf5f",
//               }}
//             >
//               <div className="text-center text-white">
//                 <div className="text-[12px] font-semibold tracking-wide">
//                   {bettingOpen ? "Timer" : round?.state === "revealing" ? "Revealing…" : "Next Round"}
//                 </div>
//                 <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)]">
//                   {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//                 </div>
//               </div>
//             </div>

//             {/* bottom strip: chips panel styled */}
//             <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-[94%]">
//               <div className="rounded-2xl bg-[#fffbef] shadow-[0_8px_0_#d9b24d] border border-[#f0d06a] px-2 py-2">
//                 <div className="flex items-center justify-between gap-2 px-1">
//                   {CHIPS.map((v, i) => {
//                     const palette = [
//                       "bg-gradient-to-b from-[#48d17a] to-[#1ea45b] border-[#2fb36a]",
//                       "bg-gradient-to-b from-[#3db2ff] to-[#197dd4] border-[#2b8fef]",
//                       "bg-gradient-to-b from-[#9a6bff] to-[#6a3ee6] border-[#7e58f2]",
//                       "bg-gradient-to-b from-[#ff5ca8] to-[#d13e82] border-[#e64f93]",
//                       "bg-gradient-to-b from-[#8b5cf6] to-[#5b21b6] border-[#7c3aed]",
//                     ][i]!;
//                     const isSel = selectedChip === v;
//                     return (
//                       <motion.button
//                         key={v}
//                         ref={(el) => {
//                           chipRefs.current[v] = el;
//                           return undefined;
//                         }}
//                         whileTap={{ scale: 0.95 }}
//                         onClick={() => setSelectedChip(v)}
//                         className={`rounded-xl px-3 py-1.5 text-white text-[13px] font-semibold border shadow ${palette} ${
//                           isSel ? "ring-2 ring-white/80" : "opacity-95"
//                         }`}
//                       >
//                         💎 {fmt(v)}
//                       </motion.button>
//                     );
//                   })}
//                 </div>
//                 <div className="mt-1 grid grid-cols-2 text-[10px] text-amber-900/80 px-1">
//                   <div className="flex items-center gap-1">① Select Amount</div>
//                   <div className="flex items-center gap-1 justify-end">② Select Food</div>
//                 </div>
//               </div>
//             </div>

//             {/* progress bar */}
//             <div className="absolute left-1/2 -translate-x-1/2 bottom-[92px] w-[86%] h-[8px] bg-white/40 rounded-full overflow-hidden">
//               <motion.div
//                 className="h-full"
//                 style={{ background: "linear-gradient(90deg,#34d399,#10b981)" }}
//                 initial={{ width: 0 }}
//                 animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
//                 transition={{ type: "tween", ease: "linear", duration: 0.05 }}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Footer panels */}
//         <div className="mt-3 space-y-3">
//           {/* Result / Trend bar */}
//           <div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-white">
//             <div className="flex items-center justify-between">
//               <div className="text-sm font-semibold flex items-center gap-2">
//                 <span className="rounded-full bg-amber-500 text-white text-[10px] px-2 py-0.5">Today Prize’s</span>
//                 <span className="opacity-90">💎 {fmt(user?.balance ?? 0)}</span>
//               </div>
//               <div className="text-xs opacity-80">Result</div>
//             </div>
//             <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
//               {winnersHistory.length === 0 && <div className="text-xs opacity-70">No results yet.</div>}
//               {winnersHistory.map((k, idx) => (
//                 <div key={`${k}-${idx}-${round?.roundId ?? "r"}`} className="min-w-8 h-8 w-8 rounded-full bg-white/95 grid place-items-center shadow">
//                   <span className="text-lg leading-none">{EMOJI[k]}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Balance + Profit small cards */}
//           <div className="grid grid-cols-2 gap-3">
//             <div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-white">
//               <div className="text-xs opacity-80">Gold balance</div>
//               <div ref={balanceRef} className="text-base font-semibold tabular-nums">💎 {fmt(user?.balance ?? 0)}</div>
//             </div>
//             <div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-white">
//               <div className="text-xs opacity-80">Today’s profit</div>
//               <div className="text-base font-semibold tabular-nums">💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}</div>
//             </div>
//           </div>

//           {/* Ranking stub (full modal pops at 10/10) */}
//           <div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-white flex items-center justify-between">
//             <div className="text-sm font-semibold">Today’s Prize Ranking</div>
//             <div className="text-xs opacity-80">Block: {displayBlockRound}/10</div>
//           </div>
//         </div>

//         {/* transient flies */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {flies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//             {remoteFlies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* payouts & bank */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {payoutFlies.map((p) => {
//               const cont = getContainerRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const toX = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : 0;
//               const toY = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : 0;
//               return (
//                 <motion.div
//                   key={p.id}
//                   initial={{ x: p.fromX, y: p.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: p.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//             {bankFlies.map((b) => {
//               const cont = getContainerRect();
//               const bank = bankRef.current?.getBoundingClientRect();
//               const toX = cont && bank ? bank.left - cont.left + bank.width / 2 - 20 : 0;
//               const toY = cont && bank ? bank.top - cont.top + bank.height / 2 - 20 : 0;
//               return (
//                 <motion.div
//                   key={b.id}
//                   initial={{ x: b.fromX, y: b.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: b.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>
//       </div>

//       {/* Leaderboard modal */}
//       {showLeaderboard && (
//         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center">
//           <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-4">
//             <div className="text-lg font-bold text-sky-900">🏆 Block Leaderboard (last 10 rounds)</div>
//             <div className="mt-1 text-xs text-sky-700">
//               Next block starts automatically{typeof intermissionSec === "number" ? ` in ${intermissionSec}s` : ""}.
//             </div>
//             <div className="mt-3 max-h-80 overflow-auto">
//               {ranking.length === 0 && <div className="text-sm text-sky-700">No winners this block.</div>}
//               {ranking.map((r, i) => (
//                 <div
//                   key={r.userId}
//                   className={`flex items-center justify-between py-2 border-b last:border-b-0 ${
//                     r.userId === user?.id ? "bg-emerald-50/80 rounded px-2" : ""
//                   }`}
//                 >
//                   <div className="flex items-center gap-2">
//                     <div className="w-6 text-right text-sm tabular-nums">{i + 1}.</div>
//                     <div className="text-sm font-medium text-sky-900">
//                       {r.userId === user?.id ? "You" : r.userId.slice(0, 6)}
//                     </div>
//                   </div>
//                   <div className="text-sm font-semibold text-sky-900 tabular-nums">
//                     {r.wins} win{r.wins !== 1 ? "s" : ""}
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="mt-4 flex justify-end gap-2">
//               <button onClick={() => setIntermissionSec(0)} className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm px-3 py-1.5">
//                 Start Now
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Volume sliders */}
//       <div className="fixed right-3 bottom-3 rounded-xl bg-black/50 text-white border border-white/15 backdrop-blur p-3 w-64">
//         <div className="text-sm font-semibold mb-1">Sound</div>
//         <Slider label="Master" value={prefs.master} onChange={(v) => setPrefs((p) => ({ ...p, master: v }))} />
//         <Slider label="Bet" value={prefs.bet} onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))} />
//         <Slider label="Reveal" value={prefs.reveal} onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))} />
//         <Slider label="Win" value={prefs.win} onChange={(v) => setPrefs((p) => ({ ...p, win: v }))} />
//         <Slider label="BG Music" value={prefs.bg} onChange={(v) => setPrefs((p) => ({ ...p, bg: v }))} />
//       </div>

//       {/* Enable sound nudge */}
//       {showSoundNudge && (
//         <button
//           onClick={() => primeAllAudio().then(startBgIfPossible)}
//           className="fixed left-3 bottom-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-2 shadow-lg"
//           title="Enable game audio"
//         >
//           🔊 Enable Sound
//         </button>
//       )}
//     </div>
//   );
// }

// /** =============== UI bits =============== **/
// function Slider({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: number;
//   onChange: (v: number) => void;
// }) {
//   return (
//     <div className="mb-2">
//       <div className="flex items-center justify-between text-xs mb-1">
//         <span className="text-white/80">{label}</span>
//         <span className="text-white/60 tabular-nums">{Math.round(value * 100)}%</span>
//       </div>
//       <input
//         type="range"
//         min={0}
//         max={1}
//         step={0.01}
//         value={value}
//         onChange={(e) => onChange(parseFloat(e.target.value))}
//         className="w-full accent-emerald-400"
//       />
//     </div>
//   );
// }

// function Coin() {
//   return (
//     <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-400 shadow-xl flex items-center justify-center">
//       <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-300 flex items-center justify-center">
//         <span className="text-amber-600 text-[10px] font-extrabold">$</span>
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






//////////////////////////////////////


// import { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";

// const CHIPS = [1000, 2000, 3000, 4000, 5000] as const;

// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };

// // persistent coin placed on a fruit (relative coords inside the fruit box)
// type StackedCoin = { id: string; fruit: FruitKey; relX: number; relY: number; value: number; userId: string };

// // winner payout flies (from a stacked coin’s absolute position → balance)
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };

// // losers’ coins → bank
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// const MAX_COINS_PER_FRUIT = 60;

// /** tiny base64 blips so you don’t need hosting */
// const SND_BET =
//   "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQAAAP8AAP8A//8A/wAAAP8A//8A/wAAAP8AAP8A";
// const SND_REVEAL =
//   "data:audio/wav;base64,UklGRoAAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQAAAAAAAP8AAP//AAD//wAA//8AAP//AAD/";

// type SoundPrefs = {
//   master: number; // 0..1
//   bet: number;    // 0..1
//   reveal: number; // 0..1
// };

// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8 };
// const PREFS_KEY = "soundPrefsV1";

// export default function App() {
//   const { user, round, totals, placeBet, echoQueue, shiftEcho } = useGame();

//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const fruitRefs = useRef<Record<FruitKey, HTMLDivElement | null>>({
//     cherry: null, lemon: null, grape: null, watermelon: null,
//     apple: null, pineapple: null, blueberry: null, strawberry: null,
//   });
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);

//   const bettingOpen = round?.state === "betting";
//   const progress = round ? 1 - round.timeLeftMs / 10000 : 0;

//   const [selectedChip, setSelectedChip] = useState<number>(1000);

//   // transient flying coins
//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);

//   // persistent stacked coins (stay visible until pause/new round)
//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   // payout flies (your winning coins → balance)
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   // losers’ coins → bank
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // Balance gain animation (minor flourish)
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);

//   // Sounds + settings
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);

//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) return JSON.parse(raw);
//     } catch {}
//     return DEFAULT_PREFS;
//   });
//   const [showSettings, setShowSettings] = useState(false);

//   function applyVolumes() {
//     const master = clamp01(prefs.master);
//     const bet = clamp01(prefs.bet);
//     const reveal = clamp01(prefs.reveal);
//     if (betAudioRef.current) betAudioRef.current.volume = master * bet;
//     if (revealAudioRef.current) revealAudioRef.current.volume = master * reveal;
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     applyVolumes();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     applyVolumes();
//     try {
//       localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
//     } catch {}
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefs.master, prefs.bet, prefs.reveal]);

//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const count = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: count }, () => crypto.randomUUID());
//         setGainCoins((prev) => [...prev, ...ids]);
//         setTimeout(() => setGainCoins((prev) => prev.slice(count)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance]);

//   // --- geometry helpers ---
//   function getCenter(el: HTMLElement | null) {
//     const container = containerRef.current?.getBoundingClientRect();
//     const r = el?.getBoundingClientRect();
//     if (!r || !container) return { x: 0, y: 0 };
//     return { x: r.left + r.width / 2 - container.left, y: r.top + r.height / 2 - container.top };
//   }

//   function fruitRect(key: FruitKey) {
//     const cont = containerRef.current?.getBoundingClientRect();
//     const r = fruitRefs.current[key]?.getBoundingClientRect();
//     if (!cont || !r) return null;
//     return { x: r.left - cont.left, y: r.top - cont.top, w: r.width, h: r.height };
//   }

//   function hash01(str: string, salt = 0) {
//     // simple deterministic hash -> [0,1)
//     let h = 2166136261 ^ salt;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   }

//   // deterministic relative position inside a fruit box from betId
//   function relPosFromBet(betId: string): { rx: number; ry: number } {
//     const rx = 0.2 + 0.6 * hash01(betId, 1);
//     const ry = 0.25 + 0.5 * hash01(betId, 2);
//     return { rx, ry };
//   }

//   function absFromRel(key: FruitKey, rx: number, ry: number) {
//     const rect = fruitRect(key);
//     if (!rect) return { x: 0, y: 0 };
//     const pad = 16;
//     const x = rect.x + pad + (rect.w - 2 * pad) * rx;
//     const y = rect.y + pad + (rect.h - 2 * pad) * ry;
//     return { x, y };
//   }

//   // remote origin for other users (near top center with jitter)
//   function getRemoteOrigin() {
//     const cont = containerRef.current?.getBoundingClientRect();
//     if (!cont) return { x: 0, y: 0 };
//     const x = cont.width * 0.5 + (Math.random() - 0.5) * 120;
//     const y = 24 + Math.random() * 36;
//     return { x, y };
//   }

//   // --- spawning helpers ---
//   function spawnLocalFlyTo(to: { x: number; y: number }, value: number) {
//     const from = getCenter(chipRefs.current[value]!);
//     const id = crypto.randomUUID();
//     setFlies((prev) => [...prev, { id, from, to, value }]);
//     setTimeout(() => setFlies((prev) => prev.filter((f) => f.id !== id)), 1200);
//   }

//   function spawnRemoteFlyTo(to: { x: number; y: number }, value: number) {
//     const from = getRemoteOrigin();
//     const id = crypto.randomUUID();
//     setRemoteFlies((prev) => [...prev, { id, from, to, value }]);
//     setTimeout(() => setRemoteFlies((prev) => prev.filter((f) => f.id !== id)), 1200);
//   }

//   // --- handle incoming bet echoes: animate + persist + SOUND ---
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;

//     const evt = echoQueue[0]; // { betId, userId, fruit, value }
//     const { rx, ry } = relPosFromBet(evt.betId);
//     const to = absFromRel(evt.fruit, rx, ry);

//     // sound: soft blip on each bet
//     if (betAudioRef.current) {
//       betAudioRef.current.pause();
//       betAudioRef.current.currentTime = 0;
//       betAudioRef.current.play().catch(() => {});
//     }

//     if (evt.userId === user?.id) spawnLocalFlyTo(to, evt.value);
//     else spawnRemoteFlyTo(to, evt.value);

//     // persist stacked coin (relative coords) so it remains visible
//     setStacked((prev) => {
//       if (prev.some((c) => c.id === evt.betId)) return prev;
//       return [...prev, { id: evt.betId, fruit: evt.fruit, relX: rx, relY: ry, value: evt.value, userId: evt.userId }];
//     });

//     // shift queue
//     shiftEcho();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [echoQueue, round?.roundId]);

//   // track round id and clear on new round or pause
//   useEffect(() => {
//     if (!round) return;

//     // New round started?
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//     setCurrentRoundId(round.roundId);

//     // Hard clear at pause; we keep coins during revealing for clarity
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//   }, [round?.roundId, round?.state]);

//   // --- on REVEAL: animate YOUR winning coins → balance + losers’ coins → bank + SOUND ---
//   const revealHandledRef = useRef<string | null>(null); // roundId we already reacted to
//   useEffect(() => {
//     if (!round) return;
//     if (round.state !== "revealing" || !round.winner) return;
//     if (revealHandledRef.current === round.roundId) return; // only once per round
//     revealHandledRef.current = round.roundId;

//     // play reveal sound
//     if (revealAudioRef.current) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }

//     const cont = containerRef.current?.getBoundingClientRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();
//     if (!cont || !bank) return;

//     // My winning coins → balance
//     if (user && bal) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === round.winner);
//       if (myWins.length) {
//         const toX = bal.left - cont.left + bal.width / 2 - 20;
//         const toY = bal.top - cont.top + bal.height / 2 - 20;
//         const flies: PayoutFly[] = myWins.map((c, i) => {
//           const { x, y } = absFromRel(c.fruit, c.relX, c.relY);
//           return { id: c.id, fromX: x - 20, fromY: y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         // remove my winning coins after animation
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === round.winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }

//     // All losing coins (any user, fruit !== winner) → bank
//     const losers = stacked.filter((c) => c.fruit !== round.winner);
//     if (losers.length) {
//       const toX = bank.left - cont.left + bank.width / 2 - 20;
//       const toY = bank.top - cont.top + bank.height / 2 - 20;
//       const bflies: BankFly[] = losers.map((c, i) => {
//         const { x, y } = absFromRel(c.fruit, c.relX, c.relY);
//         return { id: c.id, fromX: x - 20, fromY: y - 20, delay: i * 0.03 };
//       });
//       setBankFlies(bflies);
//       // remove losing coins after animation
//       setTimeout(() => {
//         setStacked((prev) => prev.filter((c) => c.fruit === round.winner));
//         setBankFlies([]);
//       }, 1100 + losers.length * 30);
//     }
//   }, [round?.state, round?.winner, round?.roundId, stacked, user]);

//   async function onFruitClick(key: FruitKey) {
//     if (!bettingOpen || !selectedChip) return;
//     const resp = await placeBet(key, selectedChip);
//     if (!resp.ok) {
//       // nothing; rejected (we wait for echo to add coins deterministically)
//     }
//   }

//   // counts & clustering per fruit
//   const counts = useMemo(() => {
//     const map: Record<FruitKey, number> = {
//       cherry: 0, lemon: 0, grape: 0, watermelon: 0, apple: 0, pineapple: 0, blueberry: 0, strawberry: 0,
//     };
//     for (const c of stacked) map[c.fruit] += 1;
//     return map;
//   }, [stacked]);

//   return (
//     <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
//       <div
//         ref={containerRef}
//         className="relative w-full max-w-6xl rounded-2xl bg-white/5 backdrop-blur p-5 ring-1 ring-white/10 shadow-2xl overflow-hidden"
//       >
//         {/* Top bar: title + settings button */}
//         <div className="flex items-center justify-between">
//           <div className="flex flex-col gap-1">
//             <h1 className="text-white text-xl font-semibold tracking-wide">Fruit Betting — Live</h1>
//             <p className="text-white/60 text-xs">Click a fruit to place your bet while the timer runs.</p>
//           </div>
//           <button
//             onClick={() => setShowSettings((s) => !s)}
//             className="text-white/80 text-xs rounded-full px-3 py-1.5 border border-white/20 hover:bg-white/10"
//             aria-label="Settings"
//             title="Sound Settings"
//           >
//             ⚙️ Settings
//           </button>
//         </div>

//         {/* Timer */}
//         <div className="w-full sm:w-72 mt-3">
//           <div className="flex items-center justify-between text-white/80 text-xs mb-1">
//             <span>{round?.state === "betting" ? "Betting Open" : round?.state === "revealing" ? "Revealing" : "Next round soon"}</span>
//             <span className="tabular-nums">{round ? (round.timeLeftMs / 1000).toFixed(1) : "0.0"}s</span>
//           </div>
//           <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
//             <motion.div
//               className="h-full bg-emerald-400"
//               initial={{ width: 0 }}
//               animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
//               transition={{ type: "tween", ease: "linear", duration: 0.05 }}
//             />
//           </div>
//         </div>

//         {/* Bank icon (house sink) */}
//         <div
//           ref={bankRef}
//           className="absolute right-3 top-3 rounded-xl bg-white/8 border border-white/20 text-white/90 px-3 py-2 text-xs flex items-center gap-2"
//           title="House bank"
//         >
//           🏦 <span className="hidden sm:inline">House Bank</span>
//         </div>

//         {/* Chips */}
//         <div className="mt-4 flex items-center gap-3">
//           <span className="text-white/70 text-xs">Select chip:</span>
//           {CHIPS.map((v) => (
//             <motion.button
//               key={v}
//               ref={(el) => {
//                 chipRefs.current[v] = el;
//                 return undefined;
//               }}
//               onClick={() => setSelectedChip(v)}
//               whileTap={{ scale: 0.92 }}
//               className={`h-10 px-4 rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
//                 selectedChip === v
//                   ? "bg-emerald-400 text-emerald-900 border-emerald-300 shadow-lg"
//                   : "bg-white/10 text-white border-white/20 hover:bg-white/15"
//               }`}
//             >
//               <span className="text-sm font-semibold">{v / 1000}k</span>
//             </motion.button>
//           ))}
//         </div>

//         {/* Fruits grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
//           {FRUITS.map((key) => (
//             <FruitBox
//               key={key}
//               refEl={(el) => (fruitRefs.current[key] = el)}
//               fruitKey={key}
//               total={totals[key]}
//               highlighted={round?.winner === key && round?.state !== "betting"}
//               disabled={round?.state !== "betting"}
//               onClick={() => onFruitClick(key)}
//               count={counts[key]}
//               max={MAX_COINS_PER_FRUIT}
//               extra={Math.max(0, stacked.filter((c) => c.fruit === key).length - MAX_COINS_PER_FRUIT)}
//             />
//           ))}
//         </div>

//         {/* Transient flying coins (local + remote) */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {flies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//             {remoteFlies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* PERSISTENT stacked coins (cap & cluster) */}
//         <div className="pointer-events-none absolute inset-0">
//           {FRUITS.map((fruit) => {
//             const coins = stacked.filter((c) => c.fruit === fruit);
//             const render = coins.slice(0, MAX_COINS_PER_FRUIT); // cap
//             return render.map((c) => {
//               const abs = absFromRel(c.fruit, c.relX, c.relY);
//               return (
//                 <div
//                   key={c.id}
//                   className="absolute w-10 h-10"
//                   style={{ transform: `translate(${abs.x - 20}px, ${abs.y - 20}px)` }}
//                 >
//                   <Coin />
//                 </div>
//               );
//             });
//           })}
//         </div>

//         {/* Payout flies (your winning coins → balance) */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {payoutFlies.map((p) => {
//               const cont = containerRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const toX = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : 0;
//               const toY = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : 0;
//               return (
//                 <motion.div
//                   key={p.id}
//                   initial={{ x: p.fromX, y: p.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: p.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>

//         {/* Bank flies (losers’ coins → house bank) */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {bankFlies.map((b) => {
//               const cont = containerRef.current?.getBoundingClientRect();
//               const bank = bankRef.current?.getBoundingClientRect();
//               const toX = cont && bank ? bank.left - cont.left + bank.width / 2 - 20 : 0;
//               const toY = cont && bank ? bank.top - cont.top + bank.height / 2 - 20 : 0;
//               return (
//                 <motion.div
//                   key={b.id}
//                   initial={{ x: b.fromX, y: b.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: b.delay }}
//                   className="absolute w-10 h-10"
//                 >
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>

//         {/* Balance + P/L */}
//         <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
//           <div className="text-white/70 text-xs">You</div>
//           <div ref={balanceRef} className="text-white text-base tabular-nums">
//             Balance: {fmt(user?.balance ?? 0)}
//           </div>
//           <div className="text-emerald-300 text-base tabular-nums">Profit: +{fmt(user?.profit ?? 0)}</div>
//           <div className="text-rose-300 text-base tabular-nums">Loss: -{fmt(user?.loss ?? 0)}</div>
//         </div>

//         {/* Coins flying to balance on (general) win spike */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {gainCoins.map((id, i) => {
//               const cont = containerRef.current?.getBoundingClientRect();
//               const bal = balanceRef.current?.getBoundingClientRect();
//               const startX = cont ? cont.width / 2 : 0;
//               const startY = cont ? cont.height / 2 : 0;
//               const toX = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : startX;
//               const toY = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : startY;
//               return (
//                 <motion.div
//                   key={id}
//                   initial={{ x: startX, y: startY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
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

//         {/* Settings panel (volume sliders, persistent) */}
//         <AnimatePresence>
//           {showSettings && (
//             <motion.div
//               initial={{ opacity: 0, y: -6 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -6 }}
//               className="absolute right-3 top-14 w-64 rounded-xl bg-black/60 backdrop-blur border border-white/15 p-3 text-white"
//             >
//               <div className="text-sm font-semibold mb-2">Sound Settings</div>
//               <Slider
//                 label="Master"
//                 value={prefs.master}
//                 onChange={(v) => setPrefs((p) => ({ ...p, master: v }))}
//               />
//               <Slider
//                 label="Bet"
//                 value={prefs.bet}
//                 onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))}
//               />
//               <Slider
//                 label="Reveal"
//                 value={prefs.reveal}
//                 onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))}
//               />

//               <div className="flex justify-end mt-2">
//                 <button
//                   onClick={() => setShowSettings(false)}
//                   className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15"
//                 >
//                   Close
//                 </button>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }

// function Slider({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: number;
//   onChange: (v: number) => void;
// }) {
//   return (
//     <div className="mb-2">
//       <div className="flex items-center justify-between text-xs mb-1">
//         <span className="text-white/80">{label}</span>
//         <span className="text-white/60 tabular-nums">{Math.round(value * 100)}%</span>
//       </div>
//       <input
//         type="range"
//         min={0}
//         max={1}
//         step={0.01}
//         value={value}
//         onChange={(e) => onChange(parseFloat(e.target.value))}
//         className="w-full accent-emerald-400"
//       />
//     </div>
//   );
// }

// function FruitBox({
//   refEl,
//   fruitKey,
//   total,
//   highlighted,
//   disabled,
//   onClick,
//   count,
//   max,
//   extra,
// }: {
//   refEl: (el: HTMLDivElement | null) => void;
//   fruitKey: FruitKey;
//   total: number;
//   highlighted: boolean | undefined;
//   disabled: boolean | undefined;
//   onClick: () => void;
//   count: number;
//   max: number;
//   extra: number;
// }) {
//   const emoji = useMemo(
//     () =>
//       ({
//         cherry: "🍒",
//         lemon: "🍋",
//         grape: "🍇",
//         watermelon: "🍉",
//         apple: "🍎",
//         pineapple: "🍍",
//         blueberry: "🫐",
//         strawberry: "🍓",
//       } as Record<FruitKey, string>)[fruitKey],
//     [fruitKey]
//   );
//   const title = fruitKey.charAt(0).toUpperCase() + fruitKey.slice(1);
//   return (
//     <div
//       ref={refEl}
//       onClick={() => !disabled && onClick()}
//       className={`relative min-h-[160px] rounded-2xl p-4 border transition-all select-none cursor-pointer ${
//         highlighted
//           ? "bg-emerald-500/15 border-emerald-400/50 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
//           : disabled
//           ? "bg-white/5 border-white/10 opacity-80"
//           : "bg-white/5 border-white/10 hover:bg-white/10"
//       }`}
//     >
//       {/* Count badge (top-left) */}
//       <div className="absolute -left-2 -top-2">
//         <div className="flex items-center gap-1">
//           <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tabular-nums">
//             {count}
//           </span>
//           {extra > 0 && (
//             <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px]">+{extra}</span>
//           )}
//         </div>
//       </div>

//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <span className="text-2xl">{emoji}</span>
//           <div className="text-white text-base font-semibold tracking-wide">{title}</div>
//         </div>
//         <div className="text-right">
//           <div className="text-white/70 text-xs">Total Bet</div>
//           <div className="text-white text-lg font-bold tabular-nums">{fmt(total)}</div>
//         </div>
//       </div>

//       <div className="absolute inset-x-4 bottom-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
//         <motion.div
//           className="h-full bg-white/30"
//           initial={{ width: 0 }}
//           animate={{ width: `${Math.min(100, (total / 60_000) * 100)}%` }}
//           transition={{ type: "spring", stiffness: 90, damping: 18 }}
//         />
//       </div>

//       <div className="absolute right-3 top-3 text-[10px] uppercase tracking-wider text-white/50">
//         {disabled ? "Closed" : "Place Bet"}
//       </div>
//     </div>
//   );
// }

// function Coin() {
//   return (
//     <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-400 shadow-xl flex items-center justify-center">
//       <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-300 flex items-center justify-center">
//         <span className="text-amber-900 text-[10px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// function fmt(n: number) {
//   return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
// }

// function clamp01(n: number) {
//   return Math.max(0, Math.min(1, n));
// }



// import { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence, useAnimation } from "framer-motion";
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";

// const CHIPS = [500, 1000, 10000, 50000, 100000] as const; // to match screenshot strip

// type StackedCoin = { id: string; fruit: FruitKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// const MAX_COINS_PER_SLICE = 60;

// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";

// type SoundPrefs = { master: number; bet: number; reveal: number; win: number };
// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8 };
// const PREFS_KEY = "soundPrefsWheelV1";

// /** Icons (reuse FruitKey but themed as “items/animals” like screenshot) */
// const EMOJI: Record<FruitKey, string> = {
//   cherry: "🐲",      // dragon
//   lemon: "🧞",       // genie-ish
//   grape: "🐅",       // tiger
//   watermelon: "👑",  // crown
//   apple: "🪔",       // lamp
//   pineapple: "🫙",   // jar
//   blueberry: "💎",   // gem
//   strawberry: "🍱",  // plate
// };
// const LABEL: Record<FruitKey, string> = {
//   cherry: "Dragon",
//   lemon: "Genie",
//   grape: "Tiger",
//   watermelon: "Crown",
//   apple: "Lamp",
//   pineapple: "Jar",
//   blueberry: "Gem",
//   strawberry: "Platter",
// };

// /** “x times” labels around the ring to mimic screenshot */
// const MULTIPLIERS = [45, 5, 5, 15, 5, 25, 5, 10] as const;

// export default function App() {
//   const { user, round, placeBet, echoQueue, shiftEcho } = useGame();

//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const ringRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);
//   const wheelDegRef = useRef(0);

//   const [selectedChip, setSelectedChip] = useState<number>(1000);
//   const bettingOpen = round?.state === "betting";
//   const progress = round ? 1 - round.timeLeftMs / 10000 : 0;

//   const [stacked, setStacked] = useState<StackedCoin[]>([]);
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   // simple local trend tape (last 10 winners) – visual only
//   const [trend, setTrend] = useState<FruitKey[]>([]);

//   // sounds
//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try { const raw = localStorage.getItem(PREFS_KEY); if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }; } catch {}
//     return DEFAULT_PREFS;
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);

//   function applyVolumes() {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//   }

//   useEffect(() => {
//     betAudioRef.current = new Audio(SND_BET);
//     revealAudioRef.current = new Audio(SND_REVEAL);
//     winAudioRef.current = new Audio(SND_WIN);
//     applyVolumes();
//   }, []);

//   useEffect(() => {
//     function prime() {
//       const list = [betAudioRef.current, revealAudioRef.current, winAudioRef.current].filter(Boolean) as HTMLAudioElement[];
//       for (const a of list) { a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => {}); }
//       window.removeEventListener("pointerdown", prime);
//     }
//     window.addEventListener("pointerdown", prime, { once: true });
//     return () => window.removeEventListener("pointerdown", prime);
//   }, []);

//   useEffect(() => { applyVolumes(); try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} },
//     [prefs.master, prefs.bet, prefs.reveal, prefs.win]);

//   // flourish
//   const [lastBalance, setLastBalance] = useState<number | null>(null);
//   const [gainCoins, setGainCoins] = useState<string[]>([]);
//   useEffect(() => {
//     if (!user) return;
//     if (lastBalance !== null) {
//       const delta = user.balance - lastBalance;
//       if (delta > 0) {
//         const n = Math.min(6, Math.max(2, Math.floor(delta / 5000)));
//         const ids = Array.from({ length: n }, () => crypto.randomUUID());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance]);

//   // geometry
//   function getContainerRect() { return containerRef.current?.getBoundingClientRect() || null; }
//   function getRingCenter() {
//     const cont = getContainerRect();
//     const ring = ringRef.current?.getBoundingClientRect();
//     if (cont && ring) return { x: ring.left - cont.left + ring.width / 2, y: ring.top - cont.top + ring.height / 2 };
//     return { x: (cont?.width ?? 0) / 2, y: 300 };
//   }

//   const slices: readonly FruitKey[] = FRUITS;
//   const sliceAngle = 360 / slices.length;

// function hash01(str: string, salt = 0) {
//   let h = 2166136261 ^ salt;
//   for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//   return ((h >>> 0) % 10000) / 10000;
// }

// function sliceButtonCenter(sliceIndex: number) {
//   const cont = containerRef.current?.getBoundingClientRect();
//   const wheel = wheelRef.current?.getBoundingClientRect();
//   const cx = wheel && cont ? wheel.left - cont.left + wheel.width / 2 : 0;
//   const cy = wheel && cont ? wheel.top - cont.top + wheel.height / 2 : 0;

//   const sliceAngle = 360 / FRUITS.length;
//   const radius = 160; // your button ring radius
//   // include current rotation so visual & math match
//   const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//   const ang = (angDeg * Math.PI) / 180;

//   return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
// }

//   function ringButtonCenter(sliceIndex: number) {
//     const { x: cx, y: cy } = getRingCenter();
//     const rad = 150;
//     const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//     const ang = (angDeg * Math.PI) / 180;
//     return { x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) };
//   }
//   function offsetForBet(betId: string) {
//     const a = 2 * Math.PI * hash01(betId, 3); const r = 6 + 14 * hash01(betId, 4);
//     return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   }
//   function targetForBet(sliceIndex: number, betId: string) {
//     const c = ringButtonCenter(sliceIndex); const o = offsetForBet(betId);
//     return { x: c.x + o.dx, y: c.y + o.dy };
//   }

//   function spawnLocalFly(to: { x: number; y: number }, value: number) {
//     const cont = getContainerRect();
//     const chip = chipRefs.current[value]?.getBoundingClientRect();
//     const from = chip && cont ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 } : { x: to.x, y: to.y };
//     const id = crypto.randomUUID(); setFlies((p) => [...p, { id, from, to, value }]);
//     setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//   }
//   function spawnRemoteFly(to: { x: number; y: number }, value: number) {
//     const c = getRingCenter(); const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//     const id = crypto.randomUUID(); setRemoteFlies((p) => [...p, { id, from, to, value }]);
//     setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//   }

//   // bet echoes -> visuals
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0];
//     const idx = (slices as FruitKey[]).indexOf(evt.fruit);
//     const to = targetForBet(idx, evt.betId);

//     if (betAudioRef.current) { betAudioRef.current.pause(); betAudioRef.current.currentTime = 0; betAudioRef.current.play().catch(() => {}); }

//     if (evt.userId === user?.id) spawnLocalFly(to, evt.value);
//     else spawnRemoteFly(to, evt.value);

//     setStacked((prev) => prev.some((c) => c.id === evt.betId) ? prev : [...prev, { id: evt.betId, fruit: evt.fruit, value: evt.value, userId: evt.userId }]);
//     shiftEcho();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [echoQueue, round?.roundId]);

//   // clear per round/pause
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) { setStacked([]); setFlies([]); setRemoteFlies([]); setPayoutFlies([]); setBankFlies([]); }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") { setStacked([]); setFlies([]); setRemoteFlies([]); setPayoutFlies([]); setBankFlies([]); }
//   }, [round?.roundId, round?.state]);

//   // spin (rotate whole ring to bring winner to top)
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);
//   useEffect(() => {
//     if (!round || round.state !== "revealing" || !round.winner) return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     const w = round.winner as FruitKey;
//     const winnerIdx = (slices as FruitKey[]).indexOf(w);
//     const pointerAt = -90;
//     const targetSliceAngle = winnerIdx * sliceAngle;

//     const base = 360 * 10;
//     const current = wheelDegRef.current || 0;
//     const desiredMod = ((pointerAt - targetSliceAngle) % 360 + 360) % 360;
//     const currentMod = ((current % 360) + 360) % 360;
//     let extra = desiredMod - currentMod; if (extra < 0) extra += 360;

//     const total = current + base + extra;
//     wheelDegRef.current = total;
//     controls.start({ rotate: total, transition: { duration: 1.1, ease: [0.2, 0.85, 0.25, 1] } });

//     if (revealAudioRef.current) { revealAudioRef.current.pause(); revealAudioRef.current.currentTime = 0; revealAudioRef.current.play().catch(() => {}); }
//     setTimeout(() => doRevealFlights(w), 1100);
//   }, [round?.state, round?.winner, round?.roundId]);

//   function doRevealFlights(winner: FruitKey) {
//     const cont = getContainerRect(); if (!cont) return;
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     // local wins -> balance
//     if (user && bal) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current) { winAudioRef.current.pause(); winAudioRef.current.currentTime = 0; winAudioRef.current.play().catch(() => {}); }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit); const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.05 };
//         });
//         setPayoutFlies(flies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => !(c.userId === user.id && c.fruit === winner)));
//           setPayoutFlies([]);
//         }, 1200 + myWins.length * 50);
//       }
//     }
//     // losers -> bank
//     if (bank) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit); const p = targetForBet(idx, c.id);
//           return { id: c.id, fromX: p.x - 20, fromY: p.y - 20, delay: i * 0.03 };
//         });
//         setBankFlies(bflies);
//         setTimeout(() => {
//           setStacked((prev) => prev.filter((c) => c.fruit === winner));
//           setBankFlies([]);
//         }, 1100 + losers.length * 30);
//       }
//     }

//     // update local trend tape (purely visual)
//     setTrend((t) => [winner, ...t].slice(0, 10));
//   }

//   async function onSliceClick(key: FruitKey) {
//     if (!bettingOpen || !selectedChip) return;
//     const resp = await placeBet(key, selectedChip);
//     if (!resp.ok) { /* rely on echo */ }
//   }

//   const counts = useMemo(() => {
//     const m: Record<FruitKey, number> = { cherry: 0, lemon: 0, grape: 0, watermelon: 0, apple: 0, pineapple: 0, blueberry: 0, strawberry: 0 };
//     for (const c of stacked) m[c.fruit] += 1;
//     return m;
//   }, [stacked]);

//   const roundNum = useMemo(() => {
//     if (!round?.roundId) return 0;
//     let h = 0; for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
//     return h % 10000;
//   }, [round?.roundId]);

//   return (
//     <div ref={containerRef} className="min-h-screen w-full flex items-start justify-center relative overflow-hidden">
//       {/* BACKDROP: purple palace */}
//       <div className="absolute inset-0 bg-gradient-to-b from-indigo-800 via-purple-800 to-fuchsia-800" />
//       <div className="pointer-events-none absolute inset-0">
//         {[...Array(14)].map((_, i) => (
//           <div key={i} className="absolute rounded-full blur-2xl opacity-40"
//                style={{
//                  width: 120 + (i % 3) * 70, height: 120 + (i % 3) * 70,
//                  left: `${(i * 73) % 100}%`, top: `${(i * 51) % 100}%`,
//                  background: i % 2 ? "#ffffff66" : "#a855f7aa"
//                }}/>
//         ))}
//       </div>

//       <div className="relative w-full max-w-6xl px-4">
//         {/* HEADER ICONS / TITLE ROW */}
//         <div className="flex items-center justify-between pt-5">
//           <div className="rounded-full bg-white/10 text-white px-3 py-1 text-sm shadow">Round: {roundNum}</div>
//           <div className="flex items-center gap-2 text-yellow-300">
//             <span className="text-xl">❗</span>
//             <span className="text-xl">⚙️</span>
//             <span className="text-xl">👥</span>
//           </div>
//         </div>

//         {/* TABS LEFT/RIGHT */}
//         <div className="absolute left-6 top-44">
//           <div className="flex items-center gap-2">
//             <div className="w-12 h-12 rounded-full bg-yellow-400 shadow grid place-items-center">🐉</div>
//             <div className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold border border-emerald-400">Animals</div>
//           </div>
//         </div>
//         <div className="absolute right-6 top-44">
//           <div className="flex items-center gap-2">
//             <div className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold border border-emerald-400">Items</div>
//             <div className="w-12 h-12 rounded-full bg-yellow-400 shadow grid place-items-center">🔮</div>
//           </div>
//         </div>

//         {/* CENTER WHEEL REBUILT AS HUB + JEWELED RING */}
//         <div className="relative mt-2 h-[620px]">
//           {/* pointer jewel at top */}
//           <div className="absolute left-1/2 -translate-x-1/2 top-20 z-30">
//             <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[18px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow" />
//             <div className="w-2 h-2 bg-yellow-300 rounded-full mx-auto -mt-1 shadow" />
//           </div>

//           {/* ring that spins */}
//           <motion.div
//             ref={ringRef}
//             className="absolute left-1/2 top-10 -translate-x-1/2"
//             animate={controls}
//             style={{ width: 520, height: 520, borderRadius: 9999 }}
//           >
//             {/* thin gold ring + spokes */}
//             <div className="absolute inset-[84px] rounded-full border-[10px] border-yellow-400/90 shadow-[inset_0_0_18px_rgba(255,255,255,.4),0_10px_22px_rgba(0,0,0,.35)]" />
//             {[...Array(slices.length)].map((_, i) => (
//               <div key={i} className="absolute left-1/2 top-1/2 origin-left h-[6px] bg-yellow-300/80"
//                    style={{ width: 150, transform: `rotate(${i * (360 / slices.length)}deg)` }} />
//             ))}

//             {/* jeweled nodes (buttons) */}
//             {(slices as FruitKey[]).map((key, i) => {
//               const ang = i * (360 / slices.length);
//               const rad = 200;
//               const x = 260 + rad * Math.cos(((ang - 90) * Math.PI) / 180);
//               const y = 260 + rad * Math.sin(((ang - 90) * Math.PI) / 180);
//               const highlighted = round?.winner === key && round?.state !== "betting";
//               const disabled = round?.state !== "betting";
//               return (
//                 <button
//                   key={key}
//                   onClick={() => !disabled && onSliceClick(key)}
//                   className={`absolute -translate-x-1/2 -translate-y-1/2 w-[96px] h-[96px] rounded-full grid place-items-center text-center shadow-lg border
//                     ${highlighted ? "ring-4 ring-emerald-300/40 border-yellow-200" : "border-yellow-200/70"}
//                     bg-[radial-gradient(circle_at_30%_30%,#fff,#e6f0ff)]`}
//                   style={{ left: x, top: y }}
//                 >
//                   <div className="text-3xl">{EMOJI[key]}</div>
//                   <div className="text-[10px] text-yellow-100/90 font-semibold -mt-0.5 px-2 py-0.5 rounded-full bg-purple-900/70 border border-purple-300/30">
//                     {MULTIPLIERS[i]} times
//                   </div>

//                   {/* tiny bead ring */}
//                   {[...Array(18)].map((_, j) => {
//                     const a = (j / 18) * 360;
//                     return (
//                       <span key={j} className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
//                             style={{
//                               transform: `rotate(${a}deg) translate(42px) rotate(-${a}deg)`,
//                               background: "radial-gradient(circle at 35% 35%, #fff, #ffe38c 45%, #ffc74d 60%, #b87800 100%)",
//                               boxShadow: "0 0 6px rgba(255,255,255,.9)", border: "1px solid #fff8"
//                             }}/>
//                     );
//                   })}

//                   {/* count bubble */}
//                   <div className="absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-[10px] bg-amber-500 text-white tabular-nums shadow">
//                     {counts[key]}
//                   </div>
//                 </button>
//               );
//             })}

//             {/* center countdown medallion (does NOT rotate) */}
//           </motion.div>
//           <div className="absolute left-1/2 top-[290px] -translate-x-1/2 -translate-y-1/2 z-20 w-[160px] h-[160px] rounded-full grid place-items-center text-center
//                           border-[10px] border-yellow-300"
//                style={{ background: "radial-gradient(circle at 30% 30%, #ffffff, #b6c6ff 45%, #2b4aa5 80%)", boxShadow: "0 12px 26px rgba(0,0,0,.4), inset 0 0 10px rgba(0,0,0,.25)" }}>
//             <div className="text-[11px] text-white/90 font-semibold drop-shadow">Countdown</div>
//             <div className="text-4xl font-extrabold tabular-nums text-white drop-shadow">{round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}` : "0"}</div>
//           </div>

//           {/* bank */}
//           <div ref={bankRef} className="absolute right-6 top-[180px] rounded-xl bg-yellow-400/20 border border-yellow-300 text-yellow-100 px-3 py-1 text-xs shadow">
//             🏦 House Bank
//           </div>
//         </div>

//         {/* BET STRIP */}
//         <div className="mx-auto max-w-3xl -mt-6">
//           <div className="rounded-3xl border border-fuchsia-300 bg-gradient-to-b from-fuchsia-600 to-purple-700 p-3 shadow-[0_10px_24px_rgba(0,0,0,.35)]">
//             <div className="flex items-center justify-between gap-2">
//               {CHIPS.map((v) => (
//                 <motion.button
//                   key={v}
//                   ref={(el) => { chipRefs.current[v] = el; return undefined; }}
//                   whileTap={{ scale: 0.94 }}
//                   onClick={() => setSelectedChip(v)}
//                   className={`relative rounded-2xl px-4 py-2 flex items-center gap-2 border-2 shadow
//                     ${selectedChip === v ? "bg-yellow-200 text-purple-900 border-yellow-300" : "bg-yellow-100/80 text-purple-900/80 border-yellow-300/80"}`}
//                 >
//                   <span className="text-xl">💎</span>
//                   <span className="text-sm font-bold">{humanK(v)}</span>
//                   {selectedChip === v && <span className="absolute -top-2 right-1 text-[10px] text-emerald-200">selected</span>}
//                 </motion.button>
//               ))}
//             </div>

//             <div className="mt-3 flex items-center justify-between gap-3">
//               <div className="flex-1 rounded-xl bg-purple-900/60 text-pink-100 border border-fuchsia-300/50 px-3 py-2 text-sm">
//                 Remaining Coins: <span className="font-semibold tabular-nums">{fmt(user?.balance ?? 0)}</span>
//               </div>
//               <button className="rounded-xl bg-pink-400/80 hover:bg-pink-400 text-white font-semibold px-4 py-2 border border-pink-200/60 shadow">
//                 My Records
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* BOTTOM TREND BAR */}
//         <div className="mx-auto mt-4 max-w-4xl">
//           <div className="rounded-2xl bg-purple-900/70 border border-purple-300/50 px-3 py-2 shadow text-yellow-100">
//             <div className="text-xs opacity-90 mb-1">Trend</div>
//             <div className="flex items-center gap-2 overflow-x-auto">
//               {(trend.length ? trend : (FRUITS as FruitKey[])).map((k, i) => (
//                 <div key={`${k}-${i}`} className="min-w-[46px] h-[46px] rounded-full grid place-items-center text-lg
//                          bg-[radial-gradient(circle_at_30%_30%,#fff,#e6f0ff)] border border-yellow-200/70 shadow">
//                   {EMOJI[k]}
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* STATS */}
//         <div className="mt-4 grid grid-cols-2 gap-3 max-w-md mx-auto">
//           <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/30 p-3 text-yellow-100">
//             <div className="text-xs opacity-90">Gold balance</div>
//             <div ref={balanceRef} className="text-base font-semibold tabular-nums">💎 {fmt(user?.balance ?? 0)}</div>
//           </div>
//           <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/30 p-3 text-yellow-100">
//             <div className="text-xs opacity-90">Today’s profit</div>
//             <div className="text-base font-semibold tabular-nums">💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}</div>
//           </div>
//         </div>

//         {/* RESULT FOOTER */}
//         <div className="mt-3 max-w-md mx-auto rounded-2xl bg-purple-950 text-yellow-100 p-3 text-center">
//           <div className="text-sm font-semibold">Result</div>
//           <div className="text-xs opacity-90 mt-1">
//             {round?.state === "betting" && "Place your bet"}
//             {round?.state === "revealing" && "Revealing…"}
//             {round?.state === "pause" && !!round?.winner && (() => { const w = round.winner as FruitKey; return <>Winner: {EMOJI[w]} {LABEL[w]}</>; })()}
//           </div>
//         </div>

//         {/* TRANSIENT COIN FLIES */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {[...flies, ...remoteFlies].map((f) => (
//               <motion.div key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10">
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* PAYOUTS / BANK */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {payoutFlies.map((p) => {
//               const cont = getContainerRect(); const bal = balanceRef.current?.getBoundingClientRect();
//               const toX = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : 0;
//               const toY = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : 0;
//               return (
//                 <motion.div key={p.id} initial={{ x: p.fromX, y: p.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: p.delay }}
//                   className="absolute w-10 h-10">
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//             {bankFlies.map((b) => {
//               const cont = getContainerRect(); const bank = bankRef.current?.getBoundingClientRect();
//               const toX = cont && bank ? bank.left - cont.left + bank.width / 2 - 20 : 0;
//               const toY = cont && bank ? bank.top - cont.top + bank.height / 2 - 20 : 0;
//               return (
//                 <motion.div key={b.id} initial={{ x: b.fromX, y: b.fromY, opacity: 0.0, scale: 0.85 }}
//                   animate={{ x: toX, y: toY, opacity: 1, scale: 1, rotate: 360 }}
//                   exit={{ opacity: 0, scale: 0.7 }}
//                   transition={{ type: "spring", stiffness: 220, damping: 20, delay: b.delay }}
//                   className="absolute w-10 h-10">
//                   <Coin />
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>
//         </div>

//         {/* SOUND SLIDERS */}
//         <div className="fixed right-3 bottom-3 rounded-xl bg-black/50 text-white border border-white/15 backdrop-blur p-3 w-60">
//           <div className="text-sm font-semibold mb-1">Sound</div>
//           <Slider label="Master" value={prefs.master} onChange={(v) => setPrefs((p) => ({ ...p, master: v }))} />
//           <Slider label="Bet" value={prefs.bet} onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))} />
//           <Slider label="Reveal" value={prefs.reveal} onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))} />
//           <Slider label="Win" value={prefs.win} onChange={(v) => setPrefs((p) => ({ ...p, win: v }))} />
//         </div>
//       </div>

//       {/* gain flourish (coins to balance) */}
//       <div className="pointer-events-none absolute inset-0">
//         <AnimatePresence>
//           {gainCoins.map((id, i) => {
//             const cont = containerRef.current?.getBoundingClientRect();
//             const bal = balanceRef.current?.getBoundingClientRect();
//             const sx = cont ? cont.width / 2 : 0, sy = cont ? 560 : 0;
//             const tx = cont && bal ? bal.left - cont.left + bal.width / 2 - 20 : sx;
//             const ty = cont && bal ? bal.top - cont.top + bal.height / 2 - 20 : sy;
//             return (
//               <motion.div key={id}
//                 initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                 animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                 className="absolute w-10 h-10">
//                 <Coin />
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }

// /* UI helpers */
// function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
//   return (
//     <div className="mb-2">
//       <div className="flex items-center justify-between text-xs mb-1">
//         <span className="text-white/80">{label}</span>
//         <span className="text-white/60 tabular-nums">{Math.round(value * 100)}%</span>
//       </div>
//       <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-emerald-400" />
//     </div>
//   );
// }

// function Coin() {
//   return (
//     <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-400 shadow-xl flex items-center justify-center">
//       <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-300 flex items-center justify-center">
//         <span className="text-amber-900 text-[10px] font-extrabold">$</span>
//       </div>
//     </div>
//   );
// }

// function fmt(n: number) { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n); }
// function humanK(n: number) { if (n >= 1000000) return `${Math.round(n/100000)/10}M`; if (n >= 1000) return `${Math.round(n/100)/10}K`; return `${n}`; }
// function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }






// import { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence, useAnimation } from "framer-motion";
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// const SLICE_DISPLAY_AMOUNT = 5000; // (currently unused visually; kept for future stats)
// const MAX_COINS_PER_SLICE = 60;

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// // Preferences
// type SoundPrefs = { master: number; bet: number; reveal: number; win: number; bg: number };
// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8, bg: 0.15 };
// const PREFS_KEY = "soundPrefsWheelV1";

// // Visual language
// const EMOJI: Record<FruitKey, string> = {
//   cherry: "🍒",
//   lemon: "🍋",
//   grape: "🍇",
//   watermelon: "🍉",
//   apple: "🍎",
//   pineapple: "🍍",
//   blueberry: "🫐",
//   strawberry: "🍓",
// };
// const LABEL: Record<FruitKey, string> = {
//   cherry: "Cherry",
//   lemon: "Lemon",
//   grape: "Grapes",
//   watermelon: "Watermelon",
//   apple: "Apple",
//   pineapple: "Pineapple",
//   blueberry: "Blueberry",
//   strawberry: "Strawberry",
// };
// /** nice multipliers to show “win X times” like screenshot */
// const MULTIPLIER: Record<FruitKey, number> = {
//   apple: 5,
//   lemon: 5,
//   blueberry: 10,
//   watermelon: 5,
//   grape: 15,
//   strawberry: 45,
//   pineapple: 25,
//   cherry: 10,
// };

// /** ==================== APP ==================== **/
// export default function App() {
//   const { user, round, placeBet, echoQueue, shiftEcho } = useGame();

//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);
//   const wheelDegRef = useRef(0);

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

//   // NEW: Sidebar / Top App Bar Drawer toggle
//   const [drawerOpen, setDrawerOpen] = useState(false);

//   // ——— Wheel sizing (phone UI; still responsive if container is narrower)
//   const [wheelSize, setWheelSize] = useState(360);
//   useEffect(() => {
//     if (!phoneRef.current) return;
//     const ro = new ResizeObserver((entries) => {
//       const w = entries[0].contentRect.width;
//       // phone card width ~ 360px; wheel scales within that
//       const D = Math.max(260, Math.min(420, Math.floor(w * 0.82)));
//       setWheelSize(D);
//     });
//     ro.observe(phoneRef.current);
//     return () => ro.disconnect();
//   }, []);
//   const D = wheelSize;
//   const R = D / 2;
//   const ringR = R * 0.78;
//   const btn = Math.round(D * 0.24);
//   const studs = 28;
//   const studsR = R * 0.92;
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds (moved to Settings panel)
//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
//     } catch {}
//     return DEFAULT_PREFS;
//   });
//   const betAudioRef = useRef<HTMLAudioElement | null>(null);
//   const revealAudioRef = useRef<HTMLAudioElement | null>(null);
//   const winAudioRef = useRef<HTMLAudioElement | null>(null);
//   const bgAudioRef = useRef<HTMLAudioElement | null>(null);
//   const [audioReady, setAudioReady] = useState(false);

//   function applyVolumes() {
//     const m = clamp01(prefs.master);
//     if (betAudioRef.current) betAudioRef.current.volume = m * clamp01(prefs.bet);
//     if (revealAudioRef.current) revealAudioRef.current.volume = m * clamp01(prefs.reveal);
//     if (winAudioRef.current) winAudioRef.current.volume = m * clamp01(prefs.win);
//     if (bgAudioRef.current) bgAudioRef.current.volume = m * clamp01(prefs.bg);
//   }
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
//   }, []);

//   useEffect(() => {
//     // auto start bg after first user gesture (and on load if allowed)
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
//   }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

//   // loader
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
//         const ids = Array.from({ length: n }, () => crypto.randomUUID());
//         setGainCoins((p) => [...p, ...ids]);
//         setTimeout(() => setGainCoins((p) => p.slice(n)), 1200);
//       }
//     }
//     setLastBalance(user.balance);
//   }, [user?.balance]);

//   /** ===== geometry / targets ===== */
//   function getContainerRect() {
//     return phoneRef.current?.getBoundingClientRect() || null;
//   }
//   function getWheelCenter() {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel) {
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     }
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }
//   const slices: readonly FruitKey[] = FRUITS;
//   const sliceAngle = 360 / slices.length;

//   function hash01(str: string, s = 0) {
//     let h = 2166136261 ^ s;
//     for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619;
//     return ((h >>> 0) % 10000) / 10000;
//   }
//   function sliceButtonCenter(sliceIndex: number) {
//     const { x: cx, y: cy } = getWheelCenter();
//     const angDeg = sliceIndex * sliceAngle - 90 + (wheelDegRef.current % 360);
//     const ang = (angDeg * Math.PI) / 180;
//     return { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
//   }
//   function inButtonOffsetForBet(betId: string) {
//     const a = 2 * Math.PI * hash01(betId, 3);
//     const r = 8 + 18 * hash01(betId, 4);
//     return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
//   }
//   function targetForBet(sliceIndex: number, betId: string) {
//     const c = sliceButtonCenter(sliceIndex);
//     const o = inButtonOffsetForBet(betId);
//     return { x: c.x + o.dx, y: c.y + o.dy };
//   }

//   /** ===== history & leaderboard ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FruitKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | null>(null);

//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//       ? (round as any).indexInBlock
//       : typeof (round as any)?.roundNumber === "number"
//       ? ((round as any).roundNumber % 10) + 1
//       : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? winnersHistory.length;

//   /** ===== flies ===== */
//   function spawnLocalFly(to: { x: number; y: number }, value: number) {
//     const cont = getContainerRect();
//     const chip = chipRefs.current[value]?.getBoundingClientRect();
//     const from =
//       chip && cont
//         ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//         : { x: to.x, y: to.y };
//     const id = crypto.randomUUID();
//     setFlies((p) => [...p, { id, from, to, value }]);
//     setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//   }
//   function spawnRemoteFly(to: { x: number; y: number }, value: number) {
//     const c = getWheelCenter();
//     const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//     const id = crypto.randomUUID();
//     setRemoteFlies((p) => [...p, { id, from, to, value }]);
//     setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//   }

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0]; // { betId, userId, fruit, value }
//     const idx = (slices as FruitKey[]).indexOf(evt.fruit);
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

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//   }, [round?.roundId, round?.state]);

//   /** ===== spin to winner ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);

//   useEffect(() => {
//     if (!round || round.state !== "revealing" || !round.winner) return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     const w = round.winner as FruitKey;
//     const winnerIdx = (slices as FruitKey[]).indexOf(w);
//     const pointerAt = -90;
//     const targetSliceAngle = winnerIdx * sliceAngle;

//     const base = 360 * 10;
//     const current = wheelDegRef.current || 0;
//     const desiredMod = ((pointerAt - targetSliceAngle) % 360 + 360) % 360;
//     const currentMod = ((current % 360) + 360) % 360;
//     let extra = desiredMod - currentMod;
//     if (extra < 0) extra += 360;

//     const total = current + base + extra;
//     wheelDegRef.current = total;

//     controls.start({
//       rotate: total,
//       transition: { duration: 1.1, ease: [0.2, 0.85, 0.25, 1] },
//     });

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }
//     setTimeout(() => doRevealFlights(w), 1100);
//   }, [round?.state, round?.winner, round?.roundId]);

//   function doRevealFlights(winner: FruitKey) {
//     const cont = getContainerRect();
//     if (!cont) return;

//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     // my winners -> balance (user-only win sound)
//     if (user && bal) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => {});
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     // losers -> bank
//     if (bank) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     // history + leaderboard
//     setWinnersHistory((prev) => {
//       const next = [...prev, winner].slice(-10);
//       if (next.length >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(10);
//       }
//       return next;
//     });
//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//   }

//   // intermission countdown
//   useEffect(() => {
//     if (intermissionSec === null) return;
//     if (intermissionSec <= 0) {
//       setShowLeaderboard(false);
//       setWinsByPlayer({});
//       setWinnersHistory([]);
//       setIntermissionSec(null);
//       return;
//     }
//     const id = setTimeout(() => setIntermissionSec((s) => (s === null ? null : s - 1)), 1000);
//     return () => clearTimeout(id);
//   }, [intermissionSec]);

//   async function onSliceClick(key: FruitKey) {
//     if (!bettingOpen || !selectedChip) return;
//     await placeBet(key, selectedChip);
//   }

//   const counts = useMemo(() => {
//     const m: Record<FruitKey, number> = {
//       cherry: 0,
//       lemon: 0,
//       grape: 0,
//       watermelon: 0,
//       apple: 0,
//       pineapple: 0,
//       blueberry: 0,
//       strawberry: 0,
//     };
//     for (const c of stacked) m[c.fruit] += 1;
//     return m;
//   }, [stacked]);

//   const overflowBySlice = useMemo(() => {
//     const map: Partial<Record<FruitKey, number>> = {};
//     for (const k of FRUITS) {
//       const total = stacked.filter((c) => c.fruit === k).length;
//       const overflow = Math.max(0, total - MAX_COINS_PER_SLICE);
//       if (overflow > 0) map[k] = overflow;
//     }
//     return map;
//   }, [stacked]);

//   const roundNum = useMemo(() => {
//     if (!round?.roundId) return 0;
//     let h = 0;
//     for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
//     return h % 10000;
//   }, [round?.roundId]);

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => b.wins - a.wins);
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ==================== RENDER ==================== **/
//   return (
//     <div ref={pageRef} className="min-h-screen w-full grid place-items-center bg-gradient-to-b from-[#ffd84f] to-[#ffb84f]">
//       {/* Phone frame: fixed mobile width even on desktop */}
//       <div ref={phoneRef} className="relative w-[360px] max-w-[360px] min-h-screen bg-[#ffecc6] overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
//         {/* Floating Toggle Button (opens drawer) */}
//         <button
//           aria-label="Open menu"
//           onClick={() => setDrawerOpen(true)}
//           className="fixed left-3 top-3 z-40 w-10 h-10 rounded-xl bg-[#ffe79d] border border-black/10 shadow grid place-items-center text-[18px] hover:brightness-105 active:scale-95"
//         >
//           ☰
//         </button>

//         {/* Left Drawer that contains the former Top App Bar content */}
//         <AnimatePresence>
//           {drawerOpen && (
//             <>
//               <motion.div
//                 className="fixed inset-0 z-40 bg-black/40"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 onClick={() => setDrawerOpen(false)}
//               />
//               <motion.aside
//                 className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white/90 backdrop-blur border-r border-black/10 p-3 flex flex-col"
//                 initial={{ x: -320 }}
//                 animate={{ x: 0 }}
//                 exit={{ x: -320 }}
//                 transition={{ type: "spring", stiffness: 260, damping: 26 }}
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="text-[15px] font-bold text-[#333]">Menu</div>
//                   <button aria-label="Close menu" className="text-[22px]" onClick={() => setDrawerOpen(false)}>✕</button>
//                 </div>

//                 {/* Former top app bar actions */}
//                 <div className="mt-3 grid grid-cols-4 gap-2">
//                   <IconBtn>🏠</IconBtn>
//                   <IconBtn onClick={() => setSettingsOpen(true)}>🎚️</IconBtn>
//                   <IconBtn>❓</IconBtn>
//                   <IconBtn>🕒</IconBtn>
//                 </div>

//                 <div className="mt-4 text-[13px] font-semibold text-[#333]">
//                   Today’s <span className="tabular-nums">{roundNum}</span> Round
//                 </div>

//                 {/* Quick stats in drawer */}
//                 <div className="mt-4 grid gap-2">
//                   <div className="rounded-xl bg-white/80 border border-black/10 p-3">
//                     <div className="text-[12px] opacity-80">State</div>
//                     <div className="text-[16px] font-semibold capitalize">{round?.state ?? "—"}</div>
//                   </div>
//                   <div className="rounded-xl bg-white/80 border border-black/10 p-3">
//                     <div className="text-[12px] opacity-80">Block Round</div>
//                     <div className="text-[16px] font-semibold">#{displayBlockRound}</div>
//                   </div>
//                 </div>

//                 <div className="mt-auto text-[11px] text-[#456] opacity-80">
//                   Tip: You can reopen this drawer using the ☰ button.
//                 </div>
//               </motion.aside>
//             </>
//           )}
//         </AnimatePresence>

//         {/* bank tag */}
//         <div ref={bankRef} className="absolute right-3 top-[18px] rounded-xl bg-white/70 border border-black/10 text-[#123] px-3 py-1.5 text-[11px] shadow">
//           🏦 House Bank
//         </div>

//         {/* WHEEL AREA — fixed: reserve space so nothing overlaps */}
//         <div className="relative mt-2 pb-4" style={{ minHeight: wheelTop + D + 85 }}>
//           {/* pointer (teardrop) */}
//           <div className="absolute left-1/2 -translate-x-1/2 z-20">
//             <div
//               className="w-7 h-9"
//               style={{
//                 background: "radial-gradient(circle at 50% 35%, #ffefb0, #ffc34d 60%, #f1a100 100%)",
//                 borderRadius: "12px 12px 18px 18px",
//                 position: "relative",
//                 boxShadow: "0 4px 10px rgba(0,0,0,.25), inset 0 -2px 0 rgba(0,0,0,.15)",
//               }}
//             >
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "50%",
//                   top: "86%",
//                   transform: "translate(-50%, 0)",
//                   width: 0,
//                   height: 0,
//                   borderLeft: "9px solid transparent",
//                   borderRight: "9px solid transparent",
//                   borderTop: "12px solid #f1a100",
//                   filter: "drop-shadow(0 2px 3px rgba(0,0,0,.3))",
//                 }}
//               />
//             </div>
//           </div>

//           {/* wheel disc with GOLD rim */}
//           <motion.div
//             ref={wheelRef}
//             className="absolute left-1/2 -translate-x-1/2"
//             animate={controls}
//             style={{
//               top: wheelTop,
//               width: D,
//               height: D,
//               borderRadius: 9999,
//               background: "conic-gradient(from 0deg,#fff 0 45deg,#f7f7f7 45deg 90deg,#fff 90deg 135deg,#f7f7f7 135deg 180deg,#fff 180deg 225deg,#f7f7f7 225deg 270deg,#fff 270deg 315deg,#f7f7f7 315deg 360deg)",
//               boxShadow: "inset 0 0 0 12px #f3b42c, inset 0 0 0 22px #ffe17a, inset 0 0 0 28px #f3b42c, 0 10px 40px rgba(0,0,0,.35)",
//             }}
//           >
//             {/* gold studs */}
//             {Array.from({ length: studs }).map((_, i) => {
//               const a = (i * (360 / studs) * Math.PI) / 180;
//               const x = R + studsR * Math.cos(a) - 4;
//               const y = R + studsR * Math.sin(a) - 4;
//               return (
//                 <div
//                   key={i}
//                   className="absolute rounded-full"
//                   style={{
//                     left: x,
//                     top: y,
//                     width: 8,
//                     height: 8,
//                     background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                     boxShadow: "0 1px 2px rgba(0,0,0,.35)",
//                   }}
//                 />
//               );
//             })}

//             {/* spokes */}
//             {FRUITS.map((_, i) => (
//               <div
//                 key={i}
//                 className="absolute left-1/2 top-1/2 origin-left"
//                 style={{
//                   width: R,
//                   height: 5,
//                   background: "rgba(0,0,0,.06)",
//                   transform: `rotate(${i * (360 / FRUITS.length)}deg)`,
//                 }}
//               />
//             ))}

//             {/* slice buttons */}
//             {FRUITS.map((key, i) => {
//               const ang = i * (360 / FRUITS.length);
//               const x = R + ringR * Math.cos(((ang - 90) * Math.PI) / 180);
//               const y = R + ringR * Math.sin(((ang - 90) * Math.PI) / 180);
//               const isWinner = round?.winner === key && round?.state !== "betting";
//               const disabled = round?.state !== "betting";
//               return (
//                 <button
//                   key={key}
//                   onClick={() => !disabled && onSliceClick(key)}
//                   className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border flex flex-col items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite]" : ""}`}
//                   style={{
//                     left: x,
//                     top: y,
//                     width: btn,
//                     height: btn,
//                     background: "radial-gradient(circle at 50% 40%, #ffffff, #eaf7ff)",
//                     borderColor: isWinner ? "#22c55e" : "rgba(0,0,0,.1)",
//                     boxShadow: isWinner
//                       ? "0 0 0 6px rgba(34,197,94,.28), 0 8px 18px rgba(0,0,0,.25)"
//                       : "0 8px 18px rgba(0,0,0,.18)",
//                   }}
//                   aria-label={`Bet on ${LABEL[key]}`}
//                 >
//                   <div className="text-[26px] leading-none">{EMOJI[key]}</div>
//                   <div className="text-[10px] text-[#1e3a5f] -mt-0.5">{LABEL[key]}</div>
//                   <div className="mt-0.5 text-[10px] text-[#1e3a5f] leading-none font-semibold">
//                     win <span className="font-extrabold">x{MULTIPLIER[key]}</span>
//                   </div>

//                   {/* count badge */}
//                   <div className="absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-[10px] text-white tabular-nums shadow" style={{ background: "#3b82f6" }}>
//                     {counts[key]}
//                     {overflowBySlice[key] && <span className="ml-1 opacity-80">+{overflowBySlice[key]}</span>}
//                   </div>
//                 </button>
//               );
//             })}
//           </motion.div>

//           {/* Center hub (NON-rotating) */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center"
//             style={{
//               top: hubTop,
//               width: hubSize,
//               height: hubSize,
//               background: "radial-gradient(circle at 50% 30%, #ff7a59, #e63a17 60%)",
//               boxShadow: "0 8px 20px rgba(0,0,0,.35), inset 0 0 0 10px #ffd24f",
//               border: "6px dotted #ffd24f",
//             }}
//           >
//             <div className="text-center text-white">
//               <div className="text-[12px] font-semibold tracking-wide">
//                 {bettingOpen ? "Place bets" : round?.state === "revealing" ? "Revealing…" : "Next Round"}
//               </div>
//               <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)]">
//                 {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Chip bar */}
//         <div className="px-3">
//           <div className="rounded-2xl bg-black/50 border border-white/10 shadow-lg px-2 py-6 relative backdrop-blur-sm">
//             <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 text-white text-[11px] font-semibold px-3 py-0.5 border border-emerald-300/50 shadow-md">
//               Popular Bets
//             </div>

//             <div className="mx-auto w-[94%] grid grid-cols-5 gap-6 place-items-center">
//               {CHIPS.map((v) => (
//                 <motion.button
//                   key={v}
//                   ref={(el) => {
//                     chipRefs.current[v] = el;
//                     return undefined;
//                   }}
//                   whileTap={{ scale: 0.95 }}
//                   onClick={() => setSelectedChip(v)}
//                   className={`relative rounded-full w-[64px] h-[64px] grid place-items-center transition-all duration-200 ${selectedChip === v ? "ring-2 ring-blue-400" : ""}`}
//                   title={`${v}`}
//                 >
//                   <div className={`absolute inset-0 rounded-full border-4 transition-all duration-200 ${selectedChip === v ? "border-sky-500" : "border-transparent"}`} />
//                   <div className={`absolute w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-200 ${selectedChip === v ? "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-xl" : "bg-gradient-to-br from-gray-200 to-gray-400 shadow-md"}`} />
//                   <div className={`absolute w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${selectedChip === v ? "bg-gradient-to-br from-yellow-200 to-yellow-400 border border-yellow-300 shadow-inner" : "bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-200 shadow-inner"}`} />
//                   <div className={`absolute text-sm font-bold transition-colors duration-200 ${selectedChip === v ? "text-yellow-800" : "text-gray-700"}`}>
//                     {fmt(v)}
//                   </div>
//                 </motion.button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Progress bar */}
//         <div className="px-3 mt-3">
//           <div className="h-[10px] bg-black/10 rounded-full overflow-hidden">
//             <motion.div
//               className="h-full"
//               style={{ background: "linear-gradient(90deg,#34d399,#10b981)" }}
//               initial={{ width: 0 }}
//               animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
//               transition={{ type: "tween", ease: "linear", duration: 0.05 }}
//             />
//           </div>
//         </div>

//         {/* Result row (trend bar) */}
//         <div className="px-3 mt-3">
//           <div className="rounded-2xl bg-[#e43e3e] text-white p-3 flex items-center gap-4">
//             <div className="text-sm font-semibold">Result</div>
//             <div className="mt-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
//               {winnersHistory.length === 0 && <div className="text-xs opacity-70 text-center">No results yet.</div>}
//               {winnersHistory.map((k, idx) => (
//                 <div key={`${k}-${idx}-${round?.roundId ?? "r"}`} className="min-w-8 w-8 h-8 rounded-full bg-white grid place-items-center shadow">
//                   <span className="text-lg leading-none">{EMOJI[k]}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Stats strip */}
//         <div className="px-3 mt-3 mb-24 grid grid-cols-2 gap-3">
//           <div className="rounded-2xl bg-white text-[#333] px-3 py-2 border border-black/10">
//             <div className="text-[12px] opacity-80">Coins left</div>
//             <div ref={balanceRef} className="text-[16px] font-bold">💎 {fmt(user?.balance ?? 0)}</div>
//           </div>
//           <div className="rounded-2xl bg-white text-[#333] px-3 py-2 border border-black/10">
//             <div className="text-[12px] opacity-80">Today’s rewards</div>
//             <div className="text-[16px] font-bold">💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}</div>
//           </div>
//         </div>

//         {/* transient flies */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {flies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//             {remoteFlies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* payout + bank flies */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {payoutFlies.map((f) => (
//               <motion.div
//                 key={`p-${f.id}`}
//                 initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                 animate={{
//                   x: (balanceRef.current?.getBoundingClientRect()?.left ?? 0) - (phoneRef.current?.getBoundingClientRect()?.left ?? 0) + (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                   y: (balanceRef.current?.getBoundingClientRect()?.top ?? 0) - (phoneRef.current?.getBoundingClientRect()?.top ?? 0) + (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                   opacity: 1,
//                   scale: 1,
//                   rotate: 360,
//                 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}

//             {bankFlies.map((f) => (
//               <motion.div
//                 key={`b-${f.id}`}
//                 initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                 animate={{
//                   x: (bankRef.current?.getBoundingClientRect()?.left ?? 0) - (phoneRef.current?.getBoundingClientRect()?.left ?? 0) + (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                   y: (bankRef.current?.getBoundingClientRect()?.top ?? 0) - (phoneRef.current?.getBoundingClientRect()?.top ?? 0) + (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                   opacity: 1,
//                   scale: 1,
//                   rotate: 360,
//                 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* Leaderboard modal */}
//         {showLeaderboard && (
//           <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center">
//             <div className="w-[92%] max-w-md rounded-2xl bg-white shadow-xl p-4">
//               <div className="text-lg font-bold text-sky-900">🏆 Block Leaderboard (last 10 rounds)</div>
//               <div className="mt-1 text-xs text-sky-700">
//                 Next block starts automatically{typeof intermissionSec === "number" ? ` in ${intermissionSec}s` : ""}.
//               </div>
//               <div className="mt-3 max-h-80 overflow-auto">
//                 {ranking.length === 0 && <div className="text-sm text-sky-700">No winners this block.</div>}
//                 {ranking.map((r, i) => (
//                   <div
//                     key={r.userId}
//                     className={`flex items-center justify-between py-2 border-b last:border-b-0 ${r.userId === user?.id ? "bg-emerald-50/80 rounded px-2" : ""}`}
//                   >
//                     <div className="flex items-center gap-2">
//                       <div className="w-6 text-right text-sm tabular-nums">{i + 1}.</div>
//                       <div className="text-sm font-medium text-sky-900">{r.userId === user?.id ? "You" : r.userId.slice(0, 6)}</div>
//                     </div>
//                     <div className="text-sm font-semibold text-sky-900 tabular-nums">{r.wins} win{r.wins !== 1 ? "s" : ""}</div>
//                   </div>
//                 ))}
//               </div>
//               <div className="mt-4 flex justify-end gap-2">
//                 <button onClick={() => setIntermissionSec(0)} className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm px-3 py-1.5">Start Now</button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Settings bottom sheet */}
//         <AnimatePresence>
//           {settingsOpen && (
//             <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 26 }} className="fixed inset-x-0 bottom-0 z-50">
//               <div className="mx-auto w-[350px] max-w-[350px] rounded-t-2xl bg-white shadow-2xl border-t border-black/10 p-4">
//                 <div className="flex items-center justify-between">
//                   <div className="text-[15px] font-bold text-[#222]">Settings</div>
//                   <button className="text-[22px]" onClick={() => setSettingsOpen(false)}>✕</button>
//                 </div>
//                 <div className="mt-3 text-[12px] text-[#334]">Sound</div>
//                 <div className="mt-2">
//                   <Slider label="Master" value={prefs.master} onChange={(v) => setPrefs((p) => ({ ...p, master: v }))} />
//                   <Slider label="Bet" value={prefs.bet} onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))} />
//                   <Slider label="Reveal" value={prefs.reveal} onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))} />
//                   <Slider label="Win" value={prefs.win} onChange={(v) => setPrefs((p) => ({ ...p, win: v }))} />
//                   <Slider label="BG Music" value={prefs.bg} onChange={(v) => setPrefs((p) => ({ ...p, bg: v }))} />
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* gain flourish */}
//       <div className="pointer-events-none fixed inset-0">
//         <AnimatePresence>
//           {gainCoins.map((id, i) => {
//             const cont = phoneRef.current?.getBoundingClientRect();
//             const bal = balanceRef.current?.getBoundingClientRect();
//             const sx = cont ? cont.left + cont.width / 2 : 0;
//             const sy = cont ? cont.top + 520 : 0;
//             const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//             const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//             return (
//               <motion.div
//                 key={id}
//                 initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                 animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>
//       </div>

//       {/* keyframes for winner blink */}
//       <style>{`
//         @keyframes blink {
//           0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,.9), 0 8px 18px rgba(0,0,0,.25); border-color:#22c55e; }
//           50% { box-shadow: 0 0 0 3px rgba(34,197,94,.2), 0 8px 18px rgba(0,0,0,.25); border-color:#bbf7d0; }
//         }
//         .no-scrollbar::-webkit-scrollbar{ display:none; }
//         .no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; }
//       `}</style>
//     </div>
//   );
// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FruitKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// /** ==================== UI bits ==================== **/
// function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
//   return (
//     <button
//       onClick={onClick}
//       className="w-10 h-10 rounded-xl bg-[#ffe79d] border border-black/10 shadow grid place-items-center text-[18px] hover:brightness-105 active:scale-95"
//     >
//       {children}
//     </button>
//   );
// }

// function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
//   return (
//     <div className="mb-3">
//       <div className="flex items-center justify-between text-[12px] mb-1 text-[#333]">
//         <span>{label}</span>
//         <span className="tabular-nums">{Math.round(value * 100)}%</span>
//       </div>
//       <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-[#22c55e]" />
//     </div>
//   );
// }

// function Coin() {
//   return (
//     <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-400 shadow-xl flex items-center justify-center">
//       <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-300 flex items-center justify-center">
//         <span className="text-amber-900 text-[8px] font-extrabold">$</span>
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
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// const MAX_COINS_PER_SLICE = 60;

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// // Preferences
// type SoundPrefs = { master: number; bet: number; reveal: number; win: number; bg: number };
// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8, bg: 0.15 };
// const PREFS_KEY = "soundPrefsWheelV1";

// // Visual language
// const EMOJI: Record<FruitKey, string> = {
//   cherry: "🍒",
//   lemon: "🍋",
//   grape: "🍇",
//   watermelon: "🍉",
//   apple: "🍎",
//   pineapple: "🍍",
//   blueberry: "🫐",
//   strawberry: "🍓",
// };
// const LABEL: Record<FruitKey, string> = {
//   cherry: "Cherry",
//   lemon: "Lemon",
//   grape: "Grapes",
//   watermelon: "Watermelon",
//   apple: "Apple",
//   pineapple: "Pineapple",
//   blueberry: "Blueberry",
//   strawberry: "Strawberry",
// };
// const MULTIPLIER: Record<FruitKey, number> = {
//   apple: 5,
//   lemon: 5,
//   blueberry: 10,
//   watermelon: 5,
//   grape: 15,
//   strawberry: 45,
//   pineapple: 25,
//   cherry: 10,
// };

// /** ==================== APP ==================== **/
// export default function App() {
//   const { user, round, placeBet, echoQueue, shiftEcho } = useGame();
//   const prefersReducedMotion = useReducedMotion();

//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null); // ✅ single authoritative ref
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);
//   const wheelDegRef = useRef(0);

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

//   // Sidebar / Top App Bar Drawer
//   const [drawerOpen, setDrawerOpen] = useState(false);

//   // ——— Wheel sizing (phone UI; still responsive if container is narrower)
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
//   const studs = 28;
//   const studsR = R * 0.92;
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
//     } catch { }
//     return DEFAULT_PREFS;
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
//     } catch {
//       // ignore autoplay restrictions
//     }
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
//   }, []); // init once

//   useEffect(() => {
//     // auto start bg after first user gesture if allowed
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

//   // loader
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
//         const ids = Array.from({ length: n }, () => crypto.randomUUID());
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

//   const slices: readonly FruitKey[] = FRUITS;
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

//   /** ===== history & leaderboard ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FruitKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | null>(null);

//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//         ? (round as any).indexInBlock
//         : typeof (round as any)?.roundNumber === "number"
//           ? ((round as any).roundNumber % 10) + 1
//           : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? winnersHistory.length;

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = crypto.randomUUID();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = crypto.randomUUID();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0]; // { betId, userId, fruit, value }
//     const idx = (slices as FruitKey[]).indexOf(evt.fruit);
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
//   }, [echoQueue, round?.roundId]); // intentionally limited deps

//   /** ===== clear per round / pause ===== */
//   useEffect(() => {
//     if (!round) return;
//     if (currentRoundId && currentRoundId !== round.roundId) {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//     setCurrentRoundId(round.roundId);
//     if (round.state === "pause") {
//       setStacked([]);
//       setFlies([]);
//       setRemoteFlies([]);
//       setPayoutFlies([]);
//       setBankFlies([]);
//     }
//   }, [round?.roundId, round?.state, currentRoundId]);

//   /** ===== spin to winner ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);

//   useEffect(() => {
//     if (!round || round.state !== "revealing" || !round.winner) return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     const w = round.winner as FruitKey;
//     const winnerIdx = (slices as FruitKey[]).indexOf(w);
//     const pointerAt = -90;
//     const targetSliceAngle = winnerIdx * sliceAngle;

//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const current = wheelDegRef.current || 0;
//     const desiredMod = ((pointerAt - targetSliceAngle) % 360 + 360) % 360;
//     const currentMod = ((current % 360) + 360) % 360;
//     let extra = desiredMod - currentMod;
//     if (extra < 0) extra += 360;

//     const total = current + base + extra;
//     wheelDegRef.current = total;

//     controls.start({
//       rotate: total,
//       transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//     });

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => { });
//     }
//     const delay = (prefersReducedMotion ? 0.55 : 1.1) * 1000;
//     const t = setTimeout(() => doRevealFlights(w), delay);
//     return () => clearTimeout(t);
//   }, [round?.state, round?.winner, round?.roundId, controls, prefersReducedMotion, audioReady]);

//   function doRevealFlights(winner: FruitKey) {
//     const cont = getContainerRect();
//     if (!cont) return;

//     const bal = balanceRef.current?.getBoundingClientRect();

//     // my winners -> balance (user-only win sound)
//     if (user && bal) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => { });
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     // losers -> bank
//     const bank = bankRef.current?.getBoundingClientRect();
//     if (bank) {
//       const losers = stacked.filter((c) => c.fruit !== winner);
//       if (losers.length) {
//         const bflies = losers.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     // history + leaderboard
//     setWinnersHistory((prev) => {
//       const next = [...prev, winner].slice(-10);
//       if (next.length >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(10);
//       }
//       return next;
//     });
//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//   }

//   // intermission countdown
//   useEffect(() => {
//     if (intermissionSec === null) return;
//     if (intermissionSec <= 0) {
//       setShowLeaderboard(false);
//       setWinsByPlayer({});
//       setWinnersHistory([]);
//       setIntermissionSec(null);
//       return;
//     }
//     const id = setTimeout(() => setIntermissionSec((s) => (s === null ? null : s - 1)), 1000);
//     return () => clearTimeout(id);
//   }, [intermissionSec]);

//   const onSliceClick = useCallback(
//     async (key: FruitKey) => {
//       if (!bettingOpen || !selectedChip) return;
//       await placeBet(key, selectedChip);
//     },
//     [bettingOpen, selectedChip, placeBet]
//   );

//   const counts = useMemo(() => {
//     const m: Record<FruitKey, number> = {
//       cherry: 0,
//       lemon: 0,
//       grape: 0,
//       watermelon: 0,
//       apple: 0,
//       pineapple: 0,
//       blueberry: 0,
//       strawberry: 0,
//     };
//     for (const c of stacked) m[c.fruit] += 1;
//     return m;
//   }, [stacked]);

//   const overflowBySlice = useMemo(() => {
//     const map: Partial<Record<FruitKey, number>> = {};
//     for (const k of FRUITS) {
//       const total = stacked.filter((c) => c.fruit === k).length;
//       const overflow = Math.max(0, total - MAX_COINS_PER_SLICE);
//       if (overflow > 0) map[k] = overflow;
//     }
//     return map;
//   }, [stacked]);

//   const roundNum = useMemo(() => {
//     if (!round?.roundId) return 0;
//     let h = 0;
//     for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
//     return h % 10000;
//   }, [round?.roundId]);

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => b.wins - a.wins);
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] min-h-screen overflow-hidden"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* Overlay for legibility */}
//       <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//       {/* Phone frame */}
//       <div
//         ref={phoneRef}
//         className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-xs border border-white/10 rounded-[8px] overflow-hidden"
//         style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//       >
//         {/* Floating Toggle Button (opens drawer) */}
//         <button
//           aria-label="Open menu"
//           onClick={() => setDrawerOpen(true)}
//           className="fixed left-4 top-4 z-40 w-11 h-11 rounded-2xl bg-white/10 border border-white/20 shadow-xl grid place-items-center text-[18px] hover:bg-white/20 active:scale-95 backdrop-blur text-white"
//           style={{ boxShadow: "0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.25)" }}
//         >
//           ☰
//         </button>

//         {/* Left Drawer */}
//         <AnimatePresence>
//           {drawerOpen && (
//             <>
//               <motion.div
//                 role="button"
//                 aria-label="Close menu overlay"
//                 tabIndex={-1}
//                 className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 onClick={() => setDrawerOpen(false)}
//               />
//               <motion.aside
//                 className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white/10 backdrop-blur-xl border-r border-white/15 p-3 flex flex-col text-white"
//                 initial={{ x: -320, rotateY: -25, opacity: 0 }}
//                 animate={{ x: 0, rotateY: 0, opacity: 1 }}
//                 exit={{ x: -320, rotateY: -25, opacity: 0 }}
//                 transition={{ type: "spring", stiffness: 260, damping: 26 }}
//                 style={{ boxShadow: "20px 0 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)" }}
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="text-[15px] font-bold text-white/90">Menu</div>
//                   <button
//                     aria-label="Close menu"
//                     className="text-[22px] text-white/80"
//                     onClick={() => setDrawerOpen(false)}
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 <div className="mt-3 grid grid-cols-4 gap-2">
//                   <IconBtn ariaLabel="Home">🏠</IconBtn>
//                   <IconBtn ariaLabel="Sound settings" onClick={() => setSettingsOpen(true)}>
//                     🎚️
//                   </IconBtn>
//                   <IconBtn ariaLabel="Help">❓</IconBtn>
//                   <IconBtn ariaLabel="History">🕒</IconBtn>
//                 </div>

//                 <div className="mt-4 text-[13px] font-semibold text-white/80">
//                   Today’s <span className="tabular-nums">{roundNum}</span> Round
//                 </div>

//                 {/* Quick stats in drawer */}
//                 <div className="mt-4 grid gap-2">
//                   <div className="rounded-2xl bg-white/8 border border-white/15 p-3 text-white/90">
//                     <div className="text-[12px] opacity-80">State</div>
//                     <div className="text-[16px] font-semibold capitalize">{round?.state ?? "—"}</div>
//                   </div>
//                   <div className="rounded-2xl bg-white/8 border border-white/15 p-3 text-white/90">
//                     <div className="text-[12px] opacity-80">Block Round</div>
//                     <div className="text-[16px] font-semibold">#{displayBlockRound}</div>
//                   </div>
//                 </div>

//                 <div className="mt-auto text-[11px] text-white/70">
//                   Tip: You can reopen this drawer using the ☰ button.
//                 </div>
//               </motion.aside>
//             </>
//           )}
//         </AnimatePresence>

//         {/* bank tag */}
//         <div
//           ref={bankRef}
//           className="absolute right-3 top-[18px] rounded-xl text-white/90 px-3 py-1.5 text-[11px] shadow"
//           style={{
//             background:
//               "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.04)), radial-gradient(circle at 20% 0%, rgba(255,255,255,.35), transparent 35%)",
//             border: "1px solid rgba(255,255,255,.2)",
//             boxShadow: "0 6px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//           }}
//         >
//           🏦 House Bank
//         </div>

//         {/* WHEEL AREA */}
//         <div className="relative mt-2 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//           {/* pointer */}
//           <div className="absolute left-1/2 -translate-x-1/2 z-30">
//             <div
//               className="w-9 h-12 rounded-[14px] relative"
//               style={{
//                 background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                 boxShadow:
//                   "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//               }}
//             >
//               <div
//                 className="absolute left-1/2 -bottom-[12px] -translate-x-1/2"
//                 style={{
//                   width: 0,
//                   height: 0,
//                   borderLeft: "12px solid transparent",
//                   borderRight: "12px solid transparent",
//                   borderTop: "16px solid #f59e0b",
//                   filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                 }}
//               />
//               {/* sparkle sweep */}
//               <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                 <div className="absolute -inset-y-8 -left-16 w-10 rotate-[25deg] shimmer" />
//               </div>
//             </div>
//           </div>

//           {/* wheel disc */}
//           <motion.div
//             ref={wheelRef}
//             className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//             animate={controls}
//             style={{
//               top: wheelTop,
//               width: D,
//               height: D,
//               borderRadius: 9999,
//               background:
//                 "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//               boxShadow:
//                 "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//               transformStyle: "preserve-3d",
//             }}
//           >
//             {/* metallic rim specular highlights */}
//             <div
//               className="absolute inset-0 rounded-full opacity-50"
//               style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//             />

//             {/* gold studs */}
//             {Array.from({ length: studs }).map((_, i) => {
//               const a = (i * (360 / studs) * Math.PI) / 180;
//               const x = R + studsR * Math.cos(a) - 5;
//               const y = R + studsR * Math.sin(a) - 5;
//               return (
//                 <div
//                   key={i}
//                   className="absolute rounded-full"
//                   style={{
//                     left: x,
//                     top: y,
//                     width: 10,
//                     height: 10,
//                     background: "radial-gradient(circle at 30% 30%, #fff7cc, #ffd24f 60%, #e6a400 100%)",
//                     boxShadow: "0 2px 4px rgba(0,0,0,.5)",
//                   }}
//                 />
//               );
//             })}

//             {/* spokes */}
//             {FRUITS.map((_, i) => (
//               <div
//                 key={i}
//                 className="absolute left-1/2 top-1/2 origin-left"
//                 style={{
//                   width: R,
//                   height: 5,
//                   background: "rgba(255,255,255,.05)",
//                   transform: `rotate(${i * (360 / FRUITS.length)}deg)`,
//                 }}
//               />
//             ))}

//             {/* slice buttons */}
//             {FRUITS.map((key, i) => {
//               const ang = i * (360 / FRUITS.length);
//               const x = R + ringR * Math.cos(((ang - 90) * Math.PI) / 180);
//               const y = R + ringR * Math.sin(((ang - 90) * Math.PI) / 180);
//               const isWinner = round?.winner === key && round?.state !== "betting";
//               const disabled = round?.state !== "betting";
//               return (
//                 <motion.button
//                   whileTap={{ scale: 0.96 }}
//                   whileHover={prefersReducedMotion ? {} : { translateZ: 10 }}
//                   key={key}
//                   onClick={() => !disabled && onSliceClick(key)}
//                   className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border flex flex-col items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""
//                     } `}
//                   style={{
//                     left: x,
//                     top: y,
//                     width: btn,
//                     height: btn,
//                     background:
//                       "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
//                     borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
//                     boxShadow: isWinner
//                       ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
//                       : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
//                   }}

//                   aria-label={`Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`}
//                   disabled={disabled}
//                 >
//                   <div aria-hidden className="text-[28px] leading-none drop-shadow">
//                     {EMOJI[key]}
//                   </div>

//                   <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
//                     win <span className="font-extrabold">x{MULTIPLIER[key]}</span>
//                   </div>

//                   {/* count badge */}
//                   <div
//                     className="absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-[10px] text-white tabular-nums shadow"
//                     style={{
//                       background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                       boxShadow: "0 6px 14px rgba(0,0,0,.45)",
//                       border: "1px solid rgba(255,255,255,.25)",
//                     }}
//                     aria-label={`${counts[key]} coins on ${LABEL[key]}`}
//                   >
//                     {counts[key]}
//                     {overflowBySlice[key] && <span className="ml-1 opacity-80">+{overflowBySlice[key]}</span>}
//                   </div>

//                   {/* subtle gloss */}
//                   <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
//                     <div
//                       className="absolute left-1/2 -top-10 w-24 h-24 rounded-full blur-2xl opacity-30"
//                       style={{ background: "radial-gradient(circle, white, transparent 60%)" }}
//                     />
//                   </div>
//                 </motion.button>
//               );
//             })}

//             {/* inner light sweep */}
//             {!prefersReducedMotion && (
//               <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
//                 <div className="absolute -inset-y-24 -left-40 w-14 rotate-[25deg] shimmer opacity-40" />
//               </div>
//             )}

//             {/* rotating spotlight beam */}
//             {!prefersReducedMotion && (
//               <motion.div
//                 className="absolute left-1/2 top-1/2 origin-bottom pointer-events-none"
//                 style={{ width: R, height: R }}
//                 animate={{ rotate: [0, 360] }}
//                 transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
//               >
//                 {/*                 <div
//                   className="w-full h-[140%]"
//                   style={{
//                     background: "conic-gradient(from 180deg at 50% 50%, rgba(255,255,200,0.22), transparent 60%)",
//                     maskImage: "linear-gradient(to bottom, rgba(0,0,0,1), transparent)",
//                   }}
//                 /> */}
//               </motion.div>
//             )}
//           </motion.div>
//           {/* Center hub (NON-rotating, glass chip) */}
//           <motion.div
//             className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center text-white/95 z-20"
//             style={{
//               top: hubTop,
//               width: hubSize,
//               height: hubSize,
//               background:
//                 "radial-gradient(circle at 50% 35%, rgba(99,102,241,.9), rgba(59,130,246,.9)), conic-gradient(from 210deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 60%)",
//               boxShadow: "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
//               border: "1px solid rgba(255,255,255,.25)",
//             }}
//             animate={{
//               boxShadow: [
//                 "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
//                 "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
//                 "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)"
//               ]
//             }}
//             transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
//           >
//             <div className="text-center">
//               <img src="/cat_anomation.gif" />
//               <div className="text-[12px] font-semibold tracking-wide">
//                 {bettingOpen ? "Place bets" : round?.state === "revealing" ? "Revealing…" : "Next Round"}
//               </div>
//               <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)]">
//                 {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
//               </div>
//             </div>
//           </motion.div>
//         </div>
//         {/* ⬇️ FERRIS WHEEL STAND (behind the wheel) */}
//         <div
//           className="absolute left-1/2 -translate-x-1/2 z-10"
//           style={{ top: wheelTop + R * 2, width: D * 0.94, height: Math.max(110, D * 0.34) }}
//         >
//           <div className="relative w-full h-full">
//             {/* Legs */}
//             <div
//               className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//               style={{
//                 left: "50%",
//                 transform: `translateX(-${D * 0.36}px) skewX(10deg)`,
//                 width: D * 0.28,
//                 height: Math.max(110, D * 0.28),
//                 boxShadow: "0 4px 0 #2379c9",
//               }}
//             />
//             <div
//               className="absolute bottom-10 bg-[#36a2ff] border-4 border-[#2379c9] rounded-md"
//               style={{
//                 left: "50%",
//                 transform: `translateX(${D * 0.08}px) skewX(-10deg)`,
//                 width: D * 0.28,
//                 height: Math.max(110, D * 0.28),
//                 boxShadow: "0 4px 0 #2379c9",
//               }}
//             />

//             {/* Cross-beam */}
//             {/* Progress bar beam (replaces static cross-beam) */}
//             <div
//               className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden"
//               style={{
//                 bottom: 58,
//                 width: D * 0.78,
//                 height: 16,
//                 border: "3px solid #1f4290",
//                 background: "rgba(0,0,0,.45)", // dark base for neon glow
//                 boxShadow: "inset 0 2px 6px rgba(0,0,0,.65), 0 3px 0 #1f4290",
//               }}
//             >
//               {/* neon fill */}
//               <motion.div
//                 className="h-full relative"
//                 style={{
//                   background: "linear-gradient(90deg,#8b5cf6,#3b82f6,#06b6d4)",
//                   boxShadow:
//                     "0 0 12px #3b82f6AA, 0 0 24px #06b6d4AA, inset 0 0 6px rgba(255,255,255,.25)",
//                   filter: "brightness(1.2)",
//                 }}
//                 initial={{ width: 0 }}
//                 animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
//                 transition={{ type: "tween", ease: "linear", duration: 0.05 }}
//               />

//               {/* glowing neon nodes (like bulbs) */}


//               {/* glossy highlight */}
//               <div
//                 className="pointer-events-none absolute inset-0"
//                 style={{
//                   maskImage:
//                     "linear-gradient(to bottom, rgba(255,255,255,.8), rgba(255,255,255,0.1))",
//                   WebkitMaskImage:
//                     "linear-gradient(to bottom, rgba(255,255,255,.8), rgba(255,255,255,0.1))",
//                   background: "linear-gradient(180deg, rgba(255,255,255,.12), transparent 60%)",
//                 }}
//               />
//             </div>


//             {/* Platform */}
//             <div
//               className="absolute left-1/2 -translate-x-1/2 rounded-2xl text-white font-extrabold grid place-items-center"
//               style={{
//                 bottom: 0,
//                 width: D * 0.98,
//                 height: 52,
//                 background: "linear-gradient(180deg, #36a2ff, #2379c9)", // 🔵 new platform color
//                 border: "4px solid #1e40af",
//                 boxShadow: "0 5px 0 #1e3a8a",
//               }}
//             >
//               <span className="text-[13px] tracking-wide">FERRIS WHEEL</span>

//               {/* marquee bulbs */}
//               <div className="pointer-events-none absolute inset-x-4 bottom-1 flex justify-between">
//                 {Array.from({ length: 14 }).map((_, i) => (
//                   <div
//                     key={i}
//                     className="w-3 h-3 rounded-full"
//                     style={{
//                       background: i % 2 ? "#facc15" : "#ffffff", // gold + white bulbs
//                       border: "2px solid rgba(0,0,0,.25)",
//                       animation: `bulbFlash 1s ${i % 2 ? "0.5s" : "0s"} linear infinite`,
//                       boxShadow: "0 0 6px rgba(255,255,255,.5), inset 0 1px 1px rgba(255,255,255,.6)",
//                     }}
//                   />
//                 ))}
//               </div>
//             </div>


//           </div>
//         </div>

//         {/* Chip bar - 3D tokens */}
//         {/* Chip bar - compact, blue-themed tokens */}
//         {/* ===== CHIP BAR ===== */}
//         <div className="px-3">
//           <div
//             className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
//             style={{
//               background:
//                 "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//               borderColor: "rgba(59,130,246,.35)",
//               boxShadow:
//                 "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
//             }}
//           >
//             {/* Title pill */}
//             <div
//               className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[11px] font-semibold px-3 py-0.5 border shadow-md"
//               style={{
//                 background: "linear-gradient(180deg,#60a5fa,#2563eb)",
//                 borderColor: "rgba(255,255,255,.25)",
//                 boxShadow: "0 8px 18px rgba(37,99,235,.45)",
//               }}
//             >
//               Select Bet Amount › Food
//             </div>

//             {/* Chips row */}
//             <div className="mx-auto w-[92%] grid grid-cols-5 gap-3 place-items-center">
//               {[
//                 { v: 100, color: "#1fb141" },   // green
//                 { v: 500, color: "#3b82f6" },   // blue
//                 { v: 1000, color: "#fb923c" },  // orange
//                 { v: 5000, color: "#ef4444" },  // red
//                 { v: 10000, color: "#c084fc" }, // purple
//               ].map(({ v, color }) => {
//                 const selected = selectedChip === v;
//                 return (
//                   <motion.button
//                     key={v}
//                     ref={(el) => {
//                       chipRefs.current[v] = el;
//                       return undefined;
//                     }}
//                     whileTap={{ scale: 0.95, rotate: -2 }}
//                     whileHover={{ y: -3 }}
//                     onClick={() => setSelectedChip(v)}
//                     className="relative rounded-full grid place-items-center transition-all duration-200 focus:outline-none"
//                     style={{
//                       width: 48,  // ⬅️ smaller chip size
//                       height: 48,
//                       transformStyle: "preserve-3d",
//                       boxShadow: selected
//                         ? `0 0 0 3px rgba(255,255,255,.18), 0 10px 20px ${color}55`
//                         : "0 8px 16px rgba(0,0,0,.35)",
//                       border: `2px solid ${selected ? color : "rgba(255,255,255,.14)"}`,
//                       background: `
//                 conic-gradient(
//                   #fff 0 15deg, ${color} 15deg 45deg,
//                   #fff 45deg 60deg, ${color} 60deg 90deg,
//                   #fff 90deg 105deg, ${color} 105deg 135deg,
//                   #fff 135deg 150deg, ${color} 150deg 180deg,
//                   #fff 180deg 195deg, ${color} 195deg 225deg,
//                   #fff 225deg 240deg, ${color} 240deg 270deg,
//                   #fff 270deg 285deg, ${color} 285deg 315deg,
//                   #fff 315deg 330deg, ${color} 330deg 360deg
//                 )
//               `,
//                     }}
//                     title={`${v}`}
//                     aria-label={`Select chip ${v}`}
//                   >
//                     {/* inner face */}
//                     <div
//                       className="absolute rounded-full grid place-items-center text-[10px] font-extrabold tabular-nums"
//                       style={{
//                         width: 34,
//                         height: 34,
//                         background: selected
//                           ? "radial-gradient(circle at 50% 40%, #ffffff, #f0f9ff 65%, #dbeafe)"
//                           : "radial-gradient(circle at 50% 40%, #ffffff, #f3f4f6 65%, #e5e7eb)",
//                         border: "2px solid rgba(0,0,0,.15)",
//                         color: selected ? "#0b3a8e" : "#1f2937",
//                         boxShadow: "inset 0 2px 0 rgba(255,255,255,.45)",
//                       }}
//                     >
//                       {v >= 1000 ? v / 1000 + "K" : v}
//                     </div>

//                     {/* selection glow ring */}
//                     {selected && (
//                       <div
//                         className="absolute inset-[-4px] rounded-full pointer-events-none"
//                         style={{
//                           border: `2px solid ${color}88`,
//                           boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66`,
//                         }}
//                       />
//                     )}
//                   </motion.button>
//                 );
//               })}
//             </div>
//           </div>
//         </div>



//         {/* Progress bar */}
//         {/* <div className="px-3 mt-4">
//           <div className="h-[12px] bg:white/10 rounded-full overflow-hidden border border-white/15 backdrop-blur-sm" style={{background:"rgba(255,255,255,.06)"}}>
//             <motion.div
//               className="h-full"
//               style={{ background: "linear-gradient(90deg,#34d399,#10b981)", boxShadow:"0 6px 16px rgba(16,185,129,.45)" }}
//               initial={{ width: 0 }}
//               animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
//               transition={{ type: "tween", ease: "linear", duration: 0.05 }}
//             />
//           </div>
//         </div> */}

//         {/* Result row (trend bar) */}
//         <div className="px-3 mt-3">
//           <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 text-white p-3 flex items-center gap-4 shadow-xl border border-white/15">
//             <div className="text-sm font-semibold">Result</div>
//             <div className="mt-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
//               {winnersHistory.length === 0 && <div className="text-xs opacity-70 text-center">No results yet.</div>}
//               {winnersHistory.map((k, idx) => (
//                 <div key={`${k}-${idx}-${round?.roundId ?? "r"}`} className="min-w-8 w-8 h-8 rounded-full bg-white/90 grid place-items-center shadow">
//                   <span className="text-lg leading-none">{EMOJI[k]}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Stats strip */}
//         <div className="px-3 mt-3 mb-24 grid grid-cols-2 gap-3">
//           <div className="rounded-2xl text-white px-3 py-2 border border-white/15 bg-white/6 backdrop-blur">
//             <div className="text-[12px] opacity-80">Coins left</div>
//             <div ref={balanceRef} className="text-[16px] font-bold">💎 {fmt(user?.balance ?? 0)}</div>
//           </div>
//           <div className="rounded-2xl text-white px-3 py-2 border border-white/15 bg:white/6 backdrop-blur" style={{ background: "rgba(255,255,255,.06)" }}>
//             <div className="text-[12px] opacity-80">Today’s rewards</div>
//             <div className="text-[16px] font-bold">💎 {fmt((user?.profit ?? 0) - (user?.loss ?? 0))}</div>
//           </div>
//         </div>

//         {/* transient flies */}
//         <div className="pointer-events-none absolute inset-0 z-30">
//           <AnimatePresence>
//             {flies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//             {remoteFlies.map((f) => (
//               <motion.div
//                 key={f.id}
//                 initial={{ x: f.from.x - 20, y: f.from.y - 20, opacity: 0, scale: 0.85 }}
//                 animate={{ x: f.to.x - 20, y: f.to.y - 20, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 22 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* payout + bank flies */}
//         <div className="pointer-events-none absolute inset-0">
//           <AnimatePresence>
//             {payoutFlies.map((f) => (
//               <motion.div
//                 key={`p-${f.id}`}
//                 initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                 animate={{
//                   x: (balanceRef.current?.getBoundingClientRect()?.left ?? 0) - (phoneRef.current?.getBoundingClientRect()?.left ?? 0) + (balanceRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                   y: (balanceRef.current?.getBoundingClientRect()?.top ?? 0) - (phoneRef.current?.getBoundingClientRect()?.top ?? 0) + (balanceRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                   opacity: 1,
//                   scale: 1,
//                   rotate: 360,
//                 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}

//             {bankFlies.map((f) => (
//               <motion.div
//                 key={`b-${f.id}`}
//                 initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
//                 animate={{
//                   x: (bankRef.current?.getBoundingClientRect()?.left ?? 0) - (phoneRef.current?.getBoundingClientRect()?.left ?? 0) + (bankRef.current?.getBoundingClientRect()?.width ?? 40) / 2,
//                   y: (bankRef.current?.getBoundingClientRect()?.top ?? 0) - (phoneRef.current?.getBoundingClientRect()?.top ?? 0) + (bankRef.current?.getBoundingClientRect()?.height ?? 40) / 2,
//                   opacity: 1,
//                   scale: 1,
//                   rotate: 360,
//                 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 240, damping: 24, delay: f.delay }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>

//         {/* Leaderboard modal */}
//         {showLeaderboard && (
//           <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center">
//             <div className="w-[92%] max-w-md rounded-2xl bg-white/10 border border-white/15 shadow-2xl p-4 text-white">
//               <div className="text-lg font-bold">🏆 Block Leaderboard (last 10 rounds)</div>
//               <div className="mt-1 text-xs text-white/80">
//                 Next block starts automatically{typeof intermissionSec === "number" ? ` in ${intermissionSec}s` : ""}.
//               </div>
//               <div className="mt-3 max-h-80 overflow-auto">
//                 {ranking.length === 0 && <div className="text-sm text-white/80">No winners this block.</div>}
//                 {ranking.map((r, i) => (
//                   <div
//                     key={r.userId}
//                     className={`flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 ${r.userId === user?.id ? "bg-emerald-50/10 rounded px-2" : ""}`}
//                   >
//                     <div className="flex items-center gap-2">
//                       <div className="w-6 text-right text-sm tabular-nums">{i + 1}.</div>
//                       <div className="text-sm font-medium">{r.userId === user?.id ? "You" : r.userId.slice(0, 6)}</div>
//                     </div>
//                     <div className="text-sm font-semibold tabular-nums">{r.wins} win{r.wins !== 1 ? "s" : ""}</div>
//                   </div>
//                 ))}
//               </div>
//               <div className="mt-4 flex justify-end gap-2">
//                 <button onClick={() => setIntermissionSec(0)} className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm px-3 py-1.5 border border-white/20 shadow">
//                   Start Now
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Settings bottom sheet */}
//         <AnimatePresence>
//           {settingsOpen && (
//             <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 26 }} className="fixed inset-x-0 bottom-0 z-50">
//               <div className="mx-auto w-[350px] max-w-[350px] rounded-t-2xl bg-white/10 text-white shadow-2xl border-t border-white/15 p-4 backdrop-blur-xl">
//                 <div className="flex items-center justify-between">
//                   <div className="text-[15px] font-bold">Settings</div>
//                   <button className="text-[22px]" onClick={() => setSettingsOpen(false)}>✕</button>
//                 </div>
//                 <div className="mt-3 text-[12px] text-white/80">Sound</div>
//                 <div className="mt-2">
//                   <Slider label="Master" value={prefs.master} onChange={(v) => setPrefs((p) => ({ ...p, master: v }))} />
//                   <Slider label="Bet" value={prefs.bet} onChange={(v) => setPrefs((p) => ({ ...p, bet: v }))} />
//                   <Slider label="Reveal" value={prefs.reveal} onChange={(v) => setPrefs((p) => ({ ...p, reveal: v }))} />
//                   <Slider label="Win" value={prefs.win} onChange={(v) => setPrefs((p) => ({ ...p, win: v }))} />
//                   <Slider label="BG Music" value={prefs.bg} onChange={(v) => setPrefs((p) => ({ ...p, bg: v }))} />
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* gain flourish */}
//       <div className="pointer-events-none fixed inset-0">
//         <AnimatePresence>
//           {gainCoins.map((id, i) => {
//             const cont = phoneRef.current?.getBoundingClientRect();
//             const bal = balanceRef.current?.getBoundingClientRect();
//             const sx = cont ? cont.left + cont.width / 2 : 0;
//             const sy = cont ? cont.top + 520 : 0;
//             const tx = cont && bal ? bal.left + bal.width / 2 - 20 : sx;
//             const ty = cont && bal ? bal.top + bal.height / 2 - 20 : sy;
//             return (
//               <motion.div
//                 key={id}
//                 initial={{ x: sx, y: sy, opacity: 0, scale: 0.85 }}
//                 animate={{ x: tx, y: ty, opacity: 1, scale: 1, rotate: 360 }}
//                 exit={{ opacity: 0, scale: 0.7 }}
//                 transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.05 }}
//                 className="absolute w-10 h-10"
//               >
//                 <Coin />
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>
//       </div>

//       {/* keyframes & helpers */}
//       <style>{`
//         @keyframes blink {
//           0%, 100% { box-shadow: 0 0 0 6px rgba(34,197,94,.9), 0 12px 28px rgba(0,0,0,.55); border-color:#22c55e; }
//           50% { box-shadow: 0 0 0 6px rgba(34,197,94,.2), 0 12px 28px rgba(0,0,0,.55); border-color:#bbf7d0; }
//         }
//         .no-scrollbar::-webkit-scrollbar{ display:none; }
//         .no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; }
//         .drop-shadow{ filter: drop-shadow(0 2px 4px rgba(0,0,0,.45)); }
//         .shimmer{ background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); animation: shimmer 2.4s linear infinite; }
//         @keyframes shimmer { 0% { transform: translateX(-20%); } 100% { transform: translateX(240%); } }
//         .glow { filter: drop-shadow(0 0 10px rgba(34,197,94,.45)); }
//       `}</style>
//     </div>
//   );
// }

// /** ==================== Types ==================== **/
// type StackedCoin = { id: string; fruit: FruitKey; value: number; userId: string };
// type Fly = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; value: number };
// type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
// type BankFly = { id: string; fromX: number; fromY: number; delay: number };

// /** ==================== UI bits ==================== **/
// function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
//   return (
//     <button
//       onClick={onClick}
//       className="w-10 h-10 rounded-xl bg:white/10 border border-white/20 shadow grid place-items-center text-[18px] hover:bg-white/20 active:scale-95 text-white"
//       style={{ boxShadow: "0 8px 18px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.2)", background: "rgba(255,255,255,.08)" }}
//     >
//       {children}
//     </button>
//   );
// }

// function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
//   return (
//     <div className="mb-3">
//       <div className="flex items-center justify-between text-[12px] mb-1 text-white/90">
//         <span>{label}</span>
//         <span className="tabular-nums">{Math.round(value * 100)}%</span>
//       </div>
//       <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-[#22c55e]" />
//     </div>
//   );
// }

// function Coin() {
//   return (
//     <div className="w-8 h-8 rounded-full border shadow-2xl flex items-center justify-center"
//       style={{
//         background: "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
//         borderColor: "#fbbf24",
//         boxShadow: "0 14px 30px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)"
//       }}
//     >
//       <div className="w-8 h-8 rounded-full flex items-center justify-center"
//         style={{ background: "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)", border: "1px solid #facc15" }}
//       >
//         <span className="text-amber-900 text-[8px] font-extrabold">$</span>
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

// ////////////////////////////////////////////////////

// import { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
// import { useGame } from "./useGame";
// import { FRUITS, type FruitKey } from "./types";
// import LeaderboardModal from "./LeaderboardModal";

// /** ==================== CONFIG ==================== **/
// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
// const MAX_COINS_PER_SLICE = 60;

// // Sounds
// const SND_BET = "/mixkit-clinking-coins-1993.wav";
// const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
// const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
// const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// // Preferences
// type SoundPrefs = { master: number; bet: number; reveal: number; win: number; bg: number };
// const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8, bg: 0.15 };
// const PREFS_KEY = "soundPrefsWheelV1";

// // Visual language
// const EMOJI: Record<FruitKey, string> = {
//   cherry: "🍒",
//   lemon: "🍋",
//   grape: "🍇",
//   watermelon: "🍉",
//   apple: "🍎",
//   pineapple: "🍍",
//   blueberry: "🫐",
//   strawberry: "🍓",
// };
// const LABEL: Record<FruitKey, string> = {
//   cherry: "Cherry",
//   lemon: "Lemon",
//   grape: "Grapes",
//   watermelon: "Watermelon",
//   apple: "Apple",
//   pineapple: "Pineapple",
//   blueberry: "Blueberry",
//   strawberry: "Strawberry",
// };
// const MULTIPLIER: Record<FruitKey, number> = {
//   apple: 5,
//   lemon: 5,
//   blueberry: 10,
//   watermelon: 5,
//   grape: 15,
//   strawberry: 45,
//   pineapple: 25,
//   cherry: 10,
// };

// /** ==================== ANGLE HELPERS ==================== **/
// const POINTER_DEG = -90; // fixed top pointer
// const norm360 = (a: number) => ((a % 360) + 360) % 360;

// /**
//  * Stable mapping: which slice is under the top pointer?
//  * Use half-slice offset + floor to avoid boundary flicker.
//  *
//  * We want i*sliceAngle - 90 + rot ≈ POINTER_DEG
//  * ⇒ i*sliceAngle ≈ POINTER_DEG - rot + 90
//  */
// function indexUnderPointer(rotDeg: number, sliceAngle: number, count: number) {
//   const a = norm360(POINTER_DEG - rotDeg + 90);
//   const i = Math.floor((a + sliceAngle / 2) / sliceAngle) % count;
//   return i;
// }

// /** Rotation that centers slice i under the pointer. */
// function rotationToCenterIndex(i: number, sliceAngle: number) {
//   return POINTER_DEG - i * sliceAngle + 90; // with POINTER_DEG=-90 => -i*sliceAngle
// }

// /** ==================== APP ==================== **/
// export default function App() {
//   const { user, round, placeBet, echoQueue, shiftEcho } = useGame();
//   const prefersReducedMotion = useReducedMotion();

//   // ——— Refs
//   const pageRef = useRef<HTMLDivElement | null>(null);
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLDivElement | null>(null);
//   const wheelDegRef = useRef(0);

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

//   // Sidebar / Top App Bar Drawer
//   const [drawerOpen, setDrawerOpen] = useState(false);

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
//   const studsR = R * 0.92; // still used for spoke length reference
//   const wheelTop = 35;
//   const hubSize = Math.round(D * 0.32);
//   const hubTop = wheelTop + R;

//   // ——— Sounds
//   const [prefs, setPrefs] = useState<SoundPrefs>(() => {
//     try {
//       const raw = localStorage.getItem(PREFS_KEY);
//       if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
//     } catch {}
//     return DEFAULT_PREFS;
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
//   }, []); // init once

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

//   // loader
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
//         const ids = Array.from({ length: n }, () => crypto.randomUUID());
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

//   const slices: readonly FruitKey[] = FRUITS;
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

//   /** ===== history & leaderboard ===== */
//   const [winnersHistory, setWinnersHistory] = useState<FruitKey[]>([]);
//   const [winsByPlayer, setWinsByPlayer] = useState<Record<string, number>>({});
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | null>(null);

//   const serverBlockRound =
//     (typeof (round as any)?.blockRound === "number"
//       ? (round as any).blockRound
//       : typeof (round as any)?.indexInBlock === "number"
//       ? (round as any).indexInBlock
//       : typeof (round as any)?.roundNumber === "number"
//       ? ((round as any).roundNumber % 10) + 1
//       : undefined) as number | undefined;

//   const displayBlockRound = serverBlockRound ?? winnersHistory.length;

//   /** ===== flies ===== */
//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? { x: chip.left - cont.left + chip.width / 2, y: chip.top - cont.top + chip.height / 2 }
//           : { x: to.x, y: to.y };
//       const id = crypto.randomUUID();
//       setFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getContainerRect]
//   );

//   const spawnRemoteFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const c = getWheelCenter();
//       const from = { x: c.x + (Math.random() - 0.5) * 120, y: c.y - 180 + Math.random() * 60 };
//       const id = crypto.randomUUID();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(() => setRemoteFlies((p) => p.filter((f) => f.id !== id)), 1200);
//     },
//     [getWheelCenter]
//   );

//   /** ===== on bet echo ===== */
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;
//     const evt = echoQueue[0]; // { betId, userId, fruit, value }
//     const idx = (slices as FruitKey[]).indexOf(evt.fruit);
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
//   }, [echoQueue, round?.roundId]); // intentionally limited deps

//   /** ===== local pointer-decided winner ===== */
//   const [forcedWinner, setForcedWinner] = useState<FruitKey | null>(null);

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
//     }
//   }, [round?.roundId, round?.state, currentRoundId]);

//   /** ===== spin freely, then pointer decides winner (with micro-settle to center) ===== */
//   const controls = useAnimation();
//   const lastSpinRoundRef = useRef<string | null>(null);

//   // Track wheel rotation for counter-rotation of inner content
//   const [wheelDeg, setWheelDeg] = useState(0);

//   useEffect(() => {
//     if (!round || round.state !== "revealing") return;
//     if (lastSpinRoundRef.current === round.roundId) return;
//     lastSpinRoundRef.current = round.roundId;

//     // prevent pre-blink
//     setForcedWinner(null);

//     if (revealAudioRef.current && audioReady) {
//       revealAudioRef.current.pause();
//       revealAudioRef.current.currentTime = 0;
//       revealAudioRef.current.play().catch(() => {});
//     }

//     const current = wheelDegRef.current || 0;
//     const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
//     const jitter = hash01(round.roundId ?? "seed", 99) * 360; // deterministic "random"
//     const total = current + base + jitter;

//     (async () => {
//       // 1) free spin
//       await controls.start({
//         rotate: total,
//         transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
//       });

//       // 2) find which slice is under the pointer at the stop angle
//       const idx = indexUnderPointer(total, 360 / FRUITS.length, FRUITS.length);

//       // 3) compute the exact rotation that centers that slice under the pointer
//       const ideal = rotationToCenterIndex(idx, 360 / FRUITS.length); // mod-equivalent
//       const k = Math.round((total - ideal) / 360);
//       const settleRot = ideal + 360 * k; // closest to total

//       // 4) quick settle to align button exactly under pointer
//       await controls.start({
//         rotate: settleRot,
//         transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
//       });

//       // 5) set the local winner and start flights
//       const winner = FRUITS[idx] as FruitKey;
//       setForcedWinner(winner);
//       doRevealFlights(winner);
//     })();
//   }, [round?.state, round?.roundId, controls, prefersReducedMotion, audioReady]);

//   function doRevealFlights(winner: FruitKey) {
//     const cont = getContainerRect();
//     const bal = balanceRef.current?.getBoundingClientRect();
//     const bank = bankRef.current?.getBoundingClientRect();

//     /** ===== my winners -> balance (user-only win sound) ===== */
//     if (user && bal && cont) {
//       const myWins = stacked.filter((c) => c.userId === user.id && c.fruit === winner);
//       if (myWins.length) {
//         if (winAudioRef.current && audioReady) {
//           winAudioRef.current.pause();
//           winAudioRef.current.currentTime = 0;
//           winAudioRef.current.play().catch(() => {});
//         }
//         const flies = myWins.map((c, i) => {
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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
//           const idx = (slices as FruitKey[]).indexOf(c.fruit);
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

//     /** ===== history + leaderboard (always run) ===== */
//     setWinnersHistory((prev) => {
//       const next = [...prev, winner].slice(-10);
//       if (next.length >= 10) {
//         setShowLeaderboard(true);
//         setIntermissionSec(10);
//       }
//       return next;
//     });

//     const winnersThisRound = new Set(stacked.filter((c) => c.fruit === winner).map((c) => c.userId));
//     if (winnersThisRound.size) {
//       setWinsByPlayer((prev) => {
//         const next = { ...prev } as Record<string, number>;
//         for (const uid of winnersThisRound) next[uid] = (next[uid] ?? 0) + 1;
//         return next;
//       });
//     }
//   }

//   const onSliceClick = useCallback(
//     async (key: FruitKey) => {
//       if (!bettingOpen || !selectedChip) return;
//       await placeBet(key, selectedChip);
//     },
//     [bettingOpen, selectedChip, placeBet]
//   );

//   const counts = useMemo(() => {
//     const m: Record<FruitKey, number> = {
//       cherry: 0,
//       lemon: 0,
//       grape: 0,
//       watermelon: 0,
//       apple: 0,
//       pineapple: 0,
//       blueberry: 0,
//       strawberry: 0,
//     };
//     for (const c of stacked) m[c.fruit] += 1;
//     return m;
//   }, [stacked]);

//   const overflowBySlice = useMemo(() => {
//     const map: Partial<Record<FruitKey, number>> = {};
//     for (const k of FRUITS) {
//       const total = stacked.filter((c) => c.fruit === k).length;
//       const overflow = Math.max(0, total - MAX_COINS_PER_SLICE);
//       if (overflow > 0) map[k] = overflow;
//     }
//     return map;
//   }, [stacked]);

//   const roundNum = useMemo(() => {
//     if (!round?.roundId) return 0;
//     let h = 0;
//     for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
//     return h % 10000;
//   }, [round?.roundId]);

//   const ranking = useMemo(() => {
//     const arr = Object.entries(winsByPlayer).map(([userId, wins]) => ({ userId, wins }));
//     arr.sort((a, b) => b.wins - a.wins);
//     return arr;
//   }, [winsByPlayer]);

//   // settings panel
//   const [settingsOpen, setSettingsOpen] = useState(false);

//   /** ==================== RENDER ==================== **/
//   return (
//     <div
//       ref={pageRef}
//       className="relative w-[360px] max-w-[360px] h:[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* Overlay for legibility */}
//       <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//       {/* Phone frame */}
//       <div
//         ref={phoneRef}
//         className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-xs border border-white/10 rounded-[8px] overflow-hidden"
//         style={{ boxShadow: "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)", perspective: 1200 }}
//       >
//         {/* Floating Toggle Button (opens drawer) */}
//         <button
//           aria-label="Open menu"
//           onClick={() => setDrawerOpen(true)}
//           className="fixed left-4 top-4 z-40 w-11 h-11 rounded-2xl bg-white/10 border border-white/20 shadow-xl grid place-items-center text-[18px] hover:bg-white/20 active:scale-95 backdrop-blur text-white"
//           style={{ boxShadow: "0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.25)" }}
//         >
//           ☰
//         </button>

//         {/* Left Drawer */}
//         <AnimatePresence>
//           {drawerOpen && (
//             <>
//               <motion.div
//                 role="button"
//                 aria-label="Close menu overlay"
//                 tabIndex={-1}
//                 className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 onClick={() => setDrawerOpen(false)}
//               />
//               <motion.aside
//                 className="fixed left-0 top-0 bottom-0 z-50 w:[280px] bg-white/10 backdrop-blur-xl border-r border-white/15 p-3 flex flex-col text-white"
//                 initial={{ x: -320, rotateY: -25, opacity: 0 }}
//                 animate={{ x: 0, rotateY: 0, opacity: 1 }}
//                 exit={{ x: -320, rotateY: -25, opacity: 0 }}
//                 transition={{ type: "spring", stiffness: 260, damping: 26 }}
//                 style={{ boxShadow: "20px 0 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)" }}
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="text-[15px] font-bold text-white/90">Menu</div>
//                   <button
//                     aria-label="Close menu"
//                     className="text-[22px] text-white/80"
//                     onClick={() => setDrawerOpen(false)}
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 <div className="mt-3 grid grid-cols-4 gap-2">
//                   <IconBtn ariaLabel="Home">🏠</IconBtn>
//                   <IconBtn ariaLabel="Sound settings" onClick={() => setSettingsOpen(true)}>
//                     🎚️
//                   </IconBtn>
//                   <IconBtn ariaLabel="Help">❓</IconBtn>
//                   <IconBtn ariaLabel="History">🕒</IconBtn>
//                 </div>

//                 <div className="mt-4 text-[13px] font-semibold text-white/80">
//                   Today’s <span className="tabular-nums">{roundNum}</span> Round
//                 </div>

//                 {/* Quick stats in drawer */}
//                 <div className="mt-4 grid gap-2">
//                   <div className="rounded-2xl bg-white/8 border border-white/15 p-3 text-white/90">
//                     <div className="text-[12px] opacity-80">State</div>
//                     <div className="text-[16px] font-semibold capitalize">{round?.state ?? "—"}</div>
//                   </div>
//                   <div className="rounded-2xl bg-white/8 border border-white/15 p-3 text-white/90">
//                     <div className="text-[12px] opacity-80">Block Round</div>
//                     <div className="text-[16px] font-semibold">#{displayBlockRound}</div>
//                   </div>
//                 </div>

//                 <div className="mt-auto text:[11px] text-white/70">
//                   Tip: You can reopen this drawer using the ☰ button.
//                 </div>
//               </motion.aside>
//             </>
//           )}
//         </AnimatePresence>

//         {/* bank tag */}
//         <div
//           ref={bankRef}
//           className="absolute right-3 top-[18px] rounded-xl text-white/90 px-3 py-1.5 text-[11px] shadow"
//           style={{
//             background:
//               "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.04)), radial-gradient(circle at 20% 0%, rgba(255,255,255,.35), transparent 35%)",
//             border: "1px solid rgba(255,255,255,.2)",
//             boxShadow: "0 6px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
//           }}
//         >
//           🏦 House Bank
//         </div>

//         {/* WHEEL AREA */}
//         <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//           {/* pointer */}
//           <div className="absolute left-1/2 -translate-x-1/2 z-30">
//             <div
//               className="w-9 h-12 rounded-[14px] relative"
//               style={{
//                 background: "linear-gradient(180deg,#fef3c7,#fdba74 40%,#f59e0b)",
//                 boxShadow:
//                   "0 8px 24px rgba(0,0,0,.4), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.15)",
//               }}
//             >
//               <div
//                 className="absolute left-1/2 -bottom-[12px] -translate-x-1/2"
//                 style={{
//                   width: 0,
//                   height: 0,
//                   borderLeft: "12px solid transparent",
//                   borderRight: "12px solid transparent",
//                   borderTop: "16px solid #f59e0b",
//                   filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
//                 }}
//               />
//               <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]">
//                 <div className="absolute -inset-y-8 -left-16 w-10 rotate-[25deg] shimmer" />
//               </div>
//             </div>
//           </div>

//           {/* wheel disc */}
//           <motion.div
//             ref={wheelRef}
//             className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
//             animate={controls}
//             onUpdate={(latest) => {
//               if (typeof (latest as any).rotate === "number") {
//                 const rot = (latest as any).rotate as number;
//                 setWheelDeg(rot);
//                 wheelDegRef.current = rot;
//               }
//             }}
//             style={{
//               top: wheelTop,
//               width: D,
//               height: D,
//               borderRadius: 9999,
//               background:
//                 "conic-gradient(from 0deg,#0f172a 0 45deg,#0b132d 45deg 90deg,#0f172a 90deg 135deg,#0b132d 135deg 180deg,#0f172a 180deg 225deg,#0b132d 225deg 270deg,#0f172a 270deg 315deg,#0b132d 315deg 360deg)",
//               boxShadow:
//                 "0 35px 80px rgba(0,0,0,.6), inset 0 0 0 14px #3b82f6, inset 0 0 0 22px rgba(255,255,255,.15), inset 0 0 0 30px #1d4ed8",
//               transformStyle: "preserve-3d",
//               ["--wheel-rot" as any]: `${wheelDeg}deg`,
//             }}
//           >
//             {/* rim highlight */}
//             <div
//               className="absolute inset-0 rounded-full opacity-50"
//               style={{ background: "radial-gradient(closest-side, transparent 72%, rgba(255,255,255,.15) 72%, transparent 76%)" }}
//             />

//             {/* spokes */}
//             {FRUITS.map((_, i) => (
//               <div
//                 key={`spoke-${i}`}
//                 className="absolute left-1/2 top-1/2 origin-left"
//                 style={{
//                   width: R,
//                   height: 5,
//                   background: "rgba(255,255,255,.05)",
//                   transform: `rotate(${i * (360 / FRUITS.length)}deg)`,
//                 }}
//               />
//             ))}

//             {/* per-slice studs + button */}
//             {FRUITS.map((key, i) => {
//               const angDeg = i * (360 / FRUITS.length);
//               const rad = ((angDeg - 90) * Math.PI) / 180;
//               const cx = R + ringR * Math.cos(rad);
//               const cy =