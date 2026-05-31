import { z } from 'zod';

export const createFlavorSchema = z.object({
  name: z.string().min(2),

  description: z.string().optional(),

  category: z.string(),

  emoji: z.string().optional(),

  image_url: z.string().optional(),

  price: z.number().positive(),

  stock: z.number().min(0),

  low_stock_threshold: z.number().min(0),

  is_seasonal: z.boolean().optional(),
});

export const updateFlavorSchema = createFlavorSchema.partial();
