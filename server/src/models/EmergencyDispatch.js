const mongoose = require('mongoose');

const emergencyDispatchSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: String,
      unique: true,
      index: true
    },
    emergencyRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: [true, 'Emergency request reference is required'],
      index: true
    },
    responder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned responder is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'en_route', 'arrived', 'completed', 'cancelled'],
      default: 'accepted',
      index: true
    },
    unitIdentifier: {
      type: String,
      default: 'EMS-01',
      trim: true
    },
    vehicleType: {
      type: String,
      default: 'ambulance'
    },
    responderName: {
      type: String,
      default: ''
    },
    responderContact: {
      type: String,
      default: ''
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [77.5946, 12.9716]
      }
    },
    destinationLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [77.5946, 12.9716]
      }
    },
    originLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [77.5946, 12.9716] // Default central dispatch base
      }
    },
    targetLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [77.5946, 12.9716]
      }
    },
    routeGeometry: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString'
      },
      coordinates: {
        type: [[Number]],
        default: []
      }
    },
    distanceKm: {
      type: Number,
      default: 0
    },
    estimatedMinutes: {
      type: Number,
      default: 10
    },
    estimatedDurationMin: {
      type: Number,
      default: 10
    },
    estimatedArrival: Date,
    actualArrival: Date,
    notes: {
      type: String,
      default: ''
    },
    dispatchNotes: {
      type: String,
      trim: true,
      default: ''
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        notes: String
      }
    ]
  },
  {
    timestamps: true
  }
);

// Auto-generate unique public ID: DSP-YYYYMM-XXXX
emergencyDispatchSchema.pre('save', async function (next) {
  if (this.isNew && !this.dispatchId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.dispatchId = `DSP-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('EmergencyDispatch', emergencyDispatchSchema);
