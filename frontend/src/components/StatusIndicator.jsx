import React from 'react';
import { ShieldCheck, ShieldAlert, Eye, Signal, Battery } from 'lucide-react';
import '../styles/StatusIndicator.css';

const StatusIndicator = ({ isActive, trackingInfo }) => {
    // trackingInfo = { isTracking: boolean, names: ['Name1', 'Name2'] }

    const getStatusConfig = () => {
        if (isActive) {
            return {
                className: 'danger',
                icon: <ShieldAlert size={32} />,
                text: 'SOS ALERT • RECORDING'
            };
        } else if (trackingInfo && trackingInfo.isTracking) {
            const names = trackingInfo.names.join(', ');
            return {
                className: 'tracking',
                icon: <Eye size={32} />,
                text: `TRACKED BY ${names.toUpperCase()}`
            };
        } else {
            return {
                className: 'safe',
                icon: <ShieldCheck size={32} />,
                text: 'YOU ARE SAFE'
            };
        }
    };

    const { className, icon, text } = getStatusConfig();

    return (
        <div className={`status-card ${className}`}>
            <div className="status-main">
                {icon}
                <span className="status-label">{text}</span>
            </div>

            <div className="system-status">
                <div className="status-item">
                    <Signal size={14} />
                    <span>LTE</span>
                </div>
                <div className="status-item">
                    <Battery size={14} />
                    <span>85%</span>
                </div>
            </div>
        </div>
    );
};

export default StatusIndicator;
