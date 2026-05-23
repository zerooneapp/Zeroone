const User = require('../models/User');
const Staff = require('../models/Staff');

const saveFcmToken = async (req, res) => {
    try {
        const { token, platform } = req.body;
        const actor = req.user || req.staff;

        console.log('[FCM-DEBUG] Received save request:', { platform, tokenLength: token?.length, actorId: actor?._id });

        if (!token) return res.status(400).json({ message: 'Token is required' });
        if (!actor) return res.status(401).json({ message: 'Unauthorized' });

        // Find the entity (User or Staff)
        let entity = await User.findById(actor._id);
        if (!entity && req.staff) {
            entity = await Staff.findById(actor._id);
        }

        if (!entity) {
            console.log('[FCM-DEBUG] Entity not found in database:', actor._id);
            return res.status(404).json({ message: 'User/Staff not found' });
        }

        if (platform === 'mobile' || platform === 'app') {
            if (!entity.fcmTokenMobile) entity.fcmTokenMobile = [];
            if (!entity.fcmTokenMobile.includes(token)) {
                entity.fcmTokenMobile.push(token);
                if (entity.fcmTokenMobile.length > 10) entity.fcmTokenMobile.shift();
            }
        } else {
            // Web
            if (!entity.fcmTokens) entity.fcmTokens = [];
            if (!entity.fcmTokens.includes(token)) {
                entity.fcmTokens.push(token);
                if (entity.fcmTokens.length > 10) entity.fcmTokens.shift();
            }
        }

        await entity.save();
        console.log('[FCM-DEBUG] Token saved successfully for:', actor._id);
        res.status(200).json({ message: 'Token saved successfully' });
    } catch (error) {
        console.error('[FCM-DEBUG-ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

const removeFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        const actor = req.user || req.staff;
        let entity = await User.findById(actor?._id);
        if (!entity && req.staff) entity = await Staff.findById(actor?._id);

        if (!entity) return res.status(404).json({ message: 'Entity not found' });

        if (entity.fcmTokens) entity.fcmTokens = entity.fcmTokens.filter(t => t !== token);
        if (entity.fcmTokenMobile) entity.fcmTokenMobile = entity.fcmTokenMobile.filter(t => t !== token);

        await entity.save();
        res.status(200).json({ message: 'Token removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { saveFcmToken, removeFcmToken };
