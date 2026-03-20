import React from 'react';
import { Shield, HeartPulse, Flame, UserCheck, X, PhoneCall } from 'lucide-react';
import { EMERGENCY_CONTACTS_ARRAY } from '../utils/emergencyContacts';
import '../styles/EmergencyCallModal.css';

// Map contact icon names → lucide components
const ICON_MAP = {
    Shield,
    HeartPulse,
    Flame,
    UserCheck
};

/**
 * EmergencyCallModal
 * Reusable modal for both user and guardian dashboards.
 *
 * Props:
 *   isOpen          {boolean}  - Whether the modal is visible
 *   onClose         {function} - Called when the modal should close
 *   onContactSelected {function} - Called with the contact object after selection
 *   context         {string}   - 'user' | 'guardian' (informational only)
 */
const EmergencyCallModal = ({ isOpen, onClose, onContactSelected, context = 'user' }) => {
    if (!isOpen) return null;

    const handleContactClick = (contact) => {
        // 1. Open phone dialer immediately — do not wait for backend
        window.open(`tel:${contact.number}`, '_self');

        // 2. Notify parent to log the event
        if (typeof onContactSelected === 'function') {
            onContactSelected(contact);
        }

        // 3. Close modal
        onClose();
    };

    return (
        <div
            className="emergency-modal-overlay"
            onClick={(e) => {
                // Close when clicking the backdrop (not the card itself)
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Emergency Contacts"
        >
            <div className="emergency-modal-card">
                {/* Header */}
                <div className="emergency-modal-header">
                    <div className="emergency-modal-title">
                        <span className="modal-title-icon">🆘</span>
                        <h2>Emergency Contacts</h2>
                    </div>
                    <button
                        className="emergency-modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="emergency-modal-subtitle">
                    Tap a contact to call immediately. All actions are logged.
                </p>

                {/* Contact cards */}
                <div className="emergency-contacts-grid">
                    {EMERGENCY_CONTACTS_ARRAY.map((contact) => {
                        const IconComponent = ICON_MAP[contact.icon] || Shield;
                        return (
                            <button
                                key={contact.key}
                                className="emergency-contact-card"
                                style={{
                                    borderLeftColor: contact.color,
                                    borderLeftWidth: '4px',
                                    '--card-color': contact.color
                                }}
                                onClick={() => handleContactClick(contact)}
                                aria-label={`Call ${contact.name} at ${contact.number}`}
                            >
                                <div
                                    className="emergency-contact-icon"
                                    style={{ color: contact.color }}
                                >
                                    <IconComponent size={26} strokeWidth={1.8} />
                                </div>
                                <div className="emergency-contact-info">
                                    <p className="emergency-contact-name">{contact.name}</p>
                                    <p className="emergency-contact-number">{contact.number}</p>
                                </div>
                                <PhoneCall size={16} className="emergency-contact-arrow" style={{ color: contact.color, opacity: 0.7 }} />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default EmergencyCallModal;
