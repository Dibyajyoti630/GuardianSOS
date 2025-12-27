const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
    guardian: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId, // The one being tracked
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    startedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Connection', ConnectionSchema);
