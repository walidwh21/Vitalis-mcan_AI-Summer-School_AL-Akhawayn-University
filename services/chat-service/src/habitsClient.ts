import { config } from "./config.ts";
import { logger } from "./logger.ts";
import type { HabitSummary } from "./lib/prompt.ts";

/**
 * Asks the habits-service for a compact summary used as optional chat context.
 * Failures are non-fatal: the assistant simply answers without habit context.
 */
export async function fetchHabitSummary(userId: string, today?: string): Promise<HabitSummary | null> {
  const query = today ? `?today=${encodeURIComponent(today)}` : "";
  try {
    const res = await fetch(`${config.HABITS_SERVICE_URL}/internal/users/${userId}/summary${query}`, {
      headers: { "x-internal-key": config.INTERNAL_API_KEY },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    return (await res.json()) as HabitSummary;
  } catch (err) {
    logger.warn({ err }, "habit summary unavailable, continuing without it");
    return null;
  }
}
