const jwt = require('jsonwebtoken');
const RefreshSession = require('../models/RefreshSession');
const { parseCookies, ACCESS_COOKIE } = require('../controllers/authController');

module.exports = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies[ACCESS_COOKIE];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
    if (!decoded || decoded.type !== 'access' || !decoded.id || !decoded.sid) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const session = await RefreshSession.findOne({ jtiHash: decoded.sid, userId: decoded.id, revokedAt: null });
    if (!session || session.expiresAt <= new Date()) {
      return res.status(401).json({ error: 'Session revoked or expired' });
    }

    req.user = { id: decoded.id, sessionId: session._id.toString() };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
};
