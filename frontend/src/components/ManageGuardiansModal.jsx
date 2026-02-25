import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Shield, AlertCircle } from 'lucide-react';
import '../styles/ManageGuardiansModal.css';

const ManageGuardiansModal = ({ isOpen, onClose }) => {
    const [guardians, setGuardians] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGuardians = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/connections/guardians', {
                headers: {
                    'x-auth-token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                setGuardians(data);
            }
        } catch (error) {
            console.error('Error fetching guardians:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchGuardians();
        }
    }, [isOpen]);

    const handleRemove = async (id, type) => {
        if (!window.confirm('Are you sure you want to remove this guardian? They will no longer be able to track you.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/connections/${id}?type=${type}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token
                }
            });

            if (response.ok) {
                // Remove from local state
                setGuardians(guardians.filter(g => g.id !== id));
                alert('Guardian removed successfully.');
            } else {
                alert('Failed to remove guardian.');
            }
        } catch (error) {
            console.error('Error removing guardian:', error);
            alert('Server error.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="manage-guardians-overlay" onClick={onClose}>
            <div className="manage-guardians-modal" onClick={(e) => e.stopPropagation()}>
                <div className="guardian-header">
                    <div className="header-title">
                        <Users size={24} />
                        <h2>Manage Guardians</h2>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <div className="guardian-list">
                    {loading ? (
                        <div className="empty-state">Loading...</div>
                    ) : guardians.length === 0 ? (
                        <div className="empty-state">
                            <Shield size={48} />
                            <p>No guardians added yet.</p>
                        </div>
                    ) : (
                        guardians.map((guardian) => (
                            <div key={guardian.id} className="guardian-item">
                                <div className="guardian-info">
                                    <span className="guardian-name">{guardian.name}</span>
                                    <span className="guardian-email">{guardian.email}</span>
                                    <span className={`guardian-status status-${guardian.status.toLowerCase()}`}>
                                        {guardian.status}
                                    </span>
                                </div>
                                <button
                                    className="remove-btn"
                                    onClick={() => handleRemove(guardian.id, guardian.type)}
                                    title="Remove Guardian"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageGuardiansModal;
