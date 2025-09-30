// ===============================================
// 5. Database Schema (Final and Complete) in TypeScript
// ===============================================

// Enum Role
export type Role = "superadmin" | "admin" | "coach" | "client";

// 5.1 profiles
export interface Profile {
  id: string; // UUID from auth.users
  role: Role;
  name: string;
  phone_number: string | null;
  email: string;
  picture_url: string | null;
}

// 5.4 field_courts
export interface FieldCourt {
  id: number; // BIGINT, IDENTITY
  name: string;
  fixed_price: number; // NUMERIC
  address: string;
  maps_url: string | null;
}

// 5.2 coaches (1-to-1 detail)
export interface CoachDetail {
  profile_id: string; // FK to profiles (id)
  fixed_fee: number; // NUMERIC
}

// 5.3 clients (1-to-1 detail)
export interface ClientDetail {
  profile_id: string; // FK to profiles (id)
  notes: string | null;
}

// 5.5 bookings
export interface Booking {
  id: number; // BIGINT, IDENTITY
  court_id: number; // FK to field_courts (id)
  client_id: string; // FK to profiles (id)
  coach_id: string | null; // FK to profiles (id)
  start_time: string; // TIMESTAMPTZ (ISO string)
  final_court_price: number; // Historical price
  final_coach_fee: number; // Historical fee (0 if no coach)
  total_price: number; // Final calculated price
  is_with_photography: boolean;
  adult_number: number;
  children_number: number;
  status: "pending" | "confirmed" | "cancelled"; // TEXT default 'pending'
}
