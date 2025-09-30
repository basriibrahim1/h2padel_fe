// app/admin/[id]/page.tsx (Halaman Edit)

"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Interface untuk field yang BOLEH di-edit Admin
interface BookingUpdate {
  court_id: number;
  client_id: string; // Foreign Key ID dari tabel clients
  client_name: string;
  client_phone: string;
  coach_id: string; // Foreign Key ID dari tabel coaches
  coach_name: string;
  coach_phone: string;
  start_time: string;
  final_court_price: number;
  final_coach_fee: number;
  is_with_photography: boolean;
  adult_number: number;
  children_number: number;
  status: string;
  notes: string;
}

// Interface untuk data mentah saat fetch
interface BookingDataRaw extends BookingUpdate {
  id: number;
  created_at: string;
  updated_at: string;
  total_price: number;
}

// Interface untuk data dropdown dari clients/coaches (termasuk user_id dari profiles)
interface PersonData {
  id: string; // ID dari tabel clients/coaches (Foreign Key di bookings)
  user_id: string; // ID dari auth.users
  name: string;
  phone: string;
  fixed_fee?: number; // Hanya untuk coach
}

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [bookingData, setBookingData] = useState<BookingUpdate | null>(null);
  const [clients, setClients] = useState<PersonData[]>([]);
  const [coaches, setCoaches] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log(coaches);

  // --- FUNGSI AMBIL DATA DROPDOWN ---
  const fetchDropdownData = async () => {
    // Ambil data Clients (Join ke profiles untuk nama dan phone)
    const { data: clientData } = await supabase.from("clients").select(`
                id, 
                user_id,
                profiles (full_name, phone)
            `);

    if (clientData) {
      setClients(
        clientData.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          name: c.profiles?.full_name || "N/A",
          phone: c.profiles?.phone || "",
        }))
      );
    }

    // Ambil data Coaches (Join ke profiles dan ambil default_fee)
    const { data: coachData } = await supabase.from("coaches").select(`
                id, 
                user_id, 
                fixed_fee,
                profiles (full_name, phone)
            `);

    if (coachData) {
      setCoaches(
        coachData.map((h: any) => ({
          id: h.id,
          user_id: h.user_id,
          name: h.profiles?.full_name || "N/A",
          phone: h.profiles?.phone || "",
          fixed_fee: h.fixed_fee || 0,
        }))
      );
    }
  };

  // --- FUNGSI AMBIL DATA BOOKING & INITIAL LOAD ---
  useEffect(() => {
    fetchDropdownData();

    if (!bookingId) return;

    const fetchBooking = async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single();

      setLoading(false);

      if (error) {
        setError(`Gagal mengambil data booking: ${error.message}`);
        return;
      }

      const { id, created_at, updated_at, total_price, ...editableData } = data as BookingDataRaw;

      const formattedData: BookingUpdate = {
        ...editableData,
        start_time: editableData.start_time ? new Date(editableData.start_time).toISOString().slice(0, 16) : "",
        court_id: Number(editableData.court_id),
        final_court_price: Number(editableData.final_court_price),
        final_coach_fee: Number(editableData.final_coach_fee),
        adult_number: Number(editableData.adult_number),
        children_number: Number(editableData.children_number),
      };

      setBookingData(formattedData);
    };

    fetchBooking();
  }, [bookingId]);

  // --- HANDLER AUTOFILL ---
  const handleAutofill = (name: "client_id" | "coach_id", value: string) => {
    setBookingData((prev) => {
      if (!prev) return null;

      let updates: Partial<BookingUpdate> = { [name]: value };
      const idToMatch = value;

      if (name === "client_id") {
        const client = clients.find((c) => c.id === idToMatch);
        if (client) {
          updates.client_name = client.name;
          updates.client_phone = client.phone;
        }
      } else if (name === "coach_id") {
        const coach = coaches.find((h) => h.id === idToMatch);
        if (coach) {
          updates.coach_name = coach.name;
          updates.coach_phone = coach.phone;
          updates.final_coach_fee = coach.fixed_fee || 0;
        }
      }

      return { ...prev, ...updates };
    });
  };

  // --- HANDLER CHANGE UMUM ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // Cek jika perubahan terjadi pada dropdown (client_id atau coach_id)
    if (name === "client_id" || name === "coach_id") {
      handleAutofill(name, value);
      return;
    }

    setBookingData((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              type === "number" || name === "court_id" || name === "final_court_price" || name === "final_coach_fee" || name === "adult_number" || name === "children_number"
                ? parseFloat(value) || 0
                : type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : value,
          }
        : null
    );
  };

  // --- HANDLER SAVE (UPDATE) ---
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingData) return;

    setSaving(true);
    setError(null);

    // Finalisasi data yang akan di-update
    const dataToUpdate = {
      ...bookingData,
      is_with_photography: Boolean(bookingData.is_with_photography),
    };

    const { error: updateError } = await supabase.from("bookings").update(dataToUpdate).eq("id", bookingId);

    setSaving(false);

    if (updateError) {
      setError(`Gagal menyimpan perubahan: ${updateError.message}`);
      return;
    }

    alert("Booking berhasil diperbarui!");
    router.push("/admin/dashboard");
  };

  if (loading) return <div className="p-6">Loading booking details...</div>;
  if (error && !bookingData) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!bookingData) return <div className="p-6">Booking tidak ditemukan.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Booking ID: {bookingId}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detail Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="font-semibold mt-4">Detail Pengguna</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* CLIENT ID DROPDOWN */}
              <div>
                <Label htmlFor="client_id">Pilih Client</Label>
                <select id="client_id" name="client_id" value={bookingData.client_id} onChange={handleChange} className="w-full p-2 border rounded">
                  <option value="">-- Pilih Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
              {/* COACH ID DROPDOWN */}
              <div>
                <Label htmlFor="coach_id">Pilih Coach</Label>
                <select id="coach_id" name="coach_id" value={bookingData.coach_id} onChange={handleChange} className="w-full p-2 border rounded">
                  <option value="">-- Pilih Coach --</option>
                  {coaches.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Rp. {h.fixed_fee})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Name (Autofill) */}
              <div>
                <Label htmlFor="client_name">Client Name</Label>
                <Input id="client_name" name="client_name" type="text" value={bookingData.client_name} onChange={handleChange} required />
              </div>
              {/* Coach Name (Autofill) */}
              <div>
                <Label htmlFor="coach_name">Coach Name</Label>
                <Input id="coach_name" name="coach_name" type="text" value={bookingData.coach_name} onChange={handleChange} required />
              </div>
              {/* Client Phone (Autofill) */}
              <div>
                <Label htmlFor="client_phone">Client Phone</Label>
                <Input id="client_phone" name="client_phone" type="tel" value={bookingData.client_phone} onChange={handleChange} />
              </div>
              {/* Coach Phone (Autofill) */}
              <div>
                <Label htmlFor="coach_phone">Coach Phone</Label>
                <Input id="coach_phone" name="coach_phone" type="tel" value={bookingData.coach_phone} onChange={handleChange} />
              </div>
            </div>

            <h3 className="font-semibold mt-4">Biaya & Waktu</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Final Court Price */}
              <div>
                <Label htmlFor="final_court_price">Court Price (Rp)</Label>
                <Input id="final_court_price" name="final_court_price" type="number" value={bookingData.final_court_price} onChange={handleChange} required />
              </div>
              {/* Final Coach Fee (Autofill dari dropdown coach) */}
              <div>
                <Label htmlFor="final_coach_fee">Coach Fee (Rp)</Label>
                <Input id="final_coach_fee" name="final_coach_fee" type="number" value={bookingData.final_coach_fee} onChange={handleChange} required />
              </div>

              {/* Court ID */}
              <div>
                <Label htmlFor="court_id">Court ID</Label>
                <Input id="court_id" name="court_id" type="number" value={bookingData.court_id} onChange={handleChange} required />
              </div>
              {/* Start Time */}
              <div>
                <Label htmlFor="start_time">Waktu Mulai</Label>
                <Input id="start_time" name="start_time" type="datetime-local" value={bookingData.start_time} onChange={handleChange} required />
              </div>
            </div>

            <h3 className="font-semibold mt-4">Status & Jumlah Orang</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" value={bookingData.status} onChange={handleChange} className="w-full p-2 border rounded">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {/* Is with Photography */}
              <div className="flex items-center space-x-2">
                <Input id="is_with_photography" name="is_with_photography" type="checkbox" checked={bookingData.is_with_photography} onChange={handleChange} className="h-4 w-4" />
                <Label htmlFor="is_with_photography">Dengan Fotografi?</Label>
              </div>
              {/* Adult Number */}
              <div>
                <Label htmlFor="adult_number">Dewasa</Label>
                <Input id="adult_number" name="adult_number" type="number" value={bookingData.adult_number} onChange={handleChange} required />
              </div>
              {/* Children Number */}
              <div>
                <Label htmlFor="children_number">Anak-anak</Label>
                <Input id="children_number" name="children_number" type="number" value={bookingData.children_number} onChange={handleChange} required />
              </div>
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/admin")}>
                Kembali
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
