export type RecommendationProgress = { step: string; completed: boolean };

export function buildRecommendationProgress(recommendations: string[]): RecommendationProgress[] {
  return recommendations.filter(Boolean).map((step) => ({ step, completed: false }));
}
