import React, { useState, useEffect, useRef } from 'react';
import '../styles/SOSButton.css';

const SOSButton = ({ isActive, onCancel, onSingleClick, onMultiClick, onHold }) => {
    const [clickCount, setClickCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [ripples, setRipples] = useState([]);

    // Hold Timer
    const holdTimerRef = useRef(null);
    // Multi-click Timer
    const clickTimerRef = useRef(null);

    // Config
    const HOLD_DURATION = 2000; // 2 seconds to trigger SOS
    const MULTI_CLICK_TIME = 500; // Time window to count clicks
    const REQUIRED_CLICKS = 3; // 3 clicks to trigger SOS

    const triggerVibration = (pattern) => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(pattern);
        }
    };

    const addRipple = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        // clientX/clientY logic for touch or mouse
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        const x = clientX ? clientX - rect.left : 0;
        const y = clientY ? clientY - rect.top : 0;

        const newRipple = { x, y, size, id: Date.now() };
        setRipples(prev => [...prev, newRipple]);
    };

    useEffect(() => {
        if (ripples.length > 0) {
            const timer = setTimeout(() => {
                setRipples(prev => prev.slice(1));
            }, 600); // clear after animation
            return () => clearTimeout(timer);
        }
    }, [ripples]);

    const handlePointerDown = (e) => {
        if (isActive) return;

        addRipple(e);
        triggerVibration(50); // Light vibration on press
        setIsHolding(true);

        holdTimerRef.current = setTimeout(() => {
            setIsHolding(false);
            triggerVibration([200, 100, 200]); // Heavy vibration on hold complete
            if (onHold && !isActive) onHold(); // SOS State
        }, HOLD_DURATION);
    };

    const handlePointerUp = (e) => {
        if (isActive) {
            triggerVibration(50);
            if (onCancel) onCancel();
            return;
        }

        if (isHolding) {
            // Released before hold duration finished -> count as a click
            clearTimeout(holdTimerRef.current);
            setIsHolding(false);

            setClickCount(prev => {
                const newCount = prev + 1;

                if (newCount >= REQUIRED_CLICKS) {
                    triggerVibration([100, 100, 100, 100, 100]); // specific pattern for SOS trigger
                    if (onMultiClick && !isActive) onMultiClick();
                    return 0;
                }
                return newCount;
            });
        }
    };

    const handlePointerLeave = () => {
        if (isHolding) {
            clearTimeout(holdTimerRef.current);
            setIsHolding(false);
        }
    };

    useEffect(() => {
        // Handle multi-click evaluation timer
        if (clickCount > 0 && clickCount < REQUIRED_CLICKS) {
            clearTimeout(clickTimerRef.current);

            clickTimerRef.current = setTimeout(() => {
                if (clickCount === 1) {
                    if (onSingleClick && !isActive) onSingleClick(); // Warning State
                } else if (clickCount > 1) {
                    // Clicks > 1 but < REQUIRED_CLICKS (e.g., exactly 2 taps)
                    // You could add logic for double tap here if desired
                }
                setClickCount(0);
            }, MULTI_CLICK_TIME);
        }

        return () => clearTimeout(clickTimerRef.current);
    }, [clickCount, isActive, onMultiClick, onSingleClick]);

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
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerLeave}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: 'none' }} // Ensure no gestures interfere (e.g., zoom/scroll)
            >
                <div className="sos-text">
                    {isActive ? "Tap to Cancel" : "SOS"}
                </div>

                {isActive && (
                    <>
                        <div className="background-ripple"></div>
                        <div className="background-ripple"></div>
                    </>
                )}

                {!isActive && ripples.map(r => (
                    <span
                        key={r.id}
                        className="touch-ripple"
                        style={{
                            left: r.x !== 0 ? r.x : '50%',
                            top: r.y !== 0 ? r.y : '50%',
                            width: r.size,
                            height: r.size
                        }}
                    />
                ))}

                {isHolding && !isActive && (
                    <svg className="hold-progress" viewBox="0 0 100 100">
                        <circle className="hold-circle" cx="50" cy="50" r="46" />
                    </svg>
                )}
            </button>
            {!isActive && (
                <div className="sos-instructions">
                    <p className="sos-instruction">Tap once for Warning</p>
                    <p className="sos-instruction highlight-instruction">Tap 3 times or Hold for SOS</p>
                </div>
            )}
        </div>
    );
};

export default SOSButton;
