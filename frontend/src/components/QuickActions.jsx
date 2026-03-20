import React, { useState, useRef, useEffect } from 'react';
import { Phone, Users, Volume2, VolumeX } from 'lucide-react';
import EmergencyContacts from './EmergencyContacts';
import FakeCall from './FakeCall';
import EmergencyCallModal from './EmergencyCallModal';
import '../styles/QuickActions.css';

const QuickActions = ({ socket, userId }) => {
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [showFakeCall, setShowFakeCall] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [isSirenPlaying, setIsSirenPlaying] = useState(false);

    const audioContextRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);

    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const toggleSiren = () => {
        if (isSirenPlaying) {
            stopSiren();
        } else {
            startSiren();
        }
    };

    const startSiren = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();

            const osc = audioContextRef.current.createOscillator();
            const gain = audioContextRef.current.createGain();

            // Create a piercing square wave for maximum loudness/attention
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, audioContextRef.current.currentTime);

            // LFO for the siren wail effect
            const lfo = audioContextRef.current.createOscillator();
            lfo.type = 'sawtooth';
            lfo.frequency.value = 2; // 2Hz wail

            const lfoGain = audioContextRef.current.createGain();
            lfoGain.gain.value = 200; // Modulate frequency by +/- 200Hz

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.connect(gain);
            gain.connect(audioContextRef.current.destination);

            osc.start();
            lfo.start();

            setIsSirenPlaying(true);
        } catch (error) {
            console.error("Failed to start siren:", error);
        }
    };

    const stopSiren = () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsSirenPlaying(false);
    };

    const handleActionClick = (label) => {
        if (label === 'Contacts') {
            setShowContactsModal(true);
        } else if (label === 'Fake Call') {
            setShowFakeCall(true);
        } else if (label === 'Emergency') {
            setShowEmergencyModal(true);
        } else if (label === 'Siren') {
            toggleSiren();
        } else {
            // Placeholder for other actions
            console.log(`${label} clicked`);
        }
    };

    const actions = [
        { icon: <Phone size={24} />, label: "Fake Call", color: "#4CC9F0" },
        { icon: <Users size={24} />, label: "Contacts", color: "#4361EE" },
        { icon: <span style={{ fontSize: '1.4rem' }}>📞</span>, label: "Emergency", color: "#EF4444" },
        {
            icon: isSirenPlaying ? <VolumeX size={24} /> : <Volume2 size={24} />,
            label: "Siren",
            color: isSirenPlaying ? "#FF0000" : "#FA7921",
            isActive: isSirenPlaying
        },
    ];

    return (
        <>
            <div className="quick-actions-grid">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className={`action-card ${action.isActive ? 'active-siren' : ''}`}
                        style={{
                            '--accent-color': action.color,
                            backgroundColor: action.isActive ? '#ffe5e5' : undefined,
                            borderColor: action.isActive ? '#ff0000' : undefined
                        }}
                        onClick={() => handleActionClick(action.label)}
                    >
                        <div className="icon-wrapper" style={{ backgroundColor: action.color }}>
                            {action.icon}
                        </div>
                        <span className="action-label">
                            {action.isActive ? "Stop" : action.label}
                        </span>
                    </button>
                ))}
            </div>

            <EmergencyContacts
                isOpen={showContactsModal}
                onClose={() => setShowContactsModal(false)}
            />

            <FakeCall
                isOpen={showFakeCall}
                onClose={() => setShowFakeCall(false)}
            />

            <EmergencyCallModal
                isOpen={showEmergencyModal}
                onClose={() => setShowEmergencyModal(false)}
                context="user"
                onContactSelected={(contact) => {
                    if (socket && userId) {
                        socket.emit('emergency:call-initiated', {
                            userId,
                            contactType: contact.key,
                            contactName: contact.name,
                            number: contact.number,
                            timestamp: new Date()
                        });
                    }
                }}
            />
        </>
    );
};

export default QuickActions;
