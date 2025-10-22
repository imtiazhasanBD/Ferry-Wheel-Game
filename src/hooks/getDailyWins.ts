import { useCallback } from "react";

export type DailyWinsResponse = {
  status: boolean;
  userId: string;
  date: string; // "YYYY-MM-DD"
  totalWin: number;
  countWinningBets: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const getAuthToken = () =>
  (typeof window !== "undefined" && localStorage.getItem("auth_token")) || null;

/** ======= Daily Wins API (simple) ======= */
export const useGetDailyWins = () => {
  const getDailyWins = useCallback(async (): Promise<DailyWinsResponse> => {
    const token = getAuthToken();

    const res = await fetch(`${API_BASE}/api/v1/users/daily-wins`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to fetch daily wins (${res.status}): ${text || res.statusText}`
      );
    }

    const json = (await res.json()) as DailyWinsResponse;
    return json;
  }, []);

  return getDailyWins;
};
