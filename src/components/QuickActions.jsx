import React, { useState } from 'react';
import { Phone, Users, Video, Volume2 } from 'lucide-react';
import EmergencyContacts from './EmergencyContacts';
import '../styles/QuickActions.css';

const QuickActions = () => {
    const [showContactsModal, setShowContactsModal] = useState(false);

    const handleActionClick = (label) => {
        if (label === 'Contacts') {
            setShowContactsModal(true);
        } else {
            // Placeholder for other actions
            console.log(`${label} clicked`);
        }
    };

    const actions = [
        { icon: <Phone size={24} />, label: "Fake Call", color: "#4CC9F0" },
        { icon: <Users size={24} />, label: "Contacts", color: "#4361EE" },
        { icon: <Video size={24} />, label: "Record", color: "#F72585" },
        { icon: <Volume2 size={24} />, label: "Siren", color: "#FA7921" },
    ];

    return (
        <>
            <div className="quick-actions-grid">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className="action-card"
                        style={{ '--accent-color': action.color }}
                        onClick={() => handleActionClick(action.label)}
                    >
                        <div className="icon-wrapper" style={{ backgroundColor: action.color }}>
                            {action.icon}
                        </div>
                        <span className="action-label">{action.label}</span>
                    </button>
                ))}
            </div>

            <EmergencyContacts
                isOpen={showContactsModal}
                onClose={() => setShowContactsModal(false)}
            />
        </>
    );
};

export default QuickActions;
