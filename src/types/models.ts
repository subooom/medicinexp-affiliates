// src/types/models.ts
export interface User {
  id: number;
  name: string;
  email: string;
  contact: string;
  tier?: Tier;
  is_active?: boolean;
}
// types/models.ts or wherever your types are
export interface Product {
  id: number;
  organization_id: number;
  organization?: Organization;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  cost: number | null;
  commission_rate: number | null;
  stock: number;
  min_stock: number;
  unit: string | null;
  image_url: string | null;
  images: string[] | null;
  attributes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  is_active: boolean;
  is_featured: boolean;
  is_digital: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Accessors (appended)
  price_formatted?: string;
  commission_formatted?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  stock_status_label?: string;
  stock_status_color?: string;
  profit?: number;
  profit_margin?: number;
  profit_margin_formatted?: string;
  profit_formatted?: string;
  display_name?: string;
  images_array?: string[];
  attributes_array?: Record<string, any>;
  metadata_array?: Record<string, any>;
}
export interface Tier {
  id: number;
  affiliated_organization_id: number | null;
  tier_level: number;
  tier_name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  
  // Sales-based metrics
  min_sales: number | null;
  max_sales: number | null;
  min_revenue: number | null;
  max_revenue: number | null;
  min_conversions: number | null;
  
  // Activity metrics
  min_visits: number | null;
  max_visits: number | null;
  min_distributions: number | null;
  max_distributions: number | null;
  
  // Commission structure
  base_commission_rate: number;
  multiplier: number;
  bonus_amount: number | null;
  coupon_count: number;
  
  // Perks & benefits
  perks: string[] | null;
  
  // Status
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  
  // Metadata (can be string or object)
  metadata: string | Record<string, any>;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Optional: Populated by API formatter
  requirements?: string[];
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
  created_at: string,
  updated_at: string,
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

export interface VisitStats {
  // Basic counts
  total_visits: number;
  completed_visits: number;
  scheduled_visits: number;
  cancelled_visits: number;
  
  // Time-based stats
  visits_today: number;
  visits_this_week: number;
  visits_this_month: number;
  
  // Performance metrics
  average_duration?: number; // in minutes
  completion_rate?: number; // percentage
  on_time_rate?: number; // percentage
  
  // Breakdowns
  visits_by_status?: {
    [status: string]: number;
  };
  visits_by_day?: {
    [day: string]: number;
  };
  recent_activity?: {
    date: string;
    count: number;
  }[];
  
  // Revenue/Commission related (if applicable)
  total_commission?: number;
  average_commission?: number;
  
  // Optional additional fields based on your API
  pending_sync_count?: number;
  offline_visits?: number;
}

export interface VisitFilters {
  // Pagination
  page?: number;
  limit?: number;
  
  forceRefresh?: boolean;
  
  // Date filters
  start_date?: string;
  end_date?: string;
  month?: string; // YYYY-MM format
  year?: number;
  
  // Status filters
  status?: Visit['status'] | Visit['status'][];
  
  // Entity filters
  affiliate_id?: number;
  client_id?: number;
  
  // Search
  search?: string;
  
  // Sorting
  sort_by?: 'visit_date' | 'created_at' | 'client_name' | 'status';
  sort_order?: 'asc' | 'desc';
  
  // Other common filters
  is_synced?: boolean;
  has_checkout?: boolean;
  min_duration?: number;
  max_duration?: number;
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
  quantity_remaining: number;
  affiliated_organization_id: number,
  affiliated_organization: Organization,
  max_distribution_per_venue: number;
  cost_per_unit?: number;
  total_distributed?: number;
  sku?: string;
  unit?: string;
  image_url?: string;
  type: MarketingMaterialType;
  marketing_material_type_id: number;
  is_active: boolean;
  // Only on /mr/materials: this MR's drop-offs of the material
  distributions?: MaterialDistributionHistoryItem[];
}

export interface MaterialDistributionHistoryItem {
  id: number;
  quantity: number;
  distribution_date: string;
  organization: Pick<Organization, 'id' | 'name' | 'address' | 'city'> | null;
  received_by?: string | null;
  notes?: string | null;
  visit_id?: number | null;
}

export interface Distribution {
  id: number;
  organization_id: number;
  organization: Organization;
  visit_id: number;
  visit: Visit;
  marketing_material_id: number;
  material: MarketingMaterial;
  quantity: number;
  distribution_date: string;
  notes?: string;
  received_by?: string;
  signature?: string;
  created_at: string,
}

export type LeadType = 'customer' | 'associate' | 'organization' | 'contact'

export interface Lead {
  id: number;
  call_logs?: CallLog[],
  latest_call_log?: CallLog | null,
  lead_type: LeadType,
  associated_entity?: string | null;
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
  visit: Visit
}
// src/types/models.ts

export interface CallLog {
  id: number;
  direction: 'incoming' | 'outgoing'
  medical_representative_id: number;
  lead_id: number | null;
  organization_id: number | null;
  call_date: string;
  call_time: string;
  duration: number;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  is_scheduled: boolean;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  organization?: Organization;
  visit?: Visit;
  medical_representative?: MedicalRepresentative
}

export interface MedicalRepresentative {
  id: number,
  name: string
}

export interface CallLogFormData {
  direction: 'incoming' | 'outgoing';
  lead_id?: number;
  organization_id?: number;
  call_date: string;
  call_time: string;
  duration?: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  is_scheduled?: boolean;
  scheduled_at?: string;
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