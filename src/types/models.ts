// src/types/models.ts
// Shapes returned by the MR app API (/api/affiliates). Times are ISO-8601 with
// the Kathmandu offset; money is integer paisa; rates are basis points (500 = 5%).

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Laravel paginator, as returned in `data` for list endpoints
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Programs, memberships, tiers
// ---------------------------------------------------------------------------

export interface Program {
  id: number;
  name: string;
  slug: string;
  kind: 'saas' | 'pharma' | 'other';
  description: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payout_weekday: number; // ISO: 1 = Monday ... 5 = Friday
  signup_bonus_paisa: number;
  referral_discount_percentage: number;
}

export interface CommissionScheduleEntry {
  from_year: number;
  rate_bp: number;
}

export interface Tier {
  id: number;
  program_id: number;
  level: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  commission_schedule: CommissionScheduleEntry[];
  first_year_rate_bp: number;
  requirements: Record<string, number>;
  perks: Record<string, any>;
}

export type MembershipStatus = 'invited' | 'pending' | 'active' | 'suspended' | 'left';

export interface Membership {
  id: number;
  status: MembershipStatus;
  referral_code: string;
  // Pharmacy sign-up page with this code filled in (shown as a QR code)
  referral_url: string;
  joined_at: string | null;
  program?: Program;
  tier?: Tier | null;
  has_custom_commission: boolean;
}

export interface User {
  id: number;
  mr_id: number;
  name: string;
  email: string;
  contact: string;
  active_program_id: number | null;
  memberships: Membership[];
  last_login_at: string | null;
}

export interface TierRequirementProgress {
  current: number;
  required: number;
  met: boolean;
}

export interface TierProgress {
  next_tier: { id: number; name: string; level: number };
  requirements: Record<string, TierRequirementProgress>;
  percent: number;
}

export interface CurrentTier {
  current_tier: Tier | null;
  has_custom_commission: boolean;
  counts: ActivityCounts;
  progress: TierProgress | null;
}

export interface ActivityCounts {
  sales: number;
  visits: number;
  leads: number;
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export interface VenueType {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

export interface Venue {
  id: number;
  name: string;
  venue_type_id: number | null;
  type?: VenueType | null;
  address: string;
  city: string | null;
  district: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  pan_number: string | null;
  latitude: number | null;
  longitude: number | null;
  distance: number | null; // km, nearby search only
  is_active: boolean;
  is_customer: boolean; // already a MedicineXP pharmacy
  can_edit: boolean; // added by this MR
  created_at: string;
  updated_at: string;
}

export interface VenueStats {
  my_visits: number;
  my_dropoffs: number;
  my_call_logs: number;
  my_open_leads: number;
}

export interface VenueFormData {
  name: string;
  address: string;
  venue_type_id?: number | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  pan_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  client_uuid?: string;
}

// ---------------------------------------------------------------------------
// Materials and drop-offs
// ---------------------------------------------------------------------------

export interface MaterialType {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface Material {
  id: number;
  kind: 'marketing' | 'product' | 'sample';
  name: string;
  description: string | null;
  sku: string | null;
  unit: string | null;
  image_url: string | null;
  max_per_venue: number | null;
  type: MaterialType | null;
}

// From GET /materials: the material plus what this MR carries and has dropped off
export interface MaterialWithStock extends Material {
  in_bag: number;
  total_dropped_off: number;
  recent_dropoffs: Dropoff[];
}

export interface Dropoff {
  id: number;
  material_id: number;
  material?: Material;
  quantity: number;
  venue_id: number | null;
  venue: { id: number; name: string; address: string; city: string | null } | null;
  visit_id: number | null;
  received_by: string | null;
  notes: string | null;
  occurred_at: string;
}

export interface DropoffInput {
  material_id: number;
  quantity: number;
  client_uuid?: string;
}

// ---------------------------------------------------------------------------
// Visits
// ---------------------------------------------------------------------------

export type VisitStatus = 'planned' | 'completed' | 'cancelled';

export interface Visit {
  id: number;
  client_uuid: string | null;
  venue_id: number;
  venue?: Venue;
  visited_at: string;
  status: VisitStatus;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  distance_from_venue_m: number | null;
  notes: string | null;
  checked_out_at: string | null;
  dropoffs?: Dropoff[];
  created_at: string;
}

export interface VisitFilters {
  status?: VisitStatus;
  venue_id?: number;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface VisitInput {
  venue_id: number;
  client_uuid?: string;
  status?: 'planned' | 'completed';
  visited_at?: string;
  latitude?: number;
  longitude?: number;
  location_accuracy_m?: number;
  notes?: string;
  received_by?: string;
  dropoffs?: DropoffInput[];
}

export interface VisitStats {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
  unique_venues: number;
  planned_upcoming: number;
}

// ---------------------------------------------------------------------------
// Leads and call logs
// ---------------------------------------------------------------------------

export type LeadType = 'customer' | 'associate' | 'organization' | 'contact';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface Lead {
  id: number;
  client_uuid: string | null;
  lead_type: LeadType;
  display_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  associated_entity: string | null;
  status: LeadStatus;
  interest_level: number | null; // 1-5
  next_follow_up_at: string | null;
  notes: string | null;
  venue_id: number | null;
  venue?: Venue | null;
  visit_id: number | null;
  is_customer: boolean;
  converted_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  latest_call_log?: CallLog | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInput {
  lead_type?: LeadType;
  status?: 'new' | 'contacted' | 'qualified';
  venue_id?: number | null;
  visit_id?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_address?: string | null;
  associated_entity?: string | null;
  interest_level?: number | null;
  next_follow_up_at?: string | null;
  notes?: string | null;
  client_uuid?: string;
}

export type CallStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
export type CallDirection = 'incoming' | 'outgoing';

export interface CallLog {
  id: number;
  client_uuid: string | null;
  direction: CallDirection;
  status: CallStatus;
  call_date: string; // YYYY-MM-DD
  call_time: string; // HH:MM:SS
  duration_minutes: number;
  notes: string | null;
  scheduled_at: string | null;
  lead_id: number | null;
  lead: { id: number; display_name: string; contact_phone: string | null; status: LeadStatus } | null;
  venue_id: number | null;
  venue: { id: number; name: string; phone: string | null } | null;
  visit_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CallLogFormData {
  direction: CallDirection;
  status: CallStatus;
  call_date: string;
  call_time: string;
  duration_minutes?: number;
  notes?: string | null;
  scheduled_at?: string | null;
  lead_id?: number | null;
  venue_id?: number | null;
  visit_id?: number | null;
  client_uuid?: string;
}

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

export interface EarningsSummary {
  lifetime_paisa: number;
  this_week_paisa: number;
  paid_paisa: number;
  next_payout_paisa: number;
  pending_paisa: number;
  held_bonus_paisa: number;
  next_payout_date: string; // YYYY-MM-DD
  payout_weekday: number;
  payout_delayed: boolean;
  delay_reason: string | null;
}

export type CommissionStatus = 'held' | 'pending' | 'approved' | 'paid' | 'void';

export interface Commission {
  id: number;
  kind: 'sale' | 'signup_bonus' | 'custom_bonus' | 'adjustment';
  status: CommissionStatus;
  amount_paisa: number;
  rate_bp: number | null;
  reason: string | null;
  earned_at: string;
  pharmacy_name: string | null;
  subscription_year: number | null;
  sale_amount_paisa: number | null;
  payout_id: number | null;
}

export interface Payout {
  id: number;
  amount_paisa: number;
  status: 'pending' | 'paid' | 'failed';
  method: string | null;
  reference: string | null;
  scheduled_for: string | null;
  paid_at: string | null;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardData {
  mr: { id: number; name: string };
  membership: Membership;
  earnings: EarningsSummary;
  counts: ActivityCounts;
  today: { visits: number; calls: number };
  progress: TierProgress | null;
  follow_ups_due: Lead[];
  scheduled_calls_today: CallLog[];
  recent_visits: Visit[];
  recent_leads: Lead[];
}
