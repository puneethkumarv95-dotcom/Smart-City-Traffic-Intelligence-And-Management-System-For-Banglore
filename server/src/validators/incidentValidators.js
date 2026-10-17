const { z } = require('zod');

const validCategories = [
  'Road Accident',
  'Traffic Congestion',
  'Pothole',
  'Road Damage',
  'Broken Traffic Signal',
  'Illegal Parking',
  'Road Flooding',
  'Road Closure',
  'Other',
  // programmatic slug representations
  'accident',
  'traffic_jam',
  'pothole',
  'road_damage',
  'signal_failure',
  'illegal_parking',
  'flooding',
  'road_closure',
  'other'
];

const createIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  category: z.string().refine((val) => validCategories.includes(val), {
    message: 'Invalid incident category'
  }),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  latitude: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().optional().default('Bengaluru'),
  zoneId: z.string().optional(),
  isAnonymous: z.coerce.boolean().optional().default(false)
});

const verifyIncidentSchema = z.object({
  notes: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

const rejectIncidentSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters')
});

const requestInfoSchema = z.object({
  notes: z.string().min(5, 'Information request notes must be at least 5 characters')
});

const assignIncidentSchema = z.object({
  officerId: z.string().min(1, 'Officer ID is required'),
  notes: z.string().optional().default('')
});

const markDuplicateSchema = z.object({
  duplicateOf: z.string().min(1, 'Target original incident ID is required'),
  notes: z.string().optional().default('')
});

const updateStatusSchema = z.object({
  status: z.enum([
    'submitted',
    'under_review',
    'verified',
    'assigned',
    'in_progress',
    'resolved',
    'rejected',
    'duplicate',
    'info_requested'
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

const checkDuplicatesSchema = z.object({
  category: z.string().min(1, 'Category is required for duplicate checking'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  radiusMeters: z.coerce.number().min(100).max(10000).optional().default(1000)
});

module.exports = {
  createIncidentSchema,
  verifyIncidentSchema,
  rejectIncidentSchema,
  requestInfoSchema,
  assignIncidentSchema,
  markDuplicateSchema,
  updateStatusSchema,
  voteIncidentSchema,
  feedbackSchema,
  checkDuplicatesSchema
};
