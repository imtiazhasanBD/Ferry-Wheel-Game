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