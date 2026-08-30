import { z } from 'zod';

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  currentStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  unitPrice: z.number().nonnegative().optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  unitId: z.string().uuid().optional(), // superadmin only
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).max(50).optional(),
  currentStock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;