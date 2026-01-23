import React, { useState, useEffect } from 'react';
import {
    MapPin, Battery, Signal, Wifi, Phone,
    Shield, Clock, Navigation, AlertTriangle, UserPlus, Mail, ArrowRight,
    CheckCircle, ShieldCheck, Users, LogOut, ChevronDown, List, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/GuardianDashboard.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Webpack/Vite
// Fix for default marker icon in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// SOS Alert Overlay Component
const SOSAlertOverlay = ({ user, location, onDismiss }) => (
    <div className="sos-alert-overlay">
        <div className="sos-alert-card">
            <div className="sos-icon-pulse">
                <AlertTriangle size={64} color="white" fill="red" />
            </div>
            <h1>SOS DETECTED!</h1>
            <p className="sos-user-name">{user} needs help!</p>

            <div className="sos-location-details">
                <MapPin size={20} />
                <span>{location?.address || "Unknown Location"}</span>
            </div>

            <div className="sos-actions">
                <a
                    href={`https://www.google.com/maps?q=${location?.lat},${location?.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="sos-action-btn map-btn"
                >
                    View on Google Maps
                </a>
                <button className="sos-action-btn dismiss-btn" onClick={onDismiss}>
                    Acknowledge Alert
                </button>
            </div>
        </div>
    </div>
);

// Helper component to update map view when position changes
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

const GuardianDashboard = () => {
    const navigate = useNavigate();
    // Connection State: 'initial', 'sending', 'sent', 'connected'
    const [connectionStatus, setConnectionStatus] = useState('initial');
    const [connectionData, setConnectionData] = useState({
        userName: '',
        userEmail: '',
        verificationCode: ''
    });

    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSOSAlert, setShowSOSAlert] = useState(false);
    // Map of userId -> timestamp (when snooze expires)
    const [snoozeMap, setSnoozeMap] = useState({});

    // Simulated user state (fallback)
    const [userStatus, setUserStatus] = useState({
        name: 'Alex User',
        status: 'Safe', // Safe, Warning, SOS
        battery: 85,
        signal: 4, // 1-4
        lastUpdate: new Date(),
        location: {
            lat: 28.6139,
            lng: 77.2090,
            address: 'Connaught Place, New Delhi'
        },
        speed: 0, // km/h
        isMoving: false
    });

    const [timeline, setTimeline] = useState([
        { id: 1, type: 'status', text: 'Status updated to Safe', time: '2 mins ago', icon: Shield },
        { id: 2, type: 'location', text: 'Arrived at Connaught Place', time: '15 mins ago', icon: MapPin },
        { id: 3, type: 'battery', text: 'Battery level 90%', time: '1 hour ago', icon: Battery },
    ]);

    // Fetch available connected users
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://127.0.0.1:5000/api/connections/users', {
                headers: { 'x-auth-token': token }
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableUsers(data);
                // If users exist and none selected, select first active one
                if (data.length > 0 && !selectedUserId) {
                    const activeUser = data.find(u => u.status === 'active');
                    if (activeUser) {
                        setSelectedUserId(activeUser.userId);
                        setConnectionStatus('connected');
                        setUserStatus(prev => ({ ...prev, name: activeUser.name }));
                    } else if (data.length > 0) {
                        // If we have users but none active, stay in initial but show we have options?
                        // For now, let's just pick the first one and set status
                        const firstUser = data[0];
                        setSelectedUserId(firstUser.userId);
                        // If inactive, we might not show dashboard yet?
                        // Let's assume dashboard attempts to connect.
                        if (firstUser.status === 'active') setConnectionStatus('connected');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Update displayed user when selection changes or data updates
    useEffect(() => {
        if (selectedUserId && availableUsers.length > 0) {
            const user = availableUsers.find(u => u.userId === selectedUserId);
            console.log("DEBUG: Selected User:", user);
            if (user) {
                setUserStatus(prev => ({
                    ...prev,
                    name: user.name,
                    // If backend provides location, use it. Otherwise keep existing (or fallback)
                    // We check if location exists and has lat/lng
                    location: (user.location && user.location.lat) ? {
                        lat: user.location.lat,
                        lng: user.location.lng,
                        address: user.location.address || prev.location.address
                    } : prev.location,
                    // Parse battery if it's a number, otherwise default
                    battery: typeof user.battery === 'number' ? user.battery : prev.battery,
                    status: user.userStatus || 'Safe' // Use userStatus from backend
                }));

                // Check if user status is SOS
                const snoozeUntil = snoozeMap[user.userId] || 0;
                const isSnoozed = Date.now() < snoozeUntil;

                if (user.userStatus === 'SOS' && !isSnoozed) {
                    setShowSOSAlert(true);
                } else {
                    // Check if we should auto-hide based on saftey (if safe now)
                    if (user.userStatus !== 'SOS') {
                        setShowSOSAlert(false);
                        // Optional: Clear snooze if safe?
                        // if (snoozeUntil > 0) setSnoozeMap(prev => ({ ...prev, [user.userId]: 0 }));
                    }
                    // Crucial: We do NOT force setShowSOSAlert(false) here if it is 'SOS' but 'isSnoozed', 
                    // because manually hiding handled it. 
                    // Actually, if isSnoozed is true, we want to ensure it is hidden?
                    // YES. If SOS is true BUT snooze is valid, we hide.
                    if (isSnoozed && showSOSAlert) {
                        setShowSOSAlert(false);
                    }
                }

                if (user.status === 'active') {
                    setConnectionStatus('connected');
                }
            }
        }
    }, [selectedUserId, availableUsers, snoozeMap]); // Added snoozeMap to dependencies

    const handleAcknowledge = () => {
        if (selectedUserId) {
            setSnoozeMap(prev => ({
                ...prev,
                [selectedUserId]: Date.now() + 60000 // Snooze for 1 minute
            }));
        }
        setShowSOSAlert(false);
    };

    // Poll for remote updates (Real-time tracking)
    useEffect(() => {
        if (connectionStatus !== 'connected') return;

        const interval = setInterval(() => {
            fetchUsers();
        }, 3000); // Fetch every 3 seconds for smoother updates in demo

        return () => clearInterval(interval);
    }, [connectionStatus]);

    const handleSendInvite = async (e) => {
        e.preventDefault();
        setConnectionStatus('sending');

        try {
            const response = await fetch('http://127.0.0.1:5000/api/invite/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: connectionData.userEmail,
                    name: connectionData.userName,
                    type: 'guardian_tracking'
                })
            });

            if (response.ok) {
                setConnectionStatus('sent');
                setUserStatus(prev => ({ ...prev, name: connectionData.userName }));
            } else {
                const data = await response.json();
                alert(data.msg || 'Failed to send invite');
                setConnectionStatus('initial');
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            alert('Server error. Please try again.');
            setConnectionStatus('initial');
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://127.0.0.1:5000/api/invite/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    email: connectionData.userEmail,
                    code: connectionData.verificationCode
                })
            });

            const data = await response.json();

            if (response.ok) {
                setConnectionStatus('connected');
                fetchUsers(); // Refresh list to get new connection ID
            } else {
                alert(data.msg || 'Invalid code');
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            alert('Server error. Please verify your connection.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/guardiansos/user/login');
    };

    const toggleTracking = async () => {
        const currentUser = availableUsers.find(u => u.userId === selectedUserId);
        if (!currentUser) return;

        const newStatus = currentUser.status === 'active' ? 'inactive' : 'active';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://127.0.0.1:5000/api/connections/${currentUser.connectionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update local state
                setAvailableUsers(prev => prev.map(u =>
                    u.userId === selectedUserId ? { ...u, status: newStatus } : u
                ));

                if (newStatus === 'inactive') {
                    alert(`Stopped tracking ${currentUser.name}`);
                } else {
                    alert(`Resumed tracking ${currentUser.name}`);
                }
            }
        } catch (error) {
            console.error('Error updating tracking status:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Safe': return 'success';
            case 'SOS': return 'danger';
            case 'Warning': return 'warning';
            default: return 'success';
        }
    };

    const currentUserConnection = availableUsers.find(u => u.userId === selectedUserId);
    const isTracking = currentUserConnection?.status === 'active';

    // Render Connection UI if not connected AND no available users to switch to
    // OR if we are explicitly in adding mode (which we haven't implemented a separate mode for yet, 
    // but connectionStatus 'initial' usually implies empty state).
    // However, since we now support multiple users, 'initial' should only show if we have NO users.
    const showInviteFlow = availableUsers.length === 0 && connectionStatus !== 'connected';

    if (showInviteFlow || connectionStatus === 'sending' || connectionStatus === 'sent') {
        return (
            <div className="guardian-dashboard connection-mode">
                <div className="guardian-header-actions" style={{ position: 'absolute', top: 20, right: 20 }}>
                    <button className="logout-btn icon-btn" onClick={handleLogout} title="Logout">
                        <LogOut size={24} color="white" />
                    </button>
                </div>
                <div className="connection-card">
                    <div className="connection-header">
                        <ShieldCheck size={48} className="connection-logo" />
                        <h1>GuardianSOS</h1>
                        <p>Protect what matters most</p>
                    </div>

                    {connectionStatus === 'initial' || connectionStatus === 'sending' ? (
                        <div className="connection-step">
                            <h2>Track Your Loved One</h2>
                            <p className="step-desc">Enter their details to send a connection request.</p>

                            <form onSubmit={handleSendInvite} className="connection-form">
                                <div className="form-group">
                                    <label>User's Name</label>
                                    <div className="input-with-icon">
                                        <UserPlus size={20} />
                                        <input
                                            type="text"
                                            placeholder="e.g. Dibyajyoti"
                                            required
                                            value={connectionData.userName}
                                            onChange={(e) => setConnectionData({ ...connectionData, userName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>User's Email</label>
                                    <div className="input-with-icon">
                                        <Mail size={20} />
                                        <input
                                            type="email"
                                            placeholder="dibyajyotinayak@gmail.com"
                                            required
                                            value={connectionData.userEmail}
                                            onChange={(e) => setConnectionData({ ...connectionData, userEmail: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="connect-btn" disabled={connectionStatus === 'sending'}>
                                    {connectionStatus === 'sending' ? 'Sending Invite...' : 'Send Connection Request'}
                                    {!connectionStatus === 'sending' && <ArrowRight size={20} />}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="connection-step">
                            <div className="success-icon-wrapper">
                                <CheckCircle size={64} className="success-icon" />
                            </div>
                            <h2>Invite Sent!</h2>
                            <p className="step-desc">We've sent a verification code to <strong>{connectionData.userEmail}</strong>. Please ask them for the code.</p>

                            <form onSubmit={handleVerifyCode} className="connection-form">
                                <div className="form-group">
                                    <label>Verification Code</label>
                                    <div className="code-input-wrapper">
                                        <input
                                            type="text"
                                            maxLength="6"
                                            placeholder="000000"
                                            required
                                            className="code-input"
                                            value={connectionData.verificationCode}
                                            onChange={(e) => setConnectionData({ ...connectionData, verificationCode: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="connect-btn">
                                    Verify & Connect
                                </button>
                                <button
                                    type="button"
                                    className="back-btn"
                                    onClick={() => setConnectionStatus('initial')}
                                >
                                    Back
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // DASHBOARD VIEW
    return (
        <div className="guardian-dashboard">
            <header className="dashboard-header">
                <div className="logo-section">
                    <ShieldCheck size={32} className="logo-icon" />
                    <span>GuardianSOS</span>
                </div>

                <div className="header-controls">
                    {/* User Switcher */}
                    <div className="user-switcher">
                        <button
                            className="current-user-btn"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <Users size={18} />
                            <span>{userStatus.name}</span>
                            <ChevronDown size={16} />
                        </button>
                        {showUserMenu && (
                            <div className="user-dropdown">
                                {availableUsers.map(u => (
                                    <div
                                        key={u.userId}
                                        className={`user-option ${selectedUserId === u.userId ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedUserId(u.userId);
                                            setShowUserMenu(false);
                                        }}
                                    >
                                        <span>{u.name}</span>
                                        <span className={`status-dot ${u.status === 'active' ? 'active' : 'inactive'}`}></span>
                                    </div>
                                ))}
                                <div className="dropdown-divider"></div>
                                <div
                                    className="user-option add-new"
                                    onClick={() => {
                                        setConnectionStatus('initial'); // Go to add mode
                                        setAvailableUsers([]); // Temporary hack to force view switch, better would be a dedicated 'addView' state
                                        setShowUserMenu(false);
                                    }}
                                >
                                    <UserPlus size={14} />
                                    <span>Track New User</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="header-actions">
                        <button
                            className={`action-btn ${isTracking ? 'stop-btn' : 'start-btn'}`}
                            onClick={toggleTracking}
                        >
                            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                        </button>
                        <button className="icon-btn" onClick={handleLogout} title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="map-section">
                    {isTracking ? (
                        <div className="map-container-wrapper">
                            <MapContainer
                                center={[userStatus.location.lat, userStatus.location.lng]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false} // We can add custom controls if we want, or keep it simple
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    // Using a dark theme map to fit the dashboard
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                />
                                <Marker position={[userStatus.location.lat, userStatus.location.lng]}>
                                    <Popup>
                                        {userStatus.name}<br />
                                        {userStatus.location.address}
                                    </Popup>
                                </Marker>
                                <MapUpdater center={[userStatus.location.lat, userStatus.location.lng]} />
                            </MapContainer>

                            <button
                                className="map-refresh-btn"
                                onClick={fetchUsers}
                                title="Refresh Location"
                            >
                                <RefreshCw size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="map-placeholder">
                            <MapPin size={48} className="map-pin-pulse" />
                            <div className="radar-effect"></div>
                            <p>Tracking Paused</p>
                        </div>
                    )}
                    <div className="location-overlay">
                        <div className="location-info">
                            <Navigation size={16} />
                            <span>{userStatus.location.address}</span>
                        </div>
                        <div className="last-update">
                            <Clock size={16} />
                            <span>Updated just now</span>
                        </div>
                    </div>
                </div>

                <div className="info-panel">
                    <div className="status-overview">
                        <div className={`status-card ${getStatusColor(userStatus.status)}`}>
                            <div className="status-header">
                                <Shield size={24} />
                                <h3>Current Status</h3>
                            </div>
                            <p className="status-value">{userStatus.status}</p>
                            <span className="status-desc">
                                {userStatus.status === 'SOS' ? 'Emergency Alert Active!' : 'Everything looks good'}
                            </span>
                        </div>

                        <div className="device-stats">
                            <div className="stat-card">
                                <Battery size={20} className={userStatus.battery < 20 ? 'low-battery' : ''} />
                                <div className="stat-info">
                                    <span className="stat-value">{userStatus.battery}%</span>
                                    <span className="stat-label">Battery</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Signal size={20} />
                                <div className="stat-info">
                                    <span className="stat-value">Strong</span>
                                    <span className="stat-label">Signal</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Wifi size={20} />
                                <div className="stat-info">
                                    <span className="stat-value">On</span>
                                    <span className="stat-label">Internet</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="activity-timeline">
                        <h3>Activity Timeline</h3>
                        <div className="timeline-list">
                            {timeline.map((item) => (
                                <div key={item.id} className="timeline-item">
                                    <div className="timeline-icon">
                                        <item.icon size={16} />
                                    </div>
                                    <div className="timeline-content">
                                        <p>{item.text}</p>
                                        <span>{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="quick-actions">
                        <button className="action-button emergency">
                            <AlertTriangle size={20} />
                            <span>Emergency SOS</span>
                        </button>
                        <button className="action-button call">
                            <Phone size={20} />
                            <span>Call {userStatus.name}</span>
                        </button>
                    </div>
                </div>
            </main>

            {
                showSOSAlert && (
                    <SOSAlertOverlay
                        user={userStatus.name}
                        location={userStatus.location}
                        onDismiss={handleAcknowledge}
                    />
                )
            }
        </div >
    );
};

export default GuardianDashboard;
