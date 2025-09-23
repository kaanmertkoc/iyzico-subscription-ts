// Legacy validators file - most validation is now in validation-utils.ts
// This file can be used for complex domain-specific validators if needed

import { z } from 'zod';

// SDK-specific complex schemas that extend base validation patterns
export const AddressSchema = z.object({
  contactName: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  zipCode: z.string().optional(),
  address: z.string().min(1),
});

// Helper for creating validation errors (kept for backwards compatibility)
export const createValidationError = (message: string, field?: string) => ({
  error: 'Validation Error',
  message,
  field,
  timestamp: Date.now(),
});
