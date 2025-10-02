// /api/admin/create-court/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // Pastikan ini Service Role Client

export async function POST(req: Request) {
  try {
    const { name, address, maps_url, fixed_price } = await req.json();

    if (!name || !address || fixed_price === undefined) {
      return NextResponse.json({ success: false, message: "Data Court (nama, alamat, harga) wajib diisi." }, { status: 400 });
    }

    // --- Lakukan INSERT ke tabel field_courts ---
    const { data, error } = await supabaseAdmin
      .from("field_courts")
      .insert([
        {
          name,
          address,
          maps_url,
          fixed_price: Number(fixed_price),
        },
      ])
      .select("id") // Ambil ID yang baru dibuat
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      // PENTING: Jika terjadi error database, kembalikan JSON
      return NextResponse.json({ success: false, message: error.message || "Gagal memasukkan Court ke database." }, { status: 500 });
    }

    // --- Respon Sukses ---
    return NextResponse.json({
      success: true,
      message: "Court baru berhasil dibuat.",
      // PENTING: Mengembalikan ID dengan kunci 'courtId'
      courtId: data.id,
    });
  } catch (err: any) {
    console.error("General API Error:", err);
    // PENTING: Jika terjadi error umum (misal: JSON parsing gagal), kembalikan JSON
    return NextResponse.json({ success: false, message: "Internal server error: " + err.message }, { status: 500 });
  }
}
