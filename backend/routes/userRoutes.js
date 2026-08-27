const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, deleteAccount } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/delete', authMiddleware, deleteAccount);

module.exports = router;
