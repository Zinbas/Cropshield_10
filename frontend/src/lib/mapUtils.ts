export function toMapCenter(latitude?: number | string | null, longitude?: number | string | null): { lat: number; lng: number } {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }
  return { lat: 20.5937, lng: 78.9629 };
}
