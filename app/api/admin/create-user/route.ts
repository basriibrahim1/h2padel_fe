// app/api/admin/create-user/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // Ganti path sesuai struktur Anda

export async function POST(req: Request) {
  const { email, password, fullName, phone, role } = await req.json();

  // Tambahkan validasi di sini jika diperlukan

  // Gunakan Admin Client untuk membuat user baru
  // Kita gunakan createUser() untuk mengatur password, dan TIDAK ada autologin.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    // WAJIB: Atur ini menjadi true untuk memastikan sesi TIDAK dibuat
    // Ini memaksa user untuk melakukan verifikasi atau login ulang.
    email_confirm: true,

    user_metadata: {
      full_name: fullName,
      phone: phone,
      user_role: role,
    },
  });

  if (error) {
    console.error("Admin user creation failed:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }

  // Akun dibuat, sesi Admin yang memanggil API TIDAK terpengaruh.
  return NextResponse.json({
    success: true,
    message: "Pengguna baru berhasil dibuat. Admin session tidak berubah.",
    userId: data.user?.id,
  });
}
