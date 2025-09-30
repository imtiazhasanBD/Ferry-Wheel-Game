import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useAnimation, useReducedMotion } from "framer-motion";
import { X, Volume2, Wifi, ScrollText, MessageCircleQuestionMark } from "lucide-react";
import { useGame } from "./useGame.local";
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
const SND_REVEAL = "/mixkit-fast-bike-wheel-spin.wav";
const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";

// Preferences
//type SoundPrefs = { master: number; bet: number; reveal: number; win: number; bg: number };
//const DEFAULT_PREFS: SoundPrefs = { master: 0.6, bet: 0.6, reveal: 0.8, win: 0.8, bg: 0.15 };
const PREFS_KEY = "soundPrefsWheelV1";

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


/** ==================== ANGLE HELPERS ==================== **/
const POINTER_DEG = -90;
const norm360 = (a: number) => ((a % 360) + 360) % 360;

function indexUnderPointer(rotDeg: number, sliceAngle: number, count: number) {
  const a = norm360(POINTER_DEG - rotDeg + 90);
  const i = Math.floor((a + sliceAngle / 2) / sliceAngle) % count;
  return i;
}
function rotationToCenterIndex(i: number, sliceAngle: number) {
  return POINTER_DEG - i * sliceAngle + 90;
}

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
  const { user, round, placeBet, echoQueue, shiftEcho, creditWin, updateBalance } = game;
  const startNextRound: (() => Promise<void> | void) | undefined =
    game.startNextRound || game.startNextBlock || game.nextRound || game.startRound;
  const prefersReducedMotion = useReducedMotion();
  const [showRoundWinners, setShowRoundWinners] = useState(false);
  const [roundWinners, setRoundWinners] = useState<RoundWinnerEntry[]>([]);

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

  const [userBets, setUserBets] = useState<Record<FoodsKey, number>>({
    meat: 0,
    tomato: 0,
    corn: 0,
    sausage: 0,
    lettuce: 0,
    carrot: 0,
    skewer: 0,
    ham: 0,
  });

  // ——— Refs
  const pageRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const bankRef = useRef<HTMLButtonElement | null>(null);
  const wheelDegRef = useRef(0);

  // ——— State
  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
  const bettingOpen = round?.state === "betting";
  const progress = round ? 1 - round.timeLeftMs / 10000 : 0;
  console.log(round.timeLeftMs)
  const [isLoaded, setIsLoaded] = useState(false);

  const [stacked, setStacked] = useState<StackedCoin[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

  const [flies, setFlies] = useState<Fly[]>([]);
  const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
  const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
  const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

  // Sidebar / Drawer
  // const [drawerOpen, setDrawerOpen] = useState(false);
  const isRoundOver = progress === 0;

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
  }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

  async function primeOne(a?: HTMLAudioElement | null) {
    if (!a) return;
    try {
      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    } catch { }
  }
  async function primeAllAudio() {
    await Promise.all([
      primeOne(betAudioRef.current),
      primeOne(revealAudioRef.current),
      primeOne(winAudioRef.current),
      primeOne(bgAudioRef.current),
    ]);
    setAudioReady(true);
  }

  useEffect(() => {
    betAudioRef.current = new Audio(SND_BET);
    revealAudioRef.current = new Audio(SND_REVEAL);
    winAudioRef.current = new Audio(SND_WIN);
    bgAudioRef.current = new Audio(SND_BG_LOOP);
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

  const inButtonOffsetForBet = (betId: string) => {
    const a = 2 * Math.PI * hash01(betId, 3);
    const r = 8 + 18 * hash01(betId, 4);
    return { dx: r * Math.cos(a), dy: r * Math.sin(a) };
  };

  const targetForBet = useCallback(
    (sliceIndex: number, betId: string) => {
      const c = sliceButtonCenter(sliceIndex);
      const o = inButtonOffsetForBet(betId);
      return { x: c.x + o.dx, y: c.y + o.dy };
    },
    [sliceButtonCenter]
  );

  /** ===== history & leaderboard (per 10 rounds) ===== */
  const [winnersHistory, setWinnersHistory] = useState<FoodsKey[]>([]);
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
  useEffect(() => {
    if (!echoQueue.length || !round) return;
    const evt = echoQueue[0];
    const idx = (slices as FoodsKey[]).indexOf(evt.fruit);
    const to = targetForBet(idx, evt.betId);

    if (betAudioRef.current && audioReady) {
      betAudioRef.current.pause();
      betAudioRef.current.currentTime = 0;
      betAudioRef.current.play().catch(() => { });
    }

    if (evt.userId === user?.id) spawnLocalFly(to, evt.value);
    else spawnRemoteFly(to, evt.value);

    setStacked((prev) =>
      prev.some((c) => c.id === evt.betId)
        ? prev
        : [...prev, { id: evt.betId, fruit: evt.fruit, value: evt.value, userId: evt.userId }]
    );

    shiftEcho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echoQueue, round?.roundId]);

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
    if (round.state === "pause") {
      setStacked([]);
      setFlies([]);
      setRemoteFlies([]);
      setPayoutFlies([]);
      setBankFlies([]);
      setForcedWinner(null);
      setShowRoundWinners(false);
    }
  }, [round?.roundId, round?.state, currentRoundId]);

  /** ===== spin & settle ===== */
  const controls = useAnimation();
  const lastSpinRoundRef = useRef<string | null>(null);

  const [wheelDeg, setWheelDeg] = useState(0);

  // (A) EXTRA SAFETY: if state flips to revealing, hide transient coins immediately
  useEffect(() => {
    if (round?.state === "revealing") {
      setFlies([]);
      setRemoteFlies([]);
    }
  }, [round?.state]);

  // (B) Main spin effect
  useEffect(() => {
    if (!round || round.state !== "revealing") return;
    if (lastSpinRoundRef.current === round.roundId) return;
    lastSpinRoundRef.current = round.roundId;

    // Hide any in-flight bet coins immediately before the wheel animation starts
    setFlies([]);
    setRemoteFlies([]);

    setForcedWinner(null);

    if (revealAudioRef.current && audioReady) {
      revealAudioRef.current.pause();
      revealAudioRef.current.currentTime = 0;
      revealAudioRef.current.play().catch(() => { });
    }

    const current = wheelDegRef.current || 0;
    const base = prefersReducedMotion ? 360 * 2 : 360 * 10;
    const jitter = hash01(round.roundId ?? "seed", 99) * 360;
    const total = current + base + jitter;

    (async () => {
      await controls.start({
        rotate: total,
        transition: { duration: prefersReducedMotion ? 0.6 : 1.1, ease: [0.2, 0.85, 0.25, 1] },
      });

      const idx = indexUnderPointer(total, 360 / FOODS.length, FOODS.length);
      const ideal = rotationToCenterIndex(idx, 360 / FOODS.length);
      const k = Math.round((total - ideal) / 360);
      const settleRot = ideal + 360 * k;

      await controls.start({
        rotate: settleRot,
        transition: { duration: prefersReducedMotion ? 0.12 : 0.18, ease: [0.3, 0.9, 0.35, 1] },
      });

      const winner = FOODS[idx] as FoodsKey;
      setForcedWinner(winner);
      doRevealFlights(winner);
      handleWin(winner); // optional hook
    })();
  }, [round?.state, round?.roundId, controls, prefersReducedMotion, audioReady]);

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
    setWinnersHistory((prev) => [...prev, winner].slice(-10));

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
      const next = prev + 1;
      if (next >= 10) {
        setShowLeaderboard(true);
        setIntermissionSec(INTERMISSION_SECS);
      }
      return next >= 10 ? 10 : next;
    });
  }

  // ===== Betting click gating (no external toaster) =====
  const balance = user?.balance ?? 0;
  const noCoins = balance <= 0;
  const cannotAffordChip = balance < (selectedChip || 0);
  //const hardDisabled = round?.state !== "betting" || showLeaderboard;



  const onSliceClick = useCallback(
    async (key: FoodsKey) => {
      const balance = user?.balance ?? 0;
      const noCoins = balance <= 0;
      const cannotAffordChip = balance < (selectedChip || 0);
      const hardDisabled = round?.state !== "betting" || showLeaderboard;

      // show message if no coins
      if (noCoins) {
        notify("You don't have coin");
        return;
      }

      // show message if can't afford this chip
      if (cannotAffordChip) {
        notify("Not enough balance for this chip");
        return;
      }

      // ignore clicks if hard-disabled (betting closed, leaderboard open, or round over)
      if (hardDisabled || isRoundOver || !selectedChip) return;

      // proceed with bet
      setUserBets((prevBets) => ({
        ...prevBets,
        [key]: prevBets[key] + selectedChip,
      }));

      await placeBet(key, selectedChip);
    },
    [user?.balance, round?.state, showLeaderboard, isRoundOver, selectedChip, placeBet]
  );


  /*   const counts = useMemo(() => {
      const m: Record<FoodsKey, number> = {
        meat: 0,
        tomato: 0,
        corn: 0,
        sausage: 0,
        lettuce: 0,
        carrot: 0,
        skewer: 0,
        ham: 0,
      };
      for (const c of stacked) m[c.fruit] += 1;
      return m;
    }, [stacked]);
  
    const overflowBySlice = useMemo(() => {
      const map: Partial<Record<FoodsKey, number>> = {};
      for (const k of FOODS) {
        const total = stacked.filter((c) => c.fruit === k).length;
        const overflow = Math.max(0, total - MAX_COINS_PER_SLICE);
        if (overflow > 0) map[k] = overflow;
      }
      return map;
    }, [stacked]); */

  // 1a) Compute per-slice total bet *value* from your stacked coins
  const totalsBySlice = useMemo(() => {
    const m: Record<FoodsKey, number> = {
      meat: 0,
      tomato: 0,
      corn: 0,
      sausage: 0,
      lettuce: 0,
      carrot: 0,
      skewer: 0,
      ham: 0,
    };
    for (const c of stacked) m[c.fruit] += c.value; // sum the chip values
    return m;
  }, [stacked]);

  // 1b) If your useGame() exposes server totals, prefer those:
  const totalsFromServer = (game as any)?.totals as Record<FoodsKey, number> | undefined;
  const totalsForHot = totalsFromServer ?? totalsBySlice;

  // 1c) Pick the fruit with the highest total (break ties by first seen)
  const hotKey = useMemo<FoodsKey | null>(() => {
    let best: FoodsKey | null = null;
    let bestVal = 0;
    for (const k of FOODS) {
      const v = totalsForHot[k] ?? 0;
      if (v > bestVal) { bestVal = v; best = k; }
    }
    return bestVal > 0 ? best : null; // only mark HOT if there’s at least some bet
  }, [totalsForHot]);


  /*   const roundNum = useMemo(() => {
      if (!round?.roundId) return 0;
      let h = 0;
      for (const ch of round.roundId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return h % 10000;
    }, [round?.roundId]); */

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
      setWinnersHistory([]);

      // tell the game to start the next round if it exposes a method
      if (typeof startNextRound === "function") {
        Promise.resolve(startNextRound()).catch(() => { });
      }
    }
  }, [showLeaderboard, intermissionSec, startNextRound]);


  useEffect(() => {
    // Reset the user bets when the round is over
    if (round?.state === "revealing") {
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
  }, [round?.state]);

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

    // Update user's balance or handle win logic here...
  }



  // ===== Initial game loader (fixed-time) =====
  const LOADER_DURATION_MS = 3000; // <- pick your fixed time (e.g., 2000-4000ms)

  const [bootLoading, setBootLoading] = useState(true);
  const [bootProgress, setBootProgress] = useState(0); // 0..1
  const [loggedIn, setLoggedIn] = useState(false);


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

  /*   if (bootLoading) {
      return <InitialLoader open={bootLoading} progress={bootProgress} />
  
    } */


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
      <LoginPage onLogin={() => setLoggedIn(true)} />
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
            <div className="absolute left-1/2 -translate-x-1/2 z-30">
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
            </div>

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
              {FOODS.map((key, i) => {
                const angDeg = i * (360 / FOODS.length);
                const rad = ((angDeg - 90) * Math.PI) / 180;
                const cx = R + ringR * Math.cos(rad);
                const cy = R + ringR * Math.sin(rad);

                const totalBet = userBets[key];
                const studRadius = 5;
                const studOffset = btn / 2 + 10;
                const tx = -Math.sin(rad);
                const ty = Math.cos(rad);
                const lx = cx - tx * studOffset;
                const ly = cy - ty * studOffset;

                const disabled = round?.state !== "betting" || showLeaderboard; // hardDisabled
                const isWinner = forcedWinner === key && round?.state !== "betting";

                // visual-only disable when noCoins / cannotAffordChip
                const visuallyDisabled = disabled || noCoins || cannotAffordChip;

                return (
                  <div key={key}>
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
                        if (noCoins) {
                          notify("You don't have coin");
                          return;
                        }
                        if (cannotAffordChip) {
                          notify("Not enough balance for this chip");
                          return;
                        }
                        if (disabled || isRoundOver || !selectedChip) return;
                        onSliceClick(key);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow focus:outline-none focus:ring-2 focus:ring-sky-400 ${isWinner ? "animate-[blink_900ms_steps(2)_infinite] glow" : ""}`}
                      style={{
                        left: cx,
                        top: cy,
                        width: btn,
                        height: btn,
                        background:
                          "radial-gradient(circle at 50% 35%, rgba(0,102,204,.9), rgba(0,76,153,.75) 55%, rgba(0,51,102,.65)), linear-gradient(180deg, rgba(0,76,153,.2), rgba(0,51,102,0))",
                        borderColor: isWinner ? "#22c55e" : "rgba(255,255,255,.15)",
                        boxShadow: isWinner
                          ? "0 0 0 8px rgba(34,197,94,.22), 0 14px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.4)"
                          : "0 12px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)",
                      }}
                      aria-label={`Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`}
                      disabled={disabled} // true disable only for hard-closed states
                      aria-disabled={visuallyDisabled}
                      title={
                        noCoins
                          ? "You don't have coin"
                          : cannotAffordChip
                            ? "Not enough balance for this chip"
                            : `Bet on ${LABEL[key]} (pays x${MULTIPLIER[key]})`
                      }
                    >
                      {/* Counter-rotated content */}
                      <div
                        className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
                        style={{ transform: "rotate(calc(-1 * var(--wheel-rot)))" }}
                      >
                        <div aria-hidden className="text-[28px] leading-none drop-shadow">
                          {EMOJI[key]}
                        </div>

                        <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
                          win <span className="font-extrabold">x{MULTIPLIER[key]}</span>
                        </div>

                        {/* Hot badge */}
                        {hotKey === key && (
                          <div
                            className="absolute -left-1 -top-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white shadow"
                            style={{
                              boxShadow: "0 6px 14px rgba(0,0,0,.45)",
                              border: "1px solid rgba(255,255,255,.25)",
                            }}
                            aria-label={`HOT: ${LABEL[key]} has the highest total bets`}
                          >
                            HOT
                          </div>
                        )}


                        {/* Total bet text */}
                        <div className="text-[10px] text-white">Total: {formatNumber(totalBet)}</div>
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
                    : round?.state === "revealing"
                      ? "Revealing…"
                      : "Next Round"}
                </div>
                <div className="text-[28px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
                  {round ? `${Math.max(0, Math.floor(round.timeLeftMs / 1000))}s` : "0s"}
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
                  width: D * 0.98,
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

                  <div className="flex items-center gap-2">
                    {(winnersHistory.length ? [...winnersHistory].slice(-9).reverse() : []).map((k, idx) => (
                      <div key={`${k}-bar-${idx}-${round?.roundId ?? "r"}`} className="relative shrink-0">
                        <div
                          className="w-8 h-8 rounded-xl grid place-items-center"
                          style={{
                            background: "linear-gradient(180deg,#cde8ff,#b6dcff)",
                            border: "1px solid #7fb4ff",
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #1e3a8a, 0 6px 14px rgba(0,0,0,.25)",
                          }}
                          title={LABEL[k]}
                        >
                          <span className="text-[16px] leading-none">{EMOJI[k]}</span>
                        </div>
                        {idx === 0 && (
                          <div
                            className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[7px] font-black"
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
                    ))}
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
                Mine 200k
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
                {[
                  { v: 1000, color: "#1fb141" },
                  { v: 2000, color: "#3b82f6" },
                  { v: 5000, color: "#fb923c" },
                  { v: 10000, color: "#ef4444" },
                  { v: 50000, color: "#c084fc" },
                ].map(({ v, color }) => {
                  const selected = selectedChip === v;
                  const balance = user?.balance ?? 0;
                  const afford = balance >= v;

                  return (
                    <motion.button
                      key={v}
                      ref={(el) => {
                        chipRefs.current[v] = el;
                        return undefined;
                      }}
                      whileTap={{ scale: 0.95, rotate: -2 }}
                      whileHover={{ y: -3 }}
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
                  💎 {fmt(user?.balance ?? 0)}
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

/** ==================== UI bits ==================== **/
/* function IconBtn({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick?: () => void; ariaLabel?: string }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 shadow grid place-items-center text-[18px] hover:bg-white/20 active:scale-95 text-white"
      style={{ boxShadow: "0 8px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.2)" }}
    >
      {children}
    </button>
  );
} */


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
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
} 