import { describe, expect, it } from "vitest";
import { buildRegionalHeatmapPoints, heatmapRiskLabel } from "./regionalHeatmap";

describe("regional heatmap aggregation", () => {
  it("weights elevated-risk scans more strongly than routine scans", () => {
    const [point] = buildRegionalHeatmapPoints([{ location: "Nashik", latitude: "20", longitude: "73.8", farmers: 4, scans: 6, highRisk: 2 }]);
    expect(point).toMatchObject({ weight: 10, farmers: 4, scans: 6, highRisk: 2 });
    expect(heatmapRiskLabel(point.highRisk, point.scans)).toBe("Some elevated risk");
  });

  it("drops regions without usable coordinates or approved scans", () => {
    expect(buildRegionalHeatmapPoints([
      { location: "Unknown", latitude: null, longitude: 73, scans: 4 },
      { location: "No scans", latitude: 20, longitude: 73, scans: 0 },
      { location: "Valid", latitude: 20, longitude: 73, scans: 1, highRisk: 1 },
    ])).toHaveLength(1);
  });
});
