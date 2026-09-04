/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";
import { InteractiveRiskMap, type RiskZonePoint } from "./InteractiveRiskMap";

declare global {
  interface Window {
    google?: typeof google;
    __cropShieldMapsPromise?: Promise<void>;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

export function loadMapScript(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window.__cropShieldMapsPromise) return window.__cropShieldMapsPromise;
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("cropshield-google-maps-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "cropshield-google-maps-script";
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY || ""}&v=weekly&libraries=marker,places,geocoding,geometry,visualization`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  }).catch((error) => {
    window.__cropShieldMapsPromise = undefined;
    throw error;
  });
  window.__cropShieldMapsPromise = promise;
  return promise;
}

export interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  points?: RiskZonePoint[];
  onSelectPoint?: (point: RiskZonePoint | null) => void;
  title?: string;
  compact?: boolean;
}

export function MapView({
  className,
  initialCenter = { lat: 20.5937, lng: 78.9629 },
  initialZoom = 5,
  onMapReady,
  points,
  onSelectPoint,
  title,
  compact = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const init = usePersistFn(async () => {
    if (map.current) return;
    try {
      await loadMapScript();
      if (!mapContainer.current) return;

      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        streetViewControl: false,
        mapId: "DEMO_MAP_ID",
      });

      if (onMapReady) {
        onMapReady(map.current);
      }
    } catch (err) {
      // Gracefully switch to the interactive built-in risk map
      setUseFallback(true);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  if (useFallback) {
    return (
      <InteractiveRiskMap
        className={className}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        points={points}
        onSelectPoint={onSelectPoint}
        title={title}
        compact={compact}
      />
    );
  }

  return (
    <div ref={mapContainer} className={cn("w-full h-[320px] rounded-2xl overflow-hidden", className)} />
  );
}

