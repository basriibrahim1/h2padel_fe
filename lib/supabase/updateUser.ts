"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function updateDisplayName(displayName: string) {
  const { data, error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (error) throw error;
  return data.user; // user updated
}
