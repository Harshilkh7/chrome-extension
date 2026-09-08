const express = require('express');
const { analyzeUserPermissions } = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/analyze', authMiddleware, analyzeUserPermissions);

module.exports = router;
