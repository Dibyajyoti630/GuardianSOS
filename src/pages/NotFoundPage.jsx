import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import '../styles/NotFoundPage.css';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-container">
            <div className="not-found-icon">
                <AlertTriangle size={80} color="var(--color-warning)" />
            </div>
            <h1 className="not-found-title">404</h1>
            <h2 className="not-found-subtitle">Page Not Found</h2>
            <p className="not-found-text">
                Oops! The page you are looking for seems to have gone missing or the link is broken.
            </p>
            <button className="home-button" onClick={() => navigate('/')}>
                <Home size={20} />
                <span>Go Back Home</span>
            </button>
        </div>
    );
};

export default NotFoundPage;
