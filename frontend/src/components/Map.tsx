import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RiskZonePoint } from "./InteractiveRiskMap";

export interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: LeafletMap) => void;
  points?: RiskZonePoint[];
  onSelectPoint?: (point: RiskZonePoint | null) => void;
  title?: string;
  compact?: boolean;
  onMapClick?: (e: { lat: number; lng: number }) => void;
  children?: React.ReactNode;
}

// Helper component to bind onMapReady and update center dynamically
function MapController({
  center,
  zoom,
  onMapReady,
  onMapClick
}: {
  center: { lat: number; lng: number };
  zoom: number;
  onMapReady?: (map: LeafletMap) => void;
  onMapClick?: (e: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  
  // Custom hook for Leaflet events must be imported from react-leaflet, 
  // but we can also use native map event listeners instead of useMapEvents to avoid missing imports.
  useEffect(() => {
    if (!onMapClick) return;
    const onClick = (e: any) => onMapClick(e.latlng);
    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [map, onMapClick]);
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom() !== zoom ? zoom : map.getZoom());
  }, [center, zoom, map]);

  return null;
}

export function MapView({
  className,
  initialCenter = { lat: 20.5937, lng: 78.9629 },
  initialZoom = 5,
  onMapReady,
  onMapClick,
  children,
}: MapViewProps) {
  return (
    <div className={cn("w-full h-[320px] rounded-2xl overflow-hidden relative", className)}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        zoomControl={true}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={initialCenter} zoom={initialZoom} onMapReady={onMapReady} onMapClick={onMapClick} />
        {children}
      </MapContainer>
    </div>
  );
}

