"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
// Asumsi path import komponen SelectWithAddAndSearch sudah benar
import { SelectWithAddAndSearch } from "@/components/shared/SelectWithAddAndSearch ";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// --- TYPES ---
interface CourtData {
  id: number;
  name: string;
  address: string;
  maps_url: string;
  fixed_price: number;
}
interface PersonData {
  id: string; // PK Lokal (clients.id atau coaches.id)
  user_id: string; // UUID Auth (profiles.id) - Wajib untuk edit
  name: string;
  phone: string;
  email?: string;
  fixed_fee?: number;
}
interface SelectOption {
  value: string | number;
  label: string;
  data: PersonData | CourtData;
}
interface NewEntry {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  fee?: number;
  address?: string;
  maps_url?: string;
  fixed_price?: number;
  // Fields untuk edit
  id?: string | number;
  user_id?: string;
  type?: "client" | "coach" | "court";
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
  duration: 1,
  final_court_price: 0,
  final_coach_fee: 0,
  is_with_photography: false,
  adult_number: 0,
  children_number: 0,
  status: "pending",
  notes: "",
};

const formatRupiah = (amount: number | undefined) => {
  if (!amount || isNaN(amount)) return "0";
  return amount.toLocaleString("id-ID");
};

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [bookingData, setBookingData] = useState<BookingUpdate | null>(null);
  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
  const [coachOptions, setCoachOptions] = useState<SelectOption[]>([]);
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- HELPER: find & return autofill fields ---
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
  };

  // --- FETCH DROPDOWNS (Dengan user_id) ---
  const fetchDropdowns = async () => {
    try {
      // Ambil user_id (UUID Auth) di joins
      const [clientRes, coachRes, courtRes] = await Promise.all([
        supabase.from("clients").select(`id, user_id, profiles!inner (full_name, phone, role, email)`).eq("profiles.role", "client"),
        supabase.from("coaches").select(`id, user_id, fixed_fee, profiles!inner (full_name, phone, role, email)`).eq("profiles.role", "coach"),
        supabase.from("field_courts").select(`id, name, address, maps_url, fixed_price`),
      ]);

      if (clientRes.error) throw new Error(clientRes.error.message);
      if (coachRes.error) throw new Error(coachRes.error.message);
      if (courtRes.error) throw new Error(courtRes.error.message);

      // Mapping Clients ke SelectOption[]
      const newClients = clientRes.data.map((c: any) => ({
        id: String(c.id),
        user_id: c.user_id,
        name: c.profiles?.full_name || "N/A",
        phone: c.profiles?.phone || "",
        email: c.profiles?.email || "",
      }));
      const newClientOptions: SelectOption[] = newClients.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.phone})`,
        data: c as PersonData,
      }));
      setClientOptions(newClientOptions);

      // Mapping Coaches ke SelectOption[]
      const newCoaches = coachRes.data.map((h: any) => ({
        id: String(h.id),
        user_id: h.user_id,
        name: h.profiles?.full_name || "N/A",
        phone: h.profiles?.phone || "",
        email: h.profiles?.email || "",
        fixed_fee: Number(h.fixed_fee) || 0,
      }));
      const newCoachOptions: SelectOption[] = newCoaches.map((h) => ({
        value: h.id,
        label: `${h.name} (Fee: Rp. ${formatRupiah(h.fixed_fee)})`,
        data: h as PersonData,
      }));
      setCoachOptions(newCoachOptions);

      // Mapping Courts
      const newCourtsData: CourtData[] = courtRes.data.map((d: any) => ({
        id: Number(d.id),
        name: d.name,
        address: d.address,
        maps_url: d.maps_url,
        fixed_price: Number(d.fixed_price) || 0,
      }));
      setCourts(newCourtsData);

      return { clientOptions: newClientOptions, coachOptions: newCoachOptions, courtData: newCourtsData };
    } catch (err: any) {
      console.error("fetchDropdowns failed:", err);
      toast.error("Gagal memuat dropdown data");
      return { clientOptions: [], coachOptions: [], courtData: [] };
    }
  };

  // --- HANDLE ADD NEW ENTRY (Placeholder, karena fokus di sini adalah EDIT) ---
  const handleAddNewEntry = useCallback(async (newEntry: NewEntry, type: "client" | "coach" | "court"): Promise<void> => {
    // Logika penambahan baru (registrasi user/court) SAMA dengan AddBookingPage
    toast.info("Fitur penambahan data baru di Edit Page tidak diaktifkan. Silakan tambahkan melalui Add Booking Page.");
    throw new Error("Add function not supported here.");
  }, []);

  // --- HANDLE EDIT ENTRY (DENGAN AUTOFIL & UPDATE STATE LOKAL) ---
  const handleEdit = useCallback(
    async (updatedEntry: NewEntry) => {
      const type = updatedEntry.type;

      let targetId: string | number | null | undefined = null;
      if (type === "court") {
        targetId = updatedEntry.id; // PK number
      } else {
        targetId = updatedEntry.user_id || null; // UUID string (user_id)
      }

      if (!targetId || !type) {
        throw new Error("ID atau Tipe data tidak ditemukan untuk diupdate.");
      }

      if (!bookingData) return;

      try {
        if (type === "court") {
          const courtId = Number(targetId);

          const { error: courtError } = await supabase
            .from("field_courts")
            .update({
              name: updatedEntry.name,
              address: updatedEntry.address,
              maps_url: updatedEntry.maps_url,
              fixed_price: updatedEntry.fixed_price,
            })
            .eq("id", courtId);

          if (courtError) throw courtError;

          // 1. Update State Courts (untuk dropdown)
          const updatedCourtData: CourtData = {
            id: courtId,
            name: updatedEntry.name,
            address: updatedEntry.address || "",
            maps_url: updatedEntry.maps_url || "",
            fixed_price: updatedEntry.fixed_price || 0,
          };
          setCourts((prevCourts) => prevCourts.map((c) => (c.id === courtId ? updatedCourtData : c)));

          // 2. Autofill Booking Data jika Court ini sedang terpilih
          if (bookingData.court_id === courtId) {
            setBookingData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                court_name: updatedEntry.name,
                final_court_price: updatedEntry.fixed_price || 0,
                court_address: updatedEntry.address || "",
                court_maps_url: updatedEntry.maps_url || "",
              };
            });
          }
        } else {
          const userId = String(targetId);
          const pkLokal = String(updatedEntry.id);

          const response = await fetch("/api/admin/update-user", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              fullName: updatedEntry.name,
              phone: updatedEntry.phone,
              email: updatedEntry.email,
              password: updatedEntry.password,
              role: type,
              fixedFee: updatedEntry.fee,
            }),
          });

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || "Gagal mengupdate pengguna melalui API.");
          }

          // 1. Update State Lokal (untuk dropdown)
          const updatedPersonData: PersonData = {
            id: pkLokal,
            user_id: userId,
            name: updatedEntry.name,
            phone: updatedEntry.phone || "",
            email: updatedEntry.email || result.oldEmail || "",
            fixed_fee: type === "coach" ? updatedEntry.fee || 0 : undefined,
          };

          const newLabel = type === "client" ? `${updatedEntry.name} (${updatedEntry.phone || ""})` : `${updatedEntry.name} (Fee: Rp. ${formatRupiah(updatedEntry.fee)})`;

          if (type === "client") {
            // Update state options
            setClientOptions((prev) => prev.map((c) => (c.value === pkLokal ? { ...c, label: newLabel, data: updatedPersonData } : c)));

            // 2. Autofill Booking Data jika Client ini sedang terpilih
            if (bookingData.client_id === pkLokal) {
              setBookingData((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  client_name: updatedEntry.name,
                  client_phone: updatedEntry.phone || "",
                };
              });
            }
          } else if (type === "coach") {
            // Update state options
            setCoachOptions((prev) => prev.map((h) => (h.value === pkLokal ? { ...h, label: newLabel, data: updatedPersonData } : h)));

            // 2. Autofill Booking Data jika Coach ini sedang terpilih
            if (bookingData.coach_id === pkLokal) {
              setBookingData((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  coach_name: updatedEntry.name,
                  coach_phone: updatedEntry.phone || "",
                  final_coach_fee: updatedEntry.fee || 0,
                };
              });
            }
          }
        }

        toast.success(`${type === "court" ? "Court" : type === "client" ? "Client" : "Coach"} berhasil diupdate!`);
      } catch (error: any) {
        console.error("🔥 Error editing data:", error);
        throw error;
      }
    },
    [supabase, bookingData]
  );
  // --- AKHIR HANDLE EDIT ENTRY ---

  // --- FETCH BOOKING ---
  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      if (error || !data) {
        throw new Error("Booking tidak ditemukan");
      }

      const mapped: BookingUpdate = {
        ...initialBooking,
        ...data,
        court_id: data.court_id !== null && data.court_id !== undefined ? Number(data.court_id) : "",
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
        duration: Number(data.duration) || 1,
        final_court_price: Number(data.final_court_price) || 0,
        final_coach_fee: Number(data.final_coach_fee) || 0,
        adult_number: Number(data.adult_number) || 0,
        children_number: Number(data.children_number) || 0,
        is_with_photography: Boolean(data.is_with_photography),
        status: data.status ?? "pending",
        notes: data.notes ?? "",
      };

      const autofill = autofillCourtData(mapped.court_id);
      setBookingData({ ...mapped, ...autofill });
    } catch (err: any) {
      toast.error("Gagal memuat booking: " + (err?.message || ""));
      setBookingData(null);
    }
  };

  // --- INIT & AUTOFIL ---
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchDropdowns();
        await fetchBooking();
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  // Efek untuk Autofill Court (dipicu saat courts berubah atau court_id dipilih)
  useEffect(() => {
    if (!bookingData) return;
    setBookingData((prev) => {
      if (!prev) return null;
      const fill = autofillCourtData(prev.court_id);
      const isDifferent = Object.keys(fill).some((key) => (fill as any)[key] !== (prev as any)[key]);
      if (isDifferent) {
        return { ...prev, ...fill };
      }
      return prev;
    });
  }, [courts, bookingData?.court_id]);

  // --- HANDLER CHANGE ---
  const handleSelectChange = (name: string, value: string | number) => {
    setBookingData((prev) => {
      if (!prev) return null;

      if (name === "court_id") {
        const courtIdNum = value === "" ? "" : Number(value);
        const autofill = autofillCourtData(courtIdNum);
        return { ...prev, court_id: courtIdNum as any, ...autofill } as BookingUpdate;
      }

      if (name === "client_id") {
        const clientOption = clientOptions.find((c) => c.value === value);
        if (clientOption) {
          const client = clientOption.data as PersonData;
          return { ...prev, client_id: client.id, client_name: client.name, client_phone: client.phone } as BookingUpdate;
        }
        return { ...prev, client_id: value as string } as BookingUpdate;
      }

      if (name === "coach_id") {
        const coachOption = coachOptions.find((h) => h.value === value);
        if (coachOption) {
          const coach = coachOption.data as PersonData;
          return {
            ...prev,
            coach_id: coach.id,
            coach_name: coach.name,
            coach_phone: coach.phone,
            final_coach_fee: coach.fixed_fee || 0,
          } as BookingUpdate;
        }
        return { ...prev, coach_id: value as string } as BookingUpdate;
      }

      return { ...prev, [name]: value } as BookingUpdate;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const type = target.type;

    setBookingData((prev) => {
      if (!prev) return null;
      if (type === "checkbox") {
        const checked = (target as HTMLInputElement).checked;
        return { ...prev, [name]: checked } as BookingUpdate;
      }
      if (type === "number") {
        const raw = (target as HTMLInputElement).value;
        const num = raw === "" ? 0 : Number(raw);

        if (name === "duration") return { ...prev, duration: num } as BookingUpdate;
        if (name === "final_court_price" || name === "final_coach_fee") {
          return { ...prev, [name]: num } as BookingUpdate;
        }

        return { ...prev, [name]: num } as BookingUpdate;
      }
      const val = (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
      return { ...prev, [name]: val } as BookingUpdate;
    });
  };

  // --- SAVE HANDLER ---
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingData) return;
    setSaving(true);
    const { id: _maybeId, ...payload } = bookingData as BookingUpdate & { id?: number };
    try {
      const { error } = await supabase.from("bookings").update(payload).eq("id", bookingId);
      if (error) {
        toast.error("Gagal menyimpan perubahan: " + error.message);
      } else {
        toast.success("Booking berhasil diperbarui!");
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  // --- UI ---
  if (loading) return <div className="p-6 text-center text-lg font-medium">Memuat data booking...</div>;
  if (!bookingData) return <div className="p-6 text-center text-red-500 text-lg font-medium">Booking tidak ditemukan atau gagal dimuat.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Booking ID: {bookingId}</h1>
      <Card className="bg-white shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 px-6 py-4 border-b">
          <CardTitle className="text-xl font-semibold ">Detail Booking</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* PENGGUNA */}
            <h3 className="font-semibold  text-lg border-b pb-2 text-blue-700">1. Detail Pengguna</h3>
            <div className="grid grid-cols-2 gap-5">
              {/* COACH - SelectWithAddAndSearch */}
              <div className="col-span-2">
                <SelectWithAddAndSearch
                  label="Pilih Coach"
                  placeholder="-- Cari atau Tambah Coach --"
                  options={coachOptions}
                  selectedValue={bookingData.coach_id}
                  onValueChange={(value) => handleSelectChange("coach_id", value)}
                  onAddNew={(entry) => handleAddNewEntry(entry as NewEntry, "coach")}
                  onEdit={(updatedEntry) => handleEdit({ ...updatedEntry, type: "coach" })}
                  type="coach"
                />
              </div>
              <div>
                <Label htmlFor="coach_name" className="mb-1">
                  Name (Autofill)
                </Label>
                <Input id="coach_name" name="coach_name" type="text" value={bookingData.coach_name} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-semibold" />
              </div>
              <div>
                <Label htmlFor="coach_phone" className="mb-1">
                  Phone (Autofill)
                </Label>
                <Input id="coach_phone" name="coach_phone" type="tel" value={bookingData.coach_phone} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>

              {/* CLIENT - SelectWithAddAndSearch */}
              <div className="col-span-2">
                <SelectWithAddAndSearch
                  label="Pilih Client"
                  placeholder="-- Cari atau Tambah Client --"
                  options={clientOptions}
                  selectedValue={bookingData.client_id}
                  onValueChange={(value) => handleSelectChange("client_id", value)}
                  onAddNew={(entry) => handleAddNewEntry(entry as NewEntry, "client")}
                  onEdit={(updatedEntry) => handleEdit({ ...updatedEntry, type: "client" })}
                  type="client"
                />
              </div>
              <div>
                <Label htmlFor="client_name" className="mb-1">
                  Client Name (Autofill)
                </Label>
                <Input id="client_name" name="client_name" type="text" value={bookingData.client_name} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-semibold" />
              </div>
              <div>
                <Label htmlFor="client_phone" className="mb-1">
                  Client Phone (Autofill)
                </Label>
                <Input id="client_phone" name="client_phone" type="tel" value={bookingData.client_phone} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
            </div>

            {/* COURT & WAKTU */}
            <h3 className="font-semibold  text-lg border-b pb-2 text-blue-700">2. Detail Court & Waktu</h3>
            <div className="grid grid-cols-2 gap-5">
              {/* COURT - SelectWithAddAndSearch */}
              <div className="col-span-2">
                <SelectWithAddAndSearch
                  label="Pilih Court"
                  placeholder="-- Cari atau Tambah Court --"
                  options={courts.map((c) => ({
                    value: String(c.id),
                    label: `${c.name} (Rp. ${formatRupiah(c.fixed_price)})`,
                    data: c as CourtData,
                  }))}
                  selectedValue={String(bookingData.court_id)}
                  onValueChange={(value) => handleSelectChange("court_id", value)}
                  onAddNew={(entry) => handleAddNewEntry(entry as NewEntry, "court")}
                  onEdit={(updatedEntry) => handleEdit({ ...updatedEntry, type: "court" })}
                  type="court"
                />
              </div>

              {/* Input Waktu Mulai */}
              <div>
                <Label htmlFor="start_time" className="mb-1">
                  Waktu Mulai
                </Label>
                <Input id="start_time" name="start_time" type="datetime-local" value={bookingData.start_time} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>

              {/* Input Duration */}
              <div>
                <Label htmlFor="duration" className="mb-1">
                  Duration (Jam)
                </Label>
                <Input id="duration" name="duration" type="number" value={bookingData.duration} onChange={handleChange} min={0.5} step={0.5} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>

              {/* Input Readonly Court Name */}
              <div className="col-span-2">
                <Label htmlFor="court_name" className="mb-1">
                  Court Name (Autofill)
                </Label>
                <Input id="court_name" name="court_name" value={bookingData.court_name} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>

              {/* Input Readonly Court Address */}
              <div className="col-span-2">
                <Label htmlFor="court_address" className="mb-1">
                  Court Address (Autofill)
                </Label>
                <Textarea id="court_address" name="court_address" value={bookingData.court_address} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
            </div>

            {/* BIAYA */}
            <h3 className="font-semibold  text-lg border-b pb-2 text-blue-700">3. Detail Biaya</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="final_court_price" className="mb-1">
                  Court Price Final (Rp)
                </Label>
                <Input id="final_court_price" name="final_court_price" type="number" value={bookingData.final_court_price} onChange={handleChange} className="p-3 rounded-lg border border-gray-300" required />
              </div>
              <div>
                <Label htmlFor="final_coach_fee" className="mb-1">
                  Coach Fee Final (Rp)
                </Label>
                <Input id="final_coach_fee" name="final_coach_fee" type="number" value={bookingData.final_coach_fee} onChange={handleChange} className="p-3 rounded-lg border border-gray-300" required />
              </div>
            </div>

            {/* STATUS & LAIN-LAIN */}
            <h3 className="font-semibold  text-lg border-b pb-2 text-blue-700">4. Status & Lain-lain</h3>
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
                <Checkbox
                  id="is_with_photography"
                  name="is_with_photography"
                  checked={bookingData.is_with_photography}
                  onCheckedChange={(checked) => handleChange({ target: { name: "is_with_photography", type: "checkbox", checked: checked } } as any)}
                  className="h-5 w-5 text-blue-500"
                />
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
              <Button type="submit" className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
