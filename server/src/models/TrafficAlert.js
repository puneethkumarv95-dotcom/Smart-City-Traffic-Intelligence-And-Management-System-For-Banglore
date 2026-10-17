const mongoose = require('mongoose');

const trafficAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning'
    },
    affectedCorridors: [
      {
        type: String,
        trim: true
      }
    ],
    affectedZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CityZone'
      }
    ],
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: [true, 'Valid until timestamp is required']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issuerName: {
      type: String,
      default: 'Traffic Police Directorate'
    }
  },
  {
    timestamps: true
  }
);

trafficAlertSchema.pre('validate', async function (next) {
  if (this.isNew && !this.alertId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.alertId = `ADV-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('TrafficAlert', trafficAlertSchema);

