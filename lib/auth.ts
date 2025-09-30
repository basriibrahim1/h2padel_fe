import { supabase } from "./supabase/client";

export const sendOTP = async (phone: string) => {
  return supabase.auth.signInWithOtp({ phone });
};

export const verifyOTP = async (phone: string, token: string) => {
  return supabase.auth.verifyOtp({ phone, token, type: "sms" });
};

export const getUserRole = async (userId: string) => {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role;
};
