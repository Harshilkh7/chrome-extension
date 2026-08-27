const express = require('express');
const router = express.Router();
const {
  logConsent,
  getUserConsents,
  updateConsent,
  checkOrigin,
} = require('../controllers/consentController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/log', authMiddleware, logConsent);
router.get('/my-consents', authMiddleware, getUserConsents);
router.put('/update/:id', authMiddleware, updateConsent);
router.post('/check-origin', authMiddleware, checkOrigin);

module.exports = router;
