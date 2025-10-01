"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// --- INTERFACE/TYPES ---

interface CourtData {
  id: number;
  court_name: string;
  court_address: string;
  court_maps_url: string;
  fixed_price: number;
}

interface PersonData {
  id: string; // Foreign Key ID
  name: string;
  phone: string;
  fixed_fee?: number; // Hanya untuk coach
}

interface BookingInsert {
  court_id: number | "";
  court_name: string;
  court_address: string;
  court_maps_url: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  coach_id: string;
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

// --- INITIAL STATE ---

const initialBookingState: BookingInsert = {
  court_id: "",
  court_name: "",
  court_address: "",
  court_maps_url: "",
  client_id: "",
  client_name: "",
  client_phone: "",
  coach_id: "",
  coach_name: "",
  coach_phone: "",
  start_time: "",
  final_court_price: 0,
  final_coach_fee: 0,
  is_with_photography: false,
  adult_number: 1, // Default 1 dewasa
  children_number: 0,
  status: "pending",
  notes: "",
};

export default function AddBookingPage() {
  const router = useRouter();

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // State untuk data booking BARU
  const [bookingData, setBookingData] = useState<BookingInsert>(initialBookingState);

  // State untuk dropdowns
  const [clients, setClients] = useState<PersonData[]>([]);
  const [coaches, setCoaches] = useState<PersonData[]>([]);
  const [courts, setCourts] = useState<CourtData[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function untuk autofill court
  const autofillCourtData = (currentBooking: BookingInsert, courtId: number | "", allCourts: CourtData[]) => {
    if (!courtId) return { court_name: "", court_address: "", court_maps_url: "", final_court_price: currentBooking.final_court_price };

    const court = allCourts.find((d) => d.id === courtId);
    if (court) {
      return {
        court_name: court.court_name,
        court_address: court.court_address,
        court_maps_url: court.court_maps_url,
        // Di halaman ADD, kita selalu menggunakan fixed_price dari court baru
        final_court_price: court.fixed_price || 0,
      };
    }
    return { court_name: "", court_address: "", court_maps_url: "", final_court_price: 0 };
  };

  // --- FUNGSI UTAMA: FETCH DROPDOWN DATA (Hanya fetch, tidak ada booking data) ---
  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      setLoading(true);

      try {
        // 1. Fetch Dropdown Data (Courts, Clients, Coaches) secara paralel
        const [clientRes, coachRes, courtRes] = await Promise.all([
          supabase.from("clients").select(`id, user_id, profiles (full_name, phone)`),
          supabase.from("coaches").select(`id, user_id, fixed_fee, profiles (full_name, phone)`),
          supabase.from("field_courts").select(`id, name, address, maps_url, fixed_price`),
        ]);

        if (clientRes.data) {
          setClients(
            clientRes.data.map((c: any) => ({
              id: c.id,
              name: c.profiles?.full_name || "N/A",
              phone: c.profiles?.phone || "",
              user_id: c.user_id,
            }))
          );
        }

        if (coachRes.data) {
          setCoaches(
            coachRes.data.map((h: any) => ({
              id: h.id,
              name: h.profiles?.full_name || "N/A",
              phone: h.profiles?.phone || "",
              user_id: h.user_id,
              fixed_fee: Number(h.fixed_fee) || 0,
            }))
          );
        }

        if (courtRes.data) {
          const mappedCourts = courtRes.data.map((d: any) => ({
            id: d.id,
            court_name: d.name,
            court_address: d.address,
            court_maps_url: d.maps_url,
            fixed_price: Number(d.fixed_price) || 0,
          }));
          setCourts(mappedCourts);
        }

        if (clientRes.error || coachRes.error || courtRes.error) {
          console.error("Error fetching dropdowns:", clientRes.error, coachRes.error, courtRes.error);
        }
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setError(`Gagal memuat data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- HANDLER AUTOFILL UTAMA (CLIENT/COACH/COURT) ---
  const handleAutofill = (name: "client_id" | "coach_id" | "court_id", value: string) => {
    setBookingData((prev) => {
      let updates: Partial<BookingInsert> = { [name]: value };
      const idToMatch = value;

      if (name === "court_id") {
        const courtIdNum = Number(idToMatch) || "";
        // Menggunakan fungsi helper autofillCourtData
        const courtUpdates = autofillCourtData(prev, courtIdNum, courts);
        updates = { ...updates, ...courtUpdates, court_id: courtIdNum };
      } else if (name === "client_id") {
        const client = clients.find((c) => c.id === idToMatch);
        if (client) {
          updates.client_name = client.name;
          updates.client_phone = client.phone;
        } else {
          updates.client_name = "";
          updates.client_phone = "";
        }
      } else if (name === "coach_id") {
        const coach = coaches.find((h) => h.id === idToMatch);
        if (coach) {
          updates.coach_name = coach.name;
          updates.coach_phone = coach.phone;
          updates.final_coach_fee = coach.fixed_fee || 0;
        } else {
          updates.coach_name = "";
          updates.coach_phone = "";
          updates.final_coach_fee = 0;
        }
      }

      return { ...prev, ...updates };
    });
  };

  // --- HANDLER CHANGE UMUM ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === "client_id" || name === "coach_id" || name === "court_id") {
      handleAutofill(name, value);
      return;
    }

    // Abaikan perubahan pada field phone yang seharusnya otomatis
    if (name === "client_phone" || name === "coach_phone") {
      return;
    }

    setBookingData((prev) => ({
      ...prev,
      [name]:
        type === "number" || name === "final_court_price" || name === "final_coach_fee" || name === "adult_number" || name === "children_number"
          ? parseFloat(value) || 0
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  // --- HANDLER SAVE (INSERT) ---
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!bookingData.client_id || !bookingData.court_id || !bookingData.start_time) {
      setError("Client, Court, dan Waktu Mulai harus diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    // Destructure untuk menghilangkan field yang hanya ada di frontend (court name/address/url)
    const { court_name, court_address, court_maps_url, ...dataToInsert } = bookingData;

    const finalInsert = {
      ...dataToInsert,
      is_with_photography: Boolean(dataToInsert.is_with_photography),
    };

    // 🛑 Menggunakan .insert()
    const { error: insertError } = await supabase.from("bookings").insert(finalInsert);

    setSaving(false);

    if (insertError) {
      setError(`Gagal menyimpan booking: ${insertError.message}`);
      return;
    }

    alert("Booking berhasil ditambahkan!");
    router.push("/admin"); // Arahkan kembali ke halaman admin/list
  };

  // --- RENDER BLOCKERS ---

  if (loading) return <div className="p-6">Loading data...</div>;
  if (error && !saving) return <div className="p-6 text-red-500">Error: {error}</div>;

  // --- RENDER JSX ---

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tambah Booking Baru</h1>
      <Card>
        <CardHeader>
          <CardTitle>Isi Detail Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* SECTION 1: COURT & WAKTU */}
            <h3 className="font-semibold mt-4">Detail Court & Waktu</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* COURT ID DROPDOWN */}
              <div>
                <Label htmlFor="court_id">Pilih Court</Label>
                <select id="court_id" name="court_id" value={bookingData.court_id || ""} onChange={handleChange} className="w-full p-2 border rounded" required>
                  <option value="">-- Pilih Court --</option>
                  {courts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.court_name} (Rp. {d.fixed_price.toLocaleString("id-ID")})
                    </option>
                  ))}
                </select>
              </div>
              {/* Start Time */}
              <div>
                <Label htmlFor="start_time">Waktu Mulai</Label>
                <Input id="start_time" name="start_time" type="datetime-local" value={bookingData.start_time} onChange={handleChange} required />
              </div>
              {/* Court Name (Autofill) */}
              <div className="col-span-2">
                <Label htmlFor="court_name">Court Name</Label>
                <Input id="court_name" type="text" value={bookingData.court_name} readOnly disabled className="bg-gray-100" />
              </div>
              {/* Court Address (Autofill) */}
              <div className="col-span-2">
                <Label htmlFor="court_address">Court Address</Label>
                <Textarea id="court_address" value={bookingData.court_address} readOnly disabled className="bg-gray-100" />
              </div>
              {/* Court Maps URL (Autofill) */}
              <div className="col-span-2">
                <Label htmlFor="court_maps_url">Maps URL</Label>
                <Input id="court_maps_url" type="url" value={bookingData.court_maps_url} readOnly disabled className="bg-gray-100" />
              </div>
            </div>

            {/* SECTION 2: BIAYA */}
            <h3 className="font-semibold mt-4">Detail Biaya</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Final Court Price */}
              <div>
                <Label htmlFor="final_court_price">Court Price (Rp)</Label>
                {/* Nilai ini otomatis diisi oleh dropdown court, tetapi bisa diedit jika perlu */}
                <Input id="final_court_price" name="final_court_price" type="number" value={bookingData.final_court_price} onChange={handleChange} required />
              </div>
              {/* Final Coach Fee */}
              <div>
                <Label htmlFor="final_coach_fee">Coach Fee (Rp)</Label>
                {/* Nilai ini otomatis diisi oleh dropdown coach, tetapi bisa diedit jika perlu */}
                <Input id="final_coach_fee" name="final_coach_fee" type="number" value={bookingData.final_coach_fee} onChange={handleChange} required />
              </div>
            </div>

            {/* SECTION 3: PENGGUNA */}
            <h3 className="font-semibold mt-4">Detail Pengguna</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* CLIENT ID DROPDOWN */}
              <div>
                <Label htmlFor="client_id">Pilih Client</Label>
                <select id="client_id" name="client_id" value={bookingData.client_id} onChange={handleChange} className="w-full p-2 border rounded" required>
                  <option value="">-- Pilih Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
                      {h.name} (Rp. {h.fixed_fee?.toLocaleString("id-ID") || 0})
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
                <Input id="client_phone" name="client_phone" type="tel" value={bookingData.client_phone} onChange={handleChange} readOnly disabled className="bg-gray-100" />
              </div>
              {/* Coach Phone (Autofill) */}
              <div>
                <Label htmlFor="coach_phone">Coach Phone</Label>
                <Input id="coach_phone" name="coach_phone" type="tel" value={bookingData.coach_phone} onChange={handleChange} readOnly disabled className="bg-gray-100" />
              </div>
            </div>

            {/* SECTION 4: STATUS & JUMLAH ORANG */}
            <h3 className="font-semibold mt-4">Status & Lain-lain</h3>
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
              {/* Notes */}
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={bookingData.notes} onChange={handleChange} />
              </div>
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/admin")}>
                Kembali
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menambahkan..." : "Tambah Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
