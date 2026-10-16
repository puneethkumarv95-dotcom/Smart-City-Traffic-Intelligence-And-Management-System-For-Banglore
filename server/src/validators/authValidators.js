const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().default(''),
  preferredLanguage: z.enum(['en', 'kn', 'hi']).optional().default('en'),
  notificationRadiusKm: z.number().min(1).max(50).optional().default(5)
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['en', 'kn', 'hi']).optional(),
  notificationRadiusKm: z.number().min(1).max(50).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema
};

