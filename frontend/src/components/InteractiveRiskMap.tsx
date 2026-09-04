/// <reference types="@types/google.maps" />

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Sprout,
  Users,
  Thermometer,
  Droplets,
  Map as MapIcon,
  Satellite,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface RiskZonePoint {
  id?: string | number;
  location: string;
  position: { lat: number; lng: number };
  scans: number;
  highRisk: number;
  farmers?: number;
  threatName?: string;
  primaryCrop?: string;
  temperature?: number;
  humidity?: number;
  advisory?: string;
  riskLevel?: "high" | "moderate" | "low";
  /** If true, show a special "My Farm" marker at this point */
  isMyLocation?: boolean;
}

export interface InteractiveRiskMapProps {
  points?: RiskZonePoint[];
  /** Farmer's own location – rendered as "My Farm" if provided */
  myLocation?: { lat: number; lng: number };
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onSelectPoint?: (point: RiskZonePoint | null) => void;
  /** Map title shown in top-left badge */
  title?: string;
  /** Compact view (reduced height, no filter chips) */
  compact?: boolean;
  /** Show heatmap layer (default true for admin, false for compact/farmer mini map) */
  showHeatmap?: boolean;
  /** Show map type (Normal/Satellite) toggle (default true) */
  showMapTypeControl?: boolean;
}

// ─── Fallback Regional Demo Data ─────────────────────────────────────────────
// Only used when backend provides no points AND in development/demo mode.

const DEFAULT_REGIONAL_ZONES: RiskZonePoint[] = [
  {
    id: "zone-punjab",
    location: "Punjab · Ludhiana",
    position: { lat: 30.901, lng: 75.8573 },
    scans: 14,
    highRisk: 8,
    farmers: 24,
    threatName: "Yellow Rust & Aphid Infestation",
    primaryCrop: "Wheat & Rice",
    temperature: 24,
    humidity: 88,
    advisory: "Apply prophylactic fungicidal spray on wheat borders. Inspect lower leaves for yellow pustules.",
    riskLevel: "high",
  },
  {
    id: "zone-maharashtra",
    location: "Maharashtra · Nashik",
    position: { lat: 19.9975, lng: 73.7898 },
    scans: 18,
    highRisk: 4,
    farmers: 31,
    threatName: "Early Blight & Thrips Risk",
    primaryCrop: "Tomato & Onion",
    temperature: 28,
    humidity: 74,
    advisory: "Maintain proper furrow drainage. Schedule sulfur dust or neem formulation in early morning.",
    riskLevel: "moderate",
  },
  {
    id: "zone-andhra",
    location: "Andhra Pradesh · Guntur",
    position: { lat: 16.3067, lng: 80.4365 },
    scans: 22,
    highRisk: 11,
    farmers: 45,
    threatName: "Chilli Black Thrips & Wilt",
    primaryCrop: "Chilli & Cotton",
    temperature: 31,
    humidity: 82,
    advisory: "Install yellow and blue sticky traps (25/acre). Rotate chemical classes to prevent pesticide resistance.",
    riskLevel: "high",
  },
  {
    id: "zone-karnataka",
    location: "Karnataka · Shimoga",
    position: { lat: 13.9299, lng: 75.5681 },
    scans: 9,
    highRisk: 1,
    farmers: 19,
    threatName: "Leaf Spot & Mildew",
    primaryCrop: "Arecanut & Maize",
    temperature: 26,
    humidity: 65,
    advisory: "Routine field sanitation. Soil moisture balanced; continue standard organic compost application.",
    riskLevel: "low",
  },
  {
    id: "zone-bengal",
    location: "West Bengal · Burdwan",
    position: { lat: 23.2324, lng: 87.8615 },
    scans: 16,
    highRisk: 6,
    farmers: 38,
    threatName: "Bacterial Leaf Blight (BLB)",
    primaryCrop: "Paddy & Mustard",
    temperature: 29,
    humidity: 89,
    advisory: "Avoid excess nitrogen fertilizer. Drain excess field water before foliar bactericide application.",
    riskLevel: "moderate",
  },
  {
    id: "zone-madhya",
    location: "Madhya Pradesh · Indore",
    position: { lat: 22.7196, lng: 75.8577 },
    scans: 12,
    highRisk: 2,
    farmers: 22,
    threatName: "Soybean Stem Fly & Rust",
    primaryCrop: "Soybean & Wheat",
    temperature: 27,
    humidity: 62,
    advisory: "Normal vegetative growth recorded. Weekly scout for stem discoloration.",
    riskLevel: "low",
  },
];

// ─── Colour helpers ───────────────────────────────────────────────────────────

function riskColor(level: "high" | "moderate" | "low") {
  return level === "high" ? "#ef4444" : level === "moderate" ? "#f59e0b" : "#10b981";
}

function riskFillColor(level: "high" | "moderate" | "low") {
  return level === "high"
    ? "rgba(239,68,68,0.18)"
    : level === "moderate"
    ? "rgba(245,158,11,0.16)"
    : "rgba(16,185,129,0.14)";
}

import { loadMapScript } from "./Map";

// ─── Main Component ───────────────────────────────────────────────────────────

export function InteractiveRiskMap({
  points,
  myLocation,
  initialCenter,
  initialZoom,
  className,
  expanded = false,
  onToggleExpand,
  onSelectPoint,
  title = "Regional Disease & Pest Heatmap",
  compact = false,
  showHeatmap = true,
  showMapTypeControl = true,
}: InteractiveRiskMapProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  // Attempt to load Google Maps on mount
  useEffect(() => {
    loadMapScript()
      .then(() => setMapsReady(true))
      .catch(() => setUseFallback(true));
  }, []);

  if (useFallback) {
    return (
      <FallbackSVGMap
        points={points}
        initialCenter={initialCenter}
        className={className}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onSelectPoint={onSelectPoint}
        title={title}
        compact={compact}
      />
    );
  }

  if (!mapsReady) {
    return (
      <div
        className={cn(
          "relative w-full rounded-2xl overflow-hidden border shadow-md flex items-center justify-center",
          "bg-gradient-to-br from-[#e8f5ee] via-[#dceee4] to-[#d0e8d6] border-emerald-200/60",
          expanded ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : compact ? "h-[240px]" : "h-[380px] sm:h-[440px]",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-emerald-700">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600" />
          </span>
          <span className="text-xs font-semibold">Loading live map…</span>
        </div>
      </div>
    );
  }

  return (
    <GoogleRiskMap
      points={points}
      myLocation={myLocation}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      className={className}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      onSelectPoint={onSelectPoint}
      title={title}
      compact={compact}
      showHeatmap={showHeatmap}
      showMapTypeControl={showMapTypeControl}
    />
  );
}

// ─── Google Maps Implementation ───────────────────────────────────────────────

function GoogleRiskMap({
  points,
  myLocation,
  initialCenter,
  initialZoom,
  className,
  expanded = false,
  onToggleExpand,
  onSelectPoint,
  title,
  compact = false,
  showHeatmap = true,
  showMapTypeControl = true,
}: InteractiveRiskMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const myMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const [selectedPoint, setSelectedPoint] = useState<RiskZonePoint | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "moderate" | "low">("all");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [heatmapOn, setHeatmapOn] = useState(showHeatmap);

  // Derive display points (real data > fallback demo data)
  const displayPoints = useMemo<RiskZonePoint[]>(() => {
    const raw = points && points.length > 0 ? points : DEFAULT_REGIONAL_ZONES;
    return raw.map((pt, idx) => {
      const ratio = pt.highRisk / Math.max(1, pt.scans);
      const riskLevel: "high" | "moderate" | "low" =
        pt.riskLevel ?? (ratio >= 0.45 ? "high" : ratio > 0.15 ? "moderate" : "low");
      return { ...pt, id: pt.id ?? `pt-${idx}`, riskLevel };
    });
  }, [points]);

  const filteredPoints = useMemo(
    () => (filter === "all" ? displayPoints : displayPoints.filter((p) => p.riskLevel === filter)),
    [displayPoints, filter]
  );

  const defaultCenter = useMemo(() => {
    if (initialCenter) return initialCenter;
    if (myLocation) return myLocation;
    return { lat: 20.5937, lng: 78.9629 }; // India fallback
  }, [initialCenter, myLocation]);

  const defaultZoom = initialZoom ?? (compact ? 5 : myLocation ? 7 : 5);

  // ── Initialize map once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = new window.google!.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: false,
      streetViewControl: false,
      mapId: "DEMO_MAP_ID",
      gestureHandling: "greedy",
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });

    // Initialise heatmap layer
    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      map: showHeatmap ? mapRef.current : null,
      radius: compact ? 30 : 50,
      opacity: 0.7,
    });

    return () => {
      // Cleanup on unmount
      clearCircles();
      clearMyMarker();
      clearHeatmap();
      listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      listenersRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once

  // ── Handle expanded resize ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    window.setTimeout(() => {
      if (mapRef.current) google.maps.event.trigger(mapRef.current, "resize");
    }, 100);
  }, [expanded]);

  // ── Map type sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(
      mapType === "satellite" ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
    );
  }, [mapType]);

  // ── Heatmap toggle ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!heatmapRef.current || !mapRef.current) return;
    heatmapRef.current.setMap(heatmapOn ? mapRef.current : null);
  }, [heatmapOn]);

  // ── Update heatmap data when points change ───────────────────────────────────
  useEffect(() => {
    if (!heatmapRef.current) return;
    const weighted = displayPoints.map((pt) => ({
      location: new google.maps.LatLng(pt.position.lat, pt.position.lng),
      weight: Math.max(1, pt.highRisk * 3 + (pt.scans - pt.highRisk)),
    }));
    heatmapRef.current.setData(weighted);
  }, [displayPoints]);

  // ── Draw/redraw circles when filteredPoints or selection changes ─────────────
  const clearCircles = useCallback(() => {
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];
  }, []);

  const clearMyMarker = useCallback(() => {
    if (myMarkerRef.current) {
      myMarkerRef.current.map = null;
      myMarkerRef.current = null;
    }
  }, []);

  const clearHeatmap = useCallback(() => {
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    clearCircles();

    filteredPoints.forEach((pt) => {
      if (!mapRef.current) return;
      const isSelected = selectedPoint?.id === pt.id;
      const color = riskColor(pt.riskLevel ?? "low");
      const fill = riskFillColor(pt.riskLevel ?? "low");
      const baseRadius = Math.max(18000, Math.min(45000, (pt.scans || 1) * 2500 + 15000));

      // Outer halo ring
      const outerCircle = new google.maps.Circle({
        map: mapRef.current,
        center: pt.position,
        radius: baseRadius * 1.5,
        strokeColor: color,
        strokeOpacity: 0.25,
        strokeWeight: 1.5,
        fillColor: fill,
        fillOpacity: 0.08,
        clickable: false,
        zIndex: 1,
      });

      // Main filled zone circle
      const mainCircle = new google.maps.Circle({
        map: mapRef.current,
        center: pt.position,
        radius: baseRadius,
        strokeColor: color,
        strokeOpacity: isSelected ? 1 : 0.7,
        strokeWeight: isSelected ? 3 : 2,
        fillColor: fill,
        fillOpacity: isSelected ? 0.4 : 0.25,
        clickable: true,
        zIndex: 2,
      });

      const listener = google.maps.event.addListener(mainCircle, "click", () => {
        setSelectedPoint(pt);
        onSelectPoint?.(pt);
        // Pan to the clicked point
        mapRef.current?.panTo(pt.position);
      });

      listenersRef.current.push(listener);
      circlesRef.current.push(outerCircle, mainCircle);
    });
  }, [filteredPoints, selectedPoint, clearCircles, onSelectPoint]);

  // ── Draw "My Farm" marker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    clearMyMarker();
    const loc = myLocation ?? (points && points.find((p) => p.isMyLocation)?.position);
    if (!loc) return;

    const pin = document.createElement("div");
    pin.innerHTML = `
      <div style="
        background: #065f46; color: white; font-size: 10px; font-weight: 700;
        padding: 4px 8px; border-radius: 20px; white-space: nowrap;
        border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; gap: 4px;
      ">
        <span style="font-size:13px;">📍</span> My Farm
      </div>`;

    myMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: loc,
      title: "My Farm",
      content: pin,
      zIndex: 10,
    });
  }, [myLocation, points, clearMyMarker]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const handleZoomIn = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 5) + 1);
  const handleZoomOut = () => mapRef.current?.setZoom(Math.max(3, (mapRef.current.getZoom() ?? 5) - 1));
  const handleReset = () => {
    mapRef.current?.setCenter(defaultCenter);
    mapRef.current?.setZoom(defaultZoom);
    setSelectedPoint(null);
    onSelectPoint?.(null);
  };

  const highCount = displayPoints.filter((p) => p.riskLevel === "high").length;
  const modCount = displayPoints.filter((p) => p.riskLevel === "moderate").length;
  const lowCount = displayPoints.filter((p) => p.riskLevel === "low").length;

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden select-none border shadow-md",
        "bg-[#e8f5ee] border-emerald-200/60",
        expanded ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : compact ? "h-[240px]" : "h-[380px] sm:h-[440px]",
        className
      )}
    >
      {/* ── Google Map Canvas ── */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* ── Top Toolbar ── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Title badge */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-2 max-w-[55%] truncate">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-emerald-900 truncate">
            {compact ? "Regional Risk Zones" : title}
          </span>
        </div>

        {/* Map type + controls group */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Normal / Satellite toggle */}
          {showMapTypeControl && (
            <div className="flex bg-white/90 backdrop-blur-md rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setMapType("roadmap")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold transition-all",
                  mapType === "roadmap"
                    ? "bg-emerald-700 text-white"
                    : "text-emerald-800 hover:bg-emerald-50"
                )}
                title="Normal map"
                aria-label="Normal map"
              >
                <MapIcon size={11} />
                <span className="hidden sm:inline">Normal</span>
              </button>
              <button
                type="button"
                onClick={() => setMapType("satellite")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold transition-all",
                  mapType === "satellite"
                    ? "bg-emerald-700 text-white"
                    : "text-emerald-800 hover:bg-emerald-50"
                )}
                title="Satellite view"
                aria-label="Satellite view"
              >
                <Satellite size={11} />
                <span className="hidden sm:inline">Satellite</span>
              </button>
            </div>
          )}

          {/* Zoom / Reset / Fullscreen controls */}
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-emerald-200 shadow-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 transition-all"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 transition-all"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 transition-all"
              title="Reset view"
              aria-label="Reset view"
            >
              <RotateCcw size={13} />
            </button>
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95"
                title={expanded ? "Close full screen" : "Full screen map"}
                aria-label="Toggle full screen"
              >
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Chips (not shown in compact mode) ── */}
      {!compact && (
        <div className="absolute top-12 left-3 z-20 flex flex-wrap gap-1.5 pointer-events-auto">
          {(["all", "high", "moderate", "low"] as const).map((lvl) => {
            const label =
              lvl === "all"
                ? `All (${displayPoints.length})`
                : lvl === "high"
                ? `High (${highCount})`
                : lvl === "moderate"
                ? `Moderate (${modCount})`
                : `Routine (${lowCount})`;
            const active = filter === lvl;
            const color =
              lvl === "all"
                ? active
                  ? "bg-emerald-800 text-white border-emerald-700"
                  : "bg-white/80 text-emerald-900 border-emerald-200 hover:border-emerald-400"
                : lvl === "high"
                ? active
                  ? "bg-red-600 text-white border-red-500"
                  : "bg-white/80 text-red-700 border-red-200 hover:border-red-400"
                : lvl === "moderate"
                ? active
                  ? "bg-amber-600 text-white border-amber-500"
                  : "bg-white/80 text-amber-800 border-amber-200 hover:border-amber-400"
                : active
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-white/80 text-emerald-800 border-emerald-200 hover:border-emerald-400";

            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilter(lvl)}
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer backdrop-blur-md shadow-sm flex items-center gap-1",
                  color
                )}
              >
                {lvl !== "all" && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full inline-block",
                      lvl === "high" ? "bg-red-500" : lvl === "moderate" ? "bg-amber-500" : "bg-emerald-500"
                    )}
                  />
                )}
                {label}
              </button>
            );
          })}

          {/* Heatmap toggle */}
          {showHeatmap && (
            <button
              type="button"
              onClick={() => setHeatmapOn((v) => !v)}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer backdrop-blur-md shadow-sm flex items-center gap-1",
                heatmapOn
                  ? "bg-orange-600 text-white border-orange-500"
                  : "bg-white/80 text-orange-800 border-orange-200 hover:border-orange-400"
              )}
            >
              <Layers size={10} />
              Heatmap
            </button>
          )}
        </div>
      )}

      {/* ── Selected Hotspot Detail Drawer ── */}
      {selectedPoint && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-30 bg-white/97 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider text-white",
                    selectedPoint.riskLevel === "high"
                      ? "bg-red-600"
                      : selectedPoint.riskLevel === "moderate"
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  )}
                >
                  {selectedPoint.riskLevel} Risk Zone
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-1 leading-snug flex items-center gap-1 truncate">
                <MapPin size={13} className="text-emerald-600 shrink-0" />
                {selectedPoint.location}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPoint(null);
                onSelectPoint?.(null);
              }}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>

          <div className="py-2.5 space-y-2 text-xs text-gray-700">
            {selectedPoint.threatName && (
              <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-xl border border-amber-100">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <b className="text-amber-800 block text-[11px]">Flagged Threat:</b>
                  <span className="text-[11px] text-gray-700">{selectedPoint.threatName}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-red-50 p-1.5 rounded-lg">
                <span className="text-[9px] text-gray-500 block">High Risk</span>
                <b className="text-red-600 text-xs font-extrabold">{selectedPoint.highRisk}</b>
              </div>
              <div className="bg-emerald-50 p-1.5 rounded-lg">
                <span className="text-[9px] text-gray-500 block">Total Scans</span>
                <b className="text-emerald-700 text-xs font-extrabold">{selectedPoint.scans}</b>
              </div>
              <div className="bg-gray-50 p-1.5 rounded-lg">
                <span className="text-[9px] text-gray-500 block">Farms</span>
                <b className="text-gray-900 text-xs font-extrabold">{selectedPoint.farmers ?? "—"}</b>
              </div>
            </div>

            {(selectedPoint.temperature != null || selectedPoint.humidity != null) && (
              <div className="flex items-center gap-3 text-[10px] text-gray-500 px-1">
                {selectedPoint.temperature != null && (
                  <span className="flex items-center gap-1">
                    <Thermometer size={12} className="text-orange-500" />
                    {selectedPoint.temperature}°C
                  </span>
                )}
                {selectedPoint.humidity != null && (
                  <span className="flex items-center gap-1">
                    <Droplets size={12} className="text-cyan-600" />
                    {selectedPoint.humidity}% Humidity
                  </span>
                )}
                {selectedPoint.primaryCrop && (
                  <span className="flex items-center gap-1 truncate">
                    <Sprout size={12} className="text-emerald-600" />
                    {selectedPoint.primaryCrop}
                  </span>
                )}
              </div>
            )}

            {selectedPoint.advisory && (
              <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100 line-clamp-3 leading-relaxed">
                💡 {selectedPoint.advisory}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectPoint?.(selectedPoint)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-lg cursor-pointer"
          >
            <span>Focus this regional threat</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Map Legend ── */}
      {!compact && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none hidden sm:flex items-center gap-3 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-emerald-200 shadow-sm">
          <span className="flex items-center gap-1 text-[9px] font-bold text-red-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> High Risk
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moderate
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Monitoring
          </span>
          {showHeatmap && heatmapOn && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-orange-700">
              <Layers size={10} className="text-orange-500" /> Heatmap
            </span>
          )}
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <ShieldCheck size={11} className="text-emerald-600" /> Click zone for details
          </span>
        </div>
      )}
    </div>
  );
}

// ─── SVG Fallback (preserved from original for no-API / offline states) ────────

const MAP_BOUNDS = { minLat: 8.0, maxLat: 36.0, minLng: 68.0, maxLng: 96.0 };

function FallbackSVGMap({
  points,
  initialCenter: _initialCenter,
  className,
  expanded = false,
  onToggleExpand,
  onSelectPoint,
  title = "Regional Disease & Pest Heatmap",
  compact = false,
}: InteractiveRiskMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [filter, setFilter] = useState<"all" | "high" | "moderate" | "low">("all");
  const [selectedPoint, setSelectedPoint] = useState<RiskZonePoint | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const displayPoints = useMemo<RiskZonePoint[]>(() => {
    const raw = points && points.length > 0 ? points : DEFAULT_REGIONAL_ZONES;
    return raw.map((pt, idx) => {
      const ratio = pt.highRisk / Math.max(1, pt.scans);
      const riskLevel: "high" | "moderate" | "low" =
        pt.riskLevel ?? (ratio >= 0.45 ? "high" : ratio > 0.15 ? "moderate" : "low");
      return { ...pt, id: pt.id ?? `pt-${idx}`, riskLevel };
    });
  }, [points]);

  const filteredPoints = useMemo(
    () => (filter === "all" ? displayPoints : displayPoints.filter((p) => p.riskLevel === filter)),
    [displayPoints, filter]
  );

  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 740 + 30;
    const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 640 + 30;
    return { x: Math.max(20, Math.min(780, x)), y: Math.max(20, Math.min(680, y)) };
  };

  const highCount = displayPoints.filter((p) => p.riskLevel === "high").length;
  const modCount = displayPoints.filter((p) => p.riskLevel === "moderate").length;
  const lowCount = displayPoints.filter((p) => p.riskLevel === "low").length;

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden select-none border shadow-md",
        "bg-gradient-to-br from-[#e8f5ee] via-[#dceee4] to-[#d0e8d6] border-emerald-200/60",
        expanded ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : compact ? "h-[240px]" : "h-[380px] sm:h-[440px]",
        className
      )}
      onMouseDown={(e) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      }}
      onMouseMove={(e) => {
        if (!isDragging.current) return;
        setPanOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      }}
      onMouseUp={() => { isDragging.current = false; }}
      onMouseLeave={() => { isDragging.current = false; }}
    >
      {/* Offline indicator badge */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-300 shadow-sm flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wide text-amber-800">
            {compact ? "Regional Risk (Offline)" : `${title} · Offline view`}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-emerald-200 shadow-sm">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs"
            aria-label="Zoom in"
          ><Plus size={14} /></button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.3))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs"
            aria-label="Zoom out"
          ><Minus size={14} /></button>
          <button
            type="button"
            onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setSelectedPoint(null); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs"
            aria-label="Reset view"
          ><RotateCcw size={13} /></button>
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              aria-label="Toggle full screen"
            >{expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      {!compact && (
        <div className="absolute top-12 left-3 z-20 flex flex-wrap gap-1.5 pointer-events-auto">
          {(["all", "high", "moderate", "low"] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilter(lvl)}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer backdrop-blur-md shadow-sm",
                filter === lvl ? "bg-emerald-800 text-white border-emerald-700" : "bg-white/80 text-emerald-900 border-emerald-200"
              )}
            >
              {lvl === "all" ? `All (${displayPoints.length})` : lvl === "high" ? `High (${highCount})` : lvl === "moderate" ? `Moderate (${modCount})` : `Routine (${lowCount})`}
            </button>
          ))}
        </div>
      )}

      {/* SVG Canvas */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden">
        <svg
          viewBox="0 0 800 700"
          className="w-full h-full"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            transformOrigin: "center center",
            transition: isDragging.current ? "none" : "transform 250ms ease-out",
          }}
        >
          <defs>
            <pattern id="cropGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34,133,74,0.12)" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="0.8" fill="rgba(34,133,74,0.18)" />
            </pattern>
            <linearGradient id="mapBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8f5ee" />
              <stop offset="100%" stopColor="#cde6d4" />
            </linearGradient>
          </defs>
          <rect width="800" height="700" fill="url(#mapBgGrad)" />
          <rect width="800" height="700" fill="url(#cropGrid)" />
          <path
            d="M 230 70 L 290 50 L 370 70 L 360 120 L 480 150 L 580 160 L 640 180 L 690 190 L 680 230 L 610 240 L 540 260 L 510 320 L 460 380 L 430 460 L 410 560 L 370 630 L 350 630 L 310 540 L 270 450 L 220 380 L 190 320 L 170 260 L 200 180 Z"
            fill="rgba(34,133,74,0.12)"
            stroke="rgba(21,128,61,0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          {filteredPoints.map((pt) => {
            const { x, y } = projectCoords(pt.position.lat, pt.position.lng);
            const isSelected = selectedPoint?.id === pt.id;
            const strokeColor = riskColor(pt.riskLevel ?? "low");
            const fillColor = riskFillColor(pt.riskLevel ?? "low");
            const baseRadius = Math.max(32, Math.min(54, (pt.scans || 1) * 3 + 24));
            return (
              <g key={pt.id} className="cursor-pointer" onClick={() => { setSelectedPoint(pt); onSelectPoint?.(pt); }}>
                <circle cx={x} cy={y} r={baseRadius + 14} fill="none" stroke={strokeColor} strokeWidth="1.2" strokeOpacity="0.4" className="animate-ping" style={{ animationDuration: pt.riskLevel === "high" ? "2s" : "3.2s", transformOrigin: `${x}px ${y}px` }} />
                <circle cx={x} cy={y} r={baseRadius + 6} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeOpacity="0.6" />
                <circle cx={x} cy={y} r={baseRadius} fill={fillColor} stroke={strokeColor} strokeWidth={isSelected ? 3.5 : 2} />
                <circle cx={x} cy={y} r={15} fill={strokeColor} stroke="#ffffff" strokeWidth="2.5" />
                <text x={x} y={y + 4.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800" fontFamily="system-ui,sans-serif" pointerEvents="none">
                  {pt.highRisk > 0 ? pt.highRisk : pt.scans}
                </text>
                <rect x={x - 48} y={y + 19} width="96" height="18" rx="4" fill="rgba(255,255,255,0.88)" stroke={isSelected ? strokeColor : "rgba(0,0,0,0.12)"} strokeWidth="0.8" />
                <text x={x} y={y + 31.5} textAnchor="middle" fill="#1a3d2e" fontSize="8.5" fontWeight="700" pointerEvents="none">
                  {pt.location.split(" · ").pop() || pt.location}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Drawer */}
      {selectedPoint && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-30 bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div>
              <span className={cn("text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider text-white", selectedPoint.riskLevel === "high" ? "bg-red-600" : selectedPoint.riskLevel === "moderate" ? "bg-amber-600" : "bg-emerald-600")}>
                {selectedPoint.riskLevel} Risk Zone
              </span>
              <h4 className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1">
                <MapPin size={13} className="text-emerald-600 shrink-0" />
                {selectedPoint.location}
              </h4>
            </div>
            <button type="button" onClick={() => { setSelectedPoint(null); onSelectPoint?.(null); }} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close details">✕</button>
          </div>
          <div className="py-2.5 space-y-2">
            {selectedPoint.threatName && (
              <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-xl border border-amber-100">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div><b className="text-amber-800 block text-[11px]">Flagged Threat:</b><span className="text-[11px]">{selectedPoint.threatName}</span></div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-red-50 p-1.5 rounded-lg"><span className="text-[9px] text-gray-500 block">High Risk</span><b className="text-red-600 text-xs font-extrabold">{selectedPoint.highRisk}</b></div>
              <div className="bg-emerald-50 p-1.5 rounded-lg"><span className="text-[9px] text-gray-500 block">Total Scans</span><b className="text-emerald-700 text-xs font-extrabold">{selectedPoint.scans}</b></div>
              <div className="bg-gray-50 p-1.5 rounded-lg"><span className="text-[9px] text-gray-500 block">Farms</span><b className="text-gray-900 text-xs font-extrabold">{selectedPoint.farmers ?? "—"}</b></div>
            </div>
            {selectedPoint.advisory && (
              <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100 line-clamp-2 leading-relaxed">
                💡 {selectedPoint.advisory}
              </p>
            )}
          </div>
          <button type="button" onClick={() => onSelectPoint?.(selectedPoint)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-lg cursor-pointer">
            <span>Focus this regional threat</span><ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="absolute bottom-2.5 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 text-[9px] text-amber-700 bg-white/80 px-2.5 py-1 rounded-full backdrop-blur-sm border border-amber-200 shadow-sm">
        <ShieldCheck size={11} className="text-amber-500" />
        <span>Interactive Offline Regional Fallback — map unavailable</span>
      </div>
    </div>
  );
}
