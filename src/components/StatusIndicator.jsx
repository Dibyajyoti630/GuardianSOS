import React from 'react';
import { ShieldCheck, ShieldAlert, Signal, Battery, Wifi } from 'lucide-react';
import '../styles/StatusIndicator.css';

const StatusIndicator = ({ isActive }) => {
    return (
        <div className={`status-card ${isActive ? 'danger' : 'safe'}`}>
            <div className="status-main">
                {isActive ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
                <span className="status-label">
                    {isActive ? 'SOS ALERT • RECORDING' : 'YOU ARE SAFE'}
                </span>
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
