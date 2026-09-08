const ConsentLog = require('../models/ConsentLog');
const { getIO } = require('../socket');
const { analyzePermissions } = require('../services/aiRiskService');

exports.analyzeUserPermissions = async (req, res) => {
  try {
    const consents = await ConsentLog.find({ userId: req.user.id }).sort({ timestamp: -1 });

    if (consents.length === 0) {
      return res.status(400).json({
        error: 'No permission records are available for analysis',
      });
    }

    const input = consents.map((consent) => ({
      service: consent.service,
      permissions: consent.dataShared,
      consentGiven: consent.consentGiven,
    }));

    const analysis = await analyzePermissions(input);
    const byService = new Map(
      analysis.analyses.map((item) => [item.service, item])
    );

    const updatedConsents = [];

    for (const consent of consents) {
      const item = byService.get(consent.service);
      if (!item) continue;

      consent.aiRisk = item.risk;
      consent.aiReason = item.reason;
      consent.aiRecommendation = item.recommendation;
      consent.aiConfidence = Math.max(0, Math.min(100, Number(item.confidence) || 0));
      consent.aiAnalyzedAt = new Date();
      await consent.save();
      updatedConsents.push(consent);
    }

    const io = getIO();
    io.to(`user:${req.user.id}`).emit('ai-analysis-updated', {
      summary: analysis.overallSummary,
      consents: updatedConsents,
    });

    return res.status(200).json({
      summary: analysis.overallSummary,
      consents: updatedConsents,
    });
  } catch (err) {
    console.error('[ERROR] AI permission analysis failed:', err);

    return res.status(500).json({
      error: err.message || 'AI analysis failed',
    });
  }
};
