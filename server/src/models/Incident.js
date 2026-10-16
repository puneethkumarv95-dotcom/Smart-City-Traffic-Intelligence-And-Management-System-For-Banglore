const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true,
      minlength: 5,
      maxlength: 150
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'accident',
        'pothole',
        'traffic_jam',
        'flooding',
        'signal_failure',
        'road_closure',
        'illegal_parking',
        'road_damage',
        'other'
      ],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 10,
      maxlength: 2000
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    // GeoJSON Point: [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates [lng, lat] are required']
      }
    },
    address: {
      type: String,
      required: [true, 'Address or street landmark is required'],
      trim: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone',
      default: null,
      index: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    reporterIp: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'verified',
        'assigned',
        'in_progress',
        'resolved',
        'rejected',
        'duplicate'
      ],
      default: 'submitted',
      index: true
    },
    media: [
      {
        url: { type: String, required: true },
        mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' }
      }
    ],
    verifiedBy: {
      officer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      officerName: { type: String, default: '' },
      verifiedAt: { type: Date, default: null },
      notes: { type: String, default: '' }
    },
    rejectedBy: {
      officer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      officerName: { type: String, default: '' },
      rejectedAt: { type: Date, default: null },
      reason: { type: String, default: '' }
    },
    assignedTo: {
      officer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      officerName: { type: String, default: '' },
      department: { type: String, default: '' },
      assignedAt: { type: Date, default: null },
      notes: { type: String, default: '' }
    },
    resolutionDetails: {
      notes: { type: String, default: '' },
      resolvedAt: { type: Date, default: null },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    citizenFeedback: {
      rating: { type: Number, min: 1, max: 5, default: null },
      comments: { type: String, default: '' },
      submittedAt: { type: Date, default: null }
    },
    confirmVotesCount: {
      type: Number,
      default: 0
    },
    disputeVotesCount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // Default 48h expiration
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        changedByName: { type: String, default: 'System' },
        actorRole: { type: String, default: 'system' },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' }
      }
    ]
  },
  {
    timestamps: true
  }
);

// 2dsphere spatial index for geospatial radius & nearest queries
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ severity: 1, status: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
