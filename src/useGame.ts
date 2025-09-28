import { useEffect, useRef, useState } from "react";
import { makeSocket } from "./socket";
import type { FruitKey } from "./types";

type RoundState = "betting" | "revealing" | "pause";
type Bet = { id: string; fruit: FruitKey; value: number; roundId: string; createdAt: string };
type RoundPublic = { roundId: string; state: RoundState; timeLeftMs: number; winner?: FruitKey };

const RT = import.meta.env.VITE_RT_URL || "http://localhost:8080";
const TABLE_ID = (import.meta.env.VITE_TABLE_ID as string) || "public-1";

export function useGame() {
  const socketRef = useRef<ReturnType<typeof makeSocket> | null>(null);

  const [user, setUser] = useState<{ id: string; name: string; balance: number; profit: number; loss: number } | null>(null);
  const [round, setRound] = useState<RoundPublic | null>(null);
  const [totals, setTotals] = useState<Record<FruitKey, number>>({
    cherry: 0, lemon: 0, grape: 0, watermelon: 0, apple: 0, pineapple: 0, blueberry: 0, strawberry: 0,
  });
  const [myBets, setMyBets] = useState<Bet[]>([]);

  // queue of bet echoes so the UI can animate reliably
  const [echoQueue, setEchoQueue] = useState<Array<{ betId: string; userId: string; fruit: FruitKey; value: number }>>([]);

  function shiftEcho() {
    setEchoQueue((q) => q.slice(1));
  }

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      // 1) ensure token
      let token = localStorage.getItem("token");
      if (!token) {
        const res = await fetch(`${RT}/auth/guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "You" }),
        });
        const data = await res.json();
        token = data.token;
        localStorage.setItem("token", token ?? "");
      }
      if (!isMounted) return;

      // 2) connect socket with token
      const socket = makeSocket(token!);
      socketRef.current = socket;

      // 3) join a table room and get snapshot
      socket.emit("table:join", { tableId: TABLE_ID }, (snap: any) => {
        if (!isMounted || !snap) return;
        setUser(snap.user);
        setMyBets(snap.myBets);
        setTotals(snap.fruitTotals);
        setRound(snap.round);
      });

      // 4) listeners
      socket.on("round:tick", (p: any) => { setRound(p); if (p.fruitTotals) setTotals(p.fruitTotals); });
      socket.on("round:state", (p: any) => setRound(p));
      socket.on("totals:update", (p: any) => setTotals(p.fruitTotals));
      socket.on("round:result", (p: any) =>
        setRound((r) => (r ? { ...r, winner: p.winner, state: "revealing", timeLeftMs: 0 } : r))
      );

      socket.on("balance:refresh", () => {
        socket.emit("table:join", { tableId: TABLE_ID }, (snap: any) => {
          if (!snap) return;
          setUser(snap.user);
          setMyBets(snap.myBets);
          setTotals(snap.fruitTotals);
          setRound(snap.round);
        });
      });

      // enqueue every bet echo
      socket.on("bet:echo", (evt: any) => {
        // evt: { betId, userId, fruit, value }
        setEchoQueue((q) => [...q, evt]);
      });
    }

    boot();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  function placeBet(fruit: FruitKey, value: number): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ ok: false, error: "NO_SOCKET" });

      socket.emit("bet:place", { tableId: TABLE_ID, fruit, value }, (resp: any) => {
        if (resp?.ok) {
          setUser(resp.state.user);
          setMyBets(resp.state.myBets);
          setTotals(resp.state.fruitTotals);
          setRound(resp.state.round);
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: resp?.error });
        }
      });
    });
  }

  /**
   * Prefer this when your backend supports a server-side credit.
   * Tries `balance:credit`; falls back to optimistic local update + refresh.
   */
  function creditWin(delta: number): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!delta) return resolve({ ok: true });
      const socket = socketRef.current;
      if (!socket) {
        // optimistic local if absolutely no socket (unlikely)
        setUser((u) => (u ? { ...u, balance: u.balance + delta } : u));
        return resolve({ ok: false, error: "NO_SOCKET" });
      }

      // If your server implements this:
      socket.emit("balance:credit", { tableId: TABLE_ID, amount: delta }, (resp: any) => {
        if (resp?.ok) {
          // server returns latest state ideally
          if (resp.state?.user) setUser(resp.state.user);
          resolve({ ok: true });
        } else {
          // fallback: optimistic local + then force a refresh snapshot
          setUser((u) => (u ? { ...u, balance: u.balance + delta } : u));
          socket.emit("table:join", { tableId: TABLE_ID }, (snap: any) => {
            if (snap) {
              setUser(snap.user);
              setMyBets(snap.myBets);
              setTotals(snap.fruitTotals);
              setRound(snap.round);
            }
          });
          resolve({ ok: false, error: resp?.error ?? "CREDIT_UNSUPPORTED" });
        }
      });
    });
  }

  /**
   * Simple optimistic updater if you don't want a new server event.
   * It updates locally and then triggers a fresh snapshot.
   */
  function updateBalance(delta: number) {
    if (!delta) return;
    setUser((u) => (u ? { ...u, balance: u.balance + delta } : u));
    const socket = socketRef.current;
    if (socket) {
      socket.emit("table:join", { tableId: TABLE_ID }, (snap: any) => {
        if (!snap) return;
        setUser(snap.user);
        setMyBets(snap.myBets);
        setTotals(snap.fruitTotals);
        setRound(snap.round);
      });
    }
  }

  return {
    user,
    round,
    totals,
    myBets,
    placeBet,
    echoQueue,
    shiftEcho,

    // NEW: expose balance updaters for the UI payout flow
    creditWin,       // preferred if your backend supports it
    updateBalance,   // optimistic-only fallback
  };
}
