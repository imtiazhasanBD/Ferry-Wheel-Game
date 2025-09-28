import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JWTPayload = { sub: string; role: "user" | "admin"; name?: string };

export function signJwt(payload: JWTPayload) {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyJwt(token: string): JWTPayload | null {
  try { return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload; } catch { return null; }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization; if (!h) return res.status(401).json({ error: "NO_AUTH" });
  const token = h.replace(/^Bearer\s+/i, "");
  const payload = verifyJwt(token); if (!payload) return res.status(401).json({ error: "BAD_TOKEN" });
  (req as any).user = payload; next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const u = (req as any).user; if (!u || u.role !== "admin") return res.status(403).json({ error: "FORBIDDEN" });
  next();
}