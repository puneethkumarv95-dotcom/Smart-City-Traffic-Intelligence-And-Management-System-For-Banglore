const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    subscribedZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CityZone'
      }
    ],
    emergencyAlerts: {
      type: Boolean,
      default: true
    },
    incidentStatusUpdates: {
      type: Boolean,
      default: true
    },
    roadClosureAlerts: {
      type: Boolean,
      default: true
    },
    escalationAlerts: {
      type: Boolean,
      default: true
    },
    minSeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    radiusKm: {
      type: Number,
      min: 1,
      max: 50,
      default: 5
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
