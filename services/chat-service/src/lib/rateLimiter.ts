/** In-memory sliding-window limiter. Per instance; use a shared store (e.g. Redis) when scaling out. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();

  const sweep = (t: number) => {
    for (const [key, times] of hits) {
      if (times.every((x) => t - x >= windowMs)) hits.delete(key);
    }
  };

  return {
    /** Returns true if the action is allowed and records it. */
    take(key: string): boolean {
      const t = now();
      if (hits.size > 5_000) sweep(t);
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
  };
}
