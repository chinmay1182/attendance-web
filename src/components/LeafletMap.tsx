"use client";
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

type Site = {
    id: string;
    name: string;
    radius: number;
    latitude: number;
    longitude: number;
};

type MarkerData = {
    id: string;
    lat: number;
    lng: number;
    title: string;
};

// Map click handler
function LocationMarker({ onSelect }: { onSelect?: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onSelect && onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

interface LeafletMapProps {
    sites?: Site[];
    markers?: MarkerData[];
    onLocationSelect?: (lat: number, lng: number) => void;
    className?: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ sites = [], markers = [], onLocationSelect, className }) => {
    return (
        <MapContainer center={[19.0760, 72.8777]} zoom={13} style={{ height: '100%', width: '100%' }} className={className}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            {onLocationSelect && <LocationMarker onSelect={onLocationSelect} />}

            {/* Render Sites (Geofences) */}
            {sites.map(site => (
                <Circle
                    key={site.id}
                    center={[site.latitude || 0, site.longitude || 0]}
                    pathOptions={{ color: 'blue', fillColor: 'blue' }}
                    radius={site.radius}
                >
                    <Popup>{site.name}</Popup>
                </Circle>
            ))}

            {/* Render Markers (Live Locations) */}
            {markers.map(marker => (
                <Marker key={marker.id} position={[marker.lat, marker.lng]}>
                    <Popup>{marker.title}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default LeafletMap;
