const express = require('express');
const { saveFcmToken, removeFcmToken } = require('../controllers/fcmController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/save', saveFcmToken);
router.delete('/remove', removeFcmToken);

module.exports = router;
