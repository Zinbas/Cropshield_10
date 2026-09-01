export type WeeklyRiskScan = { createdAt: Date | string | number; riskLevel?: string | null };
export type WeeklyRiskPoint = { label: string; high: number; moderate: number; total: number; intensity: number };

export function buildWeeklyRiskHistory(scans: WeeklyRiskScan[], now = new Date()): WeeklyRiskPoint[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(start);
  currentWeekStart.setDate(start.getDate() - start.getDay());
  return [3, 2, 1, 0].map((weeksAgo) => {
    const from = new Date(currentWeekStart);
    from.setDate(currentWeekStart.getDate() - weeksAgo * 7);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    const inWeek = scans.filter((scan) => {
      const date = new Date(scan.createdAt);
      return date >= from && date < to;
    });
    const high = inWeek.filter((scan) => scan.riskLevel === "high" || scan.riskLevel === "critical").length;
    const moderate = inWeek.filter((scan) => scan.riskLevel === "medium").length;
    return {
      label: weeksAgo === 0 ? "This week" : `${weeksAgo}w ago`,
      high,
      moderate,
      total: inWeek.length,
      intensity: Math.min(100, high * 35 + moderate * 18 + Math.max(0, inWeek.length - high - moderate) * 5),
    };
  });
}
