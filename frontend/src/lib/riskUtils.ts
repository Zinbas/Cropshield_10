/** Utility functions for the risk prediction UI */

export function getRiskColor(score: number): string {
  if (score >= 75) return "#dc2626"; // red-600 (critical)
  if (score >= 55) return "#ea580c"; // orange-600 (high)
  if (score >= 35) return "#d97706"; // amber-600 (medium)
  return "#16a34a"; // green-600 (low)
}

export function getRiskGradient(score: number): string {
  if (score >= 75) return "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)";
  if (score >= 55) return "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)";
  if (score >= 35) return "linear-gradient(135deg, #d97706 0%, #b45309 100%)";
  return "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";
}

export function getRiskLabel(score: number): string {
  if (score >= 75) return "Critical Risk";
  if (score >= 55) return "High Risk";
  if (score >= 35) return "Moderate Risk";
  if (score >= 15) return "Low Risk";
  return "Minimal Risk";
}

export function getRiskLevelFromString(level: string): "low" | "medium" | "high" | "critical" {
  const l = level.toLowerCase();
  if (l === "critical") return "critical";
  if (l === "high") return "high";
  if (l === "medium" || l === "moderate") return "medium";
  return "low";
}

export function getRiskEmoji(level: string): string {
  const l = level.toLowerCase();
  if (l === "critical") return "🔴";
  if (l === "high") return "🟠";
  if (l === "medium" || l === "moderate") return "🟡";
  return "🟢";
}

export type ThreatDetails = {
  explanation: string;
  outlook: string;
  preventiveActions: string[];
  factors: { factor: string; contribution: number; description: string }[];
};

export function parseThreatDetails(json: string | null | undefined): ThreatDetails {
  if (!json) return { explanation: "", outlook: "", preventiveActions: [], factors: [] };
  try {
    const parsed = JSON.parse(json);
    return {
      explanation: parsed.explanation ?? "",
      outlook: parsed.outlook ?? "",
      preventiveActions: Array.isArray(parsed.preventiveActions) ? parsed.preventiveActions : [],
      factors: Array.isArray(parsed.factors) ? parsed.factors : [],
    };
  } catch {
    return { explanation: "", outlook: "", preventiveActions: [], factors: [] };
  }
}

export const GROWTH_STAGES = [
  { value: "seedling", label: "🌱 Seedling", description: "Just sprouted, early growth" },
  { value: "vegetative", label: "🌿 Vegetative", description: "Active leaf and stem growth" },
  { value: "flowering", label: "🌸 Flowering", description: "Producing flowers and blossoms" },
  { value: "fruiting", label: "🍅 Fruiting", description: "Fruit/grain development" },
  { value: "harvest", label: "🌾 Harvest", description: "Ready for or undergoing harvest" },
] as const;

export type GrowthStage = typeof GROWTH_STAGES[number]["value"];

export function getGrowthStageLabel(stage: string | null | undefined): string {
  const found = GROWTH_STAGES.find(s => s.value === stage);
  return found?.label ?? "Not set";
}

/** Calculate the SVG arc path for a circular gauge */
export function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

export function formatTimeAgo(date: Date | string | number): string {
  const now = Date.now();
  const past = new Date(date).getTime();
  const diff = now - past;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
