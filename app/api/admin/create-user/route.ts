// app/api/admin/create-user/route.ts (Direvisi untuk Rollback)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
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

    // --- 1. Buat User di Supabase Auth (Service Role) ---
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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

    // --- 2. Panggil SQL Function untuk mengisi profiles dan tabel relasi ---
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

      // V KRITIS: ROLLBACK MANUAL - Hapus user yang baru dibuat jika insert DB gagal V
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        console.log(`Rollback sukses: User Auth ${newUserId} berhasil dihapus.`);
      } catch (deleteError: any) {
        console.error("Rollback Gagal: Gagal menghapus user Auth setelah DB error:", deleteError);
      }
      // A KRITIS: ROLLBACK MANUAL - Hapus user yang baru dibuat jika insert DB gagal A

      return NextResponse.json(
        {
          success: false,
          message: `Database error: ${fnError.message}. User Auth telah dihapus (rollback).`,
        },
        { status: 500 }
      );
    }

    // --- 3. Respon Sukses ---
    return NextResponse.json({
      success: true,
      message: `${role} baru berhasil dibuat dan DB relasi terisi.`,
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
