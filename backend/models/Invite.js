const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    type: {
        type: String, // 'guardian_invite' or 'user_invite'
        default: 'guardian_invite'
    },
    inviterEmail: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Expire after 1 hour
    }
});

module.exports = mongoose.model('Invite', InviteSchema);
