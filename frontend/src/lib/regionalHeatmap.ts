export type RegionalRiskLocation = {
  location: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  farmers?: number;
  scans?: number;
  highRisk?: number;
};

export type RegionalHeatmapPoint = {
  location: string;
  position: { lat: number; lng: number };
  weight: number;
  farmers: number;
  scans: number;
  highRisk: number;
};

export function buildRegionalHeatmapPoints(locations: RegionalRiskLocation[]): RegionalHeatmapPoint[] {
  return locations.flatMap((location) => {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    const scans = Math.max(0, Number(location.scans ?? 0));
    const highRisk = Math.min(scans, Math.max(0, Number(location.highRisk ?? 0)));
    if (location.latitude === null || location.latitude === undefined || location.longitude === null || location.longitude === undefined || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || scans <= 0) return [];
    return [{
      location: location.location,
      position: { lat, lng },
      // High/critical scans carry triple weight; lower-risk approved scans still contribute context.
      weight: Math.max(1, highRisk * 3 + (scans - highRisk)),
      farmers: Math.max(0, Number(location.farmers ?? 0)),
      scans,
      highRisk,
    }];
  });
}

export function heatmapRiskLabel(highRisk: number, scans: number) {
  if (!scans) return "No approved scans";
  const ratio = highRisk / scans;
  return ratio >= 0.5 ? "Higher risk concentration" : ratio > 0 ? "Some elevated risk" : "Routine approved activity";
}
