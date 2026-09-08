const PermissionControl = require('../models/PermissionControl');

const SUPPORTED_PERMISSIONS = new Set([
  'camera',
  'microphone',
  'location',
  'notifications',
  'clipboard',
  'automaticDownloads',
]);

function isValidService(service) {
  try {
    const url = new URL(service);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

exports.setPermissionControl = async (req, res) => {
  try {
    const { service, permission, state } = req.body;

    if (!isValidService(service)) {
      return res.status(400).json({ error: 'A valid http/https service origin is required' });
    }

    if (!SUPPORTED_PERMISSIONS.has(permission)) {
      return res.status(400).json({ error: 'Permission is not supported for browser control' });
    }

    if (!['allow', 'block', 'ask'].includes(state)) {
      return res.status(400).json({ error: 'state must be allow, block, or ask' });
    }

    const control = await PermissionControl.findOneAndUpdate(
      { userId: req.user.id, service, permission },
      { $set: { state, appliedAt: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(control);
  } catch (err) {
    console.error('[ERROR] setPermissionControl failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getPendingPermissionControls = async (req, res) => {
  try {
    const controls = await PermissionControl.find({
      userId: req.user.id,
      appliedAt: null,
    }).sort({ updatedAt: -1 });

    return res.status(200).json(controls);
  } catch (err) {
    console.error('[ERROR] getPendingPermissionControls failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.acknowledgePermissionControls = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' });
    }

    await PermissionControl.updateMany(
      {
        _id: { $in: ids },
        userId: req.user.id,
      },
      { $set: { appliedAt: new Date() } }
    );

    return res.status(200).json({ message: 'Permission controls acknowledged' });
  } catch (err) {
    console.error('[ERROR] acknowledgePermissionControls failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
