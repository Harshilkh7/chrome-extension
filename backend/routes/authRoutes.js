const express = require('express');
const router = express.Router();
const { registerUser, loginUser, refreshToken, logout, me } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);

module.exports = router;
