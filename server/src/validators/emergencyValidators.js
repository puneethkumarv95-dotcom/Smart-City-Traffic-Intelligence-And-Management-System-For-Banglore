const { z } = require('zod');

const createEmergencyRequestSchema = z.object({
  emergencyType: z.enum(['accident', 'medical', 'fire', 'breakdown', 'other']).default('accident'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(1000),
  latitude: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().min(3, 'Address is required'),
  callerPhone: z.string().min(5, 'Contact phone number is required'),
  callerName: z.string().optional().default('Citizen'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('critical'),
  vehicleInfo: z.string().optional().default(''),
  casualties: z.coerce.number().min(0).default(0)
});

const updateEmergencyRequestStatusSchema = z.object({
  status: z.enum(['pending', 'acknowledged', 'dispatched', 'resolved', 'cancelled']),
  notes: z.string().optional().default('')
});

const createDispatchSchema = z.object({
  emergencyRequest: z.string().min(1, 'Emergency request ID is required'),
  unitIdentifier: z.string().min(2, 'Unit identifier is required (e.g. AMB-04)'),
  vehicleType: z.enum(['ambulance', 'police_patrol', 'fire_tender', 'towing_truck', 'quick_response_team']).default('ambulance'),
  responderName: z.string().min(2, 'Responder name is required'),
  responderContact: z.string().min(5, 'Responder contact is required'),
  currentLatitude: z.coerce.number().min(-90).max(90),
  currentLongitude: z.coerce.number().min(-180).max(180),
  notes: z.string().optional().default('')
});

const updateDispatchStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'en_route', 'arrived', 'completed', 'cancelled']),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  note: z.string().optional().default('')
});

module.exports = {
  createEmergencyRequestSchema,
  updateEmergencyRequestStatusSchema,
  createDispatchSchema,
  updateDispatchStatusSchema
};
