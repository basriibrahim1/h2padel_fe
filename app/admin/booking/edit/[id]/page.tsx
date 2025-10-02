// app/admin/[id]/page.tsx

"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// --- TYPES ---
interface CourtData {
  id: number;
  name: string;
  address: string;
  maps_url: string;
  fixed_price: number;
}
interface PersonData {
  id: string;
  name: string;
  phone: string;
  fixed_fee?: number;
}
interface BookingUpdate {
  id?: number;
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
  duration: number;
  final_court_price: number;
  final_coach_fee: number;
  is_with_photography: boolean;
  adult_number: number;
  children_number: number;
  status: string;
  notes: string;
}

// --- INITIAL STATE ---
const initialBooking: BookingUpdate = {
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
  duration: 60,
  final_court_price: 0,
  final_coach_fee: 0,
  is_with_photography: false,
  adult_number: 0,
  children_number: 0,
  status: "pending",
  notes: "",
};

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [bookingData, setBookingData] = useState<BookingUpdate | null>(null);
  const [clients, setClients] = useState<PersonData[]>([]);
  const [coaches, setCoaches] = useState<PersonData[]>([]);
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // --- HELPER: find & return autofill fields (robust: accepts number or string)

  const autofillCourtData = (courtId: number | string | ""): Partial<BookingUpdate> => {
    if (courtId === "" || courtId === null || courtId === undefined) return {};
    const idNum = typeof courtId === "number" ? courtId : Number(courtId);
    const court = courts.find((d) => Number(d.id) === idNum);
    if (!court) return {};
    return {
      court_name: court.name,
      court_address: court.address,
      court_maps_url: court.maps_url,
      final_court_price: Number(court.fixed_price) || 0,
    };
  }; // --- FETCH DROPDOWNS ---

  const fetchDropdowns = async () => {
    try {
      const [clientRes, coachRes, courtRes] = await Promise.all([
        supabase.from("clients").select(`id, profiles (full_name, phone)`),
        supabase.from("coaches").select(`id, fixed_fee, profiles (full_name, phone)`),
        supabase.from("field_courts").select(`id, name, address, maps_url, fixed_price`),
      ]);

      if (clientRes.error) {
        console.error("clients error:", clientRes.error);
        toast.error("Gagal memuat clients");
      } else if (clientRes.data) {
        setClients(
          clientRes.data.map((c: any) => ({
            id: String(c.id),
            name: c.profiles?.full_name || "N/A",
            phone: c.profiles?.phone || "",
          }))
        );
      }

      if (coachRes.error) {
        console.error("coaches error:", coachRes.error);
        toast.error("Gagal memuat coaches");
      } else if (coachRes.data) {
        setCoaches(
          coachRes.data.map((h: any) => ({
            id: String(h.id),
            name: h.profiles?.full_name || "N/A",
            phone: h.profiles?.phone || "",
            fixed_fee: Number(h.fixed_fee) || 0,
          }))
        );
      }

      if (courtRes.error) {
        console.error("courts error:", courtRes.error);
        toast.error("Gagal memuat courts");
      } else if (courtRes.data) {
        // normalize id to number
        setCourts(
          courtRes.data.map((d: any) => ({
            id: Number(d.id),
            name: d.name,
            address: d.address,
            maps_url: d.maps_url,
            fixed_price: Number(d.fixed_price) || 0,
          }))
        );
      }
    } catch (err: any) {
      console.error("fetchDropdowns failed:", err);
      toast.error("Gagal memuat dropdown data");
    }
  }; // --- FETCH BOOKING ---

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      if (error || !data) {
        console.error("fetchBooking error:", error);
        throw new Error("Booking tidak ditemukan");
      }

      const mapped: BookingUpdate = {
        ...initialBooking,
        ...data,
        court_id: data.court_id !== null && data.court_id !== undefined ? Number(data.court_id) : "", // Memastikan field court yang diminta ada saat pemuatan data
        court_name: data.court_name ?? "",
        court_address: data.court_address ?? "",
        court_maps_url: data.court_maps_url ?? "",
        client_id: data.client_id ?? "",
        client_name: data.client_name ?? "",
        client_phone: data.client_phone ?? "",
        coach_id: data.coach_id ?? "",
        coach_name: data.coach_name ?? "",
        coach_phone: data.coach_phone ?? "",
        start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : "",
        duration: data.duration || 0,
        final_court_price: Number(data.final_court_price) || 0,
        final_coach_fee: Number(data.final_coach_fee) || 0,
        adult_number: Number(data.adult_number) || 0,
        children_number: Number(data.children_number) || 0,
        is_with_photography: Boolean(data.is_with_photography),
        status: data.status ?? "pending",
        notes: data.notes ?? "",
      }; // Apply autofill if courts already loaded; otherwise effect below will apply after courts load

      const autofill = autofillCourtData(mapped.court_id);
      setBookingData({ ...mapped, ...autofill });
    } catch (err: any) {
      console.error("fetchBooking failed:", err);
      toast.error("Gagal memuat booking: " + (err?.message || ""));
      setBookingData(null);
    }
  }; // --- INIT: ensure dropdowns are loaded first for reliable autofill ---

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchDropdowns();
        await fetchBooking();
      } finally {
        setLoading(false);
      }
    })(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]); // If courts are fetched after booking, ensure autofill runs

  useEffect(() => {
    if (!bookingData) return;
    if (!bookingData.court_id) return;

    const fill = autofillCourtData(bookingData.court_id);
    if (
      (fill.court_name && fill.court_name !== bookingData.court_name) ||
      (fill.court_address && fill.court_address !== bookingData.court_address) ||
      (fill.court_maps_url && fill.court_maps_url !== bookingData.court_maps_url) ||
      (typeof fill.final_court_price === "number" && fill.final_court_price !== bookingData.final_court_price)
    ) {
      setBookingData((prev) => (prev ? { ...prev, ...fill } : prev));
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courts, bookingData?.court_id]); // --- HANDLER CHANGE (type-safe) ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const type = target.type;

    setBookingData((prev) => {
      if (!prev) return null; // checkbox

      if (type === "checkbox") {
        const checked = (target as HTMLInputElement).checked;
        return { ...prev, [name]: checked } as BookingUpdate;
      } // select court_id (autofill)

      if (name === "court_id") {
        const courtIdStr = (target as HTMLSelectElement).value;
        const courtIdNum = courtIdStr === "" ? "" : Number(courtIdStr);
        const autofill = autofillCourtData(courtIdNum);
        return { ...prev, court_id: courtIdNum as any, ...autofill } as BookingUpdate;
      } // select client_id -> populate name/phone

      if (name === "client_id") {
        const val = (target as HTMLSelectElement).value;
        const client = clients.find((c) => c.id === val);
        if (client) {
          return { ...prev, client_id: val, client_name: client.name, client_phone: client.phone } as BookingUpdate;
        }
        return { ...prev, client_id: val } as BookingUpdate;
      } // select coach_id -> populate name/phone/fixed_fee -> final_coach_fee

      if (name === "coach_id") {
        const val = (target as HTMLSelectElement).value;
        const coach = coaches.find((c) => c.id === val);
        if (coach) {
          return {
            ...prev,
            coach_id: val,
            coach_name: coach.name,
            coach_phone: coach.phone,
            final_coach_fee: coach.fixed_fee || 0,
          } as BookingUpdate;
        }
        return { ...prev, coach_id: val } as BookingUpdate;
      } // number inputs

      if (type === "number") {
        const raw = (target as HTMLInputElement).value;
        const num = raw === "" ? 0 : Number(raw);
        return { ...prev, [name]: num } as BookingUpdate;
      }

      if (name === "duration") {
        const raw = (target as HTMLInputElement).value;
        const num = raw === "" ? 0 : Number(raw);
        return { ...prev, duration: num } as BookingUpdate;
      } // default: text / textarea / datetime-local

      const val = (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
      return { ...prev, [name]: val } as BookingUpdate;
    });
  }; // --- SAVE HANDLER (with toast) ---

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingData) return;

    setSaving(true); // Hapus field 'id' saja. // Field court_name, court_address, dan court_maps_url akan tetap ada di payload.

    const { id: _maybeId, ...payload } = bookingData as BookingUpdate & { id?: number };

    try {
      // payload sekarang berisi court_name, court_address, dan court_maps_url
      const { error } = await supabase.from("bookings").update(payload).eq("id", bookingId);
      if (error) {
        console.error("Update error:", error);
        toast.error("Gagal menyimpan perubahan: " + error.message);
      } else {
        toast.success("Booking berhasil diperbarui!");
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      console.error("Unexpected update error:", err);
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  }; // --- UI ---

  if (loading) return <div className="p-6">Loading data...</div>;
  if (!bookingData) return <div className="p-6 text-red-500">Booking tidak ditemukan.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Booking ID: {bookingId}</h1>
      <Card className="bg-white shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 px-6 py-4 border-b">
          <CardTitle className="text-xl font-semibold text-gray-700">Detail Booking</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* PENGGUNA */}
            <h3 className="font-semibold text-gray-700 text-lg">Detail Pengguna</h3>
            <div className="grid grid-cols-2 gap-5">
              {/* COACH */}
              <div className="col-span-2">
                <Label htmlFor="coach_id" className="mb-1">
                  Pilih Coach
                </Label>
                <select id="coach_id" name="coach_id" value={bookingData.coach_id} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">-- Pilih Coach --</option>
                  {coaches.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Rp. {h.fixed_fee?.toLocaleString("id-ID") || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="coach_name" className="mb-1">
                  Name
                </Label>
                <Input id="coach_name" name="coach_name" type="text" value={bookingData.coach_name} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="coach_phone" className="mb-1">
                  Phone
                </Label>
                <Input id="coach_phone" name="coach_phone" type="tel" value={bookingData.coach_phone} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>

              {/* CLIENT */}
              <div className="col-span-2">
                <Label htmlFor="client_id" className="mb-1">
                  Pilih Client
                </Label>
                <select id="client_id" name="client_id" value={bookingData.client_id} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">-- Pilih Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="client_name" className="mb-1">
                  Client Name
                </Label>
                <Input id="client_name" name="client_name" type="text" value={bookingData.client_name} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="client_phone" className="mb-1">
                  Client Phone
                </Label>
                <Input id="client_phone" name="client_phone" type="tel" value={bookingData.client_phone} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
            </div>

            {/* COURT & WAKTU */}
            <h3 className="font-semibold text-gray-700 text-lg">Detail Court & Waktu</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="court_id" className="mb-1">
                  Pilih Court
                </Label>
                <select
                  id="court_id"
                  name="court_id"
                  value={bookingData.court_id === "" ? "" : String(bookingData.court_id)}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                >
                  <option value="">-- Pilih Court --</option>
                  {courts.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name} (Rp. {d.fixed_price.toLocaleString("id-ID")})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="start_time" className="mb-1">
                  Waktu Mulai
                </Label>
                <Input id="start_time" name="start_time" type="datetime-local" value={bookingData.start_time} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <Label htmlFor="court_name" className="mb-1">
                  Court Name
                </Label>
                <Input id="court_name" name="court_name" value={bookingData.court_name} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="duration" className="mb-1">
                  Duration (jam)
                </Label>
                <Input id="duration" name="duration" type="number" value={bookingData.duration} onChange={handleChange} min={0.5} step={0.5} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="court_address" className="mb-1">
                  Court Address
                </Label>
                <Textarea id="court_address" name="court_address" value={bookingData.court_address} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="court_maps_url" className="mb-1">
                  Maps URL
                </Label>
                <Input id="court_maps_url" name="court_maps_url" value={bookingData.court_maps_url} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
            </div>

            {/* BIAYA */}
            <h3 className="font-semibold text-gray-700 text-lg">Detail Biaya</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="final_court_price" className="mb-1">
                  Court Price (Rp)
                </Label>
                <Input id="final_court_price" name="final_court_price" type="number" value={bookingData.final_court_price} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" required />
              </div>
              <div>
                <Label htmlFor="final_coach_fee" className="mb-1">
                  Coach Fee (Rp)
                </Label>
                <Input id="final_coach_fee" name="final_coach_fee" type="number" value={bookingData.final_coach_fee} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" required />
              </div>
            </div>

            {/* STATUS & LAIN-LAIN */}
            <h3 className="font-semibold text-gray-700 text-lg">Status & Lain-lain</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="status" className="mb-1">
                  Status
                </Label>
                <select id="status" name="status" value={bookingData.status} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 mt-5">
                <input id="is_with_photography" name="is_with_photography" type="checkbox" checked={bookingData.is_with_photography} onChange={handleChange} className="h-5 w-5 text-blue-500" />
                <Label htmlFor="is_with_photography">Dengan Fotografi?</Label>
              </div>
              <div>
                <Label htmlFor="adult_number" className="mb-1">
                  Dewasa
                </Label>
                <Input id="adult_number" name="adult_number" type="number" value={bookingData.adult_number} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <Label htmlFor="children_number" className="mb-1">
                  Anak-anak
                </Label>
                <Input id="children_number" name="children_number" type="number" value={bookingData.children_number} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes" className="mb-1">
                  Notes
                </Label>
                <Textarea id="notes" name="notes" value={bookingData.notes} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex justify-between pt-6">
              <Button type="button" variant="outline" className="px-6 py-3 rounded-lg" onClick={() => router.push("/admin/dashboard")}>
                Kembali
              </Button>
              <Button type="submit" className="px-6 py-3 rounded-lg" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
