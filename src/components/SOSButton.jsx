import React, { useState, useEffect } from 'react';
import '../styles/SOSButton.css';

const SOSButton = ({ isActive, onActivate, onCancel }) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        let timer;
        if (isActive && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (isActive && countdown === 0) {
            // Countdown finished, alert sent (managed by parent or here)
        } else if (!isActive) {
            setCountdown(5); // Reset
        }
        return () => clearInterval(timer);
    }, [isActive, countdown]);

    return (
        <div className="sos-wrapper">
            <button
                className={`sos-btn ${isActive ? 'active' : ''}`}
                onClick={isActive ? onCancel : onActivate}
            >
                <div className="sos-text">
                    {isActive ? (
                        <span className="countdown">{countdown}</span>
                    ) : (
                        "SOS"
                    )}
                </div>
                <div className="ripple"></div>
                <div className="ripple"></div>
            </button>
            {isActive && <p className="sos-instruction">Tap to Cancel</p>}
        </div>
    );
};

export default SOSButton;
