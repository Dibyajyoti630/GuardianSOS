import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, MapPin, Battery, Signal, Shield, AlertTriangle } from 'lucide-react';
import '../styles/HistoryPreview.css';

const HistoryPreview = () => {
    const navigate = useNavigate();
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/activity?t=${Date.now()}`, {
                    headers: { 'x-auth-token': token }
                });

                if (response.ok) {
                    const data = await response.json();
                    setHistoryItems(data);
                }
            } catch (error) {
                console.error('Error fetching activity:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();

        // Refresh every 10 seconds to keep dashboard alive
        const interval = setInterval(fetchActivity, 10000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getIcon = (type, text) => {
        if (text.includes('SOS')) return <AlertTriangle size={16} color="#ef4444" />;
        if (text.includes('Warning')) return <AlertTriangle size={16} color="#f59e0b" />;
        switch (type) {
            case 'location': return <MapPin size={16} />;
            case 'battery': return <Battery size={16} />;
            case 'network': return <Signal size={16} />;
            case 'status': return <Shield size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getStatusStyle = (type, text) => {
        if (text.includes('SOS')) return 'emergency';      // Red
        if (text.includes('Warning')) return 'warning';    // Yellow
        if (type === 'location') return 'resolved';        // Greenish/Blue
        if (text.includes('Safe')) return 'resolved';      // Green
        return 'test'; // Default gray/neutral
    };

    return (
        <div className="history-preview">
            <div className="history-header">
                <span className="history-title">Recent Activity</span>
                <button className="view-all-btn" onClick={() => navigate('/guardiansos/user/evidence')}>View Evidence</button>
            </div>

            <div className="history-list">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#6b7280' }}>Loading activity...</div>
                ) : historyItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#6b7280' }}>No recent activity.</div>
                ) : (
                    <>
                        {(isExpanded ? historyItems : historyItems.slice(0, 5)).map((item) => (
                            <div key={item._id} className="history-item">
                                <div className="history-icon">
                                    {getIcon(item.type, item.text)}
                                </div>
                                <div className="history-info" style={{ flex: 1 }}>
                                    <span className={`history-status ${getStatusStyle(item.type, item.text)}`} style={{ display: 'block', marginBottom: '4px' }}>
                                        {item.text}
                                    </span>
                                    <span className="history-date" style={{ fontSize: '0.75rem' }}>{formatTime(item.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                        {historyItems.length > 5 && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginTop: '10px',
                                    background: 'transparent',
                                    border: '1px solid #374151',
                                    color: '#9ca3af',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => { e.target.style.background = '#1f2937'; e.target.style.color = 'white'; }}
                                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#9ca3af'; }}
                            >
                                {isExpanded ? 'Show Less' : `View All Activities (${historyItems.length})`}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default HistoryPreview;
