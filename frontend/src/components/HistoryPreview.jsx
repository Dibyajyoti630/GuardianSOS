import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import '../styles/HistoryPreview.css';

const HistoryPreview = () => {
    const navigate = useNavigate();
    const historyItems = [
        { id: 1, date: "Today, 10:23 AM", status: "False Alarm", type: "Test" },
        { id: 2, date: "Yesterday, 8:45 PM", status: "Resolved", type: "Emergency" },
    ];

    return (
        <div className="history-preview">
            <div className="history-header">
                <span className="history-title">Recent Activity</span>
                <button className="view-all-btn" onClick={() => navigate('/guardiansos/user/evidence')}>View Evidence</button>
            </div>

            <div className="history-list">
                {historyItems.map((item) => (
                    <div key={item.id} className="history-item">
                        <div className="history-icon">
                            <Clock size={16} />
                        </div>
                        <div className="history-info">
                            <span className="history-date">{item.date}</span>
                            <span className={`history-status ${item.type.toLowerCase()}`}>
                                {item.status}
                            </span>
                        </div>
                        <ChevronRight size={16} className="arrow-icon" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPreview;
