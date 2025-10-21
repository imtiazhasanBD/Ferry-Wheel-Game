import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fmt } from "./constants";

type RankItem = {
    userId: string;
    name?: string;
    wins?: number;
    amount?: number;
    avatarUrl?: string | null;
};

export default function TodayLeaderboardModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [ranking, setRanking] = useState<RankItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem("auth_token");

    useEffect(() => {
        if (!open) return;

        async function fetchLeaderboard() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/v1/bettings/leaderboard/today`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                    }
                );
                if (!res.ok) throw new Error("Failed to fetch leaderboard");
                const data = await res.json();

                setCurrentUserId(data.userId || null);

                const mappedRanking: RankItem[] = (data.leaders || []).map(
                    (leader: any) => ({
                        userId: leader.userId,
                        name: leader.user?.username || leader.userId.slice(0, 6),
                        amount: leader.totalWon,
                        wins: leader.winsCount,
                        avatarUrl: leader.user?.username
                            ? leader.user.username[0].toUpperCase()
                            : null,
                    })
                );

                setRanking(mappedRanking);
            } catch (e) {
                console.error(e);
                setRanking([]);
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();
    }, [open, token]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[999] grid place-items-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 6 }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className="relative w-[92%] max-w-sm rounded-[28px] px-2 pt-4 pb-5"
                        style={{
                            background:
                                "linear-gradient(180deg,#2379c9 0%, #1f6bb4 40%, #1b5d9c 75%, #154b7e 100%)",
                            boxShadow:
                                "0 24px 80px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.2)",
                            border: "2px solid rgba(255,255,255,.15)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2">
                            <motion.div
                                initial={{ y: -18, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
                            >
                                <RibbonBlue />
                            </motion.div>
                        </div>
                        {/* Transparent panel (no white bg) */}
                        <div
                            className="overflow-hidden"
                        >
                            <div className="px-3 py-3 min-h-[150px]">
                                {loading ? (
                                    <div className="space-y-2">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="h-12 rounded-[8px] bg-white/10 animate-pulse" />
                                        ))}
                                    </div>
                                ) : ranking.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-white/80">No winners found.</div>
                                ) : (
                                    <div className="overflow-hidden overflow-y-auto no-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-white/90">
                                                    <th className="px-2 py-2 w-14">Ranking</th>
                                                    <th className="px-2 py-2 w-16">Profile</th>
                                                    <th className="px-2 py-2">Name</th>
                                                    <th className="px-2 py-2 text-right">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ranking.map((r, i) => {
                                                    const idx = i + 1;
                                                    const isSelf = r.userId === currentUserId;
                                                    const crown = idx === 1 ? "🥇" : idx === 2 ? "🥈" : idx === 3 ? "🥉" : null;

                                                    return (
                                                        <motion.tr
                                                            key={r.userId + i}
                                                            initial={{ opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.03 }}
                                                            className={`relative border-t border-white/15 text-white
    ${isSelf ? " outline-2 outline-emerald-400/80 -outline-offset-2" : ""}`}
                                                        >

                                                            {/* Ranking */}
                                                            <td className="px-2 py-2 tabular-nums align-middle">
                                                                <div className="w-12 text-center">
                                                                    {crown ? (
                                                                        <span className="inline-block align-middle text-[22px] md:text-[24px] leading-none">
                                                                            {crown}
                                                                        </span>
                                                                    ) : (
                                                                        <span>{idx}</span>
                                                                    )}
                                                                </div>
                                                            </td>


                                                            {/* Profile (avatar/initial only, no bg) */}
                                                            <td className="px-2 py-2 align-middle">
                                                                <div
                                                                    className={`grid h-8 w-8 place-items-center rounded-full border text-white font-bold select-none
    ${isSelf ? "border-emerald-400/80" : "border-white/30"}`}
                                                                >
                                                                    {r.avatarUrl ? <span>{r.avatarUrl}</span> : <span>👤</span>}
                                                                </div>

                                                            </td>

                                                            {/* Name */}
                                                            <td className="px-2 py-2 align-middle">
                                                                <div className="truncate">{r.name || r.userId.slice(0, 6)}</div>
                                                            </td>

                                                            {/* Revenue */}
                                                            <td className="px-2 py-2 text-right tabular-nums align-middle text-amber-300">
                                                                {fmt(r.amount ?? 0)}
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                )}
                            </div>
                        </div>


                        <motion.button
                            onClick={onClose}
                            aria-label="Close"
                            whileTap={{ scale: 0.95 }}
                            className="absolute -right-2 -top-8 grid h-8 w-8 place-items-center rounded-full text-white shadow"
                            style={{
                                background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
                                boxShadow: "inset 0 2px 0 rgba(255,255,255,.5), 0 6px 12px rgba(0,0,0,.25)",
                                border: "1px solid rgba(35,121,201,.6)",
                            }}
                        >
                            ✕
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function RibbonBlue() {
    return (
        <div className="relative flex justify-center">
            <div
                className="absolute -left-10 top-1/2 h-8 w-10 -translate-y-1/2 rotate-[-12deg] rounded-l-md"
                style={{
                    background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
                    boxShadow: "-4px 4px 0 rgba(0,0,0,.15)",
                }}
            />
            <div
                className="absolute -right-10 top-1/2 h-8 w-10 -translate-y-1/2 rotate-[12deg] rounded-r-md"
                style={{
                    background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 100%)",
                    boxShadow: "4px 4px 0 rgba(0,0,0,.15)",
                }}
            />
            <div
                className="relative min-w-[250px] rounded-[18px] px-8 py-2 text-center text-[15px] font-extrabold tracking-wide text-white"
                style={{
                    background: "linear-gradient(180deg,#36a2ff 0%, #2379c9 60%, #1b5d9c 100%)",
                    textShadow: "0 1px 0 rgba(0,0,0,.25)",
                    boxShadow: "0 6px 12px rgba(0,0,0,.3), inset 0 2px 0 rgba(255,255,255,.6)",
                    border: "2px solid rgba(255,255,255,.5)",
                }}
            >
                Today&apos;s Revenue Rank
            </div>
        </div>
    );
}
