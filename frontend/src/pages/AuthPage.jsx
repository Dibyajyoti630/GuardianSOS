import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import '../styles/AuthPage.css';

const AuthPage = ({ role }) => {
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        emergencyContact: ''
    });

    const handleAuth = async (e) => {
        e.preventDefault();

        const endpoint = isLogin ? 'https://guardiansos-backend.onrender.com/api/auth/login' : 'https://guardiansos-backend.onrender.com/api/auth/signup';

        const body = isLogin
            ? { email: formData.email, password: formData.password }
            : {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: role, // 'user' or 'guardian' passed as prop
                emergencyContact: formData.emergencyContact
            };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                // Save token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user.role === 'guardian') {
                    navigate('/guardian-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                alert(data.msg || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert('Server error. Please try again later.');
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                // Get user info from Google
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                });

                const userInfo = await userInfoResponse.json();

                // Send to backend for verification and user creation/login
                const response = await fetch('https://guardiansos-backend.onrender.com/api/auth/google', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        credential: tokenResponse.access_token,
                        role: role,
                        userInfo: userInfo
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (data.user.role === 'guardian') {
                        navigate('/guardian-dashboard');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    console.error('Backend error:', data);
                    alert(data.msg || 'Google authentication failed');
                }
            } catch (error) {
                console.error('Google login error:', error);
                console.error('Error details:', error.message);
                alert('Failed to login with Google. Please try again.');
            }
        },
        onError: () => {
            console.error('Google Login Failed');
            alert('Google login failed. Please try again.');
        },
        flow: 'implicit',
    });

    const isUser = role === 'user';
    const roleTitle = isUser ? 'User' : 'Guardian';

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-wrapper">
                        <ShieldCheck size={40} className="auth-logo" />
                    </div>
                    <h1>GuardianSOS</h1>
                    <p className="auth-subtitle">
                        {roleTitle} {isLogin ? 'Login' : 'Registration'}
                    </p>
                </div>


                <form onSubmit={handleAuth} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <User size={20} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <User size={20} className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={20} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {!isLogin && isUser && (
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Emergency Contact (Optional)"
                                value={formData.emergencyContact}
                                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                            />
                        </div>
                    )}

                    <button type="submit" className="auth-submit-btn">
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={20} />
                    </button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <button
                    type="button"
                    className="google-btn"
                    onClick={handleGoogleLogin}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            className="toggle-auth-btn"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
