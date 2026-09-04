export const GEOCODE_CACHE = new Map<string, { lat: number; lng: number }>();

export async function geocodeLocation(state: string, district: string): Promise<{ lat: number; lng: number } | null> {
  const query = `${district}, ${state}, India`;
  if (GEOCODE_CACHE.has(query)) {
    return GEOCODE_CACHE.get(query) || null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "CropShield/1.0"
      }
    });

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      GEOCODE_CACHE.set(query, result);
      return result;
    }
    
    // If not found, cache null to avoid re-fetching
    GEOCODE_CACHE.set(query, { lat: 0, lng: 0 }); // Use 0,0 as a marker for not found
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
