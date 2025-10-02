// app/api/admin/update-user/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface UpdateUserPayload {
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  password?: string;
  role: "client" | "coach";
  fixedFee?: number;
}

export async function PUT(request: Request) {
  let body: UpdateUserPayload;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, fullName, phone, email, password, role, fixedFee } = body;

  // Cek paling penting: Pastikan userId ada
  if (!userId || !role || !fullName) {
    return NextResponse.json({ success: false, message: "Data wajib (userId, fullName, role) tidak lengkap." }, { status: 400 });
  }

  try {
    // 1. Update Otentikasi Pengguna (Auth)
    const authUpdates: { email?: string; password?: string } = {};
    if (email) authUpdates.email = email;
    // HANYA kirim password ke Supabase Auth jika diisi di form (length > 0)
    if (password && password.length > 0) authUpdates.password = password;

    if (email || (password && password.length > 0)) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);

      if (authError) {
        // Jika errornya "User not found", ini akan ditangkap di sini
        if (authError.message.includes("A user with this email address already exists")) {
          return NextResponse.json({ success: false, message: "Gagal: Email sudah digunakan oleh user lain." }, { status: 409 });
        }
        // Mengembalikan error Supabase Auth, termasuk "User not found"
        return NextResponse.json({ success: false, message: authError.message }, { status: 404 });
      }
    }

    // 2. Update Tabel 'profiles' (untuk nama dan telepon)
    const profileUpdateData: { full_name: string; phone?: string } = { full_name: fullName };
    if (phone !== undefined) {
      profileUpdateData.phone = phone;
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").update(profileUpdateData).eq("id", userId); // Menggunakan userId (UUID) untuk mencari baris

    if (profileError) {
      throw profileError;
    }

    // 3. Update Tabel 'coaches' jika perlu
    if (role === "coach") {
      const coachUpdateData: { fixed_fee?: number } = {};
      if (fixedFee !== undefined) {
        coachUpdateData.fixed_fee = fixedFee;
      }

      const { error: coachError } = await supabaseAdmin.from("coaches").update(coachUpdateData).eq("id", userId);

      if (coachError) {
        throw coachError;
      }
    }

    return NextResponse.json({ success: true, message: `User ${fullName} (${userId}) berhasil diupdate.` });
  } catch (error: any) {
    console.error("Error updating user:", error.message || error);
    return NextResponse.json({ success: false, message: error.message || "Gagal mengupdate pengguna." }, { status: 500 });
  }
}
