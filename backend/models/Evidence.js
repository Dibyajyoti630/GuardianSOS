const mongoose = require('mongoose');

const EvidenceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String, // 'video', 'image', 'audio'
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    deviceId: {
        type: String // To distinguish between Front/Back cam
    },
    batchId: {
        type: String // To group files from the same "session"
    }
});

module.exports = mongoose.model('Evidence', EvidenceSchema);
