// LocalConnect Customer App Database Types

export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  email_verified: boolean;
  email_verified_at?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'customer' | 'shop_owner' | 'admin';
  is_active: boolean;
  role_data?: any;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  delivery_addresses: any[];
  preferences: any;
  loyalty_points: number;
  favorite_shops: string[];
  created_at: string;
  updated_at: string;
}

export interface ShopOwnerProfile {
  id: string;
  user_id: string;
  business_verified: boolean;
  verification_documents: any[];
  business_name?: string;
  business_category?: string;
  business_address?: string;
  gstin?: string;
  business_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseShop {
  id: string;
  owner_id: string;
  name: string;
  slug?: string;
  description?: string;
  categories: string[];
  address?: string;
  phone_number?: string;
  email?: string;
  logo_url?: string;
  cover_image_url?: string;
  gallery_images: string[];
  business_hours?: any;
  location?: { x: number; y: number };
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_active: boolean;
  subscription_tier: 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string;
  payment_upi_id?: string;
  payment_phone_number?: string;
  accepts_online_payments: boolean;
  created_at: string;
  updated_at: string;
}

// Helper types for API responses
export type SupabaseResponse<T> = {
  data: T | null;
  error: any;
};
