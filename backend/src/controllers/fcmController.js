const User = require('../models/User');
const Staff = require('../models/Staff');
const NotificationService = require('../services/notificationService');

const saveFcmToken = async (req, res) => {
    try {
        const { token, platform } = req.body;
        const actor = req.user || req.staff;
        const normalizedToken = typeof token === 'string' ? token.trim() : '';
        const normalizedPlatform = String(platform || 'web').trim().toLowerCase();

        console.log('[FCM-DEBUG] Received save request:', { platform, tokenLength: token?.length, actorId: actor?._id });

        if (!normalizedToken) return res.status(400).json({ message: 'Token is required' });
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

        // 🛡️ SECURITY SWEEP: Remove this token from ALL other accounts to prevent cross-contamination
        // This heals the database if tokens were entangled during the old logout bug.
        await Promise.all([
            User.updateMany(
                { $or: [{ fcmTokens: normalizedToken }, { fcmTokenMobile: normalizedToken }] },
                { $pull: { fcmTokens: normalizedToken, fcmTokenMobile: normalizedToken } }
            ),
            Staff.updateMany(
                { $or: [{ fcmTokens: normalizedToken }, { fcmTokenMobile: normalizedToken }] },
                { $pull: { fcmTokens: normalizedToken, fcmTokenMobile: normalizedToken } }
            )
        ]);

        const tokenField = ['mobile', 'app', 'android', 'ios'].includes(normalizedPlatform)
            ? 'fcmTokenMobile'
            : 'fcmTokens';

        // Use an atomic update instead of document.save(). Multiple tabs or
        // React StrictMode can register the same FCM token simultaneously;
        // document.save() then races on the User version and returns 500.
        //
        // Keep the few newest web tokens: one per browser/origin (e.g. the live
        // site and localhost open at the same time for one account). The token
        // was pulled above, so $push cannot create duplicates; old/expired
        // tokens are dropped by $slice and by FCM-failure cleanup.
        const tokenUpdate = tokenField === 'fcmTokens'
            ? { $push: { fcmTokens: { $each: [normalizedToken], $slice: -3 } } }
            : { $addToSet: { fcmTokenMobile: normalizedToken } };

        await entity.constructor.updateOne(
            { _id: entity._id },
            tokenUpdate
        );

        console.log('[FCM-DEBUG] Token saved successfully for:', actor._id, tokenField);
        res.status(200).json({ message: 'Token saved successfully', platform: tokenField });
    } catch (error) {
        console.error('[FCM-DEBUG-ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

const removeFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        console.log('[FCM-DEBUG] Received remove token request for token:', token.slice(0, 15) + '...');

        // Unlink token globally across User and Staff collections
        await Promise.all([
            User.updateMany(
                { $or: [{ fcmTokens: token }, { fcmTokenMobile: token }] },
                { $pull: { fcmTokens: token, fcmTokenMobile: token } }
            ),
            Staff.updateMany(
                { $or: [{ fcmTokens: token }, { fcmTokenMobile: token }] },
                { $pull: { fcmTokens: token, fcmTokenMobile: token } }
            )
        ]);

        console.log('[FCM-DEBUG] Token unlinked successfully from all accounts');
        res.status(200).json({ message: 'Token removed successfully' });
    } catch (error) {
        console.error('[FCM-DEBUG-ERROR] Token removal failed:', error.message);
        res.status(500).json({ message: error.message });
    }
};

const sendTestFcmNotification = async (req, res) => {
    try {
        const actor = req.user || req.staff;
        const platform = String(req.body?.platform || 'web').trim().toLowerCase();

        if (!actor) return res.status(401).json({ message: 'Unauthorized' });
        if (!['web', 'mobile'].includes(platform)) {
            return res.status(400).json({ message: 'Platform must be web or mobile' });
        }

        // Staff logins keep their token on the Staff document, vendors on User.
        const entity = req.staff
            ? await Staff.findById(actor._id).select('fcmTokens fcmTokenMobile')
            : await User.findById(actor._id).select('fcmTokens fcmTokenMobile');
        const tokens = platform === 'mobile'
            ? (entity?.fcmTokenMobile || [])
            : (entity?.fcmTokens || []);

        if (!tokens.length) {
            return res.status(404).json({
                message: 'No ' + platform + ' FCM token is saved for this account',
                platform,
                tokenCount: 0
            });
        }

        const result = await NotificationService.sendTestPush(actor._id, platform);
        return res.status(200).json({
            message: platform + ' test notification processed',
            platform,
            tokenCount: tokens.length,
            ...(result || {})
        });
    } catch (error) {
        console.error('[FCM-TEST-ERROR]', error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { saveFcmToken, removeFcmToken, sendTestFcmNotification };
