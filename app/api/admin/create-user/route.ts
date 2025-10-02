// app/api/admin/create-user/route.ts (Final Code dengan SQL Function)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    // Pastikan Anda menerima fixedFee
    const { email, password, fullName, phone, role, fixedFee } = await req.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        {
          success: false,
          message: "Data utama (email, password, nama, role) wajib diisi.",
        },
        { status: 400 }
      );
    }

    // 1. Buat User di Supabase Auth (Service Role)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // NOTE: Kita tidak perlu mengisi user_metadata, karena kita mengisi Profiles melalui SQL Function
    });

    if (authError) {
      console.error("Auth user creation failed:", authError);
      return NextResponse.json(
        {
          success: false,
          message: authError.message,
        },
        { status: 400 }
      );
    }

    const newUserId = authData.user?.id;

    if (!newUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Gagal mendapatkan User ID dari Supabase Auth setelah pembuatan.",
        },
        { status: 500 }
      );
    }

    // 2. Panggil SQL Function untuk mengisi profiles dan tabel relasi (clients/coaches)
    const feeValue = fixedFee === undefined || fixedFee === null ? 0 : fixedFee;

    const { error: fnError } = await supabaseAdmin.rpc("create_user_profile_and_role", {
      new_user_id: newUserId,
      new_user_role: role,
      new_full_name: fullName,
      new_phone: phone,
      new_email: email,
      coach_fixed_fee: feeValue,
    });

    if (fnError) {
      console.error("SQL Function (create_user_profile_and_role) Gagal:", fnError);
      // Error ini berasal dari database constraint di function
      return NextResponse.json(
        {
          success: false,
          message: `Database error via SQL Function: ${fnError.message}`,
        },
        { status: 500 }
      );
    }

    // 3. Respon Sukses
    return NextResponse.json({
      success: true,
      message: "Pengguna baru berhasil dibuat dan DB relasi terisi.",
      userId: newUserId,
    });
  } catch (err: any) {
    console.error("General API Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
