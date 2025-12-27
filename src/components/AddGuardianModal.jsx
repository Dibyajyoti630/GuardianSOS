import React, { useState } from 'react';
import { X, UserPlus, Mail, Send, CheckCircle } from 'lucide-react';
import '../styles/AddGuardianModal.css';

const AddGuardianModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState('input'); // 'input', 'sending', 'sent'
    const [guardianName, setGuardianName] = useState('');
    const [guardianEmail, setGuardianEmail] = useState('');

    const handleInvite = async () => {
        if (!guardianName.trim() || !guardianEmail.trim()) {
            alert('Please fill in both name and email.');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const inviterEmail = user.email || '';

        setStep('sending');

        try {
            const response = await fetch('http://127.0.0.1:5000/api/invite/send', {
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
                const newGuardian = {
                    id: Date.now(),
                    name: guardianName,
                    email: guardianEmail,
                    status: 'pending', // pending, active
                    dateAdded: new Date().toISOString()
                };

                // Get existing guardians from localStorage
                const existingGuardians = JSON.parse(localStorage.getItem('guardianContacts') || '[]');
                const updatedGuardians = [...existingGuardians, newGuardian];

                // Save to localStorage
                localStorage.setItem('guardianContacts', JSON.stringify(updatedGuardians));

                setStep('sent');
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

    const handleClose = () => {
        setGuardianName('');
        setGuardianEmail('');
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
                    {step === 'input' || step === 'sending' ? (
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
                                    They will receive an email with a link to connect with you.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="success-state">
                            <div className="success-icon">
                                <CheckCircle size={48} color="#10b981" />
                            </div>
                            <h3>Invite Sent Successfully!</h3>
                            <p>
                                An invitation has been sent to <strong>{guardianEmail}</strong>.
                                Once they accept, you will be able to share your location and alerts with them.
                            </p>
                        </div>
                    )}
                </div>

                <div className="guardian-footer">
                    {step !== 'sent' ? (
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
