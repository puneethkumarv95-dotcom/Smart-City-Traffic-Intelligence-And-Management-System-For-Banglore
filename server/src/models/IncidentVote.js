const mongoose = require('mongoose');

const incidentVoteSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    voteType: {
      type: String,
      enum: ['confirm', 'dispute'],
      required: true
    },
    voterIp: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent repeated votes from the same account for the same incident
incidentVoteSchema.index({ incident: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('IncidentVote', incidentVoteSchema);
