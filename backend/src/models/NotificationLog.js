const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tokens: [String],
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // auto delete after 24h as per SOP
    }
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
