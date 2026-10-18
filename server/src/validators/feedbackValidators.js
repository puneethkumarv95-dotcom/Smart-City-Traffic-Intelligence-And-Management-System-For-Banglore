const { z } = require('zod');

const submitFeedbackSchema = z.object({
  incidentId: z.string().min(1, 'Incident ID is required'),
  rating: z.coerce.number().min(1).max(5, 'Rating must be between 1 and 5'),
  responseTimeliness: z.coerce.number().min(1).max(5).optional().default(3),
  officerProfessionalism: z.coerce.number().min(1).max(5).optional().default(3),
  comment: z.string().max(1000).optional().default(''),
  suggestions: z.string().max(1000).optional().default('')
});

module.exports = {
  submitFeedbackSchema
};
