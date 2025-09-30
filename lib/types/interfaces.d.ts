// types.ts

export type RoleEnum = "client" | "coach" | "admin" | "superadmin";

// ------------------------
// Profiles
// ------------------------
export interface Profiles {
  id: string;
  role: RoleEnum;
  name: string;
  phone_number?: string | null;
  email: string;
  picture_url?: string | null;
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

// ------------------------
// Coaches
// ------------------------
export interface Coach {
  profile_id: string; // UUID, FK to Profile
  fixed_fee: number;
  created_at: string;
  updated_at: string;
}

// ------------------------
// Clients
// ------------------------
export interface Client {
  profile_id: string; // UUID, FK to Profile
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------
// Field Courts
// ------------------------
export interface FieldCourt {
  id: number; // BIGINT
  name: string;
  fixed_price: number;
  address: string;
  maps_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------
// Bookings
// ------------------------
export type BookingStatus = "pending" | string;

export interface Booking {
  id: number;
  court_id: number;
  client_id: string;
  coach_id?: string | null;
  start_time: string;
  final_court_price: number;
  final_coach_fee: number;
  total_price: number;
  is_with_photography: boolean;
  adult_number: number;
  children_number: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}
