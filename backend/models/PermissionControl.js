const mongoose = require('mongoose');

const permissionControlSchema = new mongoose.Schema(
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
    permission: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      enum: ['allow', 'block', 'ask'],
      required: true,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

permissionControlSchema.index(
  { userId: 1, service: 1, permission: 1 },
  { unique: true }
);

module.exports = mongoose.models.PermissionControl || mongoose.model('PermissionControl', permissionControlSchema);
