const crypto = require('crypto');
const User = require('../models/User');
const RefreshSession = require('../models/RefreshSession');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ACCESS_TTL = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';
const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const hashJti = (jti) => crypto.createHash('sha256').update(jti).digest('hex');

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((cookies, part) => {
    const index = part.indexOf('='); if (index === -1) return cookies;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); return cookies;
  }, {});
}
function cookieOptions(maxAge, path = '/') {
  const production = process.env.NODE_ENV === 'production';
  return [`Max-Age=${Math.floor(maxAge / 1000)}`, `Path=${path}`, 'HttpOnly', `SameSite=${production ? 'None' : 'Lax'}`, ...(production ? ['Secure'] : [])].join('; ');
}
function clearCookie(name, path = '/') {
  return `${name}=; Max-Age=0; Path=${path}; HttpOnly; SameSite=${process.env.NODE_ENV === 'production' ? 'None' : 'Lax'}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
function setAuthCookies(res, accessToken, refreshToken) {
  res.append('Set-Cookie', `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; ${cookieOptions(15 * 60 * 1000)}`);
  res.append('Set-Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; ${cookieOptions(7 * 24 * 60 * 60 * 1000)}`);
}
const userView = (user) => ({ id: user._id, username: user.username, email: user.email });

async function createTokenPair(user) {
  const jti = crypto.randomUUID();
  const jtiHash = hashJti(jti);
  const refreshToken = jwt.sign({ id: user._id.toString(), type: 'refresh', jti }, getRefreshSecret(), { expiresIn: REFRESH_TTL });
  const accessToken = jwt.sign({ id: user._id.toString(), type: 'access', sid: jtiHash }, getAccessSecret(), { expiresIn: ACCESS_TTL });
  await RefreshSession.create({ userId: user._id, jtiHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  return { accessToken, refreshToken };
}

async function rotateRefreshToken(refreshToken) {
  const decoded = jwt.verify(refreshToken, getRefreshSecret());
  if (decoded.type !== 'refresh' || !decoded.id || !decoded.jti) throw new Error('Invalid refresh token');
  const session = await RefreshSession.findOneAndUpdate(
    { jtiHash: hashJti(decoded.jti), userId: decoded.id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );
  if (!session) throw new Error('Refresh session is revoked or expired');
  const user = await User.findById(decoded.id);
  if (!user) throw new Error('User not found');
  return { user, ...(await createTokenPair(user)) };
}

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email and password are required' });
    if (await User.findOne({ $or: [{ email }, { username }] })) return res.status(400).json({ error: 'User already exists' });
    const user = await User.create({ username, email, password: await bcrypt.hash(password, 10) });
    const { accessToken, refreshToken } = await createTokenPair(user);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user: userView(user) });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
    console.error('Register error:', err); res.status(500).json({ error: 'Server error' });
  }
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });
    const { accessToken, refreshToken } = await createTokenPair(user);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: userView(user) });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Server error' }); }
};
const refreshToken = async (req, res) => {
  try {
    const cookies = parseCookies(req); if (!cookies[REFRESH_COOKIE]) return res.status(401).json({ error: 'Refresh token required' });
    const { user, accessToken, refreshToken: nextRefreshToken } = await rotateRefreshToken(cookies[REFRESH_COOKIE]);
    setAuthCookies(res, accessToken, nextRefreshToken); res.json({ user: userView(user) });
  } catch (_) { res.status(401).json({ error: 'Refresh token is invalid or expired' }); }
};
const logout = async (req, res) => {
  const cookies = parseCookies(req);
  try {
    if (cookies[REFRESH_COOKIE]) {
      const decoded = jwt.verify(cookies[REFRESH_COOKIE], getRefreshSecret());
      if (decoded.jti) await RefreshSession.updateOne({ jtiHash: hashJti(decoded.jti), revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
  } catch (_) {}
  res.append('Set-Cookie', clearCookie(ACCESS_COOKIE)); res.append('Set-Cookie', clearCookie(REFRESH_COOKIE)); res.json({ message: 'Logged out successfully' });
};
const me = async (req, res) => { const user = await User.findById(req.user.id); if (!user) return res.status(401).json({ error: 'User not found' }); res.json({ user: userView(user) }); };
module.exports = { loginUser, registerUser, refreshToken, logout, me, parseCookies, ACCESS_COOKIE };
