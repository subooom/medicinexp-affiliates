// src/types/models.ts
export interface User {
  id: number;
  name: string;
  email: string;
  contact: string;
  tier?: Tier;
  is_active?: boolean;
}

export interface Tier {
  id: number;
  name: string;
  level: number;
  commission_rate: number;
  coupon_count: number;
  min_sales?: number;
  min_revenue?: number;
  min_conversions?: number;
  min_visits?: number;
  min_distributions?: number;
}

export interface OrganizationType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  image?: string;
}

export interface Organization {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website?: string;
  latitude: number;
  longitude: number;
  type: OrganizationType;
  organization_type_id: number;
  is_active: boolean;
  distance?: number;
  full_address?: string;
}

export interface Visit {
  id: number;
  organization_id: number;
  organization: Organization;
  visit_date: string;
  visit_time: string;
  notes?: string;
  status: 'planned' | 'completed' | 'cancelled';
  latitude?: number;
  longitude?: number;
  check_in_time?: string;
  check_out_time?: string;
}

export interface MarketingMaterialType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sample_image?: string;
}

export interface MarketingMaterial {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  cost_per_unit?: number;
  sku?: string;
  unit?: string;
  image_url?: string;
  type: MarketingMaterialType;
  marketing_material_type_id: number;
  is_active: boolean;
}

export interface Distribution {
  id: number;
  organization_id: number;
  organization: Organization;
  marketing_material_id: number;
  material: MarketingMaterial;
  quantity: number;
  distribution_date: string;
  notes?: string;
  received_by?: string;
  signature?: string;
}

export interface Lead {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes?: string;
  organization?: Organization;
  organization_id?: number;
  coupon_code_id?: number;
  converted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: number;
  coupon: string;
  discount_in_percentage: number;
  expires_at?: string;
  used_at?: string;
  used_by?: string;
  tier?: Tier;
  tier_id?: number;
  lead_id?: number;
  sale_id?: number;
}

export interface Commission {
  id: number;
  commission_amount: number;
  commission_rate_used: number;
  discount_percentage?: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  earned_date: string;
  paid_date?: string;
  organization?: Organization;
  tenant?: any;
  coupon_code?: Coupon;
}

export interface Metrics {
  total_sales: number;
  total_revenue: number;
  total_conversions: number;
  total_leads: number;
  conversion_rate: number;
  total_visits: number;
  total_distributions: number;
  total_commission_earned: number;
  pending_commission: number;
  month_sales: number;
  month_revenue: number;
  month_commission: number;
}

export interface DashboardData {
  mr: User;
  tier: Tier | null;
  metrics: Metrics;
  summary: any;
  recent_activity: any[];
  progress: any;
}