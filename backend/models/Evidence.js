const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['SOS_TRIGGER', 'MANUAL_CAPTURE', 'GUARDIAN_REQUEST'],
    required: true
  },
  cameraType: {
    type: String,
    enum: ['environment', 'user'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String
  },
  thumbnailUrl: {
    type: String
  },
  format: {
    type: String
  },
  size: {
    type: Number
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  viewedBy: [{
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: Date
  }]
});

const Evidence = mongoose.model('Evidence', evidenceSchema);

module.exports = Evidence;
