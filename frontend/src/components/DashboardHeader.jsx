import React, { useState } from 'react';
import { User, Settings, HelpCircle, LogOut, X, Shield, MapPin, Navigation, Clock, Zap, Phone, AlertCircle, RefreshCw, Moon, Sun, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FakeCallSettings from './FakeCallSettings';
import AddGuardianModal from './AddGuardianModal';
import ManageGuardiansModal from './ManageGuardiansModal';
import '../styles/DashboardHeader.css';

const DashboardHeader = ({ user }) => {
    const navigate = useNavigate();
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showFakeCallSettings, setShowFakeCallSettings] = useState(false);
    const [showAddGuardian, setShowAddGuardian] = useState(false);
    const [showManageGuardians, setShowManageGuardians] = useState(false);
    const [activeGuardians, setActiveGuardians] = useState([]);

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

                const response = await fetch(`http://127.0.0.1:5000/api/connections/guardians?t=${new Date().getTime()}`, {
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
                                    <h3>🛡️ Main Features</h3>

                                    <div className="help-item">
                                        <div className="help-icon sos-icon">
                                            <Shield size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>SOS Button (Center)</h4>
                                            <p>Press and hold the large red button to activate emergency alert. A 5-second countdown will start. Release to cancel, or keep holding to send SOS to your emergency contacts with your live location.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <MapPin size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Live Location Card</h4>
                                            <p>Shows your current location on a map with real-time updates. The map displays your exact coordinates and address using GPS or network-based positioning.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <RefreshCw size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Refresh Location Button</h4>
                                            <p>Click the circular refresh icon (🔄) on the location card to manually update your position. Useful if your location seems outdated or inaccurate.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Navigation size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Share Location Button</h4>
                                            <p>Share your current location with others via messaging apps or copy the Google Maps link to clipboard. Great for letting friends know where you are.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>📊 Status Indicators</h3>

                                    <div className="help-item">
                                        <div className="help-icon status-safe">
                                            <AlertCircle size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Safety Status</h4>
                                            <p><strong>Green:</strong> You're safe and protected<br />
                                                <strong>Red:</strong> SOS is active - emergency alert sent<br />
                                                <strong>Orange:</strong> Warning or countdown in progress</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Clock size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Last Updated Time</h4>
                                            <p>Shows when your location was last refreshed. Location updates automatically every few seconds when you move.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>⚙️ Header Icons</h3>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <HelpCircle size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Help Icon (?)</h4>
                                            <p>Opens this guide to help you understand all dashboard features and how to use them effectively.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Settings size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Settings Icon (⚙️)</h4>
                                            <p>Access app settings and options. Toggle between dark and light mode, or logout from your account.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <LogOut size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Logout</h4>
                                            <p>Click Settings → Logout to safely sign out of your account and return to the login page.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>💡 Quick Actions</h3>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Phone size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Fake Call</h4>
                                            <p>Simulate a realistic incoming phone call to help you escape uncomfortable situations. Tap to trigger an instant fake call with ringtone and vibration. Customize the caller name in Settings → Fake Call Settings.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Phone size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Emergency Contacts</h4>
                                            <p>Quick access buttons to call emergency services (Police, Ambulance, Fire) or your pre-configured emergency contacts.</p>
                                        </div>
                                    </div>

                                    <div className="help-item">
                                        <div className="help-icon">
                                            <Zap size={24} />
                                        </div>
                                        <div className="help-text">
                                            <h4>Quick Actions Panel</h4>
                                            <p>Access frequently used safety features like calling emergency services, sharing location, or viewing your safety history.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section help-tips">
                                    <h3>💡 Pro Tips</h3>
                                    <ul>
                                        <li>Enable GPS on your device for accurate location tracking</li>
                                        <li>Add emergency contacts in settings for faster SOS alerts</li>
                                        <li>Test the SOS button (but cancel before countdown ends) to familiarize yourself</li>
                                        <li>Keep the app open in background for continuous protection</li>
                                        <li>Share your location with trusted contacts when traveling alone</li>
                                        <li>Check the accuracy indicator - green means GPS is working well</li>
                                    </ul>
                                </section>

                                <section className="help-section help-footer">
                                    <p><strong>Need more help?</strong> Contact support or visit our FAQ page.</p>
                                    <p className="help-version">GuardianSOS v1.0 - Your Safety, Our Priority 🛡️</p>
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
