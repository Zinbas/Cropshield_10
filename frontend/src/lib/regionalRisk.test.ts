import { describe, expect, it } from "vitest";
import { buildRegionalRiskAlerts } from "./regionalRisk";

describe("regional disease and pest risk alerts", () => {
  it("labels humid crop threats as predicted high risk with a forecast and actions", () => {
    const alerts = buildRegionalRiskAlerts({ cropType: "tomato", cropName: "Tomato plot", state: "Maharashtra", district: "Nashik", temperature: 28, humidity: 90, precipitation: 8, windSpeed: 8 });
    const fungal = alerts.find((alert) => alert.id === "fungal-infection");
    expect(fungal).toMatchObject({ label: "Predicted Risk", crop: "Tomato plot", region: "Nashik, Maharashtra", riskLevel: "High" });
    expect(fungal?.reason).toContain("humidity");
    expect(fungal?.outlook).toContain("7–10 days");
    expect(fungal?.actions.length).toBeGreaterThanOrEqual(2);
  });

  it("returns a moderate weather-linked potential threat for extreme conditions", () => {
    const alerts = buildRegionalRiskAlerts({ cropType: "wheat", state: "Punjab", temperature: 22, humidity: 60, precipitation: 15, windSpeed: 8 });
    expect(alerts.some((alert) => alert.id === "weather-stress" && alert.riskLevel === "Moderate")).toBe(true);
    expect(alerts.every((alert) => alert.label === "Predicted Risk")).toBe(true);
  });

  it("still returns low or moderate watch guidance with sparse context", () => {
    const alerts = buildRegionalRiskAlerts({ cropType: "millet" });
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((alert) => ["Low", "Moderate", "High"].includes(alert.riskLevel))).toBe(true);
  });
});
