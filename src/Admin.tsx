import { useEffect, useState } from "react";

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [day, setDay] = useState<string>(new Date().toISOString().slice(0,10));
  const [pw, setPw] = useState<string>("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));

  async function login() {
    const res = await fetch(`${import.meta.env.VITE_RT_URL || "http://localhost:8080"}/auth/admin`, { method: "POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password: pw }) });
    const d = await res.json(); if (d.token) { localStorage.setItem("admin_token", d.token); setToken(d.token); }
  }
  async function load() {
    if (!token) return;
    const res = await fetch(`${import.meta.env.VITE_RT_URL || "http://localhost:8080"}/admin/daily?day=${day}`, { headers: { Authorization: `Bearer ${token}` } });
    setData(await res.json());
  }

  useEffect(() => { if (token) load(); }, [token]);
console.log(data)
  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-semibold mb-4">Admin — Daily P&L</h1>
      {!token && (
        <div className="mb-4 flex gap-2">
          <input className="text-black px-2 py-1 rounded" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Admin password" />
          <button className="px-3 py-1 bg-emerald-500 rounded" onClick={login}>Login</button>
        </div>
      )}
      <div className="mb-3 flex gap-2 items-center">
        <input type="date" className="text-black px-2 py-1 rounded" value={day} onChange={(e)=>setDay(e.target.value)} />
        <button className="px-3 py-1 bg-blue-500 rounded" onClick={load}>Load</button>
      </div>
      {data && (
        <div className="space-y-4">
          <div className="bg-white/10 p-3 rounded">
            <div className="font-semibold">Platform</div>
            <div>Win (payouts): {data.platform?.win ?? 0}</div>
            <div>Loss (kept): {data.platform?.loss ?? 0}</div>
            <div>Net: {(data.platform?.loss ?? 0) - (data.platform?.win ?? 0)}</div>
          </div>
          <div className="bg-white/10 p-3 rounded">
            <div className="font-semibold mb-2">Users</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left"><th>User</th><th>Win</th><th>Loss</th></tr>
              </thead>
              <tbody>
                {data.users?.map((u:any)=> (
                  <tr key={u.user_id}><td>{u.user_id}</td><td>{u.win}</td><td>{u.loss}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}