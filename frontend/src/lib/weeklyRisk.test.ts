import { describe, expect, it } from "vitest";
import { buildWeeklyRiskHistory } from "./weeklyRisk";

describe("weekly risk history", () => {
  it("groups the last four weeks and weights severe scans more strongly", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    const history = buildWeeklyRiskHistory([
      { createdAt: "2026-09-01T10:00:00Z", riskLevel: "critical" },
      { createdAt: "2026-08-31T10:00:00Z", riskLevel: "medium" },
      { createdAt: "2026-08-20T10:00:00Z", riskLevel: "low" },
    ], now);
    expect(history).toHaveLength(4);
    expect(history[3]).toMatchObject({ label: "This week", high: 1, moderate: 1, total: 2 });
    expect(history[3]?.intensity).toBeGreaterThan(history[2]?.intensity ?? 0);
  });

  it("ignores malformed or out-of-window scan records", () => {
    const history = buildWeeklyRiskHistory([
      { createdAt: "not-a-date", riskLevel: "high" },
      { createdAt: "2026-01-01T10:00:00Z", riskLevel: "high" },
    ], new Date("2026-09-02T12:00:00Z"));
    expect(history.every((point) => point.total === 0)).toBe(true);
  });
});
