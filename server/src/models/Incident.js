const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      unique: true,
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
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true,
      minlength: 5,
      maxlength: 150
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 10,
      maxlength: 2000
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Road Accident',
        'Traffic Congestion',
        'Pothole',
        'Road Damage',
        'Broken Traffic Signal',
        'Illegal Parking',
        'Road Flooding',
        'Road Closure',
        'Other',
        // Also support lowercase slugs for flexible API backwards compatibility
        'accident',
        'traffic_jam',
        'pothole',
        'road_damage',
        'signal_failure',
        'illegal_parking',
        'flooding',
        'road_closure',
        'other'
      ],
      index: true
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
    city: {
      type: String,
      default: 'Bengaluru'
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone',
      default: null,
      index: true
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' }
      }
    ],
    videos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' }
      }
    ],
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
        'duplicate',
        'info_requested'
      ],
      default: 'submitted',
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'info_requested'],
      default: 'pending',
      index: true
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
      index: true
    },
    confirmationsCount: {
      type: Number,
      default: 0
    },
    disputesCount: {
      type: Number,
      default: 0
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    citizenFeedback: {
      rating: { type: Number, min: 1, max: 5, default: null },
      comments: { type: String, default: '' },
      submittedAt: { type: Date, default: null }
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate unique public identifier (e.g. INC-202610-8472)
incidentSchema.pre('validate', async function (next) {
  if (!this.incidentId) {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.incidentId = `INC-${yearMonth}-${randomSuffix}`;
  }
  next();
});

// Indexes for high performance querying
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ severity: 1, status: 1 });
incidentSchema.index({ category: 1, status: 1 });
incidentSchema.index({ zone: 1, status: 1 });
incidentSchema.index({ reportedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
