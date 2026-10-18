const { z } = require('zod');

const createShiftSchema = z.object({
  officer: z.string().min(1, 'Officer ID is required'),
  shiftType: z.enum(['morning', 'afternoon', 'night', 'emergency_standby', 'custom']).default('morning'),
  shiftStart: z.coerce.date({ required_error: 'Shift start time is required' }),
  shiftEnd: z.coerce.date({ required_error: 'Shift end time is required' }),
  assignedZone: z.string().min(1, 'Assigned zone is required'),
  patrolVehicle: z.string().optional().default(''),
  notes: z.string().optional().default('')
}).refine((data) => new Date(data.shiftEnd) > new Date(data.shiftStart), {
  message: 'Shift end time must be after shift start time',
  path: ['shiftEnd']
});

const updateShiftSchema = z.object({
  dutyStatus: z.enum(['scheduled', 'active', 'completed', 'cancelled', 'on_leave']).optional(),
  shiftStart: z.coerce.date().optional(),
  shiftEnd: z.coerce.date().optional(),
  assignedZone: z.string().optional(),
  patrolVehicle: z.string().optional(),
  notes: z.string().optional()
});

const acknowledgeEscalationSchema = z.object({
  actionTaken: z.string().optional().default('Officer acknowledged escalation'),
  notes: z.string().optional().default('')
});

const resolveEscalationSchema = z.object({
  resolutionNotes: z.string().min(3, 'Resolution notes are required')
});

module.exports = {
  createShiftSchema,
  updateShiftSchema,
  acknowledgeEscalationSchema,
  resolveEscalationSchema
};
