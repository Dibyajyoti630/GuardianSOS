import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Phone, User, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import '../styles/EmergencyContacts.css';

const EmergencyContacts = ({ isOpen, onClose }) => {
    const [contacts, setContacts] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        email: '',
        relationship: ''
    });

    // API base URL
    const API_URL = 'http://127.0.0.1:5000/api/contacts';

    // Get auth token from localStorage
    const getAuthToken = () => {
        return localStorage.getItem('token');
    };

    // Fetch contacts from server
    const fetchContacts = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                setError('Please login to view contacts');
                setLoading(false);
                return;
            }

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch contacts');
            }

            const data = await response.json();
            setContacts(data);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setError('Failed to load contacts. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Load contacts when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    const handleAddContact = async (e) => {
        e.preventDefault();

        if (!newContact.name || !newContact.phone) {
            alert('Name and phone number are required!');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Please login to add contacts');
                return;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newContact)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Failed to add contact');
            }

            const addedContact = await response.json();
            setContacts([...contacts, addedContact]);
            setNewContact({ name: '', phone: '', email: '', relationship: '' });
            setShowAddForm(false);
        } catch (err) {
            console.error('Error adding contact:', err);
            alert(err.message || 'Failed to add contact. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteContact = async (id) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Please login to delete contacts');
                return;
            }

            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete contact');
            }

            setContacts(contacts.filter(contact => contact._id !== id));
        } catch (err) {
            console.error('Error deleting contact:', err);
            alert('Failed to delete contact. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCallContact = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    if (!isOpen) return null;

    return (
        <div className="emergency-contacts-overlay" onClick={onClose}>
            <div className="emergency-contacts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="emergency-contacts-header">
                    <div className="header-title">
                        <User size={24} className="header-icon" />
                        <h2>Emergency Contacts</h2>
                    </div>
                    <div className="header-actions">
                        <button
                            className="refresh-contacts-btn"
                            onClick={fetchContacts}
                            disabled={loading}
                            title="Refresh contacts"
                        >
                            <RefreshCw size={20} className={loading ? 'spinning' : ''} />
                        </button>
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="emergency-contacts-content">
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading && !showAddForm && (
                        <div className="loading-state">
                            <RefreshCw size={48} className="spinning" />
                            <p>Loading contacts...</p>
                        </div>
                    )}

                    {!loading && contacts.length === 0 && !showAddForm && (
                        <div className="empty-state">
                            <AlertCircle size={48} className="empty-icon" />
                            <h3>No Emergency Contacts</h3>
                            <p>Add trusted contacts who will be notified during emergencies</p>
                        </div>
                    )}

                    {!loading && contacts.length > 0 && !showAddForm && (
                        <div className="contacts-list">
                            {contacts.map((contact) => (
                                <div key={contact._id} className="contact-card">
                                    <div className="contact-avatar">
                                        <User size={24} />
                                    </div>
                                    <div className="contact-info">
                                        <h4>{contact.name}</h4>
                                        {contact.relationship && (
                                            <span className="relationship">{contact.relationship}</span>
                                        )}
                                        <div className="contact-details">
                                            <div className="detail-item">
                                                <Phone size={14} />
                                                <span>{contact.phone}</span>
                                            </div>
                                            {contact.email && (
                                                <div className="detail-item">
                                                    <Mail size={14} />
                                                    <span>{contact.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="contact-actions">
                                        <button
                                            className="call-btn"
                                            onClick={() => handleCallContact(contact.phone)}
                                            title="Call contact"
                                        >
                                            <Phone size={18} />
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteContact(contact._id)}
                                            title="Delete contact"
                                            disabled={loading}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showAddForm && (
                        <form className="add-contact-form" onSubmit={handleAddContact}>
                            <h3>Add New Contact</h3>

                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter contact name"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number *</label>
                                <input
                                    type="tel"
                                    placeholder="Enter phone number"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Email (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="Enter email address"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Relationship (Optional)</label>
                                <select
                                    value={newContact.relationship}
                                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                                    disabled={loading}
                                >
                                    <option value="">Select relationship</option>
                                    <option value="Family">Family</option>
                                    <option value="Friend">Friend</option>
                                    <option value="Colleague">Colleague</option>
                                    <option value="Neighbor">Neighbor</option>
                                    <option value="Guardian">Guardian</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewContact({ name: '', phone: '', email: '', relationship: '' });
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Contact'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {!showAddForm && (
                    <div className="emergency-contacts-footer">
                        <button
                            className="add-contact-btn"
                            onClick={() => setShowAddForm(true)}
                            disabled={loading}
                        >
                            <Plus size={20} />
                            Add Emergency Contact
                        </button>
                        <p className="footer-note">
                            💡 These contacts will be notified when you activate SOS
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmergencyContacts;
