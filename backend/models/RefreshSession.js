const mongoose = require('mongoose');

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jtiHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshSession', refreshSessionSchema);
