const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      index: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    requesterName: {
      type: String,
      default: 'Citizen',
      trim: true
    },
    callerName: {
      type: String,
      default: 'Citizen',
      trim: true
    },
    requesterPhone: {
      type: String,
      default: '',
      trim: true
    },
    callerPhone: {
      type: String,
      default: '',
      trim: true
    },
    emergencyType: {
      type: String,
      enum: ['accident', 'medical', 'fire', 'breakdown', 'other'],
      required: [true, 'Emergency type is required'],
      index: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    address: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'critical',
      index: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'critical',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'assigned', 'dispatched', 'en_route', 'arrived', 'completed', 'resolved', 'cancelled'],
      default: 'pending',
      index: true
    },
    assignedResponder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedVehicle: {
      type: String,
      default: 'KA-01-EMS-108'
    },
    assignedAt: Date,
    etaMinutes: {
      type: Number,
      default: null
    },
    isSimulation: {
      type: Boolean,
      default: true
    },
    resolvedAt: Date
  },
  {
    timestamps: true
  }
);

// 2dsphere index for geographic dispatch queries
emergencyRequestSchema.index({ location: '2dsphere' });
emergencyRequestSchema.index({ status: 1, createdAt: -1 });

// Auto-generate unique public ID: REQ-YYYYMM-XXXX
emergencyRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.requestId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.requestId = `REQ-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
