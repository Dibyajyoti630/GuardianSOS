import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, FileVideo, FileImage } from 'lucide-react';
import '../styles/EvidenceHistory.css';

const EvidenceHistory = () => {
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchEvidence();
    }, []);

    const fetchEvidence = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://127.0.0.1:5000/api/evidence', {
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                const data = await res.json();
                setEvidence(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getFileUrl = (filePath) => {
        // filePath in DB is like '/uploads/fileName.webm'
        // Need to prepend server base URL if it's relative
        if (filePath.startsWith('http')) return filePath;
        return `http://127.0.0.1:5000${filePath}`;
    };

    return (
        <div className="evidence-page">
            <header className="evidence-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1>Secure Evidence Vault</h1>
                <div style={{ width: 80 }}></div> {/* Spacer */}
            </header>

            {loading ? (
                <div className="loading">Loading evidence...</div>
            ) : (
                <div className="evidence-grid">
                    {evidence.length === 0 ? (
                        <div className="empty-state">
                            <p>No recorded evidence found.</p>
                        </div>
                    ) : (
                        evidence.map((item) => (
                            <div key={item._id} className="evidence-card">
                                <div className="media-wrapper">
                                    {item.type === 'video' ? (
                                        <video
                                            src={getFileUrl(item.filePath)}
                                            controls
                                            className="evidence-video"
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            src={getFileUrl(item.filePath)}
                                            alt="Evidence"
                                            className="evidence-video"
                                        />
                                    )}
                                </div>
                                <div className="evidence-details">
                                    <span className="evidence-date">
                                        <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                                        {formatDate(item.timestamp)}
                                    </span>
                                    {item.location && item.location.lat && (
                                        <div className="evidence-location">
                                            <MapPin size={14} />
                                            <span>
                                                {item.location.address || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`}
                                            </span>
                                        </div>
                                    )}
                                    <div className="evidence-meta">
                                        <span>{item.type === 'video' ? <FileVideo size={14} /> : <FileImage size={14} />} {item.type.toUpperCase()}</span>
                                        <span>ID: {item.deviceId ? item.deviceId.slice(0, 8) : 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default EvidenceHistory;
