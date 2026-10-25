import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger.ts";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Express 4 does not forward rejected promises to the error handler; this does. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    // A streaming response is already underway; all we can do is close it.
    logger.error({ err }, "error after headers were sent");
    res.end();
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid request",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: "request_error", message: err.message });
    return;
  }
  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: "internal_error", message: "Something went wrong" });
}
