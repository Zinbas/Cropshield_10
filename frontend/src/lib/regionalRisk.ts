export type PredictedRiskLevel = "Low" | "Moderate" | "High";

export type RegionalRiskInput = {
  cropType?: string | null;
  cropName?: string | null;
  region?: string | null;
  state?: string | null;
  district?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  precipitation?: number | null;
  windSpeed?: number | null;
};

export type RegionalRiskAlert = {
  id: string;
  label: "Predicted Risk";
  crop: string;
  threat: string;
  region: string;
  riskLevel: PredictedRiskLevel;
  reason: string;
  outlook: string;
  actions: string[];
};

const cropFamily = (value: string) => {
  const crop = value.toLowerCase();
  if (/rice|paddy|wheat|maize|corn|millet|sorghum/.test(crop)) return "cereal";
  if (/tomato|potato|chilli|pepper|brinjal|eggplant|cotton|okra/.test(crop)) return "vegetable";
  if (/grape|mango|banana|citrus|apple|pomegranate/.test(crop)) return "fruit";
  return "general";
};

const riskFromScore = (score: number): PredictedRiskLevel => score >= 5 ? "High" : score >= 3 ? "Moderate" : "Low";

export function buildRegionalRiskAlerts(input: RegionalRiskInput): RegionalRiskAlert[] {
  const family = cropFamily(`${input.cropType ?? ""} ${input.cropName ?? ""}`);
  const crop = input.cropName || input.cropType || "Your crop";
  const region = [input.district, input.state, input.region].filter(Boolean).join(", ") || "your saved region";
  const temperature = input.temperature ?? 27;
  const humidity = input.humidity ?? 70;
  const precipitation = input.precipitation ?? 0;
  const wind = input.windSpeed ?? 0;
  const fungalScore = (humidity >= 80 ? 3 : humidity >= 70 ? 1 : 0) + (precipitation >= 5 ? 2 : precipitation > 0 ? 1 : 0) + (temperature >= 20 && temperature <= 32 ? 1 : 0);
  const insectScore = (temperature >= 24 && temperature <= 34 ? 2 : 0) + (humidity >= 55 && humidity <= 80 ? 1 : 0) + (wind < 20 ? 1 : 0);
  const alerts: RegionalRiskAlert[] = [];

  if (family === "cereal" || family === "vegetable" || family === "fruit" || fungalScore >= 3) {
    const threat = family === "cereal" ? "Leaf and sheath fungal infection" : family === "fruit" ? "Fruit and leaf fungal infection" : "Fungal leaf spot and blight";
    alerts.push({
      id: "fungal-infection",
      label: "Predicted Risk",
      crop,
      threat,
      region,
      riskLevel: riskFromScore(fungalScore),
      reason: humidity >= 80 && temperature >= 20 && temperature <= 32 ? "High humidity and suitable temperature may increase the risk of fungal infection." : precipitation > 0 ? "Recent rainfall can leave foliage wet and create conditions favorable to fungal spread." : "Current temperature and humidity are being monitored for conditions that can support fungal infection.",
      outlook: fungalScore >= 5 ? "Potentially elevated over the next 7–10 days if wet conditions persist." : "Monitor over the next 7–15 days, especially after rain or irrigation.",
      actions: ["Improve airflow and avoid overhead irrigation.", "Inspect lower leaves and shaded areas every 2–3 days.", "Follow local product labels and consult a verified expert before treatment."],
    });
  }

  if (family !== "fruit" || insectScore >= 3) {
    alerts.push({
      id: "sap-feeding-pests",
      label: "Predicted Risk",
      crop,
      threat: family === "fruit" ? "Fruit fly and sap-feeding pest pressure" : "Aphid, whitefly, or other sap-feeding pest pressure",
      region,
      riskLevel: riskFromScore(insectScore),
      reason: temperature >= 24 && temperature <= 34 ? "Warm temperatures may support faster pest activity and reproduction." : "Temperature and wind conditions are being watched for potential pest activity.",
      outlook: insectScore >= 4 ? "Potentially elevated over the next 7–15 days during warm, calm periods." : "Low-to-moderate watch for the next 7–15 days.",
      actions: ["Check leaf undersides and new growth for insects or honeydew.", "Remove heavily affected leaves and keep field edges weed-free.", "Use only locally approved controls and protect beneficial insects."],
    });
  }

  if (wind >= 30 || precipitation >= 12) {
    alerts.push({
      id: "weather-stress",
      label: "Predicted Risk",
      crop,
      threat: wind >= 30 ? "Wind and physical crop stress" : "Rain-related root and field stress",
      region,
      riskLevel: "Moderate",
      reason: wind >= 30 ? "Strong wind may damage tender growth and reduce spray coverage." : "Heavy rain may increase waterlogging and nutrient-loss risk in poorly drained fields.",
      outlook: "Weather-linked potential threat for the next 7 days; reassess after conditions change.",
      actions: ["Check drainage, supports, and damaged stems after each weather event.", "Avoid spraying during strong wind or immediately before heavy rain.", "Record new symptoms separately; this is not a confirmed disease diagnosis."],
    });
  }

  return alerts.slice(0, 3);
}
