import React, { useState } from 'react';
import { User, Settings, HelpCircle, LogOut, X, Shield, MapPin, Navigation, Clock, Zap, Phone, AlertCircle, RefreshCw, Moon, Sun, UserPlus, Users, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FakeCallSettings from './FakeCallSettings';
import AddGuardianModal from './AddGuardianModal';
import ManageGuardiansModal from './ManageGuardiansModal';
import '../styles/DashboardHeader.css';

const DashboardHeader = ({ user, socket }) => {
    const navigate = useNavigate();
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showFakeCallSettings, setShowFakeCallSettings] = useState(false);
    const [showAddGuardian, setShowAddGuardian] = useState(false);
    const [showManageGuardians, setShowManageGuardians] = useState(false);
    const [activeGuardians, setActiveGuardians] = useState([]);
    
    // Disconnect state
    const holdTimer = React.useRef(null);
    const progressInterval = React.useRef(null);
    const [holdProgress, setHoldProgress] = useState(0);

    // Theme state - get from localStorage or default to 'dark'
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    // Apply theme on mount and when theme changes
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Fetch active guardians
    React.useEffect(() => {
        const fetchActiveGuardians = async () => {
            try {
                const token = localStorage.getItem('token');
                // Only fetch if token is present
                if (!token) return;

                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/connections/guardians?t=${new Date().getTime()}`, {
                    headers: {
                        'x-auth-token': token,
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setActiveGuardians(data);
                } else {
                    console.error('DashboardHeader: Response not OK', response.status);
                }
            } catch (error) {
                console.error('Error fetching guardians:', error);
            }
        };

        fetchActiveGuardians();
        // Poll every 10 seconds for updates
        const interval = setInterval(fetchActiveGuardians, 10000);
        return () => clearInterval(interval);
    }, []);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/guardiansos/user/login');
    };

    const handleVoluntaryOffline = () => {
        const userId = user?._id || user?.id || user?.userId;
        if (socket && socket.connected) {
            let disconnected = false;
            
            const doDisconnect = () => {
                if (disconnected) return; // prevent double firing
                disconnected = true;
                socket.disconnect();
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                alert('You are now offline.');
                navigate('/guardiansos/user/login');
            };
            
            socket.emit('voluntary-offline', { userId });
            socket.once('voluntary-offline-ack', doDisconnect);
            setTimeout(doDisconnect, 3000); // fallback
        } else {
            handleLogout();
        }
    };

    const handleDuressOffline = () => {
        const userId = user?._id || user?.id || user?.userId;
        if (socket && socket.connected) {
            socket.emit('duress-offline', { userId });
            setTimeout(() => {
                socket.disconnect();
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                navigate('/guardiansos/user/login');
            }, 500);
        } else {
            handleLogout();
        }
    };

    const handlePointerDown = (e) => {
        // Only trigger on left click
        if (e && e.button !== 0 && e.type === 'pointerdown') return;
        
        // Start progress bar
        progressInterval.current = setInterval(() => {
            setHoldProgress(prev => prev + (100 / 30)); // 30 intervals over 3s
        }, 100);
        
        // Start 3s timer for duress
        holdTimer.current = setTimeout(() => {
            clearInterval(progressInterval.current);
            handleDuressOffline(); // only fires if hold completes
        }, 3000);
    };

    const handlePointerUp = () => {
        // If released before 3s - treat as voluntary single tap
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
            clearInterval(progressInterval.current);
            setHoldProgress(0);
            handleVoluntaryOffline(); // single tap action fires here
        }
    };

    const handlePointerLeave = () => {
        // Cancel everything if pointer leaves button
        clearTimeout(holdTimer.current);
        clearInterval(progressInterval.current);
        setHoldProgress(0);
        holdTimer.current = null;
    };

    return (
        <>
            <header className="dashboard-header">
                <div className="profile-section">
                    <div className="avatar">
                        <User size={20} color="var(--color-text-main)" />
                    </div>
                    <div className="user-info">
                        <span className="greeting">Hi, {user ? user.name : 'User'}</span>
                        {activeGuardians.filter(g => g.status === 'active').length > 0 ? (
                            <span className="status-text active-tracking">
                                You are being tracked by {activeGuardians.filter(g => g.status === 'active').map(g => g.name || 'Guardian').join(', ')}
                            </span>
                        ) : (
                            <span className="status-text">You are being protected</span>
                        )}
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="icon-btn"
                        aria-label="Help"
                        onClick={() => setShowHelp(true)}
                    >
                        <HelpCircle size={24} />
                    </button>
                    <div className="settings-container">
                        <button
                            className="icon-btn"
                            aria-label="Settings"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings size={24} />
                        </button>
                        {showSettings && (
                            <div className="settings-dropdown">
                                <button
                                    className="settings-item"
                                    onClick={() => {
                                        setShowAddGuardian(true);
                                        setShowSettings(false);
                                    }}
                                >
                                    <UserPlus size={16} />
                                    <span>Add a Guardian</span>
                                </button>
                                <button
                                    className="settings-item"
                                    onClick={() => {
                                        setShowManageGuardians(true);
                                        setShowSettings(false);
                                    }}
                                >
                                    <Users size={16} />
                                    <span>Manage Guardians</span>
                                </button>
                                <button
                                    className="settings-item"
                                    onClick={() => {
                                        setShowFakeCallSettings(true);
                                        setShowSettings(false);
                                    }}
                                >
                                    <Phone size={16} />
                                    <span>Fake Call Settings</span>
                                </button>
                                <button className="settings-item theme-toggle" onClick={toggleTheme}>
                                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                                
                                <div className="offline-btn-container" style={{ position: 'relative' }}>
                                    <button 
                                        className="settings-item offline-btn" 
                                        style={{ 
                                            borderTop: '1px solid var(--color-border)', 
                                            marginTop: '4px',
                                            paddingTop: '10px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}
                                        onPointerDown={handlePointerDown}
                                        onPointerUp={handlePointerUp}
                                        onPointerLeave={handlePointerLeave}
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        <div 
                                            className="hold-progress-fill" 
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                bottom: 0,
                                                height: '100%',
                                                width: `${holdProgress}%`,
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                transition: 'width 0.05s linear',
                                                zIndex: 0
                                            }}
                                        />
                                        <Power size={16} style={{ position: 'relative', zIndex: 1 }} />
                                        <span style={{ position: 'relative', zIndex: 1 }}>Going Offline</span>
                                    </button>
                                </div>
                                <button className="settings-item" onClick={handleLogout}>
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header >

            {/* Help Modal */}
            {
                showHelp && (
                    <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
                        <div className="help-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="help-modal-header">
                                <h2>Dashboard Guide</h2>
                                <button className="close-btn" onClick={() => setShowHelp(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="help-modal-content">
                                <section className="help-section">
                                    <h3>🛡️ SOS & Safety Status</h3>

                                    <div className="help-item">
                                        <div className="help-icon sos-icon">
                                            <Shield size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>SOS Button Power</h4>
                                            <p><strong>Single Tap:</strong> Triggers "Warning" status - notifies guardians you feel unsafe.</p>
                                            <p><strong>Long Press (3s) or Triple Tap:</strong> Triggers "Full SOS" - starts 5s countdown, activates siren, and alerts all guardians with live location.</p>
                                            <p><strong>I Am Safe:</strong> Tap the green button to cancel an active SOS or Warning alert.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <AlertCircle size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Safety Indicators</h4>
                                            <p><strong>Green:</strong> All clear - you're protected.<br />
                                               <strong>Orange:</strong> Warning triggered - guardians notified.<br />
                                               <strong>Red:</strong> SOS Active - emergency services alerted.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>📍 Location & Tracking</h3>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <MapPin size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Live Tracking Card</h4>
                                            <p>Shows your real-time position on a dark-themed map. Includes accuracy indicators and your current address.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <RefreshCw size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Refresh & Share</h4>
                                            <p>Use 🔄 to force a GPS update. Use the Share icon to send a Google Maps link of your location to anyone via messaging apps.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>⚡ Quick Actions</h3>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Phone size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Emergency & Fake Call</h4>
                                            <p><strong>Emergency Call:</strong> Instantly dial Police, Ambulance, Fire, or your primary Guardian.</p>
                                            <p><strong>Fake Call:</strong> Trigger a realistic incoming call to escape uncomfortable situations (Setup in Settings).</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Users size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Guardian Protection</h4>
                                            <p>Your guardians can view your live location, battery level, and request a photo/video from your device if they detect you're in danger.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>⚙️ Strategic Settings</h3>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Power size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Going Offline</h4>
                                            <p><strong>Single Tap:</strong> Voluntary disconnect when you're safe.</p>
                                            <p><strong>3s Hold (Duress):</strong> Use if forced to go offline. Notifies guardians of a "Suspicious Disconnect".</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <UserPlus size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Manage Guardians</h4>
                                            <p>Add new guardians (requires OTP verification) or manage existing ones to control who can track your safety.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section help-tips">
                                    <h3>💡 Pro Safety Tips</h3>
                                    <ul>
                                        <li>Keep the app running in the background for continuous tracking.</li>
                                        <li>Test the "Fake Call" feature in private so you know what it looks like.</li>
                                        <li>Use "Duress Offline" only if you're actually in a suspicious situation.</li>
                                        <li>Ensure GPS "High Accuracy" is enabled in your device settings.</li>
                                        <li>Regularly check if your Primary Guardian is active.</li>
                                    </ul>
                                </section>

                                <section className="help-section help-footer">
                                    <p><strong>Your Safety, Our Priority.</strong> GuardianSOS v1.1 🛡️</p>
                                </section>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Fake Call Settings Modal */}
            <FakeCallSettings
                isOpen={showFakeCallSettings}
                onClose={() => setShowFakeCallSettings(false)}
            />

            <AddGuardianModal
                isOpen={showAddGuardian}
                onClose={() => setShowAddGuardian(false)}
            />

            <ManageGuardiansModal
                isOpen={showManageGuardians}
                onClose={() => setShowManageGuardians(false)}
            />
        </>
    );
};

export default DashboardHeader;
