const mongoose = require('mongoose');

const roadClosureSchema = new mongoose.Schema(
  {
    closureId: {
      type: String,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Road closure title is required'],
      trim: true,
      maxlength: 150
    },
    roadName: {
      type: String,
      required: [true, 'Road name is required'],
      trim: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone'
    },
    reason: {
      type: String,
      required: [true, 'Reason for closure is required'],
      trim: true
    },
    diversionInstructions: {
      type: String,
      required: [true, 'Diversion instructions are required'],
      trim: true
    },
    // GeoJSON Point or LineString representing the closed segment
    location: {
      type: {
        type: String,
        enum: ['Point', 'LineString'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat] for Point
        required: true
      }
    },
    address: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: [true, 'Closure start time is required'],
      default: Date.now
    },
    endTime: {
      type: Date,
      required: [true, 'Closure estimated end time is required']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['partial', 'full', 'emergency'],
      default: 'full'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdByName: {
      type: String,
      default: 'Traffic Authority'
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere spatial index for geospatial searches
roadClosureSchema.index({ location: '2dsphere' });

// Auto-generate human-readable closure ID: CLS-YYYYMM-XXXX
roadClosureSchema.pre('validate', async function (next) {
  if (this.isNew && !this.closureId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.closureId = `CLS-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('RoadClosure', roadClosureSchema);
