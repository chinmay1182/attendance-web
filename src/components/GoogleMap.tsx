"use client";
import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';

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

interface GoogleMapProps {
    sites?: Site[];
    markers?: MarkerData[];
    center?: { lat: number, lng: number };
    zoom?: number;
    interactive?: boolean;
    className?: string;
    onLocationSelect?: (lat: number, lng: number) => void;
}

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: 'inherit'
};

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

const MapsComponent: React.FC<GoogleMapProps> = ({
    sites = [],
    markers = [],
    center = { lat: 19.0760, lng: 72.8777 },
    zoom = 13,
    interactive = true,
    className,
    onLocationSelect
}) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCb7q7Ox_QPBf6priHrKzEre4375l8Ko2s",
        libraries
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

    const onLoad = React.useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    useEffect(() => {
        if (map && center) {
            map.panTo(center);
        }
    }, [center, map]);

    if (!isLoaded) return <div>Loading Maps...</div>;

    return (
        <div className={className} style={{ width: '100%', height: '100%' }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={zoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    disableDefaultUI: !interactive,
                    zoomControl: interactive,
                    scrollwheel: interactive,
                    draggable: interactive,
                }}
                onClick={(e: google.maps.MapMouseEvent) => {
                    if (interactive && onLocationSelect && e.latLng) {
                        onLocationSelect(e.latLng.lat(), e.latLng.lng());
                    }
                }}
            >
                {/* Render Sites (Geofences) */}
                {sites.map((site, index) => (
                    <React.Fragment key={`${site.id}-${index}`}>
                        <Circle
                            center={{ lat: site.latitude || 0, lng: site.longitude || 0 }}
                            radius={site.radius_meters || 100}
                            options={{
                                strokeColor: '#2563eb',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                                fillColor: '#2563eb',
                                fillOpacity: 0.2,
                            }}
                        />
                        <Marker
                            position={{ lat: site.latitude || 0, lng: site.longitude || 0 }}
                            title={site.name}
                            icon={{
                                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                            }}
                        />
                    </React.Fragment>
                ))}

                {/* Render Markers (Live Locations) */}
                {markers.map((marker, index) => (
                    <Marker
                        key={`${marker.id}-${index}`}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        title={marker.title}
                        onClick={() => setSelectedMarker(marker)}
                    />
                ))}

                {selectedMarker && (
                    <InfoWindow
                        position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div>{selectedMarker.title}</div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
};

export default MapsComponent;
