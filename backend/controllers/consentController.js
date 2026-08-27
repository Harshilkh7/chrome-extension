const ConsentLog = require('../models/ConsentLog');
const { getIO } = require('../socket');

function isValidDataShared(dataShared) {
  return (
    Array.isArray(dataShared) &&
    dataShared.every(
      (item) =>
        item &&
        typeof item.permission === 'string' &&
        item.permission.trim() !== '' &&
        typeof item.granted === 'boolean'
    )
  );
}

// POST /api/consent/log
// Create a consent record for a service, or merge into an existing one.
exports.logConsent = async (req, res) => {
  try {
    const { service, dataShared, consentGiven } = req.body;

    if (!service || typeof service !== 'string') {
      return res.status(400).json({ error: 'service is required' });
    }
    if (!isValidDataShared(dataShared)) {
      return res.status(400).json({
        error: 'Each item in dataShared must have permission (string) and granted (boolean)',
      });
    }

    const existingConsent = await ConsentLog.findOne({ userId: req.user.id, service });

    let mergedDataShared = dataShared;
    if (existingConsent) {
      const mergedMap = new Map(existingConsent.dataShared.map((e) => [e.permission, e.granted]));
      for (const incoming of dataShared) {
        mergedMap.set(incoming.permission, incoming.granted);
      }
      mergedDataShared = Array.from(mergedMap, ([permission, granted]) => ({ permission, granted }));
    }

    const updatedConsent = await ConsentLog.findOneAndUpdate(
      { userId: req.user.id, service },
      {
        $set: {
          dataShared: mergedDataShared,
          consentGiven: Boolean(consentGiven),
        },
      },
      { upsert: true, new: true }
    );

getIO()
  .to(`user:${req.user.id}`)
  .emit('consent-updated', updatedConsent);

    return res.status(existingConsent ? 200 : 201).json({
      message: existingConsent ? 'Consent updated' : 'Consent created',
      consent: updatedConsent,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate consent entry' });
    }
    console.error('[ERROR] logConsent failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/consent/my-consents
exports.getUserConsents = async (req, res) => {
  try {
    const consents = await ConsentLog.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.status(200).json(consents);
  } catch (err) {
    console.error('Fetch consent error:', err);
    res.status(500).json({ error: 'Server error while fetching consents' });
  }
};

// PUT /api/consent/update/:id
// Update (or add) individual permission entries on an existing consent record.
exports.updateConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { dataShared } = req.body;

    if (!isValidDataShared(dataShared)) {
      return res.status(400).json({
        error: 'Each dataShared item must have a valid permission (string) and granted (boolean)',
      });
    }

    const consent = await ConsentLog.findOne({
      _id: id,
      userId: req.user.id
    });

    if (!consent) {
      return res.status(404).json({
        error: 'Consent not found'
      });
    }

    dataShared.forEach(({ permission, granted }) => {
      const entry = consent.dataShared.find(
        (e) => e.permission === permission
      );

      if (entry) {
        entry.granted = granted;
      } else {
        consent.dataShared.push({
          permission,
          granted
        });
      }
    });

    consent.consentGiven = consent.dataShared.every(
      (e) => e.granted
    );

    await consent.save();

    // Send real-time update to dashboard
    getIO()
      .to(`user:${req.user.id}`)
      .emit('consent-updated', consent);

    return res.status(200).json({
      message: 'Consent updated',
      consent
    });

  } catch (err) {
    console.error('[ERROR] updateConsent failed:', err);
    return res.status(500).json({
      error: 'Server error'
    });
  }
};

// POST /api/consent/check-origin
// Lets the extension ask "have I already logged this site for this user?"
exports.checkOrigin = async (req, res) => {
  try {
    const { origin } = req.body;
    if (!origin) {
      return res.status(400).json({ error: 'origin is required' });
    }

    const existing = await ConsentLog.findOne({ userId: req.user.id, service: origin });
    res.json({ exists: !!existing, consent: existing || null });
  } catch (err) {
    console.error('checkOrigin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
