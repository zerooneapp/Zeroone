const express = require('express');
const { updateProfile, deleteAccount, toggleFavorite, getFavorites } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.patch('/profile', protect, updateProfile);
router.delete('/profile', protect, deleteAccount);
router.post('/favorites/toggle', protect, toggleFavorite);
router.get('/favorites', protect, getFavorites);

module.exports = router;
