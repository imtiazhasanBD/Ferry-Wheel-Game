import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { z } from "zod";
import { ensureSchema, ensureUserRow, writeBet, adminDaily } from "./db.js";
import { Tables } from "./tables.js";
import { signJwt, verifyJwt, requireAuth, requireAdmin } from "./auth.js";
import { FRUITS, FruitKey } from "./types.js";
import { randomUUID } from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json());

// Auth endpoints
app.post("/auth/guest", async (req, res) => {
  const name = (req.body?.name as string) || `Player-${Math.random().toString(36).slice(2,6)}`;
  const id = randomUUID();
  const user = { id, name, balance: 100_000, profit: 0, loss: 0 };
  await ensureUserRow(user).catch(()=>{});
  const token = signJwt({ sub: id, role: "user", name });
  res.json({ token, user });
});

app.post("/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: "BAD_PW" });
  const token = signJwt({ sub: "admin", role: "admin", name: "Admin" });
  res.json({ token });
});

app.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

// Admin API
app.get("/admin/daily", requireAuth, requireAdmin, async (req, res) => {
  const { day } = req.query as { day?: string };
  const data = await adminDaily(day);
  res.json(data);
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const tables = new Tables(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("NO_TOKEN"));
  const payload = verifyJwt(token);
  if (!payload) return next(new Error("BAD_TOKEN"));
  (socket as any).user = payload;
  next();
});

io.on("connection", (socket) => {
  const user = (socket as any).user as { sub:string; role:string; name?:string };

  socket.on("table:join", async ({ tableId }: { tableId?: string } = {}, cb) => {
    const tId = tableId || "public-1";
    const t = tables.get(tId);
    (socket as any).tableId = tId;                     // track current table on socket
    socket.join(`table:${tId}`);

    // ensure the table tracks this user (initial dummy balance if not present)
    t.joinUser({ id: user.sub, name: user.name || "Guest", balance: 100_000, profit: 0, loss: 0 });
    await ensureUserRow({ id: user.sub, name: user.name || "Guest", balance: 100_000, profit: 0, loss: 0 }).catch(()=>{});

    cb?.(t.snapshotFor(user.sub));
  });

  // Optional: allow clients to pull a fresh snapshot (used by some UIs)
  socket.on("state:pull", (cb) => {
    const tId = (socket as any).tableId || "public-1";
    const t = tables.get(tId);
    cb?.(t.snapshotFor(user.sub));
  });

  const betSchema = z.object({
    tableId: z.string().default("public-1"),
    fruit: z.enum(FRUITS),
    value: z.union([z.literal(1000), z.literal(2000), z.literal(3000), z.literal(4000), z.literal(5000)])
  });

  socket.on("bet:place", async (data, cb) => {
    const parsed = betSchema.safeParse(data);
    if (!parsed.success) return cb?.({ ok:false, error:"INVALID_PAYLOAD" });

    const { tableId, fruit, value } = parsed.data;
    const t = tables.get(tableId);

    const result = t.placeBet(user.sub, fruit as FruitKey, value);
    if (!(result as any).ok) return cb?.(result);

    // write bet
    const bet = t.ensureBets().slice(-1)[0];
    await writeBet({
      id: bet.id,
      userId: bet.userId,
      roundId: t.state.currentRoundId,
      tableId,
      fruit: bet.fruit,
      value: bet.value,
      createdAt: bet.createdAt
    }).catch(()=>{});

    // respond to the bettor with their updated snapshot
    cb?.({ ok:true, state: t.snapshotFor(user.sub) });

    // broadcast coin-fly echo so EVERYONE at this table animates a coin
    io.to(t.room()).emit("bet:echo", {
      betId: bet.id,
      userId: bet.userId,
      fruit: bet.fruit,
      value: bet.value
    });

    // keep totals in sync for progress bars
    io.to(t.room()).emit("totals:update", { fruitTotals: t.fruitTotals() });
  });
});

(async () => {
  await ensureSchema().catch((e)=> console.error("DB init error", e));
  tables.start();
  const PORT = process.env.PORT || 8080;
  httpServer.listen(PORT, () => console.log(`Server listening on :${PORT}`));
})();
