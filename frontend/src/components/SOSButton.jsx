import React, { useState, useEffect, useRef } from 'react';
import '../styles/SOSButton.css';

const SOSButton = ({ isActive, onCancel, onSingleClick, onMultiClick, onHold }) => {
    const [clickCount, setClickCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);

    // Hold Timer
    const holdTimerRef = useRef(null);
    // Multi-click Timer
    const clickTimerRef = useRef(null);

    // Config
    const HOLD_DURATION = 2000; // 2 seconds to trigger SOS
    const MULTI_CLICK_TIME = 500; // Time window to count clicks
    const REQUIRED_CLICKS = 3; // 3 clicks to trigger SOS

    useEffect(() => {
        // Handle multi-click evaluation
        if (clickCount > 0) {
            clearTimeout(clickTimerRef.current);

            if (clickCount >= REQUIRED_CLICKS) {
                setClickCount(0);
                if (onMultiClick && !isActive) onMultiClick();
            } else {
                // Wait to see if they click again
                clickTimerRef.current = setTimeout(() => {
                    if (clickCount === 1) {
                        if (onSingleClick && !isActive) onSingleClick(); // Warning State
                    }
                    setClickCount(0);
                }, MULTI_CLICK_TIME);
            }
        }

        return () => clearTimeout(clickTimerRef.current);
    }, [clickCount, isActive, onMultiClick, onSingleClick]);

    const handlePointerDown = (e) => {
        if (isActive) return; // Don't trigger new actions if already active

        setIsHolding(true);
        holdTimerRef.current = setTimeout(() => {
            setIsHolding(false);
            if (onHold && !isActive) onHold(); // SOS State
        }, HOLD_DURATION);
    };

    const handlePointerUp = (e) => {
        if (isActive) {
            // If already active, any click is a cancel intention
            if (onCancel) onCancel();
            return;
        }

        if (isHolding) {
            // Released before hold duration finished -> count as a click
            clearTimeout(holdTimerRef.current);
            setIsHolding(false);
            setClickCount(prev => prev + 1);
        }
    };

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            clearTimeout(holdTimerRef.current);
            clearTimeout(clickTimerRef.current);
        };
    }, []);

    return (
        <div className="sos-wrapper">
            <button
                className={`sos-btn ${isActive ? 'active' : ''} ${isHolding ? 'holding' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
                style={{ touchAction: 'manipulation' }} // Prevent scrolling while touching
            >
                <div className="sos-text">
                    {isActive ? "Tap to Cancel" : "SOS"}
                </div>
                {isActive && (
                    <>
                        <div className="ripple"></div>
                        <div className="ripple"></div>
                    </>
                )}
            </button>
            {!isActive && (
                <p className="sos-instruction">
                    Tap once for Warning<br />
                    Tap 3 times or Hold for SOS
                </p>
            )}
        </div>
    );
};

export default SOSButton;
