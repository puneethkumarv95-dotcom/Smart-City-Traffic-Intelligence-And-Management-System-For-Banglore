const mongoose = require('mongoose');

const officerShiftSchema = new mongoose.Schema(
  {
    shiftId: {
      type: String,
      unique: true,
      index: true
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Officer reference is required'],
      index: true
    },
    assignedZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone',
      default: null,
      index: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone',
      default: null,
      index: true
    },
    shiftDate: {
      type: Date,
      default: () => new Date(),
      index: true
    },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'night', 'emergency_standby', 'custom'],
      default: 'morning'
    },
    shiftStart: {
      type: Date,
      required: [true, 'Shift start time is required'],
      index: true
    },
    shiftEnd: {
      type: Date,
      required: [true, 'Shift end time is required'],
      index: true
    },
    dutyStatus: {
      type: String,
      enum: ['scheduled', 'active', 'on_duty', 'completed', 'cancelled', 'on_leave', 'absent'],
      default: 'scheduled',
      index: true
    },
    patrolVehicle: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Static method for shift overlap conflict detection
officerShiftSchema.statics.checkConflict = async function (officer, start, end, excludeId = null) {
  const query = {
    officer,
    dutyStatus: { $nin: ['cancelled', 'completed'] },
    shiftStart: { $lt: new Date(end) },
    shiftEnd: { $gt: new Date(start) }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.findOne(query);
};

// Compound index for fast conflict detection: officer cannot have overlapping active shifts
officerShiftSchema.index({ officer: 1, shiftStart: 1, shiftEnd: 1, dutyStatus: 1 });

// Auto-generate unique public ID: SFT-YYYYMM-XXXX
officerShiftSchema.pre('save', async function (next) {
  if (this.isNew && !this.shiftId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.shiftId = `SFT-${yearMonth}-${randomSuffix}`;
  }
  if (!this.zone && this.assignedZone) {
    this.zone = this.assignedZone;
  }
  if (!this.shiftDate && this.shiftStart) {
    this.shiftDate = this.shiftStart;
  }
  next();
});

module.exports = mongoose.model('OfficerShift', officerShiftSchema);
