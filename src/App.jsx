import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import NotFoundPage from './pages/NotFoundPage'
import GuardianDashboard from './pages/GuardianDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <BrowserRouter>
                <div className="app-container">
                    <Routes>
                        <Route path="/" element={<Navigate to="/guardiansos/user/login" replace />} />
                        <Route
                            path="/guardiansos/user/login"
                            element={<AuthPage role="user" />}
                        />
                        <Route
                            path="/guardiansos/guardian/login"
                            element={<AuthPage role="guardian" />}
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/guardian-dashboard"
                            element={
                                <ProtectedRoute>
                                    <GuardianDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </div>
            </BrowserRouter>
        </GoogleOAuthProvider>
    )
}

export default App
