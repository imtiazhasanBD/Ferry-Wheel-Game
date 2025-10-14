import { useState } from "react";

type LoginResponse = {
  token: string;
  user?: {
    id?: string | number;
    name?: string;
    [k: string]: unknown;
  };
  // add/adjust fields if your API returns more
};

const API_URL = "https://greedy.stallforest.com/api/v1/users/login";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Adjust keys here if your backend expects different names
        body: JSON.stringify({ username: name, password }),
        credentials: "include", // keep if backend sets auth cookies; remove if not needed
      });

      // Try to parse JSON even on error to surface server message
      const maybeJson = await res
        .clone()
        .json()
        .catch(() => null as unknown as LoginResponse | null);

      if (!res.ok) {
        const message =
          (maybeJson as any)?.message ||
          (maybeJson as any)?.error ||
          `Login failed (${res.status})`;
        throw new Error(message);
      }

      const data = (maybeJson ||
        (await res.json())) as LoginResponse;

      // Save token (adjust key if your API uses a different field)
      if (data?.token) {
        localStorage.setItem("auth_token", data.token);
      }

      // Optionally persist user info
      if (data?.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }

      onLogin();
    } catch (err: any) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto rounded-[8px] border border-white/10"
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold drop-shadow">
            Ferry Wheel Royale
          </h1>
          <p className="text-sm text-white/70">Sign in to play</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="w-full max-w-xs space-y-4 bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-xl border border-white/20"
        >
          {error && (
            <div className="text-red-200 text-xs bg-red-500/20 border border-red-400/40 rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-black text-sm focus:ring-2 focus:ring-sky-400 outline-none border border-sky-400/40"
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-black text-sm focus:ring-2 focus:ring-sky-400 outline-none border border-sky-400/40 pr-10"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto text-xs text-sky-100/80 hover:text-white"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-white/60">
          Don’t have an account?{" "}
          <span className="underline cursor-pointer">Sign up</span>
        </p>
      </div>
    </div>
  );
}
