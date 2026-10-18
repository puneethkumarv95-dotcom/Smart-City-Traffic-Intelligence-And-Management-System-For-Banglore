const mongoose = require('mongoose');

const escalationEventSchema = new mongoose.Schema(
  {
    escalationId: {
      type: String,
      unique: true,
      index: true
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Incident reference is required'],
      index: true
    },
    reason: {
      type: String,
      enum: [
        'critical_pending_timeout',
        'unassigned_verified_timeout',
        'sla_breached',
        'high_frequency_cluster',
        'manual_supervisor_escalation'
      ],
      required: [true, 'Escalation reason is required'],
      index: true
    },
    severity: {
      type: String,
      enum: ['medium', 'high', 'critical'],
      default: 'high',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true
    },
    triggerDetails: {
      timeElapsedMinutes: Number,
      thresholdMinutes: Number,
      locationClusterCount: Number,
      description: String
    },
    escalatedToRole: {
      type: String,
      enum: ['police', 'admin'],
      default: 'police'
    },
    escalatedToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone',
      default: null
    },
    escalationLevel: {
      type: String,
      enum: ['standard', 'supervisor', 'chief_officer', 'crisis_management'],
      default: 'supervisor'
    },
    actionTaken: {
      type: String,
      default: ''
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
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

// Prevent duplicate active escalations for the same incident and reason
escalationEventSchema.index({ incident: 1, reason: 1, status: 1 });

// Auto-generate unique public ID: ESC-YYYYMM-XXXX
escalationEventSchema.pre('save', async function (next) {
  if (this.isNew && !this.escalationId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.escalationId = `ESC-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('EscalationEvent', escalationEventSchema);
