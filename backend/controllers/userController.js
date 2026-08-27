const User = require('../models/User');

// GET /api/user/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/user/profile  (username only — email is immutable here)
exports.updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { username: username.trim() },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'That username is already taken' });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// DELETE /api/user/delete
exports.deleteAccount = async (req, res) => {
  try {
    const ConsentLog = require('../models/ConsentLog');
    await User.findByIdAndDelete(req.user.id);
    await ConsentLog.deleteMany({ userId: req.user.id });
    res.json({ message: 'User account deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
