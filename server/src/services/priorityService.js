const Incident = require('../models/Incident');
const EscalationEvent = require('../models/EscalationEvent');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Calculate dynamic incident priority score (0-100)
 * Uses severity, wait time, community verification, and road hazard classification
 */
const calculateIncidentPriority = (incident) => {
  // 1. Severity component (40%)
  const severityScores = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25
  };
  const severityScore = severityScores[incident.severity] || 50;

  // 2. Age / Wait time component (25%)
  // Older unresolved incidents gain urgency (+10 pts per 30 minutes, max 100)
  const ageMs = Date.now() - new Date(incident.createdAt).getTime();
  const ageMinutes = Math.floor(ageMs / (60 * 1000));
  const ageScore = Math.min(100, Math.floor((ageMinutes / 30) * 10));

  // 3. Community consensus component (15%)
  const netVotes = (incident.confirmationsCount || 0) - (incident.disputesCount || 0);
  const voteScore = Math.min(100, Math.max(0, netVotes * 20));

  // 4. Hazard category impact component (20%)
  const categoryImpact = {
    'Road Accident': 100,
    accident: 100,
    'Road Flooding': 95,
    flooding: 95,
    'Road Closure': 90,
    road_closure: 90,
    'Broken Traffic Signal': 80,
    signal_failure: 80,
    'Road Damage': 65,
    road_damage: 65,
    Pothole: 60,
    pothole: 60,
    'Illegal Parking': 40,
    illegal_parking: 40,
    Other: 35,
    other: 35
  };
  const impactScore = categoryImpact[incident.category] || 50;

  // Weighted total
  const totalScore = Math.round(
    severityScore * 0.4 +
    ageScore * 0.25 +
    voteScore * 0.15 +
    impactScore * 0.2
  );

  let priorityTier = 'STANDARD';
  if (totalScore >= 80) priorityTier = 'CRITICAL';
  else if (totalScore >= 65) priorityTier = 'HIGH';
  else if (totalScore >= 45) priorityTier = 'ELEVATED';

  return {
    score: totalScore,
    tier: priorityTier,
    breakdown: {
      severityScore,
      ageScore,
      ageMinutes,
      voteScore,
      impactScore
    }
  };
};

/**
 * Check and evaluate escalation triggers across active incidents
 * Automatically creates escalation events and emits real-time alerts
 */
const runEscalationCheck = async (io = null) => {
  try {
    const activeIncidents = await Incident.find({
      status: { $in: ['submitted', 'under_review', 'verified', 'assigned'] }
    }).populate('zone', 'name code');

    const now = Date.now();
    const escalationsCreated = [];

    for (const incident of activeIncidents) {
      const createdMs = new Date(incident.createdAt).getTime();
      const elapsedMinutes = Math.floor((now - createdMs) / (60 * 1000));

      let triggerReason = null;
      let thresholdMins = 0;
      let severity = 'high';

      // Rule 1: Critical incident pending verification > 25 minutes
      if (
        incident.severity === 'critical' &&
        ['submitted', 'under_review'].includes(incident.status) &&
        elapsedMinutes >= 25
      ) {
        triggerReason = 'critical_pending_timeout';
        thresholdMins = 25;
        severity = 'critical';
      }
      // Rule 2: Verified incident unassigned > 40 minutes
      else if (
        incident.status === 'verified' &&
        !incident.assignedOfficer &&
        elapsedMinutes >= 40
      ) {
        triggerReason = 'unassigned_verified_timeout';
        thresholdMins = 40;
        severity = 'high';
      }
      // Rule 3: SLA breached (> 90 minutes without progress)
      else if (elapsedMinutes >= 90 && incident.status !== 'resolved') {
        triggerReason = 'sla_breached';
        thresholdMins = 90;
        severity = incident.severity === 'critical' ? 'critical' : 'high';
      }

      if (triggerReason) {
        // Prevent duplicate active escalation for the same incident & reason
        const existingEscalation = await EscalationEvent.findOne({
          incident: incident._id,
          reason: triggerReason,
          status: { $in: ['active', 'acknowledged'] }
        });

        if (!existingEscalation) {
          const escalation = await EscalationEvent.create({
            incident: incident._id,
            reason: triggerReason,
            severity,
            status: 'active',
            triggerDetails: {
              timeElapsedMinutes: elapsedMinutes,
              thresholdMinutes: thresholdMins,
              description: `Incident ${incident.incidentId} (${incident.title}) exceeded ${thresholdMins}m threshold without resolution.`
            },
            escalatedToRole: 'police',
            notes: 'Automated SLA heuristic escalation.'
          });

          escalationsCreated.push(escalation);

          // Create in-app notifications for Police & Admin roles
          await Notification.create({
            targetRole: 'police',
            title: `⚠️ ESCALATION: ${incident.title}`,
            message: `Incident ${incident.incidentId} has exceeded SLA threshold (${elapsedMinutes} mins). Immediate supervisor triage required.`,
            severity,
            relatedResource: 'incident',
            resourceId: incident._id.toString()
          });

          // Real-time broadcast if socket server is provided
          if (io) {
            io.to('role:police').emit('escalation:new', {
              escalationId: escalation.escalationId,
              incidentId: incident.incidentId,
              title: incident.title,
              reason: triggerReason,
              severity,
              elapsedMinutes
            });
            io.to('role:admin').emit('escalation:new', {
              escalationId: escalation.escalationId,
              incidentId: incident.incidentId,
              title: incident.title,
              reason: triggerReason,
              severity,
              elapsedMinutes
            });
          }
        }
      }
    }

    if (escalationsCreated.length > 0) {
      logger.info(`Escalation monitor: Triggered ${escalationsCreated.length} new operational escalations.`);
    }

    return escalationsCreated;
  } catch (error) {
    logger.error(`Escalation monitor error: ${error.message}`);
    return [];
  }
};

module.exports = {
  calculateIncidentPriority,
  calculatePriorityScore: calculateIncidentPriority,
  runEscalationCheck
};
