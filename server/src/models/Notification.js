const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    // Optional broadcast role if not targeted to single user
    targetRole: {
      type: String,
      enum: ['citizen', 'police', 'emergency', 'operator', 'admin', 'all']
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['incident_verified', 'incident_resolved', 'road_closure', 'traffic_alert', 'duty_assigned', 'system'],
      default: 'system'
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    },
    link: {
      type: String,
      default: ''
    },
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    },
    relatedIncident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident'
    },
    relatedClosure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadClosure'
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
