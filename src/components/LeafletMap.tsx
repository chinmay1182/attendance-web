"use client";
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Type definition (can be shared)
type Site = {
    id: string;
    name: string;
    radius: number;
    latitude: number;
    longitude: number;
};

// Map click handler
function LocationMarker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

interface LeafletMapProps {
    sites: Site[];
    onLocationSelect: (lat: number, lng: number) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ sites, onLocationSelect }) => {
    return (
        <MapContainer center={[19.0760, 72.8777]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            <LocationMarker onSelect={onLocationSelect} />
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
        </MapContainer>
    );
};

export default LeafletMap;
