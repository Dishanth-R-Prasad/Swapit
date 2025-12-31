import { z } from 'zod';

// Auth validation schemas
export const authLoginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
});

export const authSignupSchema = authLoginSchema.extend({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
});

// Profile validation schema
export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  mobile_number: z.string().regex(/^[0-9]{10,15}$/, 'Mobile number must be 10-15 digits').optional().or(z.literal('')),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
});

// Listing validation schema
export const listingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  price: z.number().min(0, 'Price cannot be negative').max(100000000, 'Price is too high'),
  estimatedValue: z.number().min(0, 'Estimated value cannot be negative').max(100000000, 'Estimated value is too high').optional().nullable(),
  city: z.string().trim().max(100, 'City name is too long').optional(),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits').optional().or(z.literal('')),
});

// Message validation schema
export const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message must be less than 5000 characters'),
});

// Offer validation schema
export const offerSchema = z.object({
  cashAmount: z.number().min(0, 'Cash amount cannot be negative').max(100000000, 'Cash amount is too high'),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional(),
});

// Helper function to get first error message from zod error
export function getZodErrorMessage(error: z.ZodError): string {
  return error.errors[0]?.message || 'Validation failed';
}
