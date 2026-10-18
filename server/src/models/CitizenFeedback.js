const mongoose = require('mongoose');

const citizenFeedbackSchema = new mongoose.Schema(
  {
    feedbackId: {
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
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required'],
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: 1,
      max: 5
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    comments: {
      type: String,
      trim: true,
      default: ''
    },
    comment: {
      type: String,
      trim: true,
      default: ''
    },
    suggestions: {
      type: String,
      trim: true,
      default: ''
    },
    responseTimeliness: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    responseTimelinessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    officerProfessionalism: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    officerProfessionalismRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    status: {
      type: String,
      enum: ['published', 'flagged', 'reviewed'],
      default: 'published',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// One feedback per user per incident
citizenFeedbackSchema.index({ incident: 1, submittedBy: 1 }, { unique: true });

// Auto-generate unique public ID: FDB-YYYYMM-XXXX
citizenFeedbackSchema.pre('save', async function (next) {
  if (this.isNew && !this.feedbackId) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.feedbackId = `FDB-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('CitizenFeedback', citizenFeedbackSchema);
