const { z } = require('zod');

const createIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  category: z.enum([
    'accident',
    'pothole',
    'traffic_jam',
    'flooding',
    'signal_failure',
    'road_closure',
    'illegal_parking',
    'road_damage',
    'other'
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  latitude: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().min(3, 'Address is required'),
  zoneId: z.string().optional(),
  isAnonymous: z.coerce.boolean().optional().default(false)
});

const verifyIncidentSchema = z.object({
  notes: z.string().optional().default('')
});

const rejectIncidentSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters')
});

const assignIncidentSchema = z.object({
  officerId: z.string().min(1, 'Officer ID is required'),
  notes: z.string().optional().default('')
});

const updateStatusSchema = z.object({
  status: z.enum([
    'under_review',
    'verified',
    'assigned',
    'in_progress',
    'resolved',
    'rejected',
    'duplicate'
  ]),
  notes: z.string().optional().default('')
});

const voteIncidentSchema = z.object({
  voteType: z.enum(['confirm', 'dispute'])
});

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1).max(5, 'Rating must be between 1 and 5 stars'),
  comments: z.string().optional().default('')
});

module.exports = {
  createIncidentSchema,
  verifyIncidentSchema,
  rejectIncidentSchema,
  assignIncidentSchema,
  updateStatusSchema,
  voteIncidentSchema,
  feedbackSchema
};
