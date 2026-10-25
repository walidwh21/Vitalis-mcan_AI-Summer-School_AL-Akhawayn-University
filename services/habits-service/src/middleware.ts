import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.ts";
import { HttpError } from "./http.ts";

/** Verifies the bearer token and exposes the user id as `res.locals.userId`. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Missing bearer token");

  let subject: string | undefined;
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET, { algorithms: ["HS256"] });
    subject = typeof payload === "string" ? undefined : payload.sub;
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  if (!subject) throw new HttpError(401, "Invalid or expired token");

  res.locals.userId = subject;
  next();
}

/** Guards service-to-service endpoints that must never be reachable from the public API. */
export function requireInternalKey(req: Request, _res: Response, next: NextFunction) {
  const provided = Buffer.from(String(req.headers["x-internal-key"] ?? ""));
  const expected = Buffer.from(config.INTERNAL_API_KEY);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new HttpError(403, "Forbidden");
  }
  next();
}
