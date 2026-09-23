// Tipos que espelham o schema definido em supabase/migrations/0001_init.sql

export type SessionStatus = 'active' | 'matched' | 'no_match' | 'cancelled';
export type SplitType = 'equal' | 'exact' | 'percentage';
export type GroupRole = 'owner' | 'member';

export interface SessionFilters {
  categories?: string[];
  price_levels?: number[]; // escala Google Places: 0 a 4
  vegetarian_friendly?: boolean;
}

export interface UserRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMemberRow {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

export interface SwipeSessionRow {
  id: string;
  group_id: string;
  created_by: string;
  city: string;
  location_lat: number;
  location_lng: number;
  radius_meters: number;
  filters: SessionFilters;
  status: SessionStatus;
  created_at: string;
  ended_at: string | null;
}

export interface SessionParticipantRow {
  session_id: string;
  user_id: string;
  joined_at: string;
}

export interface RestaurantRow {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  category: string | null;
  price_level: number | null;
  rating: number | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  vegetarian_friendly: boolean | null;
  raw: Record<string, unknown> | null;
  fetched_at: string;
}

export interface SessionRestaurantRow {
  session_id: string;
  restaurant_id: string;
  position: number;
}

export interface SwipeRow {
  id: string;
  session_id: string;
  user_id: string;
  restaurant_id: string;
  liked: boolean;
  created_at: string;
}

export interface MatchRow {
  id: string;
  session_id: string;
  restaurant_id: string;
  matched_at: string;
}

export interface ExpenseRow {
  id: string;
  group_id: string;
  session_id: string | null;
  match_id: string | null;
  description: string;
  total_amount: number;
  paid_by: string;
  split_type: SplitType;
  created_by: string;
  created_at: string;
}

export interface ExpenseParticipantRow {
  expense_id: string;
  user_id: string;
  share_amount: number;
}

// Combinações úteis para a UI

export interface GroupWithMemberCount extends GroupRow {
  member_count: number;
}

export interface MatchWithRestaurant extends MatchRow {
  restaurant: RestaurantRow;
}

export interface ExpenseWithParticipants extends ExpenseRow {
  participants: (ExpenseParticipantRow & { user: UserRow })[];
  payer: UserRow;
}
