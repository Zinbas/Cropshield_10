import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { scans, profiles, crops, riskPredictions, regionalOutbreaks } from "../database/schema";
import { and, eq, gte, or, sql, desc } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────
export type WeatherForecast = {
  current: { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; wind_speed_10m?: number };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
  };
};

export type RiskFactor = {
  factor: string;
  contribution: number; // 0–100
  description: string;
};

export type ThreatPrediction = {
  threatType: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  explanation: string;
  outlook: string;
  preventiveActions: string[];
};

export type RiskCalculationResult = {
  overallScore: number;
  overallLevel: "low" | "medium" | "high" | "critical";
  threats: ThreatPrediction[];
  weatherSnapshot: WeatherForecast;
  calculatedAt: string;
};

// ─── Crop family classification ──────────────────────────────────────
const CROP_FAMILIES: Record<string, RegExp> = {
  cereal: /rice|paddy|wheat|maize|corn|millet|sorghum|barley|oat/i,
  vegetable: /tomato|potato|chilli|pepper|brinjal|eggplant|cotton|okra|onion|cabbage|cauliflower|spinach|pea|bean/i,
  fruit: /grape|mango|banana|citrus|apple|pomegranate|papaya|guava|watermelon|strawberry/i,
  oilseed: /soybean|sunflower|mustard|groundnut|peanut|sesame|coconut/i,
  pulse: /lentil|chickpea|pigeon\s?pea|moong|urad|gram/i,
};

function getCropFamily(cropType: string): string {
  const combined = cropType.toLowerCase();
  for (const [family, pattern] of Object.entries(CROP_FAMILIES)) {
    if (pattern.test(combined)) return family;
  }
  return "general";
}

// ─── Disease vulnerability profiles per crop family ──────────────────
const DISEASE_PROFILES: Record<string, { fungal: number; insect: number; bacterial: number; viral: number }> = {
  cereal: { fungal: 0.8, insect: 0.7, bacterial: 0.4, viral: 0.3 },
  vegetable: { fungal: 0.9, insect: 0.8, bacterial: 0.6, viral: 0.5 },
  fruit: { fungal: 0.7, insect: 0.6, bacterial: 0.5, viral: 0.4 },
  oilseed: { fungal: 0.6, insect: 0.5, bacterial: 0.4, viral: 0.3 },
  pulse: { fungal: 0.7, insect: 0.6, bacterial: 0.5, viral: 0.4 },
  general: { fungal: 0.7, insect: 0.6, bacterial: 0.5, viral: 0.4 },
};

// ─── Growth stage risk multipliers ───────────────────────────────────
const GROWTH_STAGE_MULTIPLIERS: Record<string, Record<string, number>> = {
  seedling: { fungal: 1.3, insect: 1.1, bacterial: 1.2, viral: 1.0 },
  vegetative: { fungal: 1.1, insect: 1.3, bacterial: 1.0, viral: 1.1 },
  flowering: { fungal: 1.2, insect: 1.4, bacterial: 1.1, viral: 1.2 },
  fruiting: { fungal: 1.0, insect: 1.2, bacterial: 0.9, viral: 1.0 },
  harvest: { fungal: 0.8, insect: 0.9, bacterial: 0.7, viral: 0.8 },
};

// ─── Rule-based risk scoring ─────────────────────────────────────────
function calculateWeatherRiskFactors(weather: WeatherForecast): { fungalScore: number; insectScore: number; bacterialScore: number; factors: RiskFactor[] } {
  const temp = weather.current.temperature_2m ?? 27;
  const humidity = weather.current.relative_humidity_2m ?? 60;
  const precip = weather.current.precipitation ?? 0;
  const wind = weather.current.wind_speed_10m ?? 5;

  const factors: RiskFactor[] = [];
  let fungalScore = 0;
  let insectScore = 0;
  let bacterialScore = 0;

  // Humidity factor
  if (humidity >= 85) {
    fungalScore += 30; bacterialScore += 15;
    factors.push({ factor: "Very high humidity", contribution: 30, description: `Humidity at ${humidity}% creates ideal conditions for fungal spore germination and leaf wetness.` });
  } else if (humidity >= 75) {
    fungalScore += 20; bacterialScore += 10;
    factors.push({ factor: "High humidity", contribution: 20, description: `Humidity at ${humidity}% supports fungal growth, especially with prolonged leaf wetness.` });
  } else if (humidity >= 65) {
    fungalScore += 10;
    factors.push({ factor: "Moderate humidity", contribution: 10, description: `Humidity at ${humidity}% — monitor for prolonged dew periods.` });
  }

  // Temperature factor
  if (temp >= 20 && temp <= 32) {
    fungalScore += 15; insectScore += 20;
    factors.push({ factor: "Warm temperature", contribution: 18, description: `Temperature of ${temp}°C is in the optimal range for both fungal pathogens and insect reproduction.` });
  } else if (temp >= 25 && temp <= 35) {
    insectScore += 25;
    factors.push({ factor: "Hot temperature", contribution: 20, description: `Temperature of ${temp}°C accelerates insect pest lifecycle and feeding activity.` });
  }

  // Precipitation factor
  if (precip >= 10) {
    fungalScore += 25; bacterialScore += 20;
    factors.push({ factor: "Heavy rainfall", contribution: 25, description: `${precip}mm precipitation promotes splash-dispersal of fungal and bacterial pathogens.` });
  } else if (precip >= 3) {
    fungalScore += 15; bacterialScore += 10;
    factors.push({ factor: "Moderate rainfall", contribution: 15, description: `${precip}mm precipitation keeps foliage wet, supporting pathogen colonization.` });
  }

  // Wind factor
  if (wind < 10) {
    fungalScore += 5; insectScore += 10;
    factors.push({ factor: "Calm wind", contribution: 8, description: `Low wind speed (${wind} km/h) allows pest insects to settle and reduces leaf drying.` });
  } else if (wind >= 30) {
    factors.push({ factor: "Strong wind", contribution: 10, description: `Wind at ${wind} km/h may cause physical damage and spread airborne spores.` });
    fungalScore += 10;
  }

  // Forecast factors (if 7-day data available)
  if (weather.daily?.precipitation_sum) {
    const totalForecastRain = weather.daily.precipitation_sum.reduce((sum, v) => sum + (v ?? 0), 0);
    if (totalForecastRain >= 50) {
      fungalScore += 15;
      factors.push({ factor: "Heavy rain forecast", contribution: 15, description: `${totalForecastRain.toFixed(0)}mm total rain forecast over next 7 days — sustained wet conditions ahead.` });
    }
  }

  if (weather.daily?.precipitation_probability_max) {
    const avgProbability = weather.daily.precipitation_probability_max.reduce((sum, v) => sum + (v ?? 0), 0) / weather.daily.precipitation_probability_max.length;
    if (avgProbability >= 60) {
      fungalScore += 10;
      factors.push({ factor: "Persistent rain likely", contribution: 10, description: `Average precipitation probability ${avgProbability.toFixed(0)}% over the forecast period.` });
    }
  }

  return { fungalScore: Math.min(fungalScore, 100), insectScore: Math.min(insectScore, 100), bacterialScore: Math.min(bacterialScore, 100), factors };
}

function scoreToLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function calculateRuleBasedRisk(
  cropType: string,
  growthStage: string | null,
  weather: WeatherForecast,
  recentHighRiskScans: number,
  regionalReportCount: number,
): ThreatPrediction[] {
  const family = getCropFamily(cropType);
  const vulnerability = DISEASE_PROFILES[family] ?? DISEASE_PROFILES.general;
  const stageMultiplier = GROWTH_STAGE_MULTIPLIERS[growthStage ?? "vegetative"] ?? GROWTH_STAGE_MULTIPLIERS.vegetative;
  const { fungalScore, insectScore, bacterialScore, factors } = calculateWeatherRiskFactors(weather);

  // Regional boost: if nearby farmers report issues, risk goes up
  const regionalBoost = Math.min(20, regionalReportCount * 5);
  const historyBoost = Math.min(15, recentHighRiskScans * 5);

  const threats: ThreatPrediction[] = [];

  // Fungal threat
  const fungalRaw = (fungalScore * vulnerability.fungal * stageMultiplier.fungal) + regionalBoost + historyBoost;
  const fungalFinal = Math.min(100, Math.round(fungalRaw));
  if (fungalFinal >= 20) {
    threats.push({
      threatType: family === "cereal" ? "Leaf & Sheath Fungal Infection" : family === "fruit" ? "Fruit & Leaf Fungal Disease" : "Fungal Leaf Spot / Blight",
      riskScore: fungalFinal,
      riskLevel: scoreToLevel(fungalFinal),
      factors: factors.filter(f => f.factor.toLowerCase().includes("humid") || f.factor.toLowerCase().includes("rain") || f.factor.toLowerCase().includes("temperature")),
      explanation: `Weather conditions favor fungal pathogen activity on ${cropType}. ${growthStage ? `The ${growthStage} growth stage has ${stageMultiplier.fungal > 1.1 ? "elevated" : "moderate"} susceptibility.` : ""}${regionalBoost > 0 ? ` ${regionalReportCount} nearby farmer(s) have reported similar issues recently.` : ""}`,
      outlook: fungalFinal >= 55 ? "Elevated risk expected over the next 7–10 days if wet conditions persist." : "Monitor over the next 7–15 days, especially after rain or irrigation.",
      preventiveActions: [
        "Improve air circulation by thinning dense canopy areas.",
        "Avoid overhead irrigation; use drip systems where possible.",
        "Inspect lower leaves, shaded areas, and stems every 2–3 days.",
        "Follow local product labels; consult a verified expert before applying fungicides.",
      ],
    });
  }

  // Insect pest threat
  const insectRaw = (insectScore * vulnerability.insect * stageMultiplier.insect) + regionalBoost + historyBoost;
  const insectFinal = Math.min(100, Math.round(insectRaw));
  if (insectFinal >= 20) {
    threats.push({
      threatType: family === "fruit" ? "Fruit Fly & Sap-feeding Pest Pressure" : "Aphid / Whitefly / Sap-feeding Pest Pressure",
      riskScore: insectFinal,
      riskLevel: scoreToLevel(insectFinal),
      factors: factors.filter(f => f.factor.toLowerCase().includes("temp") || f.factor.toLowerCase().includes("wind")),
      explanation: `Temperature and wind conditions may support increased pest activity on ${cropType}. ${growthStage === "flowering" ? "The flowering stage is particularly vulnerable to pest damage." : ""}`,
      outlook: insectFinal >= 55 ? "Elevated pest pressure expected during warm, calm periods over the next 7–15 days." : "Low-to-moderate watch for the next 7–15 days.",
      preventiveActions: [
        "Check leaf undersides and new growth daily for insects, eggs, or honeydew.",
        "Remove heavily affected leaves and keep field edges weed-free.",
        "Use yellow sticky traps to monitor flying pest populations.",
        "Apply only locally approved biological or chemical controls; protect beneficial insects.",
      ],
    });
  }

  // Bacterial threat
  const bacterialRaw = (bacterialScore * vulnerability.bacterial * stageMultiplier.bacterial) + regionalBoost;
  const bacterialFinal = Math.min(100, Math.round(bacterialRaw));
  if (bacterialFinal >= 30) {
    threats.push({
      threatType: "Bacterial Wilt / Soft Rot Risk",
      riskScore: bacterialFinal,
      riskLevel: scoreToLevel(bacterialFinal),
      factors: factors.filter(f => f.factor.toLowerCase().includes("rain") || f.factor.toLowerCase().includes("humid")),
      explanation: `Wet conditions and high humidity increase the risk of bacterial pathogens entering through wounds or natural openings on ${cropType}.`,
      outlook: bacterialFinal >= 55 ? "Potentially elevated if waterlogging persists." : "Monitor drainage and watch for wilting symptoms.",
      preventiveActions: [
        "Ensure proper drainage; avoid waterlogging around root zones.",
        "Avoid handling plants when foliage is wet.",
        "Remove and destroy visibly affected plants to prevent bacterial spread.",
        "Use copper-based treatments only with verified expert guidance.",
      ],
    });
  }

  return threats.sort((a, b) => b.riskScore - a.riskScore);
}

// ─── AI-enhanced prediction ──────────────────────────────────────────
const aiPredictionSchema = {
  type: "object",
  properties: {
    threats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          threatType: { type: "string" },
          riskScore: { type: "number" },
          riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
          explanation: { type: "string" },
          outlook: { type: "string" },
          preventiveActions: { type: "array", items: { type: "string" } },
        },
        required: ["threatType", "riskScore", "riskLevel", "explanation", "outlook", "preventiveActions"],
      },
    },
    overallAssessment: { type: "string" },
  },
  required: ["threats", "overallAssessment"],
} as const;

export async function generateAIPrediction(context: {
  cropType: string;
  growthStage: string | null;
  location: { state?: string | null; district?: string | null; region?: string | null };
  weather: WeatherForecast;
  recentScans: { disease?: string | null; riskLevel?: string | null; createdAt: Date | string }[];
  regionalOutbreaks: { threatType: string; reportCount: number; outbreakLevel: string }[];
  ruleBasedThreats: ThreatPrediction[];
}): Promise<ThreatPrediction[]> {
  const locationStr = [context.location.district, context.location.state, context.location.region].filter(Boolean).join(", ") || "Unknown location";

  const scanHistory = context.recentScans.slice(0, 5).map(s =>
    `- ${s.disease || "No disease"} (${s.riskLevel || "unknown"} risk) on ${new Date(s.createdAt).toLocaleDateString()}`
  ).join("\n") || "No recent scans.";

  const outbreakInfo = context.regionalOutbreaks.length > 0
    ? context.regionalOutbreaks.map(o => `- ${o.threatType}: ${o.reportCount} reports (${o.outbreakLevel} level)`).join("\n")
    : "No active outbreaks in this region.";

  const ruleBasedSummary = context.ruleBasedThreats.map(t =>
    `- ${t.threatType}: ${t.riskScore}% (${t.riskLevel})`
  ).join("\n");

  const messages = [
    {
      role: "system" as const,
      content: `You are CropShield's early warning risk prediction AI. Your task is to predict potential crop disease and pest threats BEFORE visible symptoms appear, based on environmental conditions, crop context, historical data, and regional patterns. Be conservative but actionable. Do not diagnose — predict risks and recommend preventive measures.`,
    },
    {
      role: "user" as const,
      content: `Predict disease and pest risks for the following farm context:

**Crop:** ${context.cropType}
**Growth Stage:** ${context.growthStage || "Not specified"}
**Location:** ${locationStr}

**Current Weather:**
- Temperature: ${context.weather.current.temperature_2m ?? "unknown"}°C
- Humidity: ${context.weather.current.relative_humidity_2m ?? "unknown"}%
- Precipitation: ${context.weather.current.precipitation ?? 0}mm
- Wind: ${context.weather.current.wind_speed_10m ?? "unknown"} km/h

**7-Day Forecast:**
${context.weather.daily ? `- Max temps: ${context.weather.daily.temperature_2m_max?.join(", ")}°C\n- Precipitation sums: ${context.weather.daily.precipitation_sum?.join(", ")}mm\n- Rain probability: ${context.weather.daily.precipitation_probability_max?.join(", ")}%` : "Not available"}

**Recent Scan History:**
${scanHistory}

**Regional Outbreaks:**
${outbreakInfo}

**Rule-based Risk Assessment:**
${ruleBasedSummary}

Based on all this data, provide your AI-enhanced risk predictions. Return up to 3 most relevant threats. For each threat, provide a specific threat name, risk score (0-100), risk level, detailed explanation of contributing factors, 7-15 day outlook, and 3-5 specific preventive actions the farmer should take.`,
    },
  ];

  try {
    let response;
    try {
      response = await invokeLLM({
        model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
        messages,
        response_format: { type: "json_schema", json_schema: { name: "risk_prediction", strict: true, schema: aiPredictionSchema } },
      });
    } catch {
      response = await invokeLLM({
        model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
        messages,
        response_format: { type: "json_object" },
      });
    }

    const rawContent = response.choices?.[0]?.message?.content;
    const content = Array.isArray(rawContent)
      ? rawContent.filter((part) => part.type === "text").map((part) => (part as { type: "text"; text: string }).text).join("")
      : rawContent;

    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    const aiThreats: ThreatPrediction[] = (parsed.threats ?? []).slice(0, 3).map((t: any) => ({
      threatType: t.threatType ?? "Unknown Threat",
      riskScore: Math.min(100, Math.max(0, Number(t.riskScore) || 0)),
      riskLevel: ["low", "medium", "high", "critical"].includes(t.riskLevel) ? t.riskLevel : scoreToLevel(Number(t.riskScore) || 0),
      factors: [],
      explanation: t.explanation ?? "",
      outlook: t.outlook ?? "",
      preventiveActions: Array.isArray(t.preventiveActions) ? t.preventiveActions : [],
    }));

    return aiThreats;
  } catch (error) {
    console.error("[RiskEngine] AI prediction failed:", error);
    return [];
  }
}

// ─── Regional outbreak detection ─────────────────────────────────────
export async function detectRegionalOutbreaks(state: string, district: string): Promise<{
  outbreaks: { threatType: string; reportCount: number; avgScore: number; level: "watch" | "warning" | "outbreak" }[];
}> {
  const db = await getDb();
  if (!db) return { outbreaks: [] };

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Get recent high-risk scans from same district
  const recentScans = await db
    .select({
      disease: scans.disease,
      riskLevel: scans.riskLevel,
      count: sql<number>`count(*)`,
    })
    .from(scans)
    .innerJoin(profiles, eq(scans.ownerId, profiles.userId))
    .where(
      and(
        eq(profiles.state, state),
        eq(profiles.district, district),
        eq(scans.status, "complete"),
        or(eq(scans.riskLevel, "high"), eq(scans.riskLevel, "critical")),
        gte(scans.createdAt, fourteenDaysAgo),
      )
    )
    .groupBy(scans.disease, scans.riskLevel);

  // Aggregate by disease type
  const diseaseGroups = new Map<string, { count: number; scores: number[] }>();
  for (const row of recentScans) {
    const disease = row.disease || "Unidentified threat";
    const group = diseaseGroups.get(disease) ?? { count: 0, scores: [] };
    group.count += Number(row.count);
    group.scores.push(row.riskLevel === "critical" ? 85 : 65);
    diseaseGroups.set(disease, group);
  }

  const outbreaks = Array.from(diseaseGroups.entries())
    .filter(([, data]) => data.count >= 3)
    .map(([threatType, data]) => {
      const avgScore = Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length);
      const level: "watch" | "warning" | "outbreak" =
        data.count >= 8 ? "outbreak" : data.count >= 5 ? "warning" : "watch";
      return { threatType, reportCount: data.count, avgScore, level };
    })
    .sort((a, b) => b.reportCount - a.reportCount);

  return { outbreaks };
}

// ─── Full risk calculation (rule-based + AI) ─────────────────────────
export async function calculateFullRisk(
  ownerId: number,
  cropId: number | null,
  cropType: string,
  growthStage: string | null,
  location: { state?: string | null; district?: string | null; region?: string | null },
  weather: WeatherForecast,
): Promise<RiskCalculationResult> {
  const db = await getDb();

  // Get recent high-risk scans for this farmer
  let recentHighRiskScans = 0;
  let recentScanHistory: { disease?: string | null; riskLevel?: string | null; createdAt: Date | string }[] = [];
  if (db) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const farmerScans = await db.select().from(scans)
      .where(and(eq(scans.ownerId, ownerId), eq(scans.status, "complete"), gte(scans.createdAt, thirtyDaysAgo)))
      .orderBy(desc(scans.createdAt)).limit(10);
    recentHighRiskScans = farmerScans.filter(s => s.riskLevel === "high" || s.riskLevel === "critical").length;
    recentScanHistory = farmerScans;
  }

  // Get regional report count
  let regionalReportCount = 0;
  let activeOutbreaks: { threatType: string; reportCount: number; outbreakLevel: string }[] = [];
  if (location.state && location.district && db) {
    const outbreakResult = await detectRegionalOutbreaks(location.state, location.district);
    regionalReportCount = outbreakResult.outbreaks.reduce((sum, o) => sum + o.reportCount, 0);

    const dbOutbreaks = await db.select().from(regionalOutbreaks)
      .where(and(
        eq(regionalOutbreaks.state, location.state),
        eq(regionalOutbreaks.district, location.district),
        sql`${regionalOutbreaks.resolvedAt} IS NULL`,
      ));
    activeOutbreaks = dbOutbreaks.map(o => ({
      threatType: o.threatType,
      reportCount: o.reportCount,
      outbreakLevel: o.outbreakLevel,
    }));
  }

  // Step 1: Rule-based scoring
  const ruleBasedThreats = calculateRuleBasedRisk(cropType, growthStage, weather, recentHighRiskScans, regionalReportCount);

  // Step 2: AI-enhanced prediction (only if rule-based score is notable)
  const maxRuleScore = Math.max(0, ...ruleBasedThreats.map(t => t.riskScore));
  let finalThreats = ruleBasedThreats;

  if (maxRuleScore >= 35) {
    const aiThreats = await generateAIPrediction({
      cropType,
      growthStage,
      location,
      weather,
      recentScans: recentScanHistory,
      regionalOutbreaks: activeOutbreaks,
      ruleBasedThreats,
    });

    if (aiThreats.length > 0) {
      // Merge: use AI threats but keep rule-based factors
      finalThreats = aiThreats.map(aiThreat => {
        const matchingRule = ruleBasedThreats.find(rt =>
          rt.threatType.toLowerCase().includes(aiThreat.threatType.toLowerCase().split(" ")[0]) ||
          aiThreat.threatType.toLowerCase().includes(rt.threatType.toLowerCase().split(" ")[0])
        );
        return {
          ...aiThreat,
          factors: matchingRule?.factors ?? [],
          riskScore: Math.round((aiThreat.riskScore + (matchingRule?.riskScore ?? aiThreat.riskScore)) / 2),
        };
      });
      // Re-sort and recalculate levels
      finalThreats = finalThreats.map(t => ({ ...t, riskLevel: scoreToLevel(t.riskScore) }));
      finalThreats.sort((a, b) => b.riskScore - a.riskScore);
    }
  }

  const overallScore = finalThreats.length > 0
    ? Math.round(finalThreats.reduce((sum, t) => sum + t.riskScore, 0) / finalThreats.length)
    : 0;

  return {
    overallScore,
    overallLevel: scoreToLevel(overallScore),
    threats: finalThreats.slice(0, 4),
    weatherSnapshot: weather,
    calculatedAt: new Date().toISOString(),
  };
}

// ─── Outbreak escalation check ───────────────────────────────────────
export function shouldEscalateToOfficer(reportCount: number, avgScore: number): boolean {
  return reportCount >= 5 && avgScore >= 60;
}
