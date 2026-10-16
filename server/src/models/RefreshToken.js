const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    replacedByToken: {
      type: String,
      default: null
    },
    createdByIp: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

refreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expiresAt.getTime();
});

refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && !this.isExpired;
});

// Auto-delete expired tokens after 14 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

