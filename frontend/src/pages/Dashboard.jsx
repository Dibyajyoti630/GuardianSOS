import React, { useState } from 'react'
import DashboardHeader from '../components/DashboardHeader'
import SOSButton from '../components/SOSButton'
import StatusIndicator from '../components/StatusIndicator'
import LocationCard from '../components/LocationCard'
import QuickActions from '../components/QuickActions'
import HistoryPreview from '../components/HistoryPreview'
import io from 'socket.io-client';

const socket = io('https://guardiansos-backend.onrender.com');
import '../styles/Dashboard.css'

const Dashboard = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Guest' });
    const [isSOSActive, setIsSOSActive] = useState(false);
    const [trackingInfo, setTrackingInfo] = useState({ isTracking: false, names: [] });

    React.useEffect(() => {
        const checkTrackingStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(`https://guardiansos-backend.onrender.com/api/connections/guardians?t=${new Date().getTime()}`, {
                    headers: { 'x-auth-token': token }
                });

                if (res.ok) {
                    const data = await res.json();

                    // Filter guardians who are active
                    const activeGuardians = data.filter(g => g.status === 'active');

                    if (activeGuardians.length > 0) {
                        const names = activeGuardians.map(g => g.name || 'Guardian');
                        setTrackingInfo({ isTracking: true, names });
                    } else {
                        setTrackingInfo({ isTracking: false, names: [] });
                    }
                }
            } catch (err) {
                console.error('Error fetching tracking status:', err);
            }
        };

        checkTrackingStatus();
        const interval = setInterval(checkTrackingStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // ----------------------------------------------------
    // DYNAMIC INTERACTION: Online Status & Device Stats
    // ----------------------------------------------------
    React.useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Emitting online status to backend immediately on mount
            socket.emit('user-online', { token });
        }

        // Function to gather and emit device stats (Battery, Network)
        const updateDeviceStats = async () => {
            if (!token) return;

            let battery = undefined;
            let signal = 'Unknown';
            let wifi = 'Unknown';

            // Gather Battery Info
            try {
                if (navigator.getBattery) {
                    const batteryManager = await navigator.getBattery();
                    battery = Math.round(batteryManager.level * 100);
                }
            } catch (err) {
                console.warn("Battery API error:", err);
            }

            // Gather Network/Wifi Info
            try {
                if (navigator.connection) {
                    const conn = navigator.connection;
                    // 'wifi', 'cellular', 'ethernet', etc.
                    if (conn.type === 'wifi') {
                        wifi = 'Connected';
                        signal = 'Strong';
                    } else if (conn.type === 'cellular') {
                        wifi = 'Disconnected';
                        // Use effectiveType ('4g', '3g', etc.) as a proxy for signal type
                        signal = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Cellular';
                    } else {
                        // Fallback connection types
                        wifi = conn.type === 'none' ? 'Disconnected' : 'Unknown';
                        signal = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Unknown';
                    }
                } else if (!navigator.onLine) {
                    wifi = 'Disconnected';
                    signal = 'None';
                } else {
                    // Primitive fallback if Network API is missing but online
                    wifi = 'Unknown';
                    signal = 'Online';
                }
            } catch (err) {
                console.warn("Network API error:", err);
            }

            // Emit newly gathered stats matching backend expectation
            socket.emit('update-device-stats', { battery, signal, wifi, token });
        };

        // Emit initially and then every 10 seconds to keep dashboard fresh
        updateDeviceStats();
        const statsInterval = setInterval(updateDeviceStats, 10000);
        return () => clearInterval(statsInterval);
    }, []);
    // ----------------------------------------------------

    // Continuous Location Streaming (for SOS and Guardian Tracking)
    React.useEffect(() => {
        let currentWatchId = null;

        if ((isSOSActive || trackingInfo.isTracking) && navigator.geolocation) {
            const token = localStorage.getItem('token');
            if (token) {
                currentWatchId = navigator.geolocation.watchPosition((pos) => {
                    const newLoc = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    socket.emit('update-location', { location: newLoc, token });
                }, (err) => console.error("WatchPosition Error:", err), { enableHighAccuracy: true });
            }
        }

        return () => {
            if (currentWatchId !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(currentWatchId);
            }
        };
    }, [isSOSActive, trackingInfo.isTracking]);

    const handleSOSSingleClick = async () => {
        // Warning State
        try {
            const token = localStorage.getItem('token');
            const location = { lat: 0, lng: 0, address: 'Warning triggered' }; // simplified 

            // Update user status to Warning via generic or SOS trigger endpoint
            // Since we only have /api/sos/trigger and /api/sos/cancel right now
            // Let's rely on /api/auth/update-status if it existed, or we can use our new socket!
            socket.emit('update-device-stats', { token }); // To keep awake

            // For now, let's just use the SOS API but pass a type if it supported it.
            // But we can just use the /api/sos/trigger for now to signify alert
            // Actually, we don't have a dedicated Warning API. Let's just do a fetch to update status
            await fetch('https://guardiansos-backend.onrender.com/api/auth/update-status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ email: user.email, status: 'Warning' }) // email is hacky, backend needs auth fixed.
            });

            // Fallback for visual
            alert("Warning status sent to Guardians.");
        } catch (err) {
            console.error("Warning trigger failed", err);
        }
    };

    const handleSOSTrigger = async () => {
        let location = { lat: 0, lng: 0, address: 'Location Unavailable' };

        // Helper to get position with timeout
        const getPosition = () => {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                    return;
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    enableHighAccuracy: true
                });
            });
        };

        try {
            const position = await getPosition();
            location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: 'Fetching address...'
            };
        } catch (geoError) {
            console.warn("SOS: Location fetch failed, sending SOS anyway.", geoError);
            alert("Warning: GPS failed. Sending SOS with last known details.");
        }

        try {
            const token = localStorage.getItem('token');
            console.log("Sending SOS with Location:", location);

            // 1. Trigger SOS API
            const res = await fetch('https://guardiansos-backend.onrender.com/api/sos/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ location })
            });

            if (!res.ok) throw new Error('API Error');
            console.log("SOS Triggered Successfully");

        } catch (err) {
            console.error("SOS Trigger Failed", err);
            alert("Failed to send SOS Alert. Please call police manually.");
        }
    };

    const handleSOSCancel = async () => {
        setIsSOSActive(false);

        try {
            const token = localStorage.getItem('token');
            await fetch('https://guardiansos-backend.onrender.com/api/sos/cancel', {
                method: 'POST',
                headers: { 'x-auth-token': token }
            });
        } catch (err) {
            console.error("SOS Cancel Failed", err);
        }
    };

    return (
        <div className="dashboard">
            <DashboardHeader user={user} />

            <main className="dashboard-content">
                <StatusIndicator isActive={isSOSActive} trackingInfo={trackingInfo} />

                <div className="sos-container">
                    <SOSButton
                        isActive={isSOSActive}
                        onCancel={handleSOSCancel}
                        onSingleClick={handleSOSSingleClick}
                        onMultiClick={() => {
                            setIsSOSActive(true);
                            handleSOSTrigger();
                        }}
                        onHold={() => {
                            setIsSOSActive(true);
                            handleSOSTrigger();
                        }}
                    />
                </div>

                <section className="info-section">
                    <LocationCard />
                </section>

                <section className="actions-section">
                    <QuickActions />
                </section>

                <HistoryPreview />
            </main>
        </div>
    )
}

export default Dashboard
