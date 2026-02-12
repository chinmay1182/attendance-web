"use client";
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

type Site = {
    id: string;
    name: string;
    radius_meters: number;
    latitude: number;
    longitude: number;
};

type MarkerData = {
    id: string;
    lat: number;
    lng: number;
    title: string;
};

interface LeafletMapProps {
    sites?: Site[];
    markers?: MarkerData[];
    center?: [number, number];
    zoom?: number;
    interactive?: boolean;
    className?: string;
    onLocationSelect?: (lat: number, lng: number) => void;
}

// Component to update map center when props change
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMapEvents({});
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
    sites = [],
    markers = [],
    center = [19.0760, 72.8777],
    zoom = 13,
    interactive = true,
    className,
    onLocationSelect
}) => {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={interactive}
            dragging={interactive}
            zoomControl={interactive}
            doubleClickZoom={interactive}
            style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
            className={className}
        >
            <ChangeView center={center} zoom={zoom} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            {/* Render Sites (Geofences) */}
            {sites.map((site, index) => (
                <Circle
                    key={`${site.id}-${index}`}
                    center={[site.latitude || 0, site.longitude || 0]}
                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                    radius={site.radius_meters || 100}
                >
                    <Popup>{site.name}</Popup>
                </Circle>
            ))}

            {/* Render Markers (Live Locations) */}
            {markers.map((marker, index) => (
                <Marker key={`${marker.id}-${index}`} position={[marker.lat, marker.lng]}>
                    <Popup>{marker.title}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default LeafletMap;
