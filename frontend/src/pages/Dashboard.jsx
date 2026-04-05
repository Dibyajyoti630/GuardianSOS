import React, { useState } from 'react'
import DashboardHeader from '../components/DashboardHeader'
import SOSButton from '../components/SOSButton'
import StatusIndicator from '../components/StatusIndicator'
import LocationCard from '../components/LocationCard'
import QuickActions from '../components/QuickActions'
import HistoryPreview from '../components/HistoryPreview'
import { ShieldCheck, Camera } from 'lucide-react';
import io from 'socket.io-client';
import { captureEvidence } from '../utils/evidenceCapture';
import PermissionModals from '../components/PermissionModals';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000'), {
    autoConnect: false
});
import '../styles/Dashboard.css'

const Dashboard = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Guest' });
    const [isSOSActive, setIsSOSActive] = useState(false);
    const [trackingInfo, setTrackingInfo] = useState({ isTracking: false, names: [] });
    const sirenRef = React.useRef(null);

    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    
    // Toast notification state
    const [toast, setToast] = useState(null);

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

        // Gather Battery Info
        try {
            if (navigator.getBattery) {
                const batteryManager = await navigator.getBattery();
                battery = Math.round(batteryManager.level * 100);
            }
        } catch (err) {
            console.warn("Battery API error:", err);
        }

        return { battery };
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
    React.useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            socket.auth = { token };
            socket.connect();
        }

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
            socket.disconnect();
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

    // Handle remote photo requests
    React.useEffect(() => {
        const handlePhotoRequest = async (data) => {
            const { guardianName, cameraType } = data;
            
            console.log(`📸 Photo requested by ${guardianName} (${cameraType} camera)`);
            
            // Show toast notification to user
            setToast(<><Camera size={16} /> {guardianName} requested a photo</>);
            setTimeout(() => setToast(null), 3000);

            // Capture photo with requested camera type
            const result = await captureEvidence(user._id || user.id, 'GUARDIAN_REQUEST', cameraType);
            
            if (result.success) {
                console.log('✅ Guardian-requested photo captured');
            } else {
                console.warn('⚠️ Guardian-requested photo failed:', result.reason);
            }
        };

        socket.on('guardian:request-photo', handlePhotoRequest);
        return () => socket.off('guardian:request-photo', handlePhotoRequest);
    }, [user._id, user.id]);

    React.useEffect(() => {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then(result => {
                    if (result.state === 'granted') {
                        setLocationPermissionGranted(true);
                    } else if (result.state === 'prompt') {
                        setShowLocationModal(true);
                    }
                })
                .catch(err => console.log('Permission query not supported'));
        }
    }, []);

    React.useEffect(() => {
        if (locationPermissionGranted && navigator.permissions && navigator.permissions.query) {
            const timer = setTimeout(() => {
                navigator.permissions.query({ name: 'camera' })
                    .then(result => {
                        if (result.state === 'prompt') {
                            setShowCameraModal(true);
                        } else if (result.state === 'granted') {
                            setCameraPermissionGranted(true);
                        }
                    })
                    .catch(err => console.log('Camera permission query not supported'));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [locationPermissionGranted]);

    const handleSOSSingleClick = async () => {
        // Warning State
        setIsSOSActive(true);
        try {
            const token = localStorage.getItem('token');

            // Get location using same reliable approach as SOS trigger
            const location = await new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve({ lat: 0, lng: 0, address: 'Geolocation not supported' });
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        address: 'Warning location'
                    }),
                    (err) => {
                        console.warn('GPS failed for Warning:', err.message, err.code);
                        resolve({ lat: 0, lng: 0, address: 'Location unavailable - GPS error' });
                    },
                    { 
                        timeout: 10000,
                        maximumAge: 600000,
                        enableHighAccuracy: false
                    }
                );
            });

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

        const getLocation = async () => {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve({ lat: 0, lng: 0, address: 'Geolocation not supported' });
                    return;
                }

                // Single attempt with longer timeout and accept cached
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        address: 'Current location'
                    }),
                    (err) => {
                        console.warn('GPS failed:', err.message, err.code);
                        resolve({ lat: 0, lng: 0, address: 'Location unavailable - GPS error' });
                    },
                    { 
                        timeout: 10000,          // 10 seconds
                        maximumAge: 600000,      // Accept 10-min old location
                        enableHighAccuracy: false // Faster, uses cached/network location
                    }
                );
            });
        };

        try {
            const token = localStorage.getItem('token');
            const [location, stats] = await Promise.all([
                getLocation(),
                getDeviceStats()
            ]);

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

            // Attempt evidence capture (async, fire-and-forget)
            captureEvidence(user._id || user.id, 'SOS_TRIGGER')
                .then(result => {
                    if (result.success) {
                        console.log(`✅ Evidence captured: ${result.compressedSize} bytes`);
                    } else {
                        console.warn(`⚠️ Evidence capture failed: ${result.reason}`);
                    }
                })
                .catch(err => {
                    console.error('Evidence capture error:', err);
                });

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

            // Cancel with timeout + retry (same as trigger for reliability)
            const sendCancel = async (retries = 1) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                try {
                    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/sos/cancel', {
                        method: 'POST',
                        headers: { 'x-auth-token': token },
                        signal: controller.signal
                    });
                    clearTimeout(timeout);
                    if (!res.ok) throw new Error(`Cancel returned ${res.status}`);
                } catch (err) {
                    clearTimeout(timeout);
                    if (retries > 0) {
                        console.warn('SOS cancel failed, retrying...', err.message);
                        return sendCancel(retries - 1);
                    }
                    throw err;
                }
            };

            await sendCancel();
            console.log('SOS Cancelled Successfully');
        } catch (err) {
            console.error("SOS Cancel Failed", err);
        }
    };

    return (
        <div className="dashboard">
            <DashboardHeader user={user} socket={socket} />

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
                    <QuickActions socket={socket} userId={user._id} />
                </section>

                <HistoryPreview />

                <PermissionModals
                    showLocationModal={showLocationModal}
                    showCameraModal={showCameraModal}
                    onLocationGranted={() => {
                        setLocationPermissionGranted(true);
                        setShowLocationModal(false);
                    }}
                    onCameraGranted={() => {
                        setCameraPermissionGranted(true);
                        setShowCameraModal(false);
                    }}
                    onCameraSkipped={() => {
                        setShowCameraModal(false);
                    }}
                />

                {/* Success Toast */}
                {toast && (
                    <div style={{
                        position: 'fixed',
                        bottom: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(30, 41, 59, 0.97)',
                        border: '1px solid #22C55E',
                        color: '#22C55E',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.92rem',
                        zIndex: 10000,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        animation: 'slideUp 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {toast}
                    </div>
                )}
            </main>
        </div>
    )
}

export default Dashboard
