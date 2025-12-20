const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    relationship: {
        type: String,
        enum: ['Family', 'Friend', 'Colleague', 'Other', ''],
        default: ''
    },
    isPrimary: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
EmergencyContactSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);
