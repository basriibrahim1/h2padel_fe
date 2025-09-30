// app/admin/add/page.tsx (Halaman Add)

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Interface untuk data yang akan di-insert
interface NewBooking {
  court_id: number | "";
  client_id: string; // Anda harus mendapatkan ini dari user_id Client
  coach_id: string; // Anda harus mendapatkan ini dari user_id Coach
  start_time: string; // Format datetime-local
  total_price: number | "";
  status: string;
  // Tambahkan field lain yang wajib diisi Admin
}

export default function AddBookingPage() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Nilai default untuk form ADD
  const [newBooking, setNewBooking] = useState<NewBooking>({
    court_id: "",
    client_id: "", // Di dunia nyata, ini dari dropdown/search user
    coach_id: "",
    start_time: new Date().toISOString().slice(0, 16),
    total_price: "",
    status: "pending",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewBooking((prev) => ({
      ...prev,
      [name]: name === "total_price" || name === "court_id" ? parseFloat(value) || (value === "" ? "" : 0) : value,
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    // Validasi wajib di sini: pastikan client_id, coach_id, dll. terisi
    if (!newBooking.client_id || !newBooking.coach_id || !newBooking.court_id) {
      setError("Field Client ID, Coach ID, dan Court ID wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    const dataToInsert = {
      ...newBooking,
      // Pastikan semua nilai numerik dikonversi ke number
      court_id: Number(newBooking.court_id),
      total_price: Number(newBooking.total_price),
      // Tambahkan field 'client_name', 'coach_name' di sini jika Anda mengisinya manual
      // client_name: 'Nama Client Manual',
    };

    const { error: insertError } = await supabase.from("bookings").insert(dataToInsert);

    setSaving(false);

    if (insertError) {
      setError(`Gagal menambahkan booking: ${insertError.message}`);
      return;
    }

    alert("Booking berhasil ditambahkan!");
    router.push("/admin");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add New Booking</h1>
      <Card>
        <CardHeader>
          <CardTitle>Input Detail Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Client ID (Asumsi Anda dapat UUID dari form/search lain) */}
            <div>
              <Label htmlFor="client_id">Client ID (UUID)</Label>
              <Input id="client_id" name="client_id" type="text" value={newBooking.client_id} onChange={handleChange} required />
            </div>

            {/* Coach ID */}
            <div>
              <Label htmlFor="coach_id">Coach ID (UUID)</Label>
              <Input id="coach_id" name="coach_id" type="text" value={newBooking.coach_id} onChange={handleChange} required />
            </div>

            {/* Court ID */}
            <div>
              <Label htmlFor="court_id">Court ID</Label>
              <Input id="court_id" name="court_id" type="number" value={newBooking.court_id} onChange={handleChange} required />
            </div>

            {/* Start Time */}
            <div>
              <Label htmlFor="start_time">Waktu Mulai</Label>
              <Input id="start_time" name="start_time" type="datetime-local" value={newBooking.start_time} onChange={handleChange} required />
            </div>

            {/* Total Price */}
            <div>
              <Label htmlFor="total_price">Total Harga (Rp)</Label>
              <Input id="total_price" name="total_price" type="number" value={newBooking.total_price} onChange={handleChange} required />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" value={newBooking.status} onChange={handleChange} className="w-full p-2 border rounded">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.push("/admin")}>
                Kembali
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Adding..." : "Add Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
