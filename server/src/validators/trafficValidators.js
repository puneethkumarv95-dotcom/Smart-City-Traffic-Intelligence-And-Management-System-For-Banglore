const { z } = require('zod');

const routeRequestSchema = z.object({
  origin: z.array(z.coerce.number()).length(2, 'Origin must be [longitude, latitude]'),
  destination: z.array(z.coerce.number()).length(2, 'Destination must be [longitude, latitude]')
});

const createClosureSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  roadName: z.string().min(3, 'Road name is required'),
  reason: z.string().min(5, 'Reason is required'),
  diversionInstructions: z.string().min(10, 'Diversion instructions must be at least 10 characters'),
  latitude: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().min(3, 'Address is required'),
  startTime: z.string().datetime().or(z.date()).optional(),
  endTime: z.string().datetime().or(z.date()),
  severity: z.enum(['partial', 'full', 'emergency']).optional().default('full'),
  zoneId: z.string().optional()
});

const updateClosureSchema = z.object({
  title: z.string().min(5).optional(),
  isActive: z.boolean().optional(),
  diversionInstructions: z.string().min(5).optional(),
  endTime: z.string().datetime().or(z.date()).optional(),
  severity: z.enum(['partial', 'full', 'emergency']).optional(),
  notes: z.string().optional()
});

const createAlertSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  message: z.string().min(10, 'Alert message must be at least 10 characters'),
  severity: z.enum(['info', 'warning', 'critical']).optional().default('warning'),
  affectedCorridors: z.array(z.string()).optional().default([]),
  validUntil: z.string().datetime().or(z.date())
});

const savedRouteSchema = z.object({
  name: z.string().min(3, 'Route nickname must be at least 3 characters').max(100),
  origin: z.object({
    address: z.string().min(2),
    coordinates: z.array(z.coerce.number()).length(2)
  }),
  destination: z.object({
    address: z.string().min(2),
    coordinates: z.array(z.coerce.number()).length(2)
  }),
  distanceKm: z.coerce.number().positive(),
  estimatedDurationMin: z.coerce.number().positive(),
  routeGeometry: z
    .object({
      type: z.literal('LineString').optional().default('LineString'),
      coordinates: z.array(z.array(z.number())).optional().default([])
    })
    .optional(),
  alertRadiusKm: z.coerce.number().min(0.5).max(10).optional().default(1.5),
  notes: z.string().optional().default('')
});

module.exports = {
  routeRequestSchema,
  createClosureSchema,
  updateClosureSchema,
  createAlertSchema,
  savedRouteSchema
};

