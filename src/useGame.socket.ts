import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FOODS, type FoodsKey } from "./types";
import { useSocket, emitAck } from "./socket";

/** ======= Local persistence keys ======= */
const STORAGE_USER_KEY = "wheel.local.user.v1";
const STORAGE_LAST_ROUND_AT = "wheel.local.lastRoundAt.v1";

/** ======= Types ======= */
type ServerRoundStatus = "betting" | "revealing" | "completed" | "revealed" | "Preparing...";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const getAuthToken = () => (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

export type RoundWinnerEntry = {
  userId: string;
  name: string;
  bet: number;
  win: number;
};


export type BoxStat = {
  box: string;
  totalAmount: number;
  bettorsCount: number;
  multiplier: number;
};

export type user_perbox_total = {
  totalAmount: number;
  count: number;
  box: string;
};

export type RoundModel = {
  roundId?: string;
  _id?: string;
  roundNumber?: string | number;

  roundStatus: ServerRoundStatus;
  status?: "OPEN" | "CLOSED" | "SETTLED" | "Preparing..."; 

  // clocks
  timeLeftMs: number;
  startTime?: string | number;
  endTime?: string | number;
  revealTime?: string | number;
  prepareTime?: string | number;

  // misc
  userPerBoxTotal?: {};
  winningBox?: string;
  boxStats?: user_perbox_total;
  roundTotal?: number;
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

export type ApiHistoryItem = {
  _id: string;
  userId: string;
  roundId: string;
  winningBox: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  beetingDuration: number;
  prepareDuration: number;
  revealDuration: number;
  _id: string;
  siteName: string;
  currency: string;
  minBet: number;
  maxBet: number;
  roundDuration: number;
  commissionRate: number;
  chips: number[];
  maintenanceMode: boolean;
  supportedLanguages: string[];
  theme: string;
  boxes: BoxStat[];
  createdAt: string;
  updatedAt: string; 
  __v: number;
};


/** ======= Small helpers ======= */
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
  } catch { }
  return { ...DEFAULT_USER };
}
function saveUser(u: LocalUser) {
  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
  } catch { }
}

/** A safe initial round */
const INITIAL_ROUND: RoundModel = {
  roundStatus: "Preparing...",
  status: "Preparing...",
  timeLeftMs: 0,
};



/** ======= The hook (socket-driven) ======= */
export function useGame() {
  const socket = useSocket();

  // ----- user & simple app state -----
  const [user, setUser] = useState<LocalUser>(() => loadUser());
  const [round, setRound] = useState<RoundModel>(INITIAL_ROUND);
  const [balance, setBalance] = useState<number>(0);
  const [sid, setSid] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [myBetTotal, setMyBetTotal] = useState(0);
  const [companyWallet, setCompanyWallet] = useState(0);
  const [time, setTime] = useState(0); 
  const [setting, setSetting] = useState<Settings | null>()
  const [ping, setPing] = useState(0)
console.log("timeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",time)

  const currentRoundId = round?._id ?? (round as any)?.roundId ?? null;

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

  /** ---- ticker helpers ---- */
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

  useEffect(() => () => stopTicker(), [stopTicker]);

  /** ---- connect & initial balance ---- */
useEffect(() => {
  if (!socket) return;

  const onConnect = async () => {
    setSid(socket.id ?? null);

    // Join game room first
    socket.emit("join", { room: "table:alpha" }, (ackState: any) => {
      if (ackState?.roundStatus) {
        setRound(ackState);
      }
    });

    // Get balance
    socket.emit("get_balance", {}, (res: any) => {
      if (res?.success && typeof res.balance === "number") {
        setBalance(res.balance);
        setUserPersist((u) => ({ ...u, balance: res.balance }));
      }
    });

    try {
      const res: any = await emitAck(socket as any, "getCurrentRound", {});
      if (res?.success && res?.round) {
        setRound(res.round);
      } else {
        const token = getAuthToken();
        const r = await fetch(`${API_BASE}/api/v1/rounds/current`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (r.ok) {
          const data = await r.json();
          const roundPayload = data?.round ?? data; 
          if (roundPayload?.roundStatus) setRound(roundPayload);
        }
      }
    } catch (e) {
      console.warn("[hydrate] failed to fetch current round", e);
    }
  };

  const onDisconnect = (_reason: string) => {
    setSid(null);
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
      setRound((prev) => ({ ...prev, ...patch }));
    };


    const onStart = (d: any) => upsert(d);
    const onUpdate = (d: any) => upsert(d);
    const onClosed = (d: any) => upsert(d);      
    const onWinner = (d: any) => upsert(d);     
    const onEnded = (d: any) => {
      // fully done
      setRound((prev) => ({ ...d, prev }));
      phaseEndRef.current = 0;
      stopTicker();
    };

    // lightweight phase tick from server
    const phaseUpdate = (d: any) => upsert(d);
    const user_perbox_total = (d: any) => upsert(d);
    const roundTotalBet = (d: any) => upsert(d);

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
  //  const onCompanyWallet = ({ wallet }: any) => setCompanyWallet(wallet);

    socket.on("roundStarted", onStart);
    socket.on("roundUpdated", onUpdate);
    socket.on("roundClosed", onClosed);
    socket.on("winnerRevealed", onWinner);
    socket.on("roundEnded", onEnded);
    socket.on("phaseUpdate", phaseUpdate);
    socket.on("user_perbox_total", user_perbox_total);
    socket.on("roundTotalBet", roundTotalBet);

    socket.on("bet_accepted", onAccepted);
    socket.on("balanceUpdate", onBalance);
    socket.on("user_bet_total", onUserBetTotal);
    socket.on("joinedTotalUsers", onTotalUsersCount);
    //socket.on("get_company_wallet", onCompanyWallet);

    return () => {
      socket.off("roundStarted", onStart);
      socket.off("roundUpdated", onUpdate);
      socket.off("roundClosed", onClosed);
      socket.off("winnerRevealed", onWinner);
      socket.off("roundEnded", onEnded);
      socket.off("phaseUpdate", phaseUpdate);
      socket.off("user_perbox_total", user_perbox_total);
      socket.off("roundTotalBet", roundTotalBet);

      socket.off("bet_accepted", onAccepted);
      socket.off("balanceUpdate", onBalance);
      socket.off("user_bet_total", onUserBetTotal);
      socket.off("joinedTotalUsers", onTotalUsersCount);
     // socket.off("get_company_wallet", onCompanyWallet);

      if (localPulseInterval) clearInterval(localPulseInterval);
      stopTicker();
    };
  }, [socket, startTicker, stopTicker]);

  /** ----  ( Preparing state) ---- */
  useEffect(() => {
    if (!round.roundId && round.roundStatus === "Preparing...") {
      fetch(`${API_BASE}/api/v1/settings/retrive`)
        .then((res) => res.json())
        .then((data) => {

          setSetting(data.settings);

          if (data?.success && data?.settings?.boxes?.length) {
            setRound((r) => r)
          }
        })
        .catch(console.error);
    }
  }, [round.roundId, round.roundStatus]);

  useEffect(() => {
    if (!socket) return;

    const updatePing = () => {
      const start = Date.now();
      socket.volatile.emit("ping_server", {}, () => {
        const latency = Date.now() - start;
        setPing(latency);
      });
    };

    const interval = setInterval(updatePing, 2000); // every 2s
    return () => clearInterval(interval);
  }, [socket]);
 /// console.log("pinggggggggggggggggggggggggggggggggggggggggggggggg", totalUsers)


  /** ======= Winners APIs ======= */
  const getRoundWinners = useCallback(
    async (roundId?: string | number): Promise<RoundWinnerEntry[]> => {
      const rawId = roundId ?? currentRoundId;
      if (!rawId) throw new Error("No round id available to fetch winners.");

      const id = String(rawId);

      const token = getAuthToken();
      const url = `${API_BASE}/api/v1/bet/top-winners/${encodeURIComponent(id)}`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch winners (${res.status}): ${text || res.statusText}`);
      }

      const json = await res.json();

      return json;
    },
    [currentRoundId]
  );

  const getCurrentHistory = useCallback(async (): Promise<ApiHistoryItem[]> => {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE}/api/v1/bet/current-history`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`history ${res.status}: ${msg || res.statusText}`);
    }

    const json = await res.json();

    return Array.isArray(json?.bettingHistory) ? json.bettingHistory : [];
  }, [round?.roundStatus === "revealed"]);

  /** ======= Betting API  ======= */
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

      // (server will usually echo too)
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


      r

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
    } catch { }
  }, [round.roundId]);

  return {
    user,
    round,        
    time,      
    placeBet,
    echoQueue,
    shiftEcho,
    creditWin,
    updateBalance,
    startNextRound,
    getRoundWinners,
    getCurrentHistory,


    setting,
    balance,     
    sid,
    myBetTotal,   
    companyWallet,
    ping 
  };
}
