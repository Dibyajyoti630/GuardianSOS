import React, { useState } from 'react'
import DashboardHeader from '../components/DashboardHeader'
import SOSButton from '../components/SOSButton'
import StatusIndicator from '../components/StatusIndicator'
import LocationCard from '../components/LocationCard'
import QuickActions from '../components/QuickActions'
import HistoryPreview from '../components/HistoryPreview'
import '../styles/Dashboard.css'

const Dashboard = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || { name: 'Guest' });
    const [isSOSActive, setIsSOSActive] = useState(false);
    const [trackingInfo, setTrackingInfo] = useState({ isTracking: false, names: [] });

    React.useEffect(() => {
        const checkTrackingStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(`http://127.0.0.1:5000/api/connections/guardians?t=${new Date().getTime()}`, {
                    headers: { 'x-auth-token': token }
                });

                if (res.ok) {
                    const data = await res.json();

                    // Filter guardians who are active
                    const activeGuardians = data.filter(g => g.status === 'active');

                    if (activeGuardians.length > 0) {
                        const names = activeGuardians.map(g => g.name || 'Guardian');
                        setTrackingInfo({ isTracking: true, names });
                    } else {
                        setTrackingInfo({ isTracking: false, names: [] });
                    }
                }
            } catch (err) {
                console.error('Error fetching tracking status:', err);
            }
        };

        checkTrackingStatus();
        const interval = setInterval(checkTrackingStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleSOSActivate = () => {
        setIsSOSActive(true);
        // Logic for countdown and alert
    };

    const handleSOSCancel = () => {
        setIsSOSActive(false);
    };

    return (
        <div className="dashboard">
            <DashboardHeader user={user} />

            <main className="dashboard-content">
                <StatusIndicator isActive={isSOSActive} trackingInfo={trackingInfo} />

                <div className="sos-container">
                    <SOSButton
                        isActive={isSOSActive}
                        onActivate={handleSOSActivate}
                        onCancel={handleSOSCancel}
                    />
                </div>

                <section className="info-section">
                    <LocationCard />
                </section>

                <section className="actions-section">
                    <QuickActions />
                </section>

                <HistoryPreview />
            </main>
        </div>
    )
}

export default Dashboard
