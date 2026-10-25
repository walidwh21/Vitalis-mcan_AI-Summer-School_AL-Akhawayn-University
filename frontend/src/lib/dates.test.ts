import { describe, expect, it } from "vitest";
import { addDays, fromISODate, startOfWeek, toISODate } from "./dates";

describe("dates", () => {
  it("round-trips ISO dates without timezone drift", () => {
    expect(toISODate(fromISODate("2026-03-29"))).toBe("2026-03-29"); // DST change in many zones
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the Monday of the week, treating Sunday as the last day", () => {
    expect(startOfWeek("2026-10-24")).toBe("2026-10-19");
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19");
    expect(startOfWeek("2026-10-19")).toBe("2026-10-19");
  });
});
