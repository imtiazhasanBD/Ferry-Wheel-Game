import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useReducedMotion,
} from "framer-motion";
import {
  X,
  Volume2,
  ScrollText,
  MessageCircleQuestionMark,
} from "lucide-react";
import {
  useGame,
  type ApiHistoryItem,
  type user_perbox_total,
} from "./useGame.socket";
import { FOODS, type FoodsKey } from "./types";
import LeaderboardModal from "./LeaderboardModal";
import GameRules from "./GameRules";
import Record from "./Record";
import SettingsBottomSheet, { type Prefs } from "./SettingsBottomSheet";
import type { TopWinnersResponse } from "./RoundWinnersModal";
import RoundWinnersModal from "./RoundWinnersModal";
import InitialLoader from "./InitialLoader";
import LoginPage from "./LoginPage";
import PingDisplay from "./components/PingDisplay";
import TodayLeaderboardModal from "./TodayLeaderboardModal";
import { useGetDailyWins } from "./hooks/getDailyWins";
import { WheelStand } from "./components/ImageWheelStand";

/** ==================== CONFIG ==================== **/
const CHIPS = [1000, 2000, 5000, 10000, 50000] as const;
const INTERMISSION_SECS = 8; // how long the leaderboard intermission lasts
const WINNER_POPUP_DELAY_MS = 1500; // hold on winner before showing popup

// Sounds
const SND_BET = "/mixkit-clinking-coins-1993.wav";
const SND_REVEAL =
  "/video-game-bonus-retro-sparkle-gamemaster-audio-lower-tone-1-00-00.mp3";
const SND_WIN = "/mixkit-ethereal-fairy-win-sound-2019.wav";
const SND_BG_LOOP = "/background-music-minecraftgaming-405001.mp3";
const PREFS_KEY = "soundPrefsWheelV1";

// === Add these right below PREFS_KEY ===
const DEFAULT_PREFS: Prefs = { master: 1, bet: 1, reveal: 1, win: 1, bg: 1 };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const normalizePrefs = (raw: any): Prefs => ({
  master: clamp01(raw?.master ?? 1),
  bet: clamp01(raw?.bet ?? 1),
  reveal: clamp01(raw?.reveal ?? 1),
  win: clamp01(raw?.win ?? 1),
  bg: clamp01(raw?.bg ?? 1),
});

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
const resolveEventKey = (e: any) =>
  e?.key ?? e?.box ?? e?.fruit ?? e?.title ?? e?.name ?? "";

// Visual language
export const EMOJI: Record<FoodsKey, string> = {
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
  500: "#16a34a", // green
  1000: "#1fb141", // slightly different green
  2000: "#3b82f6", // blue
  5000: "#fb923c", // orange
  10000: "#ef4444", // red
  50000: "#c084fc", // purple (in case more are added)
};

type UiBox = {
  key: string; // "meat"
  title: string; // "Meat"
  icon?: string;
  multiplier: number;
  group?: string; // "Pizza" | "Salad"
  total: number; // totalAmount/totalBet
  bettors: number;
};

type BoxKey = string;

// Safe UUID that works on HTTP too
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

/** ==================== APP ==================== **/
export default function App() {
  const game = useGame() as any;
  const {
    user,
    round,
    placeBet,
    echoQueue,
    shiftEcho,
    balance,
    getRoundWinners,
    getCurrentHistory,
    myBetTotal,
    setting,
    ping,
  } = game;
  const startNextRound: (() => Promise<void> | void) | undefined =
    game.startNextRound ||
    game.startNextBlock ||
    game.nextRound ||
    game.startRound;
  const prefersReducedMotion = useReducedMotion();
  const [showRoundWinners, setShowRoundWinners] = useState(false);
  const [roundWinners, setRoundWinners] = useState<TopWinnersResponse | null>(
    null
  );
  const [todayWins, setTodayWins] = useState<number | null>(0);
  const getDailyWins = useGetDailyWins();

  // --- Cursor/highlight (replaces spinning) ---
  const [hlIndex, setHlIndex] = useState<number | null>(null);
  const cursorIntervalRef = useRef<number | null>(null);
  const decelTimeoutRef = useRef<number | null>(null);
  const cursorRunningRef = useRef(false);
  const landedOnceRef = useRef(false);

  // Use whichever sound you prefer for the hop per move:
  const SND_HOP = SND_REVEAL; // or SND_BET if you like that sound better
  round.winnerBox === "Pizza" || round.winnerBox === "Salad";
  const PLATFORM_KEYS = ["Pizza", "Salad"] as const;
  const [platIdx, setPlatIdx] = useState<number | null>(null);

  useEffect(() => {
    if (round?.roundStatus !== "revealing") {
      setPlatIdx(null);
      return;
    }
    let i = 0;
    let timer: number;
    const hop = () => {
      setPlatIdx((prev) =>
        prev === null ? 0 : (prev + 1) % PLATFORM_KEYS.length
      );
      // setPlatColor(HL_COLORS[i % HL_COLORS.length]);
      i++;
      timer = window.setTimeout(hop, 90); // fast hops
    };
    hop();
    return () => clearTimeout(timer);
  }, [round?.roundStatus]);

  useEffect(() => {
    if (!round) return;
    if (round.roundStatus === "revealed" || round.roundStatus === "completed") {
      if (round.winnerBox === "Pizza") setPlatIdx(0);
      else if (round.winnerBox === "Salad") setPlatIdx(1);
      else setPlatIdx(null);
    }
  }, [round?.roundStatus, round?.winnerBox]);

  const HOP_POOL_SIZE = 6;
  const hopPoolRef = useRef<HTMLAudioElement[]>([]);
  const hopIndexRef = useRef(0);

  function playHop() {
    const pool = hopPoolRef.current;
    if (!pool.length || !audioReady) return;
    const i = hopIndexRef.current++ % pool.length;
    try {
      const a = pool[i];
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }

  // near other refs
  const cursorTimeoutRef = useRef<number | null>(null);

  function clearCursorTimers() {
    if (cursorIntervalRef.current) {
      clearInterval(cursorIntervalRef.current);
      cursorIntervalRef.current = null;
    }
    if (decelTimeoutRef.current) {
      clearTimeout(decelTimeoutRef.current);
      decelTimeoutRef.current = null;
    }
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = null;
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
    // setHlColor(randColor());

    cursorIntervalRef.current = window.setInterval(() => {
      setHlIndex((idx) => {
        const next = ((idx ?? 0) + 1) % sliceCount;
        //  setHlColor(randColor());
        playHop(); // 🔊 tick each hop
        return next;
      });
    }, Math.max(25, speedMs)) as unknown as number;
  }

  /**
   * Decelerate the highlight and land on a target slice index.
   * Adds a couple of extra laps to look natural.
   */
  function settleOnWinner(
    targetIndex: number,
    opts?: {
      extraLaps?: number;
      startDelay?: number;
      addPerStep?: number;
      maxDelay?: number;
    }
  ) {
    if (!sliceCount) return;
    if (targetIndex < 0 || targetIndex >= sliceCount) {
      stopCursor();
      return;
    }

    clearCursorTimers();

    let idx = hlIndex ?? 0;
    const extraLaps = opts?.extraLaps ?? 0; // 0 for fast finish
    let stepsLeft =
      ((targetIndex - idx + sliceCount) % sliceCount) + extraLaps * sliceCount;

    let delay = opts?.startDelay ?? 45; // start snappy
    const addPer = opts?.addPerStep ?? 18; // decel faster
    const maxDelay = opts?.maxDelay ?? 140; // cap so we finish <~1s

    const step = () => {
      if (stepsLeft <= 0) {
        stopCursor();
        if (!landedOnceRef.current) {
          landedOnceRef.current = true;
          const winnerKey = (liveBoxes[targetIndex]?.key ?? "") as FoodsKey;
          setForcedWinner(winnerKey);
          doRevealFlights(winnerKey);
          if (winAudioRef.current && audioReady) {
            winAudioRef.current.currentTime = 0;
            winAudioRef.current.play().catch(() => {});
          }
        }
        return;
      }

      idx = (idx + 1) % sliceCount;
      setHlIndex(idx);
      // setHlColor(randColor());
      playHop();
      stepsLeft--;

      delay = Math.min(maxDelay, delay + addPer);
      decelTimeoutRef.current = window.setTimeout(
        step,
        delay
      ) as unknown as number;
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

  const parseTs = (v?: string | number) =>
    typeof v === "number" ? v : v ? Date.parse(v) : 0;

  const phaseEndAt = useMemo(() => {
    const s = round?.roundStatus;
    const now = Date.now();

    // server setting is usually SECONDS; convert to ms and provide a safe default
    const prepMs =
      typeof setting?.prepareDuration === "number"
        ? setting.prepareDuration * 1000
        : 8000; // fallback 8s

    if (s === "betting") return parseTs(round?.endTime);
    if (s === "revealing") return parseTs(round?.revealTime);

    // After reveal we count down the intermission until the next round
    if (s === "revealed") return parseTs(round?.prepareTime) || now + prepMs;

    // While completed, we still want a visible countdown to next start
    if (s === "completed") return parseTs(round?.startTime) || now + prepMs;

    return 0;
  }, [
    round?.roundStatus,
    round?.endTime,
    round?.revealTime,
    round?.prepareTime,
    round?.startTime,
    setting?.prepareDuration,
  ]);

  // local UI countdown for the hub
  const [uiLeftMs, setUiLeftMs] = useState(0);
  useEffect(() => {
    const tick = () => setUiLeftMs(Math.max(0, phaseEndAt - Date.now()));
    tick(); // set immediately
    if (!phaseEndAt) {
      setUiLeftMs(0);
      return;
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndAt, round?.roundStatus]);

  // ——— Refs
  const pageRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const bankRef = useRef<HTMLButtonElement | null>(null);
  const wheelDegRef = useRef(0);

  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1]);
  const bettingOpen = round?.roundStatus === "betting";

  const [isLoaded, setIsLoaded] = useState(false);

  const [stacked, setStacked] = useState<StackedCoin[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

  const [flies, setFlies] = useState<Fly[]>([]);
  const [remoteFlies, setRemoteFlies] = useState<Fly[]>([]);
  const [payoutFlies, setPayoutFlies] = useState<PayoutFly[]>([]);
  const [bankFlies, setBankFlies] = useState<BankFly[]>([]);

  // round-over is when the server has finished the reveal
  const isRoundOver =
    round?.roundStatus === "revealed" || round?.roundStatus === "completed";

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
  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? normalizePrefs(JSON.parse(raw)) : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const betAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const applyVolumes = useCallback(() => {
    const m = clamp01(prefs.master);
    if (betAudioRef.current)
      betAudioRef.current.volume = m * clamp01(prefs.bet);
    if (revealAudioRef.current)
      revealAudioRef.current.volume = m * clamp01(prefs.reveal);
    if (winAudioRef.current)
      winAudioRef.current.volume = m * clamp01(prefs.win);
    if (bgAudioRef.current) bgAudioRef.current.volume = clamp01(prefs.bg);

    // hop pool uses "reveal" slider by default
    hopPoolRef.current.forEach((a) => {
      a.volume = m * clamp01(prefs.reveal);
    });
  }, [prefs.master, prefs.bet, prefs.reveal, prefs.win, prefs.bg]);

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
      ...hopPoolRef.current.map((a) => primeOne(a)),
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
      bgAudioRef.current.volume = clamp01(prefs.bg); // BG ignores master
    }

    applyVolumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function arm() {
      primeAllAudio().then(() => bgAudioRef.current?.play().catch(() => {}));
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
    } catch {}
  }, [applyVolumes, prefs]);

  useEffect(() => {
    if (round && !isLoaded) setIsLoaded(true);
  }, [round, isLoaded]);
  useEffect(() => {
    const t = setTimeout(() => !isLoaded && setIsLoaded(true), 900);
    return () => clearTimeout(t);
  }, [isLoaded]);

  const canon = (s?: string | null) => (s ?? "").trim().toLowerCase();

  function buildUiData(setting?: any, round?: any) {
    // Choose source
    const source = (
      round?.boxStats?.length
        ? round.boxStats
        : round?.boxes?.length
        ? round.boxes
        : setting?.boxes ?? []
    ) as any[];

    const all: UiBox[] = source.map((b) => ({
      key: canon(b.box ?? b.title),
      title: (b.title ?? b.box ?? "").trim(),
      icon: b.icon,
      multiplier: Number(b.multiplier ?? 0) || 0,
      group: b.group,
      total: Number(b.totalAmount ?? b.totalBet ?? 0) || 0,
      bettors: Number(b.bettorsCount ?? b.userCount ?? 0) || 0,
    }));

    // Platforms (Pizza/Salad) by title
    const findByTitle = (t: string) =>
      all.find((x) => canon(x.title) === canon(t));
    const pizza = findByTitle("Pizza") ?? {
      key: "pizza",
      title: "Pizza",
      icon: "🍕",
      multiplier: 0,
      total: 0,
      bettors: 0,
      group: "Pizza",
    };
    const salad = findByTitle("Salad") ?? {
      key: "salad",
      title: "Salad",
      icon: "🥗",
      multiplier: 0,
      total: 0,
      bettors: 0,
      group: "Salad",
    };

    // Wheel = everything except Pizza/Salad
    const settingOrder: string[] = (setting?.boxes ?? []).map((b: any) =>
      canon(b.title ?? b.box)
    );
    const wheel = all.filter((b) => b.title !== "Pizza" && b.title !== "Salad");
    wheel.sort((a, b) => {
      const ia = settingOrder.indexOf(a.key),
        ib = settingOrder.indexOf(b.key);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return { wheelBoxes: wheel, platforms: { Pizza: pizza, Salad: salad } };
  }

  // REMOVE old buildLiveBoxes() + liveBoxes useMemo
  const { wheelBoxes, platforms } = useMemo(
    () => buildUiData(setting, round),
    [setting?.boxes, round?.boxStats, round?.boxes]
  );

  // keep your variable name to avoid big changes:
  const liveBoxes = wheelBoxes;
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTodayLeaderboard, setShowTodayLeaderboard] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [intermissionSec, setIntermissionSec] = useState<number | undefined>(
    undefined
  );
  const [blockCount, setBlockCount] = useState(0); // 0..10
  // --- Betting sweep (red border + finger pointer) ---
  const [sweepIdx, setSweepIdx] = useState<number | null>(null);

  const serverBlockRound = (
    typeof (round as any)?.blockRound === "number"
      ? (round as any).blockRound
      : typeof (round as any)?.indexInBlock === "number"
      ? (round as any).indexInBlock
      : typeof (round as any)?.roundNumber === "number"
      ? ((round as any).roundNumber % 10) + 1
      : undefined
  ) as number | undefined;

  const displayBlockRound = serverBlockRound ?? (blockCount % 10 || 10);

  /** ===== flies ===== */
  const spawnLocalFly = useCallback(
    (to: { x: number; y: number }, value: number) => {
      const cont = getContainerRect();
      const chip = chipRefs.current[value]?.getBoundingClientRect();
      const from =
        chip && cont
          ? {
              x: chip.left - cont.left + chip.width / 2,
              y: chip.top - cont.top + chip.height / 2,
            }
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
      const from = {
        x: c.x + (Math.random() - 0.5) * 120,
        y: c.y - 180 + Math.random() * 60,
      };
      const id = uid(); //crypto.randomUUID();
      setRemoteFlies((p) => [...p, { id, from, to, value }]);
      setTimeout(
        () => setRemoteFlies((p) => p.filter((f) => f.id !== id)),
        1200
      );
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
      //  setShowRoundWinners(false);
    }
  }, [round?.roundId, round?.roundStatus, currentRoundId]);

  /** ===== spin & settle ===== */
  const controls = useAnimation();

  // when betting closes, hide transient flies
  useEffect(() => {
    if (round?.roundStatus === "revealing") {
      setFlies([]);
      setRemoteFlies([]);
    }
  }, [round?.roundStatus]);

  // Clear per round when SETTLED (after reveal is done)
  useEffect(() => {
    if (!round) return;
    if (currentRoundId && currentRoundId !== round.roundId) {
      /* clear arrays ... */
    }
    setCurrentRoundId(round.roundId);
    if (round.roundStatus === "completed") {
      setStacked([]);
      setFlies([]);
      setRemoteFlies([]);
      setPayoutFlies([]);
      setBankFlies([]);
      setForcedWinner(null);
      setShowRoundWinners(false);
    }
  }, [round?.roundId, round?.roundStatus, currentRoundId]);

  // Start fast highlight when we enter revealing
  useEffect(() => {
    if (!sliceCount) return;

    if (round?.roundStatus === "revealing") {
      // start fast hop
      landedOnceRef.current = false;
      startCursor(70);
    } else if (round?.roundStatus === "revealed") {
      // stop hopping immediately (keep hlIndex so settleOnWinner can decelerate from here)
      stopCursor();
      // DO NOT clear hlIndex here
    } else {
      // any other phase: fully clear ring
      stopCursor();
      setHlIndex(null);
    }
  }, [round?.roundStatus, sliceCount]);

  // When server reveals the winner, decelerate and land on that slice
  useEffect(() => {
    if (!sliceCount) return;

    if (round?.roundStatus === "revealing") {
      landedOnceRef.current = false;
      startRevealingCursor(); // fast→slow over the 5s
      return;
    }

    if (round?.roundStatus === "revealed") {
      // stop revealing loop immediately
      stopCursor();

      // find the winner and finish QUICKLY (≤~1s)
      const raw = (round as any)?.winnerBox ?? (round as any)?.winningBox;
      const winnerKey = norm(raw);
      const target = liveBoxes.findIndex((b) => norm(b.key) === winnerKey);

      if (target >= 0) {
        // fast settle: 0 extra laps, ~45ms start, +18ms/step, cap 140ms
        // was: settleOnWinner(target, { extraLaps: 0, startDelay: 45, addPerStep: 18, maxDelay: 140 });
        settleOnWinner(target, {
          extraLaps: 0, // keep 0 (1 lap may feel too long)
          startDelay: 60, // start a little slower
          addPerStep: 24, // decelerate more per hop
          maxDelay: 200, // allow a slower peak delay
        });
      } else {
        // winner is Pizza/Salad or unknown: no ring should keep moving
        stopAndClearHighlight();
        setTimeout(() => setShowRoundWinners(true), WINNER_POPUP_DELAY_MS);
      }
      return;
    }

    // any other phase
    stopAndClearHighlight();
  }, [
    round?.roundStatus,
    sliceCount,
    liveBoxes,
    (round as any)?.winnerBox,
    (round as any)?.winningBox,
  ]);

  // Cleanup on unmount
  useEffect(() => () => stopCursor(), []);

  function doRevealFlights(winner: FoodsKey) {
    // (no coin spawn here — scoreboard-driven effect handles animations)

    /** ===== history + ranking + block counter ===== */
    const perUser: Record<string, { bet: number; win: number }> = {};
    for (const c of stacked) {
      perUser[c.userId] ??= { bet: 0, win: 0 };
      perUser[c.userId].bet += c.value;
      if (c.fruit === winner) {
        perUser[c.userId].win += c.value * MULTIPLIER[winner];
      }
    }

    setTimeout(() => setShowRoundWinners(true), WINNER_POPUP_DELAY_MS);

    setBlockCount((prev) => {
      const next = prev + 1;
      if (displayBlockRound >= 10) {
        setShowLeaderboard(true);
        setIntermissionSec(INTERMISSION_SECS);
      }
      return next >= 10 ? 10 : next;
    });
  }

  // track echo events we've already processed by betId
  const pendingLocalBetRef = useRef<
    Array<{ key: BoxKey; value: number; until: number }>
  >([]);
  function markPendingLocal(key: BoxKey, value: number, ms = 700) {
    const now = Date.now();
    pendingLocalBetRef.current.push({ key, value, until: now + ms });
    // cleanup old
    pendingLocalBetRef.current = pendingLocalBetRef.current.filter(
      (x) => x.until > now
    );
  }
  function shouldSuppressEcho(key: BoxKey, value: number) {
    const now = Date.now();
    const i = pendingLocalBetRef.current.findIndex(
      (x) => x.key === key && x.value === value && x.until > now
    );
    if (i >= 0) {
      pendingLocalBetRef.current.splice(i, 1); // consume
      return true;
    }
    return false;
  }

  const onSliceClick = useCallback(
    async (key: BoxKey) => {
      console.log("fruittttttttttttttttttttttttttttttttttttt", key);
      const bal = balance ?? 0;
      if (bal <= 0) return notify("You don't have coin");
      if (bal < (selectedChip || 0))
        return notify("Not enough balance for this chip");
      if (round?.roundStatus !== "betting" || showLeaderboard || !selectedChip)
        return;

      // 🔹 Instant local fly (no wait)
      const idx = liveBoxes.findIndex((b) => b.key === key);
      if (idx >= 0) {
        const to = targetForBet(idx, uid()); // use a temp id just for offset variance
        spawnLocalFly(to, selectedChip);
        markPendingLocal(key, selectedChip); // so echo won't duplicate
      }

      // fire the request (no need to block UI)
      try {
        await placeBet(key, selectedChip);
      } catch (e) {
        // optional: rollback optimistic userBets or show toast
        notify("Bet failed");
      }
    },
    [
      balance,
      round?.roundStatus,
      showLeaderboard,
      isRoundOver,
      selectedChip,
      placeBet,
      liveBoxes,
      targetForBet,
      spawnLocalFly,
    ]
  );

  // helper (top-level with other utils)
  const clamp = (n: number, a: number, b: number) =>
    Math.min(b, Math.max(a, n));

  // Drive the hop while status === "revealing"
  function startRevealingCursor() {
    if (!sliceCount) return;
    stopCursor();
    cursorRunningRef.current = true;

    // reveal duration in ms (fallback 5000)
    const revealMs =
      (typeof setting?.revealDuration === "number"
        ? setting.revealDuration
        : 5) * 1000;

    // phaseEndAt already points to revealTime while revealing
    const endAt = phaseEndAt || Date.now() + revealMs;

    const step = () => {
      // stop if phase changed
      if (!cursorRunningRef.current || round?.roundStatus !== "revealing")
        return;

      // hop one slice
      setHlIndex((idx) => ((idx ?? 0) + 1) % sliceCount);
      // setHlColor(randColor());
      playHop();

      // compute how much time has passed in revealing [0..1]
      const left = Math.max(0, endAt - Date.now());
      const k = 1 - clamp(left / Math.max(1, revealMs), 0, 1); // 0→1 from start→end

      // map k to delay: fast→slow, e.g. 50ms → 160ms
      const delay = Math.round(50 + k * 110);

      cursorTimeoutRef.current = window.setTimeout(
        step,
        delay
      ) as unknown as number;
    };

    // ensure an initial index
    setHlIndex((prev) => (prev == null ? 0 : prev));
    // setHlColor(randColor());
    step();
  }

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

    const idx = liveBoxes.findIndex((b) => norm(b.key) === norm(keyRaw));
    if (idx < 0) {
      shiftEcho();
      return;
    }

    const to = targetForBet(idx, evt.betId);

    if (betAudioRef.current && audioReady) {
      betAudioRef.current.pause();
      betAudioRef.current.currentTime = 0;
      betAudioRef.current.play().catch(() => {});
    }

    // 🔹 Don’t double-spawn for your own just-clicked bet
    const isMine = evt.userId === user?.id;
    const suppress = isMine && shouldSuppressEcho(keyRaw, evt.value);

    if (!suppress) {
      if (isMine) spawnLocalFly(to, evt.value);
      else spawnRemoteFly(to, evt.value);
    }

    // keep stacked with server betId (no change)
    setStacked((prev) =>
      prev.some((c) => c.id === evt.betId)
        ? prev
        : [
            ...prev,
            {
              id: evt.betId,
              fruit: keyRaw as any,
              value: evt.value,
              userId: evt.userId,
            },
          ]
    );

    shiftEcho();
  }, [
    echoQueue,
    round?.roundId,
    liveBoxes,
    audioReady,
    user?.id,
    spawnLocalFly,
    spawnRemoteFly,
    shiftEcho,
    targetForBet,
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
      if (v > bestVal) {
        bestVal = v;
        best = bx.key;
      }
    }
    return bestVal > 0 ? best : null;
  }, [liveBoxes, totalsForHot]);

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
      //  setWinnersHistory([]);

      // tell the game to start the next round if it exposes a method
      if (typeof startNextRound === "function") {
        Promise.resolve(startNextRound()).catch(() => {});
      }
    }
  }, [showLeaderboard, intermissionSec, startNextRound]);

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

  async function handleLoginSuccess() {
    setToken(localStorage.getItem("auth_token"));
    setLoggedIn(true);
    await game.rehydrateAfterLogin?.();
    try {
      const res = await getDailyWins();
      setTodayWins(res?.totalWin ?? 0);
    } catch {
      setTodayWins(null);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getRoundWinners();
        console.log(
          "roundddddddddddddddddddddddddddddddddd winnerrrrrrrrrrrrr",
          data
        ); // no arg uses current round id
        if (alive) setRoundWinners(data);
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [showRoundWinners, round?.roundStatus === "revealed"]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await getCurrentHistory(); // ← call it
        if (!alive) return;
        setWinnersHistory(
          items
            .slice()
            .sort(
              (a: ApiHistoryItem, b: ApiHistoryItem) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
        );
      } catch (e: any) {
        if (!alive) return;
        console.log(e?.message || "Failed to load history");
      }
    })();

    return () => {
      alive = false;
    };
  }, [round?.roundStatus === "completed"]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDailyWins();
        if (!cancelled) setTodayWins(res?.totalWin ?? 0);
      } catch (e) {
        if (!cancelled) setTodayWins(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [round?.roundStatus === "revealed"]);

  function stopAndClearHighlight() {
    stopCursor(); // clears timers / running flag
    setHlIndex(null); // removes the ring from any slice
  }

  console.log("roundddddddddddddddddddd", round);
  // console.log("settinggggggggggggggggggggggggggg", setting);

  useEffect(() => {
    if (!sliceCount) return;
    if (round?.roundStatus !== "revealed") return;

    const raw = (round as any)?.winnerBox ?? (round as any)?.winningBox;
    const winnerKey = norm(raw);
    const target = liveBoxes.findIndex((b) => norm(b.key) === winnerKey);

    if (target >= 0) {
      // normal case: decelerate and land on the winning slice
      settleOnWinner(target);
    } else {
      // winner is not one of the wheel slices (e.g., Pizza/Salad or unknown)
      // stop and clear any ring so nothing stays highlighted
      stopAndClearHighlight();
      setTimeout(() => setShowRoundWinners(true), WINNER_POPUP_DELAY_MS);
    }
  }, [
    round?.roundStatus,
    (round as any)?.winnerBox,
    (round as any)?.winningBox,
    liveBoxes,
    sliceCount,
  ]);

  console.log("winHistoryyyyyyyyyyyyyyyyyyyyyyyyyy", token);

  //console.log("roundddddddd",round)

  const sweepTimerRef = useRef<number | null>(null);
  const SWEEP_STEP_MS = 1000; // You can modify this value based on your preference.

  useEffect(() => {
    if (round?.roundStatus === "betting" && liveBoxes.length > 0) {
      let i = -1;

      const tick = () => {
        i = (i + 1) % liveBoxes.length; // Update the sweep index
        setSweepIdx(i); // Update state with the new sweep index

        // Set the next timeout to keep the interval consistent
        sweepTimerRef.current = window.setTimeout(tick, SWEEP_STEP_MS);
      };

      tick(); // Start the sweeping animation

      // Cleanup on unmount or when the round changes
      return () => {
        if (sweepTimerRef.current) {
          clearTimeout(sweepTimerRef.current);
          sweepTimerRef.current = null;
        }
      };
    } else {
      // If betting is over, reset the sweep index and stop the timer
      setSweepIdx(null);

      if (sweepTimerRef.current) {
        clearTimeout(sweepTimerRef.current);
        sweepTimerRef.current = null;
      }
    }

    // Dependency array to only trigger this effect when liveBoxes or round status changes
  }, [liveBoxes.length, round?.roundStatus]);

  /** ==================== RENDER ==================== **/

  console.log("Current sweep interval: ", SWEEP_STEP_MS); // Check value of SWEEP_STEP_MS
  console.log("Current sweep index: ", sweepIdx); // Verify sweepIdx is updating every 1000ms

  // ===== Single-run guards for scoreboard-driven flight =====
  const winnersBurstDoneRef = useRef(false);
  const lastProcessedRoundRef = useRef<string | null>(null);

  // Stable “current round key”
  const currentRoundKey = String(
    (round as any)?._id ??
      (round as any)?.roundId ??
      (round as any)?.roundNumber ??
      ""
  );

  // Reset guards whenever a new round starts (or goes back to betting)
  useEffect(() => {
    if (!currentRoundKey) return;
    if (
      round?.roundStatus === "betting" ||
      lastProcessedRoundRef.current !== currentRoundKey
    ) {
      lastProcessedRoundRef.current = null;
      winnersBurstDoneRef.current = false;
    }
  }, [currentRoundKey, round?.roundStatus]);

  // ===== Burst spawners (origin → balance/bank) =====
  function spawnBurstTowardsBalance(
    n: number,
    origin?: { x: number; y: number }
  ) {
    const list: PayoutFly[] = [];
    const base = origin ?? getWheelCenter();
    for (let i = 0; i < n; i++) {
      const jitterX = (Math.random() - 0.5) * 80;
      const jitterY = (Math.random() - 0.5) * 80;
      list.push({
        id: uid(),
        fromX: base.x + jitterX - 20,
        fromY: base.y + jitterY - 20,
        delay: i * 0.05,
      });
    }
    setPayoutFlies(list);
    setTimeout(() => setPayoutFlies([]), 1200 + n * 50);
  }

  function spawnBurstTowardsBank(n: number, origin?: { x: number; y: number }) {
    const list: BankFly[] = [];
    const base = origin ?? getWheelCenter();
    for (let i = 0; i < n; i++) {
      const jitterX = (Math.random() - 0.5) * 80;
      const jitterY = (Math.random() - 0.5) * 80;
      list.push({
        id: uid(),
        fromX: base.x + jitterX - 20,
        fromY: base.y + jitterY - 20,
        delay: i * 0.04,
      });
    }
    setBankFlies(list);
    setTimeout(() => setBankFlies([]), 1100 + n * 40);
  }

  // Winner-based origin (nicer than wheel center)
// winner-based origin (unchanged)
function winnerOriginOrCenter() {
  const raw = (round as any)?.winnerBox ?? (round as any)?.winningBox;
  const key = norm(raw);
  const idx = liveBoxes.findIndex((b) => norm(b.key) === key);
  if (idx >= 0) {
    const p = targetForBet(idx, uid());
    return { x: p.x, y: p.y };
  }
  return getWheelCenter();
}

// Drive coin flights from roundWinners exactly once per round
useEffect(() => {
  const phase = round?.roundStatus;
  // Allow late data, but only after result is fixed
  const resultFixed = phase === "revealed" || phase === "completed";
  const meId = String((user as any)?.id ?? (user as any)?._id ?? "");

  if (!currentRoundKey || !resultFixed || !roundWinners || !meId) return;
  if (lastProcessedRoundRef.current === currentRoundKey) return;
  if (winnersBurstDoneRef.current) return;

  // Find my entry robustly
  const meEntry =
    roundWinners.topWinners?.find(
      (x: any) => String(x.userId ?? x.user?._id ?? x._id ?? "") === meId
    ) ?? null;

  // If my row isn't here yet, don't mark processed — let future updates retrigger
  if (!meEntry) return;

  const won  = Math.max(0, Number(meEntry.amountWon ?? 0)); // payout returned
  const bet  = Math.max(0, Number(meEntry.totalBet  ?? 0)); // stake placed
  const loss = Math.max(0, bet - won);                      // stake not returned

  // ✅ Correct scaling: only compute when strictly positive
  const winCoins  = won  > 0 ? Math.min(10, Math.max(2, Math.round(won  / 5000))) : 0;
  const lossCoins = loss > 0 ? Math.min(10, Math.max(2, Math.round(loss / 5000))) : 0;

  // If nothing to animate, don't consume the round yet (wait for better data)
  if (winCoins === 0 && lossCoins === 0) return;

  const origin = winnerOriginOrCenter();

  if (winCoins  > 0) spawnBurstTowardsBalance(winCoins, origin); // coin → balance
  if (lossCoins > 0) spawnBurstTowardsBank   (lossCoins, origin); // coin → bank

  // Mark processed ONLY after we actually spawned something
  lastProcessedRoundRef.current = currentRoundKey;
  winnersBurstDoneRef.current   = true;
}, [currentRoundKey, round?.roundStatus, roundWinners, user?.id, user?._id]);


  return (
    <div
      ref={pageRef}
      className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto"
      style={{
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        backgroundImage: `url(/bg-image.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* initial loader */}
      <InitialLoader open={bootLoading} progress={bootProgress} withinFrame />
      {/* login page */}
      {!loggedIn && <LoginPage onLogin={handleLoginSuccess} />}
      {/* Game UI */}
      <div>
        {/* Phone frame */}
        <div
          ref={phoneRef}
          className="relative w-[360px] max-w-[360px] min-h-screen bg-white/5  border border-white/10 rounded-[8px] overflow-hidden"
          style={{
            boxShadow:
              "0 40px 140px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)",
            perspective: 1200,
          }}
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
                <div className="font-bold">Round: {round?.roundNumber}</div>
              </div>

              {/* Right Side: Ping + Leaderboard */}
              <div className="flex justify-end items-center gap-2">
                <PingDisplay ping={ping} />
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
          <div
            className="pointer-events-none absolute inset-x-0 top-14 z-[60]"
            aria-live="polite"
            aria-atomic="true"
          >
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
                    background:
                      "linear-gradient(180deg, rgba(30,58,138,.85), rgba(37,99,235,.75))",
                    border: "1px solid rgba(255,255,255,.25)",
                    boxShadow:
                      "0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)",
                  }}
                >
                  {tip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* WHEEL AREA */}
          <div
            className="relative mt-10 pb-4"
            style={{ minHeight: wheelTop + D + 140 }}
          >
            {/* wheel disc */}
            <motion.div
              ref={wheelRef}
              className="absolute left-1/2 -translate-x-1/2 will-change-transform z-20"
              animate={controls}
              onUpdate={(latest) => {
                if (typeof (latest as any).rotate === "number") {
                  const rot = (latest as any).rotate as number;
                  //  setWheelDeg(rot);
                  wheelDegRef.current = rot;
                }
              }}
              style={{
                top: wheelTop,
                width: D,
                height: D,
              }}
            >
              {/* rim highlight */}
              <div className="absolute inset-0" />

              {/* Spokes */}
              {FOODS.map((_, i) => {
                const rotationDeg = i * (360 / FOODS.length);
                const spokeLength = R - 10;

                return (
                  <div
                    key={`spoke-${i}`}
                    className="absolute left-1/2 top-1/2 origin-left"
                    style={{
                      width: spokeLength,
                      height: 10,
                      background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                      transform: `rotate(${rotationDeg}deg)`,
                    }}
                  >
                    {/* Gold Bulb at the center of each spoke */}
                    <div
                      style={{
                        position: "absolute",
                        top: 2.5,
                        left: 60,
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background:
                          "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
                        boxShadow: "0 0 8px rgba(0, 0, 0, 0.3)",
                      }}
                    />
                  </div>
                );
              })}

              {/* per-slice buttons */}
              {liveBoxes.map((bx, i) => {
                const angDeg = i * sliceAngle;
                const rad = ((angDeg - 90) * Math.PI) / 180;
                const cx = R + ringR * Math.cos(rad);
                const cy = R + ringR * Math.sin(rad);

                const disabled =
                  round?.roundStatus !== "betting" || showLeaderboard;
                const isWinner =
                  forcedWinner === bx.key && round?.roundStatus !== "betting";

                const balanceNow = balance ?? 0;
                const noCoins = balanceNow <= 0;
                const cannotAffordChip = balanceNow < (selectedChip || 0);
                const visuallyDisabled =
                  disabled || noCoins || cannotAffordChip;

                const isActive = hlIndex === i;
                const roundPhase = round?.roundStatus as
                  | "betting"
                  | "revealing"
                  | "revealed"
                  | "completed"
                  | undefined;

                const platformWinner =
                  roundPhase !== "betting" &&
                  (round?.winnerBox === "Pizza" || round?.winnerBox === "Salad")
                    ? (round?.winnerBox as "Pizza" | "Salad")
                    : null;

                //const isRevealingPhase =
                //  roundPhase === "revealing" || roundPhase === "revealed";
                //  const isAfterReveal = roundPhase === "completed";

                // highlight logic for dark overlay
                // highlight logic for dark overlay
                let dimSlice = false;

                const isRevealish =
                  roundPhase === "revealing" || roundPhase === "revealed";

                if (isRevealish) {
                  if (platformWinner) {
                    // platform won: brighten all slices that belong to that platform group
                    const groupName = bx.group?.toLowerCase?.();
                    dimSlice = groupName !== platformWinner.toLowerCase();
                  } else {
                    // otherwise, only keep active slice bright
                    dimSlice = !isActive;
                  }
                } else {
                  dimSlice = false; // normal (betting/preparing)
                }

                // <- darken only non-active slices WHILE revealing
                const isSweep =
                  round?.roundStatus === "betting" && sweepIdx === i;
                const isCurrentSlice = sweepIdx === i;
                const userBoxTotal = round?.userPerBoxTotal?.find(
                  (b: user_perbox_total) => b.box === bx.title
                );
                return (
                  <div key={bx.key}>
                    <motion.button
                      whileTap={{ scale: visuallyDisabled ? 1 : 0.96 }}
                      whileHover={
                        prefersReducedMotion || visuallyDisabled
                          ? {}
                          : { translateZ: 10 }
                      }
                      onClick={() => {
                        if (noCoins) return notify("You don't have coin");
                        if (cannotAffordChip)
                          return notify("Not enough balance for this chip");
                        if (disabled || !selectedChip) return;
                        onSliceClick(bx.key);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${
                        isWinner
                          ? "animate-[blink_900ms_steps(2)_infinite] glow"
                          : ""
                      }`}
                      style={{
                        left: cx,
                        top: cy,
                        width: btn,
                        height: btn,
                        position: "absolute",
                        background:
                          "linear-gradient(180deg, #ffffff 0%, #ffffff 50%, #62c1ef 50%, #62c1ef 100%)",
                        borderStyle: "solid",
                        borderWidth: 5,
                        borderColor: isWinner
                          ? "rgb(39, 82, 172)"
                          : isActive || isSweep
                          ? "#FFA300"
                          : "rgb(39, 82, 172)",
                        transition:
                          "border-color 80ms linear, border-width 80ms linear, box-shadow 80ms linear",
                      }}
                      aria-label={`Bet on ${bx.title} (pays x${bx.multiplier})`}
                      disabled={disabled}
                      aria-disabled={visuallyDisabled}
                      title={`Bet on ${bx.title} (pays x${bx.multiplier})`}
                    >
                      {round?.roundStatus === "betting" && isCurrentSlice && (
                        <div
                          className="r -rotate-12 z-50"
                          style={{
                            position: "absolute",
                            bottom: "1px",
                            right: "0px",
                            fontSize: "30px",
                            width: "30px",
                            height: "30px",
                            pointerEvents: "none",
                          }}
                        >
                          <img
                            src="/Pointing_finger.png"
                            alt="Pointing Finger"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        </div>
                      )}
                      {/* DARK OVERLAY – toggles only while revealing & not active */}
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{
                          background:
                            "radial-gradient(120% 120% at 50% 35%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.55) 100%), rgba(0,0,0,0.55)",
                          zIndex: 20,
                        }}
                        animate={{ opacity: dimSlice ? 1 : 0 }}
                        transition={{ duration: 0.15, ease: "linear" }}
                      />
                      {/* content kept above background, below overlay when dimming */}
                      <div
                        className="relative flex flex-col items-center justify-center w-full h-full rounded-full"
                        style={{
                          // zIndex: 10,
                          transform: "rotate(calc(-1 * var(--wheel-rot)))",
                        }}
                      >
                        <div
                          aria-hidden
                          className="text-[24px] leading-none drop-shadow"
                        >
                          {bx.icon ??
                            (Object.prototype.hasOwnProperty.call(EMOJI, bx.key)
                              ? EMOJI[bx.key as FoodsKey]
                              : "❓")}
                        </div>

                        <div className="mt-1 text-[10px] text-white/90 leading-none font-bold capitalize">
                          win{" "}
                          <span className="font-extrabold">
                            x{bx.multiplier}
                          </span>
                        </div>

                        {/* === total badge (dark-overlay aware) === */}
                        {userBoxTotal && (
                          <div
                            className="absolute -top-5 z-50 w-full"
                            style={{
                              left: "50%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            <div className="relative inline-block rounded-full">
                              <div
                                className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold bg-white text-gray-800 shadow"
                                style={{
                                  border: "1px solid rgba(255,255,255,.25)",
                                }}
                                aria-label={`${userBoxTotal.totalAmount} `}
                              >
                                {`You: ${userBoxTotal.totalAmount}`}
                              </div>

                              {/* dark overlay for the badge */}
                              <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-150"
                                style={{
                                  background:
                                    "radial-gradient(120% 120% at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.65) 100%), rgba(0,0,0,.45)",
                                  opacity: dimSlice ? 1 : 0,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* === HOT badge (dark-overlay aware) === */}
                        {hotKey === bx.key && (
                          <div
                            className="absolute -right-6 top-0 z-50"
                            aria-label={`HOT: ${bx.title} has the highest total bets`}
                          >
                            <div className="relative inline-flex items-center">
                              <div className="bg-orange-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full shadow-lg border border-white/30 flex items-center justify-center">
                                HOT
                              </div>

                              {/* Tail */}
                              <div className="absolute -bottom-[4px] left-3/12 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-orange-600 rotate-12"></div>

                              {/* dark overlay for the HOT badge (covers pill + tail) */}
                              <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 transition-opacity duration-150"
                                style={{
                                  // slight rectangle overlay; if you want perfect rounded match, wrap tail separately
                                  background:
                                    "radial-gradient(120% 120% at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.65) 100%), rgba(0,0,0,.45)",
                                  borderRadius: 9999, // soften over the pill area
                                  opacity: dimSlice ? 1 : 0,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-white">
                          Total: {fmt(bx.total)}
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
                // OUTER RING (unchanged)
                background: "linear-gradient(180deg,#2f63c7,#1f4290)",
                boxShadow:
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.25)",
              }}
              animate={{
                boxShadow: [
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 44px rgba(255,220,80,.8), 0 0 64px rgba(255,200,50,.5)",
                  "0 20px 50px rgba(0,0,0,.55), inset 0 0 0 10px rgba(255,255,255,.15), 0 0 20px rgba(255,200,50,.45), 0 0 40px rgba(255,200,50,.25)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            >
              {/* INNER DISC (white/blue split) */}
              <div
                className="rounded-full relative flex items-center justify-center text-center border-1 border-blue-600"
                style={{
                  width: "86%", // adjust for desired rim thickness
                  height: "86%",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #ffffff 50%, #62c1ef 50%, #62c1ef 100%)",
                  boxShadow: "inset 0 0 10px rgba(0,0,0,.25)",
                }}
              >
                <img
                  src="/cat_anomation.gif"
                  alt="Cat"
                  className="w-64 absolute -top-8"
                />

                <div className="relative">
                  <div className="text-[12px] font-semibold tracking-wide mt-9">
                    {bettingOpen && !showLeaderboard
                      ? "Place bets"
                      : round?.roundStatus === "revealing"
                      ? "Revealing…"
                      : round?.roundStatus === "revealed"
                      ? "Result"
                      : round?.roundStatus === "completed"
                      ? "Next round"
                      : "Preparing…"}
                  </div>

                  <div className="text-[22px] font-black tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,.35)] -mt-3">
                    {round?.roundStatus === "revealed"
                      ? "0s"
                      : `${Math.floor(uiLeftMs / 1000)}s`}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* wheel stand */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{
              top: wheelTop + R * 2.2,
              width: D * 0.94,
              height: Math.max(110, D * 0.34),
            }}
          >
            <div className="relative w-full h-full">
              <WheelStand wheelTop={wheelTop} D={D} R={R} />

              {/* === Platforms (Pizza / Salad) === */}
              {(() => {
                const pizza = platforms.Pizza;
                const salad = platforms.Salad;

                const winnerIs = (who: "Pizza" | "Salad") =>
                  round?.roundStatus === "revealed" && round?.winnerBox === who;

                const isRevealing = round?.roundStatus === "revealing";
                const isRevealed = round?.roundStatus === "revealed";

                const darkFor = (idx: 0 | 1) => {
                  if (isRevealing) {
                    return platIdx !== idx;
                  }
                  if (isRevealed) {
                    const w = winnerIs(idx === 0 ? "Pizza" : "Salad");
                    return !w;
                  }
                  return false;
                };
                const DarkScrim = ({
                  show,
                  rounded,
                }: {
                  show: boolean;
                  rounded: string;
                }) =>
                  show ? (
                    <div
                      aria-hidden
                      className={`absolute inset-0 pointer-events-none ${rounded}`}
                      style={{
                        background:
                          "radial-gradient(120% 120% at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.65) 100%), rgba(0,0,0,.45)",
                        transition: "opacity .2s linear",
                      }}
                    />
                  ) : null;

                const Circle = ({
                  idx,
                  bg,
                  icon,
                }: {
                  idx: 0 | 1;
                  bg: string;
                  icon: React.ReactNode;
                }) => (
                  <div
                    className="relative rounded-full p-1 z-30"
                    style={{
                      background: bg,
                      boxShadow: "0 2px 4px rgba(0,0,0,.35)",
                      transition: "opacity .2s ease",
                    }}
                  >
                    <span className="text-3xl">{icon}</span>
                    <DarkScrim show={darkFor(idx)} rounded="rounded-full" />
                  </div>
                );

                const TopBadge = ({
                  idx,
                  children,
                }: {
                  idx: 0 | 1;
                  children: React.ReactNode;
                }) => (
                  <div className="top-0 -mt-2 shadow absolute z-30">
                    <div className="bg-[#0864b4] text-white text-[8px] font-bold px-1 py-0.5 rounded-md">
                      {children}
                    </div>
                    <DarkScrim show={darkFor(idx)} rounded="rounded-md" />
                  </div>
                );

                const BottomBadge = ({
                  idx,
                  children,
                  extraClass = "",
                }: {
                  idx: 0 | 1;
                  children: React.ReactNode;
                  extraClass?: string;
                }) => (
                  <div className={` shadow absolute z-30 ${extraClass}`}>
                    <div className="bg-[#0864b4] text-white text-[9px] font-bold px-1 rounded-md">
                      {children}
                    </div>
                    <DarkScrim show={darkFor(idx)} rounded="rounded-md" />
                  </div>
                );

                return (
                  <div className="absolute -left-8 -right-8 flex justify-between">
                    {/* PIZZA */}
                    <div className="flex flex-col items-center w-12">
                      <Circle idx={0} bg="#facc15" icon={pizza.icon ?? "🍕"} />
                      <TopBadge idx={0}>Total {fmt(pizza.total)}</TopBadge>
                      <BottomBadge idx={0} extraClass="-bottom-2">
                        {pizza.multiplier ? `${pizza.multiplier}x` : "—"}
                      </BottomBadge>
                    </div>

                    {/* SALAD */}
                    <div className="flex flex-col items-center w-12">
                      <Circle idx={1} bg="#4ade80" icon={salad.icon ?? "🥗"} />
                      <TopBadge idx={1}>Total {fmt(salad.total)}</TopBadge>
                      <BottomBadge idx={1} extraClass="-mr-3 -bottom-2">
                        {salad.multiplier ? `${salad.multiplier}x` : "—"}
                      </BottomBadge>
                    </div>
                  </div>
                );
              })()}

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
                    className="shrink-0 rounded-xl px-2 py-1 text-[12px] font-bold"
                    style={{
                      background: "linear-gradient(180deg,#2f63c7,#1f4290)",
                      border: "1px solid rgba(255,255,255,.25)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.35), 0 6px 12px rgba(0,0,0,.25)",
                    }}
                  >
                    Result
                  </div>

                  <div className="flex items-center gap-2 overflow-y-hidden overflow-x-auto no-scrollbar">
                    {(winnersHistory?.length ? [...winnersHistory] : [])
                      .filter(
                        (it, idx) => idx !== 0 || !!(it as any).winningBox
                      )
                      .map((k, idx) => {
                        const boxKey = norm(
                          (k as any).winningBox ?? (k as any).title
                        ) as FoodsKey;
                        const emoji = EMOJI[boxKey] ?? "❓";
                        const labelText =
                          LABEL[boxKey] ??
                          (k as any).box ??
                          (k as any).title ??
                          "";
                        return (
                          <div
                            key={`${
                              (k as any)?._id ?? (k as any)?.createdAt ?? idx
                            }-bar`}
                            className="relative shrink-0"
                          >
                            <div
                              className="w-7 h-7 rounded-xl grid place-items-center"
                              style={{
                                background:
                                  "linear-gradient(180deg,#cde8ff,#b6dcff)",
                                border: "1px solid #7fb4ff",
                              }}
                              title={labelText}
                            >
                              <span className="text-[16px] leading-none">
                                {k.winningBox === "Pizza"
                                  ? "🍕"
                                  : k.winningBox === "Salad"
                                  ? "🥗"
                                  : emoji}
                              </span>
                            </div>
                            {idx === 0 && (
                              <div
                                className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-1.5 py-[1px] rounded-full text-[6px] font-black"
                                style={{
                                  background:
                                    "linear-gradient(180deg,#ffd84d,#ffb800)",
                                  border: "1px solid rgba(0,0,0,.2)",
                                  boxShadow:
                                    "0 2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.6)",
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
                      <div className="text-[11px] font-semibold text-white/90 opacity-90">
                        No results yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CHIP BAR ===== */}
          <div className="px-3 relative">
            <div className="absolute left-4 right-4 -top-7 flex justify-between text-white text-[12px] font-semibold">
              <div className="px-2 rounded-full bg-blue-500 backdrop-blur-md border border-white/20 shadow">
                Mine {"" + fmt(myBetTotal ?? 0)}
              </div>
              <div className="px-2 rounded-full bg-blue-500 backdrop-blur-md border border-white/20 shadow">
                Total {fmt(round?.roundTotal ?? 0)}
              </div>
            </div>

            <div
              className="relative rounded-2xl px-2 py-5 border shadow-xl backdrop-blur-md"
              style={{
                background:
                  "linear-gradient(180deg, rgba(30,58,138,.18), rgba(37,99,235,.10))",
                borderColor: "rgba(255,255,255,0.35)",
                boxShadow:
                  "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)",
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
                        border: `2px solid ${
                          selected ? color : "rgba(255,255,255,.14)"
                        }`,
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
                boxShadow:
                  "0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
              }}
            >
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-[2px] rounded-full text-[10px] font-bold border shadow"
                style={{
                  background: "linear-gradient(180deg,#2f63c7,#1f4290)",
                  borderColor: "rgba(255,255,255,.25)",
                  boxShadow:
                    "0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)",
                }}
              >
                Stats
              </div>

              <div className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center">
                <div className="text-[11px] opacity-90 leading-none">Coins</div>
                <div
                  ref={balanceRef}
                  className="text-[14px] font-bold tabular-nums leading-tight min-w-[72px]"
                >
                  {!balance ? (
                    <div className="h-4 w-[72px] rounded animate-pulse bg-white/20" />
                  ) : (
                    <>🪙 {balance}</>
                  )}
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
              <div
                onClick={() => setShowTodayLeaderboard(true)}
                className="rounded-lg p-1.5 text-white/95 border border-white/20 bg-black/15 flex flex-col items-center"
              >
                <div className="text-[11px] opacity-90 leading-none">
                  Today's Win
                </div>
                <div className="text-[14px] font-bold tabular-nums leading-tight min-w-[72px]">
                  {todayWins === null ? (
                    <div className="h-4 w-[72px] rounded animate-pulse bg-white/20" />
                  ) : (
                    <>🪙 {todayWins}</>
                  )}
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
                  initial={{
                    x: f.from.x - 1,
                    y: f.from.y - 1,
                    opacity: 0,
                    scale: 0.85,
                  }}
                  animate={{
                    x: f.to.x - 10,
                    y: f.to.y - 8,
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
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
                  initial={{
                    x: f.from.x - 1,
                    y: f.from.y - 1,
                    opacity: 0,
                    scale: 0.85,
                  }}
                  animate={{
                    x: f.to.x - 10,
                    y: f.to.y - 10,
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
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
            {/* Payout flights → balance */}
            <AnimatePresence>
              {payoutFlies.map((f) => (
                <motion.div
                  key={`p-${f.id}`}
                  initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
                  animate={{
                    x:
                      (balanceRef.current?.getBoundingClientRect()?.left ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
                      (balanceRef.current?.getBoundingClientRect()?.width ??
                        40) /
                        2,
                    y:
                      (balanceRef.current?.getBoundingClientRect()?.top ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
                      (balanceRef.current?.getBoundingClientRect()?.height ??
                        40) /
                        2,
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 24,
                    delay: f.delay,
                  }}
                  className="absolute w-10 h-10"
                >
                  <Coin />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Bank flights → bank button */}
            <AnimatePresence>
              {bankFlies.map((f) => (
                <motion.div
                  key={`b-${f.id}`}
                  initial={{ x: f.fromX, y: f.fromY, opacity: 0, scale: 0.9 }}
                  animate={{
                    x:
                      (bankRef.current?.getBoundingClientRect()?.left ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.left ?? 0) +
                      (bankRef.current?.getBoundingClientRect()?.width ?? 40) /
                        5,
                    y:
                      (bankRef.current?.getBoundingClientRect()?.top ?? 0) -
                      (phoneRef.current?.getBoundingClientRect()?.top ?? 0) +
                      (bankRef.current?.getBoundingClientRect()?.height ?? 40) /
                        5,
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 24,
                    delay: f.delay,
                  }}
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
          />
          <TodayLeaderboardModal
            open={showTodayLeaderboard}
            onClose={() => {
              setShowTodayLeaderboard(false);
            }}
            // onStartNow={() => setIntermissionSec(0)}
          />
          <GameRules
            open={showGameRules}
            onClose={() => setShowGameRules(false)}
          />
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
            data={roundWinners}
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
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 20,
                    delay: i * 0.05,
                  }}
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
type StackedCoin = {
  id: string;
  fruit: FoodsKey;
  value: number;
  userId: string;
};
type Fly = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  value: number;
};
type PayoutFly = { id: string; fromX: number; fromY: number; delay: number };
type BankFly = { id: string; fromX: number; fromY: number; delay: number };

function Coin() {
  return (
    <div
      className="w-5 h-5 rounded-full border shadow-md flex items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 40% 30%, #fde68a, #fbbf24 55%, #f59e0b)",
        borderColor: "#fbbf24",
        boxShadow:
          "0 14px 40px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.45)",
      }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 40% 30%, #fff3c4, #fcd34d 60%, #fbbf24)",
          border: "1px solid #facc15",
        }}
      >
        <span className="text-amber-900 text-[5px] font-extrabold">$</span>
      </div>
    </div>
  );
}

/** utils */
function fmt(n: number) {
  const format = (num: number, suffix: string) => {
    const formatted = num.toFixed(1);
    return formatted.endsWith(".0")
      ? `${parseInt(formatted)}${suffix}`
      : `${formatted}${suffix}`;
  };

  if (n >= 1_000_000) return format(n / 1_000_000, "M");
  if (n >= 1_000) return format(n / 1_000, "K");
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    n
  );
}
