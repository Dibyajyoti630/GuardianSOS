import React, { useState } from 'react';
import { X, UserPlus, Mail, Send, CheckCircle, Key } from 'lucide-react';
import '../styles/AddGuardianModal.css';

const AddGuardianModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState('input'); // 'input', 'sending', 'verify', 'verifying', 'connected'
    const [guardianName, setGuardianName] = useState('');
    const [guardianEmail, setGuardianEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [verifyError, setVerifyError] = useState('');

    const handleInvite = async () => {
        if (!guardianName.trim() || !guardianEmail.trim()) {
            alert('Please fill in both name and email.');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const inviterEmail = user.email || '';

        setStep('sending');

        try {
            const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/invite/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: guardianEmail,
                    name: guardianName,
                    type: 'guardian_request',
                    inviterEmail
                })
            });

            if (response.ok) {
                setStep('verify');
            } else {
                const data = await response.json();
                alert(data.msg || 'Failed to send invite');
                setStep('input');
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            alert('Server error. Please try again.');
            setStep('input');
        }
    };

    const handleVerify = async () => {
        if (!otpCode.trim() || otpCode.length < 6) {
            setVerifyError('Please enter the 6-digit code.');
            return;
        }

        setVerifyError('');
        setStep('verifying');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/invite/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    email: guardianEmail,
                    code: otpCode
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Save to localStorage for display in ManageGuardians
                const newGuardian = {
                    id: Date.now(),
                    name: guardianName,
                    email: guardianEmail,
                    status: 'active',
                    dateAdded: new Date().toISOString()
                };
                const existingGuardians = JSON.parse(localStorage.getItem('guardianContacts') || '[]');
                localStorage.setItem('guardianContacts', JSON.stringify([...existingGuardians, newGuardian]));

                setStep('connected');
            } else {
                setVerifyError(data.msg || 'Invalid or expired code. Please try again.');
                setStep('verify');
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            setVerifyError('Server error. Please try again.');
            setStep('verify');
        }
    };

    const handleClose = () => {
        setGuardianName('');
        setGuardianEmail('');
        setOtpCode('');
        setVerifyError('');
        setStep('input');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="add-guardian-overlay" onClick={handleClose}>
            <div className="add-guardian-modal" onClick={(e) => e.stopPropagation()}>
                <div className="guardian-header">
                    <div className="header-title">
                        <UserPlus size={24} />
                        <h2>Add a Guardian</h2>
                    </div>
                    <button className="close-btn" onClick={handleClose} aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <div className="guardian-content">
                    {/* Step 1: Input */}
                    {(step === 'input' || step === 'sending') && (
                        <>
                            <div className="form-group">
                                <label htmlFor="guardian-name">Guardian Name</label>
                                <div className="input-wrapper">
                                    <input
                                        id="guardian-name"
                                        type="text"
                                        className="form-input"
                                        value={guardianName}
                                        onChange={(e) => setGuardianName(e.target.value)}
                                        placeholder="Enter guardian's name"
                                        autoComplete="off"
                                        disabled={step === 'sending'}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="guardian-email">Guardian Email</label>
                                <div className="input-wrapper">
                                    <input
                                        id="guardian-email"
                                        type="email"
                                        className="form-input"
                                        value={guardianEmail}
                                        onChange={(e) => setGuardianEmail(e.target.value)}
                                        placeholder="Enter guardian's email"
                                        autoComplete="off"
                                        disabled={step === 'sending'}
                                    />
                                </div>
                                <p className="helper-text">
                                    A verification code will be sent to their email.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Step 2: Enter OTP */}
                    {(step === 'verify' || step === 'verifying') && (
                        <div className="verify-state">
                            <div className="verify-icon">
                                <Key size={40} color="#3b82f6" />
                            </div>
                            <h3>Enter Verification Code</h3>
                            <p>
                                A 6-digit code was sent to <strong>{guardianEmail}</strong>. Ask your guardian to share it with you, then enter it below.
                            </p>
                            <div className="form-group" style={{ marginTop: '1.25rem' }}>
                                <label htmlFor="otp-code">Verification Code</label>
                                <div className="input-wrapper">
                                    <input
                                        id="otp-code"
                                        type="text"
                                        className="form-input otp-input"
                                        value={otpCode}
                                        onChange={(e) => {
                                            setVerifyError('');
                                            setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                        }}
                                        placeholder="000000"
                                        maxLength={6}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        disabled={step === 'verifying'}
                                    />
                                </div>
                                {verifyError && (
                                    <p className="error-text">{verifyError}</p>
                                )}
                            </div>
                            <button
                                className="resend-link"
                                onClick={() => {
                                    setOtpCode('');
                                    setVerifyError('');
                                    setStep('input');
                                }}
                                disabled={step === 'verifying'}
                            >
                                ← Back / Resend code
                            </button>
                        </div>
                    )}

                    {/* Step 3: Connected */}
                    {step === 'connected' && (
                        <div className="success-state">
                            <div className="success-icon">
                                <CheckCircle size={48} color="#10b981" />
                            </div>
                            <h3>Guardian Connected!</h3>
                            <p>
                                <strong>{guardianName}</strong> is now your guardian and can monitor your location and receive your alerts.
                            </p>
                        </div>
                    )}
                </div>

                <div className="guardian-footer">
                    {step === 'input' || step === 'sending' ? (
                        <>
                            <button
                                className="cancel-btn"
                                onClick={handleClose}
                                disabled={step === 'sending'}
                            >
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleInvite}
                                disabled={step === 'sending'}
                            >
                                {step === 'sending' ? (
                                    'Sending...'
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Send Invite
                                    </>
                                )}
                            </button>
                        </>
                    ) : step === 'verify' || step === 'verifying' ? (
                        <>
                            <button
                                className="cancel-btn"
                                onClick={handleClose}
                                disabled={step === 'verifying'}
                            >
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleVerify}
                                disabled={step === 'verifying' || otpCode.length < 6}
                            >
                                {step === 'verifying' ? 'Verifying...' : 'Verify & Connect'}
                            </button>
                        </>
                    ) : (
                        <button className="save-btn full-width" onClick={handleClose}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddGuardianModal;
