import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.ts";

/**
 * Rejects requests without a valid token before they reach a downstream service.
 * Services verify the token again themselves; this just keeps junk traffic off the network.
 */
export function requireToken(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") return next();
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "request_error", message: "Missing bearer token" });
    return;
  }
  try {
    jwt.verify(header.slice(7), config.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    res.status(401).json({ error: "request_error", message: "Invalid or expired token" });
    return;
  }
  next();
}
