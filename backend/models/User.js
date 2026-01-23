const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'guardian'],
        default: 'user'
    },
    phone: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Safe', 'SOS', 'Warning'],
        default: 'Safe'
    },
    emergencyContact: {
        type: String
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows null values while maintaining uniqueness for non-null values
    },
    profilePicture: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastKnownLocation: {
        lat: Number,
        lng: Number,
        address: String,
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    batteryLevel: {
        type: Number
    }
});

module.exports = mongoose.model('User', userSchema);
