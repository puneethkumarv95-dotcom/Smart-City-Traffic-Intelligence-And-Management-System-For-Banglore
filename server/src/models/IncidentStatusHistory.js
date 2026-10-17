const mongoose = require('mongoose');

const incidentStatusHistorySchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true
    },
    previousStatus: {
      type: String,
      default: null
    },
    newStatus: {
      type: String,
      required: true,
      index: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    changedByName: {
      type: String,
      default: 'System'
    },
    actorRole: {
      type: String,
      default: 'system'
    },
    notes: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

incidentStatusHistorySchema.index({ incident: 1, timestamp: -1 });

module.exports = mongoose.model('IncidentStatusHistory', incidentStatusHistorySchema);
