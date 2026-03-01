import React, { useState } from 'react'
import DashboardHeader from '../components/DashboardHeader'
import SOSButton from '../components/SOSButton'
import StatusIndicator from '../components/StatusIndicator'
import LocationCard from '../components/LocationCard'
import QuickActions from '../components/QuickActions'
import HistoryPreview from '../components/HistoryPreview'
import { ShieldCheck } from 'lucide-react';
import io from 'socket.io-client';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '');
import '../styles/Dashboard.css'

const Dashboard = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Guest' });
    const [isSOSActive, setIsSOSActive] = useState(false);
    const [trackingInfo, setTrackingInfo] = useState({ isTracking: false, names: [] });
    const sirenRef = React.useRef(null);

    const startSiren = () => {
        if (sirenRef.current) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);

            // Siren modulation
            const lfo = audioCtx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 3; // 3 Hz wobble

            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 200;

            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            gainNode.gain.value = 0.5; // volume

            lfo.start();
            oscillator.start();

            sirenRef.current = { audioCtx, oscillator, lfo };
        } catch (e) {
            console.error("Siren error:", e);
        }
    };

    const stopSiren = () => {
        if (sirenRef.current) {
            try {
                sirenRef.current.oscillator.stop();
                sirenRef.current.lfo.stop();
                sirenRef.current.audioCtx.close();
            } catch (e) { }
            sirenRef.current = null;
        }
    };

    const getDeviceStats = async () => {
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
                if (conn.type === 'wifi') {
                    wifi = 'Connected';
                    signal = 'Strong';
                } else if (conn.type === 'cellular') {
                    wifi = 'Disconnected';
                    signal = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Cellular';
                } else {
                    wifi = conn.type === 'none' ? 'Disconnected' : 'Unknown';
                    signal = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Unknown';
                }
            } else if (!navigator.onLine) {
                wifi = 'Disconnected';
                signal = 'None';
            } else {
                wifi = 'Unknown';
                signal = 'Online';
            }
        } catch (err) {
            console.warn("Network API error:", err);
        }

        return { battery, signal, wifi };
    };

    React.useEffect(() => {
        const fetchInitialStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`, {
                    headers: { 'x-auth-token': token }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'SOS' || data.status === 'Warning') {
                        setIsSOSActive(true);
                    } else {
                        setIsSOSActive(false);
                    }
                }
            } catch (err) {
                console.error("Error fetching initial status:", err);
            }
        };

        fetchInitialStatus();
    }, []);

    React.useEffect(() => {
        const checkTrackingStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/connections/guardians?t=${new Date().getTime()}`, {
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

        // Re-emit user-online on EVERY socket (re)connection
        // This handles: initial connect, auto-reconnect after network drop, Render cold start
        const handleConnect = () => {
            if (token) {
                socket.emit('user-online', { token });
                console.log('[Dashboard] Socket connected/reconnected, emitted user-online');
            }
        };

        // If already connected, emit immediately
        if (socket.connected && token) {
            socket.emit('user-online', { token });
        }

        // Listen for future (re)connections
        socket.on('connect', handleConnect);

        const updateDeviceStats = async () => {
            if (!token) return;
            const stats = await getDeviceStats();
            // Emit newly gathered stats matching backend expectation
            socket.emit('update-device-stats', { ...stats, token });
        };

        // Emit initially and then every 10 seconds to keep dashboard fresh
        updateDeviceStats();
        const statsInterval = setInterval(updateDeviceStats, 10000);
        return () => {
            clearInterval(statsInterval);
            socket.off('connect', handleConnect);
        };
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
        setIsSOSActive(true);
        try {
            const token = localStorage.getItem('token');
            let location = { lat: 0, lng: 0, address: 'Warning triggered' };

            // Try to get real location for the warning too (non-blocking)
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
                    });
                    location = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Warning location' };
                } catch (e) {
                    console.warn('Could not get location for warning:', e);
                }
            }

            socket.emit('update-device-stats', { token });

            // Send with timeout + retry for reliability
            const sendWarning = async (retries = 1) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                try {
                    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/sos/trigger', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify({ location, alertLevel: 'Warning' }),
                        signal: controller.signal
                    });
                    clearTimeout(timeout);
                    if (!res.ok) throw new Error(`Warning trigger returned ${res.status}`);
                } catch (err) {
                    clearTimeout(timeout);
                    if (retries > 0) {
                        console.warn('Warning trigger failed, retrying...', err.message);
                        return sendWarning(retries - 1);
                    }
                    throw err;
                }
            };

            await sendWarning();
            console.log('Warning status sent to Guardians successfully.');
        } catch (err) {
            console.error('Warning trigger failed', err);
            setIsSOSActive(false);
        }
    };

    const handleSOSTrigger = async () => {
        startSiren();

        // Fetch geolocation + device stats in PARALLEL for speed
        const getPositionPromise = new Promise((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos),
                () => resolve(null),
                { timeout: 3000, enableHighAccuracy: true }
            );
        });

        try {
            const token = localStorage.getItem('token');
            const [position, stats] = await Promise.all([
                getPositionPromise,
                getDeviceStats()
            ]);

            let location = { lat: 0, lng: 0, address: 'Location Unavailable' };
            if (position) {
                location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    address: 'Fetching address...'
                };
            }

            console.log("Sending SOS with Location:", location, "Stats:", stats);

            // Send SOS with timeout + retry for maximum reliability
            const sendSOS = async (retries = 1) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                try {
                    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/sos/trigger', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify({
                            location,
                            alertLevel: 'SOS',
                            battery: stats.battery || 'Unknown',
                            network: stats.signal || 'Unknown'
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeout);
                    if (!res.ok) throw new Error(`API Error ${res.status}`);
                } catch (err) {
                    clearTimeout(timeout);
                    if (retries > 0) {
                        console.warn('SOS trigger failed, retrying...', err.message);
                        return sendSOS(retries - 1);
                    }
                    throw err;
                }
            };

            await sendSOS();
            console.log("SOS Triggered Successfully");

        } catch (err) {
            console.error("SOS Trigger Failed", err);
            alert("Failed to send SOS Alert. Please call police manually.");
        }
    };

    const handleSOSCancel = async () => {
        setIsSOSActive(false);
        stopSiren();

        try {
            const token = localStorage.getItem('token');
            await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/sos/cancel', {
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

                <div className="sos-container" style={{ flexDirection: 'column', gap: '1.5rem' }}>
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
                    {isSOSActive && (
                        <button
                            onClick={handleSOSCancel}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem 2rem',
                                backgroundColor: '#10b981', // Safe green
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <ShieldCheck size={24} />
                            I Am Safe Now
                        </button>
                    )}
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
