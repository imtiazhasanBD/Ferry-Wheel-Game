import { useState } from "react";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        // Replace with your actual login logic
        alert(`Login as ${name} with password: ${password}`);
        onLogin();

    }

    return (
        <div
            className="relative w-[360px] max-w-[360px] h-[700px] overflow-hidden mx-auto 
                 rounded-[8px] border border-white/10"
            style={{
      
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-extrabold drop-shadow">Ferry Wheel Royale</h1>
                    <p className="text-sm text-white/70">Sign in to play</p>
                </div>

                <form
                    onSubmit={handleLogin}
                    className="w-full max-w-xs space-y-4 bg-white/10 backdrop-blur-md 
                     rounded-xl p-5 shadow-xl border border-white/20"
                >
                    <div>
                        <label className="block text-sm mb-1">Username</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-black text-sm 
                         focus:ring-2 focus:ring-sky-400 outline-none border-1 border-sky-400"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-black text-sm 
                         focus:ring-2 focus:ring-sky-400 outline-none border-1 border-sky-400"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 rounded-lg font-bold text-sm 
                       bg-gradient-to-r from-sky-500 to-indigo-500 
                       hover:opacity-90 shadow-lg"
                    >
                        Login
                    </button>
                </form>

                <p className="mt-4 text-xs text-white/60">
                    Don’t have an account? <span className="underline cursor-pointer">Sign up</span>
                </p>
            </div>
        </div>
    );
}
