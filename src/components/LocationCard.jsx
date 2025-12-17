import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Navigation, Loader, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '../styles/LocationCard.css';

// Fix for default leaflet marker icon not showing
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Component to update map center when position changes
const MapUpdater = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

const LocationCard = () => {
    console.log('🗺️ LocationCard component mounted');
    const [position, setPosition] = useState(null);
    const [address, setAddress] = useState('Fetching address...');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const watchIdRef = useRef(null);

    // Reverse geocoding to get address from coordinates
    const getAddressFromCoords = async (lat, lon) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data.display_name) {
                setAddress(data.display_name);
            } else {
                setAddress('Address not found');
            }
        } catch (err) {
            console.error('Error fetching address:', err);
            setAddress('Unable to fetch address');
        }
    };

    // Get user's live location
    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        console.log('🎯 Starting geolocation watch...');

        // Options for geolocation
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        // Success callback
        const success = (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            console.log('📍 Location Update:', {
                lat: latitude,
                lon: longitude,
                accuracy: `${accuracy} meters`,
                timestamp: new Date().toLocaleTimeString()
            });

            setPosition([latitude, longitude]);
            setLoading(false);
            setError(null);
            setLastUpdate(new Date());

            // Get address for the coordinates
            getAddressFromCoords(latitude, longitude);
        };

        // Error callback
        const errorCallback = (err) => {
            console.error('❌ Geolocation error:', err);
            setLoading(false);

            switch (err.code) {
                case err.PERMISSION_DENIED:
                    setError('Location permission denied. Please enable location access.');
                    break;
                case err.POSITION_UNAVAILABLE:
                    setError('Location information unavailable.');
                    break;
                case err.TIMEOUT:
                    setError('Location request timed out.');
                    break;
                default:
                    setError('An unknown error occurred.');
            }
        };

        // Watch position for continuous updates
        watchIdRef.current = navigator.geolocation.watchPosition(
            success,
            errorCallback,
            options
        );

        // Cleanup
        return () => {
            if (watchIdRef.current) {
                console.log('🛑 Stopping geolocation watch');
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // Manual refresh location
    const handleRefreshLocation = () => {
        setLoading(true);
        console.log('🔄 Manual location refresh requested');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy: locationAccuracy } = pos.coords;
                console.log('📍 Manual Location:', {
                    lat: latitude,
                    lon: longitude,
                    accuracy: `${locationAccuracy} meters`
                });
                setPosition([latitude, longitude]);
                setAccuracy(locationAccuracy);
                setLoading(false);
                setError(null);
                setLastUpdate(new Date());
                getAddressFromCoords(latitude, longitude);
            },
            (err) => {
                console.error('❌ Manual refresh error:', err);
                setLoading(false);
                setError('Failed to refresh location');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    // Share location function
    const handleShareLocation = () => {
        if (position) {
            const [lat, lon] = position;
            const shareUrl = `https://www.google.com/maps?q=${lat},${lon}`;

            if (navigator.share) {
                navigator.share({
                    title: 'My Current Location',
                    text: `I'm currently at: ${address}`,
                    url: shareUrl
                }).catch(err => console.log('Error sharing:', err));
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(shareUrl)
                    .then(() => alert('Location link copied to clipboard!'))
                    .catch(err => console.error('Failed to copy:', err));
            }
        }
    };

    // Default position (fallback)
    const defaultPosition = [28.6139, 77.2090];
    const displayPosition = position || defaultPosition;

    return (
        <div className="location-card">
            <div className="location-header">
                <div className="location-title">
                    <MapPin size={18} color="var(--color-primary)" />
                    <span>Live Location</span>
                    {loading && <Loader size={14} className="location-loader" />}
                </div>
                <div className="location-actions">
                    <button
                        className="refresh-btn"
                        onClick={handleRefreshLocation}
                        title="Refresh location"
                        disabled={loading}
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        className="share-btn"
                        onClick={handleShareLocation}
                        disabled={!position}
                    >
                        <Navigation size={14} />
                        Share
                    </button>
                </div>
            </div>

            {error && (
                <div className="location-error">
                    <p>{error}</p>
                </div>
            )}

            <div className="map-container">
                <MapContainer
                    center={displayPosition}
                    zoom={15}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={displayPosition}>
                        <Popup>
                            {position ? 'You are here (Live)' : 'Default location'}
                        </Popup>
                    </Marker>
                    <MapUpdater position={displayPosition} />
                </MapContainer>
            </div>

            <div className="address-details">
                <p className="address-text">
                    {loading ? 'Getting your location...' : address}
                </p>
                {position && (
                    <>
                        <p className="coords-text">
                            Lat: {position[0].toFixed(6)}, Long: {position[1].toFixed(6)}
                        </p>
                        {accuracy && (
                            <p className="accuracy-text" style={{
                                color: accuracy < 100 ? '#10b981' : accuracy < 1000 ? '#f59e0b' : '#ef4444'
                            }}>
                                Accuracy: ±{accuracy < 1000 ? Math.round(accuracy) : (accuracy / 1000).toFixed(1) + 'k'} meters
                                {accuracy > 1000 && ' ⚠️ Low accuracy - Enable GPS for better results'}
                            </p>
                        )}
                        {lastUpdate && (
                            <p className="update-time">
                                Last updated: {lastUpdate.toLocaleTimeString()}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LocationCard;
