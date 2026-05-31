export interface Flavor {
  id: string;
  name: string;
  description?: string;
  category: string;
  emoji?: string;
  image_url?: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  popularity: number;
  is_active: boolean;
  is_available: boolean;
  is_seasonal: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}
