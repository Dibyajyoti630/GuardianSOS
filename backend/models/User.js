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
    }
});

module.exports = mongoose.model('User', userSchema);
