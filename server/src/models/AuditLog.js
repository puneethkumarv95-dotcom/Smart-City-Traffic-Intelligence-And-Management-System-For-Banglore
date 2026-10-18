const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorEmail: {
      type: String,
      default: 'system'
    },
    actorRole: {
      type: String,
      default: 'system'
    },
    role: {
      type: String,
      default: 'system'
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    resourceType: {
      type: String,
      default: 'General',
      index: true
    },
    targetEntity: {
      type: String,
      default: 'General'
    },
    resourceId: {
      type: String,
      default: null
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.pre('save', function (next) {
  if (!this.actor && this.performedBy) {
    this.actor = this.performedBy;
  }
  if (!this.resourceType && this.targetEntity) {
    this.resourceType = this.targetEntity;
  }
  if (!this.resourceId && this.targetId) {
    this.resourceId = this.targetId.toString();
  }
  if (!this.actorRole && this.role) {
    this.actorRole = this.role;
  }
  next();
});

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
