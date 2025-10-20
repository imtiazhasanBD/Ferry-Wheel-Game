// import { useEffect, useRef, useState } from "react";
// import { io } from "socket.io-client";

// const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGUyMTE2ODhiMDBkMWEyMWIxNzg4MzgiLCJyb2xlIjoidXNlciIsImlhdCI6MTc1OTg5Nzc1NiwiZXhwIjoxNzYwNTAyNTU2fQ._cPTYovJa0dGA8PM0eAWltpFHIDvOm05uLCuRRbOkB8";

// const WS_URL = http://${window.location.hostname}:5000/game;

// function emitAck(socket, event, payload, timeoutMs = 6000) {
//   return new Promise((resolve, reject) => {
//     let done = false;
//     const t = setTimeout(() => {
//       if (!done) {
//         done = true;
//         reject(new Error(${event} timeout));
//       }
//     }, timeoutMs);
//     socket.emit(event, payload, (res) => {
//       if (!done) {
//         done = true;
//         clearTimeout(t);
//         resolve(res);
//       }
//     });
//   });
// }

// function useSocket() {
//   const ref = useRef(null);
//   if (!ref.current) {
//     ref.current = io(WS_URL, {
//       auth: TOKEN ? { token: TOKEN } : undefined,
//       transports: ["polling", "websocket"],
//       withCredentials: false,
//     });
//   }
//   useEffect(() => {
//     const s = ref.current;
//     const onErr = (e) => console.log("connect_error:", e?.message || e);
//     s.on("connect_error", onErr);
//     return () => s.off("connect_error", onErr);
//   }, []);
//   return ref.current;
// }

// export default function App() {
//   const socket = useSocket();
//   const [round, setRound] = useState(null);
//   const [balance, setBalance] = useState(0);
//   const [amount, setAmount] = useState(500);
//   const [sid, setSid] = useState(null);
//   const [log, setLog] = useState([]);
//   const [settings, setSettings] = useState(null);
//   const [users, setTotalUsers] = useState(0);
//   const [myBetTotal, setMyBetTotal] = useState(0);
//   const [companyWallet, setCompanyWallet] = useState(0);
//   const [time, setTime] = useState(0);


//   const addLog = (x) =>
//     setLog((p) => [
//       [${new Date().toLocaleTimeString()}] ${x},
//       ...p.slice(-100),
//     ]);

//   // Connect and join
//   useEffect(() => {
//     if (!socket) return;

//     const onConnect = () => {
//       setSid(socket.id);
//       console.log(socket.id);
//       socket.emit("join", { room: "table:alpha" }, () => {});
//       socket.emit(
//         "get_balance",
//         {},
//         (res) => res?.success && setBalance(res.balance)
//       );
//       addLog("connected");
//     };
//     const onDisconnect = (r) => {
//       setSid(null);
//       addLog(disconnect: ${r});
//     };

//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//     };
//   }, [socket]);

//   // Listen to game events (updated phase handling)
//   useEffect(() => {
//     if (!socket) return;
//       let interval = null;

//     const onStart = (d) => setRound({ ...d, status: "OPEN" });
//     const onUpdate = (d) => setRound({ ...d, status: "OPEN" });
//     const onClosed = (d) => setRound((p) => (p ? { ...p, ...d, status: "CLOSED" } : d));
//     const onWinner = (d) => setRound((p) => (p ? { ...p, winningBox: d.winnerBox } : p));
//     const onEnded = (d) => setRound((p) => (p ? { ...p, status: "SETTLED" } : p));
//     const onAccepted = ({ bet }) => setBalance((b) => Math.max(0, b - (bet?.amount || 0)));
//     const onBalance = ({ balance }) => typeof balance === "number" && setBalance(balance);
//     const onTotalUsersCount = ({ count }) => setTotalUsers(count);
//     const onUserBetTotal = ({ totalUserBet }) => setMyBetTotal(totalUserBet);
//     const onCompanyWallet = ({ wallet }) => setCompanyWallet(wallet);
    

//   const phaseUpdate = (d) => {
//     const endTime = new Date(d.phaseEndTime).getTime();

//     // Clear previous interval if exists
//     if (interval) clearInterval(interval);

//     // Update time every 1 second
//     interval = setInterval(() => {
//       const remainingMs = Math.max(0, endTime - Date.now());
//       setTime(remainingMs);
//     }, 1000);
//   };

//     //  Call
//     socket.on("roundStarted", onStart);
//     socket.on("roundUpdated", onUpdate);
//     socket.on("roundClosed", onClosed);
//     socket.on("winnerRevealed", onWinner);
//     socket.on("roundEnded", onEnded);
//     socket.on("bet_accepted", onAccepted);
//     socket.on("balance:update", onBalance);
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
//       socket.off("balance:update", onBalance);
//       socket.off("user_bet_total", onUserBetTotal);
//       socket.off("joinedTotalUsers", onTotalUsersCount);
//        socket.off("get_company_wallet", onCompanyWallet);
//        socket.off("phaseUpdate", phaseUpdate);
//     };
//   }, [socket]);



//   // fetch static settings data
//   useEffect(() => {
//     if (!round) {
//       fetch("http://localhost:5000/api/v1/settings/retrive")
//         .then((res) => res.json())
//         .then((data) => {
//           if (data.success) {
//             setSettings(data.settings);
//             // Populate a temporary round object to display boxes
//             setRound({
//               roundNumber: "-",
//               status: "Preparing...",
//               boxStats: data.settings.boxes.map((b) => ({
//                 box: b.title,
//                 totalAmount: 0,
//                 bettorsCount: 0,
//                 multiplier: b.multiplier,
//               })),
//             });
//           }
//         })
//         .catch(console.error);
//     }
//   }, [round]);

//   async function refreshBalance() {
//     const res = await emitAck(socket, "get_balance", {});
//     if (res?.success) setBalance(res.balance);
//     addLog(get_balance → ${JSON.stringify(res)});
//   }

//   async function place(boxName) {
//     if (!round || round.status !== "OPEN") return;
//     if (!round._id) return addLog("no round _id");
//     const amt = Math.max(50, Number(amount) || 0);
//     const res = await emitAck(socket, "place_bet", {
//       roundId: round._id,
//       box: boxName,
//       amount: amt,
//     });
//     if (!res?.success && typeof res?.balance === "number")
//       setBalance(res.balance);
//     addLog(place_bet → ${JSON.stringify(res)});
//   }

//   if (!round) {
//     if (!settings) {
//       return (
//         <div style={pageWrap}>
//           <div>SID: {sid || "-"}</div>
//           <div style={{ opacity: 0.8 }}>Loading settings…</div>
//         </div>
//       );
//     }

//     return (
//       <div style={pageWrap}>
//         <div>SID: {sid || "-"}</div>
//         <div style={{ opacity: 0.8 }}>Preparing next round…</div>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(5,1fr)",
//             gap: 8,
//             marginTop: 12,
//           }}
//         >
//           {settings.boxes.map((box, i) => (
//             <button key={i} style={btn} disabled>
//               <div>{box.icon}</div>
//               <div>{box.title}</div>
//               <div>bet:0</div>
//               <div>count:0</div>
//               {box.multiplier ? <div>({box.multiplier}x)</div> : null}
//             </button>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         padding: 16,
//         color: "#e6eef8",
//         background: "#0b0f14",
//         minHeight: "100vh",
//       }}
//     >
//       <header
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           marginBottom: 12,
//         }}
//       >
//         <div>
//           <div style={{ fontWeight: 600 }}>
//             Round #{round?.roundNumber} — {round?.status}
//           </div>
//           {round?.winningBox && (
//             <div style={{ color: "#ffd54a" }}>Winner: {round?.winningBox}</div>
//           )}
//         </div>

//         <div>
//           Time Remaining: {Math.ceil(time / 1000)}s
//         </div>

//         <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//           <span>Balance: {balance}</span>
//           <button onClick={refreshBalance} style={btn}>
//             Refresh
//           </button>
//         </div>
//       </header>
//       <div style={{ marginBottom: "12px" }}>
//         <div>
//           Total Bet:{" "}
//           {round.boxStats?.reduce((total, box) => total + box.totalAmount, 0)}
//         </div>
//         <div>Total Users: {users}</div>
//         <div>My Total Bets: {myBetTotal}</div>
//       </div>

//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(5,1fr)",
//           gap: 8,
//           marginBottom: 12,
//         }}
//       >
//         {round.boxStats?.map((box, i) => (
//           <button key={i} style={btn} onClick={() => place(box.box)}>
//             <div>{box.icon}</div>
//             <div>{box.box}</div>
//             {box.multiplier ? <div>({box.multiplier}x)</div> : null}
//             <div>bet: {box.totalAmount}</div>
//             <div>count: {box.bettorsCount}</div>
//           </button>
//         ))}
//       </div>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(5,1fr)",
//           gap: 8,
//         }}
//       >
//         {(round.boxes || []).map((b, i) => {
//           const label = typeof b === "string" ? b : b.title;
//           const mult =
//             typeof b === "string"
//               ? ""
//               : b.multiplier
//               ? ` (${b.multiplier}x)`
//               : "";
//           return (
//             <button
//               key={${label}-${i}}
//               style={btn}
//               onClick={() => place(label)}
//             >
//               {b.icon}
//               <p>{label}</p>
//               <p>{mult}</p>
//               <p>bet:{b.totalAmount}</p>
//               <p>count:{b.bettorsCount}</p>
//             </button>
//           );
//         })}
//       </div>

//       {/* Game Logs */}
//       <div
//         style={{
//           marginTop: 12,
//           fontFamily: "ui-monospace,monospace",
//           fontSize: 12,
//           opacity: 0.9,
//           maxHeight: 300,
//           overflow: "auto",
//           border: "1px solid gray",
//         }}
//       >
//         {log.map((L, i) => (
//           <div key={i}>{L}</div>
//         ))}
//       </div>

//       {/* <TransactionHistoryTable/> */}
//     </div>
//   );
// }

// const pageWrap = {
//   minHeight: "100vh",
//   display: "grid",
//   placeItems: "center",
//   background: "#111",
//   color: "#fff",
// };

// const btn = {
//   background: "#121821",
//   color: "#e6eef8",
//   border: "1px solid #2a3a52",
//   borderRadius: 8,
//   padding: "8px 12px",
//   cursor: "pointer",
// };

// //







///////////////////////////////////////////////////////////

// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

// import Wheel from "./components/Wheel";
// import ChipBar from "./components/ChipBar";
// import StatsStrip from "./components/StatsStrip";
// import Platform from "./components/Platform";
// import FliesLayer from "./components/FliesLayer";
// import ResultsStrip from "./components/ResultsStrip";

// import { useAudioManager } from "./utils/useAudioManager";
// import { useCursor } from "./utils/useCursor";
// import { useRoundLifecycle } from "./utils/useRoundLifecycle";
// import { useAsyncEffect } from "./utils/useAsyncEffect";

// import { clamp01, fmt, norm, parseTs, uid } from "./constants";
// import type {
//   BankFly,
//   BoxDef,
//   BoxKey,
//   BoxStat,
//   Fly,
//   LiveBox,
//   PayoutFly,
// } from "./types.local";
// import CenterHub from "./components/CenterHub";

// const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;

// export default function App() {
//   const game = useGame() as any;
//   const {
//     user,
//     round,
//     placeBet,
//     echoQueue,
//     shiftEcho,
//     creditWin,
//     updateBalance,
//     balance,
//     getRoundWinners,
//     getCurrentHistory,
//     myBetTotal,
//     setting,
//   } = game;

//   const startNextRound:
//     | (() => Promise<void> | void)
//     | undefined =
//     game.startNextRound ||
//     game.startNextBlock ||
//     game.nextRound ||
//     game.startRound;

//   const prefersReducedMotion = useReducedMotion();

//   /** ——————— App UI state ——————— **/
//   const [showRoundWinners, setShowRoundWinners] = useState(false);
//   const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);
//   const [settingsOpen, setSettingsOpen] = useState(false);
//   const [showLeaderboard, setShowLeaderboard] = useState(false);
//   const [showGameRules, setShowGameRules] = useState(false);
//   const [showRecord, setShowRecord] = useState(false);
//   const [intermissionSec, setIntermissionSec] = useState<number | undefined>(
//     undefined
//   );

//   const [prefs, setPrefs] = useState<Prefs>({
//     master: 1,
//     bet: 1,
//     reveal: 1,
//     win: 1,
//     bg: 1,
//   });

//   // audio manager
//   const audio = useAudioManager(prefs);

//   // soft toast
//   const [tip, setTip] = useState<string | null>(null);
//   const tipIdRef = useRef(0);
//   function notify(msg: string, ms = 1500) {
//     const id = ++tipIdRef.current;
//     setTip(msg);
//     setTimeout(() => {
//       if (tipIdRef.current === id) setTip(null);
//     }, ms);
//   }

//   // boot + login
//   const LOADER_DURATION_MS = 3000;
//   const [bootLoading, setBootLoading] = useState(true);
//   const [bootProgress, setBootProgress] = useState(0);
//   const [loggedIn, setLoggedIn] = useState(false);
//   const [token, setToken] = useState<string | null>(null);

//   useEffect(() => {
//     setToken(localStorage.getItem("auth_token"));
//     setLoggedIn(!!localStorage.getItem("auth_token"));
//   }, []);

//   useEffect(() => {
//     if (!bootLoading) return;
//     let raf = 0;
//     const start = performance.now();
//     const tick = (now: number) => {
//       const p = Math.min(1, (now - start) / LOADER_DURATION_MS);
//       setBootProgress(p);
//       if (p < 1) raf = requestAnimationFrame(tick);
//       else setTimeout(() => setBootLoading(false), 150);
//     };
//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [bootLoading]);

//   function handleLoginSuccess() {
//     setToken(localStorage.getItem("auth_token"));
//     setLoggedIn(true);
//   }

//   // refs
//   const phoneRef = useRef<HTMLDivElement | null>(null);
//   const wheelRef = useRef<HTMLDivElement | null>(null);
//   const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
//   const balanceRef = useRef<HTMLDivElement | null>(null);
//   const bankRef = useRef<HTMLButtonElement | null>(null);

//   // results history
//   const [winnersHistory, setWinnersHistory] = useState<ApiHistoryItem[]>([]);

//   /** ——————— Geometry ——————— **/
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

//   // for counter-rotation of content
//   const [wheelDeg, setWheelDeg] = useState(0);

//   /** ——————— Live boxes ——————— **/
//   const CORE_ORDER: FoodsKey[] = [
//     "meat",
//     "tomato",
//     "corn",
//     "sausage",
//     "lettuce",
//     "carrot",
//     "skewer",
//     "ham",
//   ];
//   const CORE_LABEL: Record<FoodsKey, string> = {
//     meat: "Meat",
//     tomato: "Tomato",
//     corn: "Corn",
//     sausage: "Sausage",
//     lettuce: "Lettuce",
//     carrot: "Carrot",
//     skewer: "Skewer",
//     ham: "Ham",
//   };
//   function buildLiveBoxes(payload: {
//     boxStats?: BoxStat[];
//     boxes?: BoxDef[];
//   }): LiveBox[] {
//     const src = (payload.boxStats?.length ? payload.boxStats : payload.boxes) ?? [];
//     const map = new Map<FoodsKey, LiveBox>();
//     for (const it of src as any[]) {
//       const key = norm(it.box ?? it.title) as FoodsKey;
//       if (!CORE_ORDER.includes(key)) continue;
//       const multiplier = Number(it.multiplier ?? 1);
//       const total = Number((it.totalAmount ?? it.totalBet) ?? 0);
//       const bettors = Number((it.bettorsCount ?? it.userCount) ?? 0);
//       map.set(key, {
//         key,
//         title: CORE_LABEL[key],
//         icon: it.icon,
//         multiplier: isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
//         total: isFinite(total) && total >= 0 ? total : 0,
//         bettors: isFinite(bettors) && bettors >= 0 ? bettors : 0,
//       });
//     }
//     return CORE_ORDER.map(
//       (k) =>
//         map.get(k) ?? {
//           key: k,
//           title: CORE_LABEL[k],
//           icon: undefined,
//           multiplier: 1,
//           total: 0,
//           bettors: 0,
//         }
//     );
//   }
//   const liveBoxes = useMemo(
//     () => buildLiveBoxes(round ?? {}),
//     [round?.boxStats, round?.boxes]
//   );

//   const sliceCount = liveBoxes.length || 1;
//   const sliceAngle = 360 / sliceCount;

//   const totalsForHot = useMemo(() => {
//     const m: Record<string, number> = {};
//     for (const bx of liveBoxes) m[bx.key] = bx.total ?? 0;
//     return m;
//   }, [liveBoxes]);

//   const hotKey = useMemo<string | null>(() => {
//     let best: string | null = null,
//       bestVal = 0;
//     for (const bx of liveBoxes) {
//       const v = totalsForHot[bx.key] ?? 0;
//       if (v > bestVal) {
//         bestVal = v;
//         best = bx.key;
//       }
//     }
//     return bestVal > 0 ? best : null;
//   }, [liveBoxes, totalsForHot]);

//   /** ——————— Betting ——————— **/
//   const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
//   const [userBets, setUserBets] = useState<Record<BoxKey, number>>({
//     meat: 0,
//     tomato: 0,
//     corn: 0,
//     sausage: 0,
//     lettuce: 0,
//     carrot: 0,
//     skewer: 0,
//     ham: 0,
//   });
//   const hasAnyCoins = (user?.balance ?? 0) > 0;
//   const canAffordChip = (user?.balance ?? 0) >= (selectedChip || 0);

//   const seenEchoIdsRef = useRef<Set<string>>(new Set());
//   const pendingLocalBetRef = useRef<
//     Array<{ key: BoxKey; value: number; until: number }>
//   >([]);

//   function markPendingLocal(key: BoxKey, value: number, ms = 700) {
//     const now = Date.now();
//     pendingLocalBetRef.current.push({ key, value, until: now + ms });
//     pendingLocalBetRef.current = pendingLocalBetRef.current.filter(
//       (x) => x.until > now
//     );
//   }
//   function shouldSuppressEcho(key: BoxKey, value: number) {
//     const now = Date.now();
//     const i = pendingLocalBetRef.current.findIndex(
//       (x) => x.key === key && x.value === value && x.until > now
//     );
//     if (i >= 0) {
//       pendingLocalBetRef.current.splice(i, 1);
//       return true;
//     }
//     return false;
//   }

//   const getContainerRect = useCallback(
//     () => phoneRef.current?.getBoundingClientRect() || null,
//     []
//   );
//   const getWheelCenter = useCallback(() => {
//     const cont = getContainerRect();
//     const wheel = wheelRef.current?.getBoundingClientRect();
//     if (cont && wheel)
//       return {
//         x: wheel.left - cont.left + wheel.width / 2,
//         y: wheel.top - cont.top + wheel.height / 2,
//       };
//     return { x: (cont?.width ?? 0) / 2, y: 280 };
//   }, [getContainerRect]);

//   const sliceButtonCenter = useCallback(
//     (sliceIndex: number) => {
//       const { x: cx, y: cy } = getWheelCenter();
//       const angDeg = sliceIndex * sliceAngle - 90 + (wheelDeg % 360);
//       const ang = (angDeg * Math.PI) / 180;
//       const rr = (D / 2) * 0.78;
//       return { x: cx + rr * Math.cos(ang), y: cy + rr * Math.sin(ang) };
//     },
//     [getWheelCenter, sliceAngle, wheelDeg, D]
//   );

//   const targetForBet = useCallback(
//     (sliceIndex: number, betId: string) => {
//       const c = sliceButtonCenter(sliceIndex);
//       // cheap stable-ish offset based on id length to avoid overlap
//       const a =
//         2 *
//         Math.PI *
//         (((betId.length * 9301 + 49297) % 233280) / 233280);
//       const r =
//         8 + 18 * (((betId.length * 29791 + 1597) % 233280) / 233280);
//       return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
//     },
//     [sliceButtonCenter]
//   );

//   const [flies, setFlies] = useState<Fly[]>([]);
//   const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
//   const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
//   const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

//   const spawnLocalFly = useCallback(
//     (to: { x: number; y: number }, value: number) => {
//       const cont = getContainerRect();
//       const chip = chipRefs.current[value]?.getBoundingClientRect();
//       const from =
//         chip && cont
//           ? {
//               x: chip.left - cont.left + chip.width / 2,
//               y: chip.top - cont.top + chip.height / 2,
//             }
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
//       const from = {
//         x: c.x + (Math.random() - 0.5) * 120,
//         y: c.y - 180 + Math.random() * 60,
//       };
//       const id = uid();
//       setRemoteFlies((p) => [...p, { id, from, to, value }]);
//       setTimeout(
//         () => setRemoteFlies((p) => p.filter((f) => f.id !== id)),
//         1200
//       );
//     },
//     [getWheelCenter]
//   );

//   const onSliceClick = useCallback(
//     async (key: BoxKey) => {
//       const bal = user?.balance ?? 0;
//       if (bal <= 0) return notify("You don't have coin");
//       if (bal < (selectedChip || 0))
//         return notify("Not enough balance for this chip");
//       if (round?.roundStatus !== "betting" || showLeaderboard || !selectedChip)
//         return;

//       const idx = liveBoxes.findIndex((b) => b.key === key);
//       if (idx >= 0) {
//         const to = targetForBet(idx, uid());
//         spawnLocalFly(to, selectedChip);
//         markPendingLocal(key, selectedChip);
//       }
//       setUserBets((prev) => ({
//         ...prev,
//         [key]: (prev[key] ?? 0) + selectedChip,
//       }));

//       try {
//         await placeBet(key, selectedChip);
//         audio.play("bet");
//       } catch {
//         notify("Bet failed");
//       }
//     },
//     [
//       user?.balance,
//       selectedChip,
//       round?.roundStatus,
//       showLeaderboard,
//       liveBoxes,
//       targetForBet,
//       spawnLocalFly,
//       placeBet,
//       audio,
//     ]
//   );

//   // echo processing
//   useEffect(() => {
//     if (!echoQueue.length || !round) return;

//     const evt = echoQueue[0];
//     if (evt.betId && seenEchoIdsRef.current.has(evt.betId)) {
//       shiftEcho();
//       return;
//     }
//     if (evt.betId) seenEchoIdsRef.current.add(evt.betId);

//     const keyRaw = (evt?.key ??
//       evt?.box ??
//       evt?.fruit ??
//       evt?.title ??
//       evt?.name ??
//       "") as BoxKey;

//     const idx = liveBoxes.findIndex(
//       (b) => norm(b.key) === norm(keyRaw)
//     );
//     if (idx < 0) {
//       shiftEcho();
//       return;
//     }

//     const to = targetForBet(idx, evt.betId);
//     const isMine = evt.userId === user?.id;
//     const suppress = isMine && shouldSuppressEcho(keyRaw, evt.value);

//     if (!suppress) {
//       if (isMine) spawnLocalFly(to, evt.value);
//       else spawnRemoteFly(to, evt.value);
//     }

//     shiftEcho();
//   }, [
//     echoQueue,
//     round?.roundId,
//     liveBoxes,
//     user?.id,
//     targetForBet,
//     spawnLocalFly,
//     spawnRemoteFly,
//     shiftEcho,
//   ]);

//   /** ——————— Cursor highlight ——————— **/
//   const [forcedWinner, setForcedWinner] = useState<FoodsKey | null>(null);

//   const onLand = useCallback(
//     (targetIndex: number) => {
//       const winnerKey = liveBoxes[targetIndex]?.key as
//         | FoodsKey
//         | undefined;
//       if (!winnerKey) return;
//       setForcedWinner(winnerKey);

//       // payout credit (client-side optimistic)
//       const MULTIPLIER: Record<FoodsKey, number> = {
//         meat: 45,
//         tomato: 5,
//         corn: 5,
//         sausage: 10,
//         lettuce: 5,
//         carrot: 5,
//         skewer: 15,
//         ham: 25,
//       };
//       const winAmount =
//         (userBets[winnerKey] ?? 0) * MULTIPLIER[winnerKey];
//       if (winAmount > 0) {
//         (creditWin?.(winAmount) ?? Promise.resolve()).catch(() =>
//           updateBalance?.(winAmount)
//         );
//         audio.play("win");
//       }

//       // load + show round winners
//       (async () => {
//         try {
//           const rid = (round as any)?._id || round?.roundId;
//           const data = await getRoundWinners(rid);
//           setRoundWinners(data);
//           setShowRoundWinners(true);
//         } catch {}
//       })();
//     },
//     [
//       liveBoxes,
//       userBets,
//       creditWin,
//       updateBalance,
//       getRoundWinners,
//       round,
//       audio,
//     ]
//   );

//   const {
//     activeIdx,
//     activeColor,
//     start: startCursor,
//     stop: stopCursor,
//     settleOn: settleOnWinner,
//     markNotLanded,
//   } = useCursor(sliceCount, onLand, () => audio.play("hop"));

//   /** ——————— Round lifecycle (removes duplicated effects) ——————— **/
//   const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

//   const resetForNewOrSettledRound = useCallback(() => {
//     setForcedWinner(null);
//     setFlies([]);
//     setRemoteFlies([]);
//     setPayoutFlies([]);
//     setBankFlies([]);
//     setShowRoundWinners(false);
//     if (
//       round?.roundStatus === "revealed" ||
//       round?.roundStatus === "completed"
//     ) {
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

//   useRoundLifecycle({
//     round,
//     currentRoundId,
//     setCurrentRoundId,
//     startCursor: () => startCursor(),
//     stopCursor: () => stopCursor(),
//     settleOnWinnerIndex: (i) => settleOnWinner(i),
//     markNotLanded,
//     liveBoxKeys: liveBoxes.map((b) => b.key),
//     resetForNewOrSettledRound,
//   });

//   /** ——————— Phase UI countdown ——————— **/
//   const phaseTotalMs = useMemo(() => {
//     const s = round?.roundStatus;
//     if (s === "betting")
//       return Math.max(
//         1000,
//         parseTs(round?.endTime) - parseTs(round?.startTime)
//       );
//     if (s === "revealing")
//       return Math.max(
//         600,
//         parseTs(round?.revealTime) - parseTs(round?.endTime)
//       );
//     return 1;
//   }, [
//     round?.roundStatus,
//     round?.startTime,
//     round?.endTime,
//     round?.revealTime,
//   ]);

//   const phaseEndAt = useMemo(() => {
//     const s = round?.roundStatus;
//     if (s === "betting") return parseTs(round?.endTime);
//     if (s === "revealing") return parseTs(round?.revealTime);
//     if (s === "revealed" || s === "completed")
//       return parseTs(round?.prepareTime) || parseTs(round?.startTime);
//     return 0;
//   }, [
//     round?.roundStatus,
//     round?.endTime,
//     round?.revealTime,
//     round?.prepareTime,
//     round?.startTime,
//   ]);

//   const [uiLeftMs, setUiLeftMs] = useState(0);
//   useEffect(() => {
//     const tick = () =>
//       setUiLeftMs(Math.max(0, phaseEndAt - Date.now()));
//     tick();
//     if (!phaseEndAt) {
//       setUiLeftMs(0);
//       return;
//     }
//     const id = setInterval(tick, 1000);
//     return () => clearInterval(id);
//   }, [phaseEndAt, round?.roundStatus]);

//   /** ——————— Intermission / leaderboard ——————— **/
//   useEffect(() => {
//     if (!showLeaderboard) return;
//     if (typeof intermissionSec !== "number" || intermissionSec <= 0) return;
//     const t = setInterval(
//       () =>
//         setIntermissionSec((s) =>
//           typeof s === "number" && s > 0 ? s - 1 : 0
//         ),
//       1000
//     );
//     return () => clearInterval(t);
//   }, [showLeaderboard, intermissionSec]);

//   useEffect(() => {
//     if (showLeaderboard && intermissionSec === 0) {
//       setShowLeaderboard(false);
//       setIntermissionSec(undefined);
//       if (typeof startNextRound === "function") {
//         Promise.resolve(startNextRound()).catch(() => {});
//       }
//     }
//   }, [showLeaderboard, intermissionSec, startNextRound]);

//   /** ——————— History load (useAsyncEffect) ——————— **/
//   useAsyncEffect(
//     async (signal) => {
//       try {
//         const items = await getCurrentHistory();
//         if (signal.aborted) return;
//         setWinnersHistory(
//           items
//             .slice()
//             .sort(
//               (a: ApiHistoryItem, b: ApiHistoryItem) =>
//                 new Date(b.createdAt).getTime() -
//                 new Date(a.createdAt).getTime()
//             )
//         );
//       } catch {}
//     },
//     [getCurrentHistory, round?.roundId]
//   );

//   /** ——————— Prime audio on gesture ——————— **/
//   useEffect(() => {
//     function arm() {
//       audio.primeAll();
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
//   }, [audio]);

//   /** ——————— Render ——————— **/
//   const phoneRect = phoneRef.current?.getBoundingClientRect() ?? null;
//   const balanceRect = balanceRef.current?.getBoundingClientRect() ?? null;
//   const bankRect = bankRef.current?.getBoundingClientRect() ?? null;

//   const bettingOpen = round?.roundStatus === "betting";

//   return (
//     <div
//       className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
//       style={{
//         boxShadow: "0 20px 60px rgba(0,0,0,.35)",
//         backgroundImage: `url("https://img.freepik.com/free-vector/amusement-park-with-circus-night-scene_1308-52610.jpg")`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* loader */}
//       <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
//       {!loggedIn && <LoginPage onLogin={handleLoginSuccess} />}

//       <div>
//         <div className="absolute inset-0 bg-black/40 pointer-events-none" />

//         <div
//           ref={phoneRef}
//           className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5 backdrop-blur-sm border border-white/10 rounded-[8px] overflow-hidden"
//           style={{
//             boxShadow:
//               "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)",
//             perspective: 1200,
//           }}
//         >
//           {/* top bar */}
//           <div className="absolute top-2 left-2 right-2 z-30">
//             <div className="grid grid-cols-2 gap-2">
//               <div className="flex items-center space-x-2">
//                 <button
//                   aria-label="Exit"
//                   className="p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
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

//               <div className="text-white text-xs opacity-80 leading-tight">
//                 <div className="font-bold">
//                   Round: {/* plug your displayBlockRound here if needed */}
//                 </div>
//               </div>

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

//           {/* toast */}
//           <div
//             className="pointer-events-none absolute inset-x-0 top-14 z-[60]"
//             aria-live="polite"
//             aria-atomic="true"
//           >
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
//                     background:
//                       "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
//                     border: "1px solid rgba(255,255,255,.25)",
//                   }}
//                 >
//                   {tip}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* WHEEL */}
//           <div className="relative mt-10 pb-4" style={{ minHeight: wheelTop + D + 140 }}>
//             <Wheel
//               D={D}
//               wheelTop={wheelTop}
//               ringR={ringR}
//               R={R}
//               btn={btn}
//               hubTop={hubTop}
//               hubSize={hubSize}
//               liveBoxes={liveBoxes}
//               sliceAngle={sliceAngle}
//               forcedWinner={forcedWinner}
//               activeIdx={activeIdx}
//               activeColor={activeColor}
//               roundStatus={round?.roundStatus}
//               showLeaderboard={showLeaderboard}
//               prefersReducedMotion={!!prefersReducedMotion}
//               selectedChip={selectedChip}
//               canAffordChip={canAffordChip}
//               hasAnyCoins={hasAnyCoins}
//               totalsForHot={totalsForHot}
//               hotKey={hotKey}
//               onSliceClick={onSliceClick}
//             />
//             <CenterHub
//   top={hubTop}
//   size={hubSize}
//   status={round?.roundStatus}
//   bettingOpen={round?.roundStatus === "betting"}
//   showLeaderboard={showLeaderboard}
//   uiLeftMs={uiLeftMs}
// />
//           </div>

//           {/* Platform + Results strip */}
//           <div
//             className="absolute left-1/2 -translate-x-1/2 z-10"
//             style={{
//               top: wheelTop + R * 2.2,
//               width: D * 0.94,
//               height: Math.max(110, D * 0.34),
//             }}
//           >
//             <Platform D={D} />
//             <ResultsStrip
//               items={winnersHistory}
//               emojiMap={{
//                 meat: "🥩",
//                 tomato: "🍅",
//                 corn: "🌽",
//                 sausage: "🌭",
//                 lettuce: "🥬",
//                 carrot: "🥕",
//                 skewer: "🍢",
//                 ham: "🍗",
//               }}
//               labelMap={{
//                 meat: "Meat",
//                 tomato: "Tomato",
//                 corn: "Corn",
//                 sausage: "Sausage",
//                 lettuce: "Lettuce",
//                 carrot: "Carrot",
//                 skewer: "Skewer",
//                 ham: "Ham",
//               }}
//             />
//           </div>

//           {/* Chip bar */}
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
//                 background:
//                   "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
//                 borderColor: "rgba(255,255,255,0.35)",
//                 boxShadow:
//                   "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
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

//               <ChipBar
//                 chips={setting?.chips ?? Array.from(CHIPS)}
//                 selected={selectedChip}
//                 balance={balance ?? 0}
//                 onSelect={setSelectedChip}
//                 chipRefs={chipRefs}
//                 notify={notify}
//               />
//             </div>
//           </div>

//           {/* Stats */}
//           <div className="px-3 mt-3">
//             <StatsStrip
//               balanceEl={balanceRef}
//               balance={balance ?? 0}
//               rewards={(user?.profit ?? 0) - (user?.loss ?? 0)}
//             />
//           </div>

//           {/* Flies */}
//           <FliesLayer
//             flies={flies}
//             remoteFlies={remoteFlies}
//             payoutFlies={payoutFlies}
//             bankFlies={bankFlies}
//             phoneRect={phoneRect}
//             balanceRect={balanceRect}
//             bankRect={bankRect}
//           />

//           {/* Modals */}
//           <LeaderboardModal
//             open={showLeaderboard}
//             onClose={() => {
//               setShowLeaderboard(false);
//               setIntermissionSec(undefined);
//             }}
//             onStartNow={() => setIntermissionSec(0)}
//             intermissionSec={intermissionSec}
//             ranking={[]} // wire your ranking if needed
//             user={user ?? undefined}
//           />
//           <GameRules open={showGameRules} onClose={() => setShowGameRules(false)} />
//           <Record open={showRecord} onClose={() => setShowRecord(false)} />
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

//         {/* fixed bg layer etc could go here */}
//       </div>
//     </div>
//   );
// }
