import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, X } from 'lucide-react';
import '../styles/FakeCall.css';

const FakeCall = ({ isOpen, onClose }) => {
    const [callState, setCallState] = useState('incoming'); // incoming, active, ended
    const [callDuration, setCallDuration] = useState(0);
    const [callerName, setCallerName] = useState('Dad');
    const audioContextRef = useRef(null);
    const ringtoneIntervalRef = useRef(null);
    const timerRef = useRef(null);
    const vibrationIntervalRef = useRef(null);

    // Load caller name from settings (localStorage) whenever modal opens
    useEffect(() => {
        if (isOpen) {
            const savedCallerName = localStorage.getItem('fakeCallCallerName');
            if (savedCallerName) {
                setCallerName(savedCallerName);
            }
        }
    }, [isOpen]);

    // Generate ringtone using Web Audio API (works offline)
    const startRingtone = () => {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();

            const playRingtoneCycle = () => {
                // Create oscillators for dual-tone ringtone
                const oscillator1 = audioContextRef.current.createOscillator();
                const oscillator2 = audioContextRef.current.createOscillator();
                const gainNode = audioContextRef.current.createGain();

                // Set frequencies (classic phone ring frequencies)
                oscillator1.frequency.value = 440; // A4
                oscillator2.frequency.value = 480; // Close to B4

                // Connect oscillators to gain node
                oscillator1.connect(gainNode);
                oscillator2.connect(gainNode);
                gainNode.connect(audioContextRef.current.destination);

                // Set volume
                gainNode.gain.value = 0.3;

                // Start oscillators
                oscillator1.start();
                oscillator2.start();

                // Stop after 1 second (ring duration)
                setTimeout(() => {
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.01,
                        audioContextRef.current.currentTime + 0.1
                    );
                    setTimeout(() => {
                        oscillator1.stop();
                        oscillator2.stop();
                    }, 100);
                }, 1000);
            };

            // Play immediately
            playRingtoneCycle();

            // Repeat every 3 seconds (1 second ring + 2 seconds silence)
            ringtoneIntervalRef.current = setInterval(playRingtoneCycle, 3000);
        } catch (error) {
            console.log('Audio generation failed:', error);
        }
    };

    const stopRingtone = () => {
        if (ringtoneIntervalRef.current) {
            clearInterval(ringtoneIntervalRef.current);
            ringtoneIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    // Handle incoming call state
    useEffect(() => {
        if (isOpen && callState === 'incoming') {
            // Play ringtone using Web Audio API
            startRingtone();

            // Start vibration pattern (if supported)
            startVibration();

            // Save timestamp and location for safety log
            saveCallLog();
        }

        return () => {
            stopRingtone();
            stopVibration();
        };
    }, [isOpen, callState]);

    // Handle call timer for active call
    useEffect(() => {
        if (callState === 'active') {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => {
                    const newDuration = prev + 1;
                    // Auto-end call after 60 seconds
                    if (newDuration >= 60) {
                        handleEndCall();
                    }
                    return newDuration;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [callState]);

    const startVibration = () => {
        if ('vibrate' in navigator) {
            // Vibration pattern: vibrate for 500ms, pause 500ms, repeat
            vibrationIntervalRef.current = setInterval(() => {
                navigator.vibrate(500);
            }, 1000);
        }
    };

    const stopVibration = () => {
        if (vibrationIntervalRef.current) {
            clearInterval(vibrationIntervalRef.current);
            vibrationIntervalRef.current = null;
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(0); // Stop vibration
        }
    };

    const saveCallLog = () => {
        const timestamp = new Date().toISOString();
        let location = 'Location unavailable';

        // Try to get current location
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    location = `${position.coords.latitude}, ${position.coords.longitude}`;
                    saveLog(timestamp, location);
                },
                () => {
                    saveLog(timestamp, location);
                }
            );
        } else {
            saveLog(timestamp, location);
        }
    };

    const saveLog = (timestamp, location) => {
        const logs = JSON.parse(localStorage.getItem('fakeCallLogs') || '[]');
        logs.push({
            timestamp,
            location,
            callerName
        });
        // Keep only last 50 logs
        if (logs.length > 50) {
            logs.shift();
        }
        localStorage.setItem('fakeCallLogs', JSON.stringify(logs));
    };

    const handleAccept = () => {
        stopRingtone();
        stopVibration();
        setCallState('active');
        setCallDuration(0);
    };

    const handleReject = () => {
        stopRingtone();
        stopVibration();
        setCallState('incoming');
        setCallDuration(0);
        onClose();
    };

    const handleEndCall = () => {
        stopRingtone();
        stopVibration();
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setCallState('incoming');
        setCallDuration(0);
        onClose();
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fake-call-overlay">
            {callState === 'incoming' && (
                <div className="fake-call-screen incoming-call">
                    <div className="call-header">
                        <div className="call-status">Incoming Call</div>
                    </div>

                    <div className="caller-info">
                        <div className="caller-avatar">
                            <div className="avatar-circle">
                                {callerName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <h2 className="caller-name">{callerName}</h2>
                        <p className="caller-subtitle">Mobile</p>
                    </div>

                    <div className="call-actions">
                        <button
                            className="call-button reject-button"
                            onClick={handleReject}
                            aria-label="Reject call"
                        >
                            <PhoneOff size={28} />
                            <span>Decline</span>
                        </button>
                        <button
                            className="call-button accept-button"
                            onClick={handleAccept}
                            aria-label="Accept call"
                        >
                            <Phone size={28} />
                            <span>Accept</span>
                        </button>
                    </div>
                </div>
            )}

            {callState === 'active' && (
                <div className="fake-call-screen active-call">
                    <div className="call-header">
                        <div className="call-status">Call in Progress</div>
                    </div>

                    <div className="caller-info">
                        <div className="caller-avatar">
                            <div className="avatar-circle active">
                                {callerName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <h2 className="caller-name">{callerName}</h2>
                        <p className="call-timer">{formatDuration(callDuration)}</p>
                    </div>

                    <div className="call-hints">
                        <p className="hint-text">Talk naturally</p>
                        <p className="hint-text secondary">You can leave now</p>
                    </div>

                    <div className="call-controls">
                        <button
                            className="control-button mute-button"
                            aria-label="Mute"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            <span>Mute</span>
                        </button>

                        <button
                            className="control-button speaker-button"
                            aria-label="Speaker"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                            <span>Speaker</span>
                        </button>

                        <button
                            className="control-button keypad-button"
                            aria-label="Keypad"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            <span>Keypad</span>
                        </button>
                    </div>

                    <div className="end-call-container">
                        <button
                            className="end-call-button"
                            onClick={handleEndCall}
                            aria-label="End call"
                        >
                            <PhoneOff size={32} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FakeCall;
