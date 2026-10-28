const express = require('express');
const { saveFcmToken, removeFcmToken, sendTestFcmNotification } = require('../controllers/fcmController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/save', saveFcmToken);
router.delete('/remove', removeFcmToken);
router.post('/test', authorize('vendor', 'staff'), sendTestFcmNotification);

module.exports = router;
