const mongoose = require('mongoose');

const incidentAssignmentSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    assignmentStatus: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'reassigned', 'cancelled'],
      default: 'assigned',
      index: true
    },
    completionDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

incidentAssignmentSchema.index({ assignedOfficer: 1, assignmentStatus: 1 });
incidentAssignmentSchema.index({ incident: 1, assignedDate: -1 });

module.exports = mongoose.model('IncidentAssignment', incidentAssignmentSchema);

