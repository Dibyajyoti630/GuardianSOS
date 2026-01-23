const mongoose = require('mongoose');

const SOSSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    startLocation: {
        lat: Number,
        lng: Number,
        address: String
    },
    locationHistory: [{
        lat: Number,
        lng: Number,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('SOS', SOSSchema);
