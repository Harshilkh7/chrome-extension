const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    dataShared: [
      {
        permission: { type: String, required: true },
        granted: { type: Boolean, required: true },
      },
    ],
    consentGiven: {
      type: Boolean,
      required: true,
    },
    aiRisk: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: null,
    },
    aiReason: {
      type: String,
      default: '',
    },
    aiRecommendation: {
      type: String,
      default: '',
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    aiAnalyzedAt: {
      type: Date,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { optimisticConcurrency: true }
);

consentLogSchema.index({ userId: 1, service: 1 }, { unique: true });

module.exports = mongoose.models.ConsentLog || mongoose.model('ConsentLog', consentLogSchema);
