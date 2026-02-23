import React, { useState, useEffect } from 'react';
import { X, Phone, Save } from 'lucide-react';
import '../styles/FakeCallSettings.css';

const FakeCallSettings = ({ isOpen, onClose }) => {
    const [callerName, setCallerName] = useState('Dad');
    const [presetNames] = useState(['Mom', 'Dad', 'Boss', 'Friend', 'Partner', 'Sibling']);

    useEffect(() => {
        // Load saved caller name from localStorage
        const savedName = localStorage.getItem('fakeCallCallerName');
        if (savedName) {
            setCallerName(savedName);
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('fakeCallCallerName', callerName);
        onClose();
    };

    const handlePresetClick = (name) => {
        setCallerName(name);
    };

    if (!isOpen) return null;

    return (
        <div className="fake-call-settings-overlay" onClick={onClose}>
            <div className="fake-call-settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <div className="header-title">
                        <Phone size={24} />
                        <h2>Fake Call Settings</h2>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <div className="settings-content">
                    <div className="setting-section">
                        <label htmlFor="caller-name">Caller Name</label>
                        <p className="setting-description">
                            Choose who will appear to be calling you. This name will be displayed on the fake call screen.
                        </p>
                        <input
                            id="caller-name"
                            type="text"
                            value={callerName}
                            onChange={(e) => setCallerName(e.target.value)}
                            placeholder="Enter caller name"
                            maxLength={20}
                            className="caller-name-input"
                        />
                    </div>

                    <div className="setting-section">
                        <label>Quick Presets</label>
                        <p className="setting-description">
                            Or choose from these common options:
                        </p>
                        <div className="preset-buttons">
                            {presetNames.map((name) => (
                                <button
                                    key={name}
                                    className={`preset-btn ${callerName === name ? 'active' : ''}`}
                                    onClick={() => handlePresetClick(name)}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-section info-section">
                        <h3>How It Works</h3>
                        <ul>
                            <li>Tap the "Fake Call" button on your dashboard</li>
                            <li>A realistic incoming call screen will appear</li>
                            <li>The call includes ringtone and vibration</li>
                            <li>Accept to enter "call in progress" mode</li>
                            <li>Use this to escape uncomfortable situations</li>
                            <li>No real call is made - it's completely private</li>
                        </ul>
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="save-btn" onClick={handleSave}>
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FakeCallSettings;
