const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      // the site's origin, e.g. "https://example.com"
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
      // true only while every tracked permission for this service is granted
      type: Boolean,
      required: true,
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
