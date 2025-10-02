// app/admin/add/page.tsx (Final Code dengan API CALL)

"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectWithAddAndSearch } from "@/components/shared/SelectWithAddAndSearch ";

interface CourtData {
  id: number;
  court_name: string;
  court_address: string;
  court_maps_url: string;
  fixed_price: number;
}

interface PersonData {
  id: string;
  name: string;
  phone: string;
  fixed_fee?: number;
}

interface NewPersonEntry {
  name: string;
  phone?: string;
  address?: string;
  maps_url?: string;
  fixed_price?: number;
  fee?: number;
  email?: string;
  password?: string;
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
  duration: number;
}

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
  adult_number: 1,
  children_number: 0,
  status: "pending",
  notes: "",
  duration: 1,
};

const formatRupiah = (amount: number | undefined) => {
  if (!amount || isNaN(amount)) return "0";
  return amount.toLocaleString("id-ID");
};

export default function AddBookingPage() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [bookingData, setBookingData] = useState<BookingInsert>(initialBookingState);
  const [clients, setClients] = useState<PersonData[]>([]);
  const [coaches, setCoaches] = useState<PersonData[]>([]);
  const [courts, setCourts] = useState<CourtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autofillCourtData = useCallback((currentBooking: BookingInsert, courtId: number | "", allCourts: CourtData[]) => {
    if (!courtId) return { court_name: "", court_address: "", court_maps_url: "", final_court_price: 0 };
    const court = allCourts.find((d) => d.id === courtId);
    if (court) {
      return {
        court_name: court.court_name,
        court_address: court.court_address,
        court_maps_url: court.court_maps_url,
        final_court_price: court.fixed_price || 0,
      };
    }
    return { court_name: "", court_address: "", court_maps_url: "", final_court_price: 0 };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // PERUBAHAN UTAMA: Filter data berdasarkan kolom 'role' di tabel 'profiles'
      const [clientRes, coachRes, courtRes] = await Promise.all([
        // 1. Ambil CLIENTS: Hanya user di tabel 'clients' yang role-nya 'client'
        supabase
          .from("clients")
          .select(`id, profiles!inner (full_name, phone, role)`) // !inner memastikan JOIN
          .eq("profiles.role", "client"), // <-- FILTER KRITIS

        // 2. Ambil COACHES: Hanya user di tabel 'coaches' yang role-nya 'coach'
        supabase
          .from("coaches")
          .select(`id, fixed_fee, profiles!inner (full_name, phone, role)`) // !inner memastikan JOIN
          .eq("profiles.role", "coach"), // <-- FILTER KRITIS

        // 3. Ambil Courts (tetap sama)
        supabase.from("field_courts").select(`id, name, address, maps_url, fixed_price`),
      ]);

      // --- Mapping Data ---

      if (clientRes.error) throw new Error(clientRes.error.message);
      if (coachRes.error) throw new Error(coachRes.error.message);
      if (courtRes.error) throw new Error(courtRes.error.message);

      // Mapping Clients
      if (clientRes.data) {
        setClients(
          clientRes.data.map((c: any) => ({
            id: c.id,
            name: c.profiles?.full_name || "N/A",
            phone: c.profiles?.phone || "",
          }))
        );
      }

      // Mapping Coaches
      if (coachRes.data) {
        setCoaches(
          coachRes.data.map((h: any) => ({
            id: h.id,
            name: h.profiles?.full_name || "N/A",
            phone: h.profiles?.phone || "",
            fixed_fee: Number(h.fixed_fee) || 0,
          }))
        );
      }

      // Mapping Courts
      if (courtRes.data) {
        setCourts(
          courtRes.data.map((d: any) => ({
            id: d.id,
            court_name: d.name,
            court_address: d.address,
            court_maps_url: d.maps_url,
            fixed_price: Number(d.fixed_price) || 0,
          }))
        );
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Gagal memuat data dropdown.");
    } finally {
      setLoading(false);
    }
  }, [supabase]); // Pastikan supabase adalah dependency

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAutofill = (name: "client_id" | "coach_id" | "court_id", value: string | number) => {
    setBookingData((prev) => {
      let updates: Partial<BookingInsert> = { [name]: value as string };

      if (name === "court_id") {
        const courtIdNum = Number(value) || "";
        const courtUpdates = autofillCourtData(prev, courtIdNum, courts);
        updates = { ...updates, ...courtUpdates, court_id: courtIdNum };
      } else if (name === "client_id") {
        const client = clients.find((c) => c.id === value);
        updates.client_name = client?.name || "";
        updates.client_phone = client?.phone || "";
      } else if (name === "coach_id") {
        const coach = coaches.find((c) => c.id === value);
        updates.coach_name = coach?.name || "";
        updates.coach_phone = coach?.phone || "";
        updates.final_coach_fee = coach?.fixed_fee || 0;

        if (value === "none" || !value) {
          updates = { coach_id: "", coach_name: "", coach_phone: "", final_coach_fee: 0 };
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleChange = (name: keyof BookingInsert, value: any) => {
    if (name === "client_id" || name === "coach_id" || name === "court_id") {
      handleAutofill(name, value);
      return;
    }
    const numberFields: (keyof BookingInsert)[] = ["final_court_price", "final_coach_fee", "adult_number", "children_number", "duration"];
    let finalValue = numberFields.includes(name) ? parseFloat(value) || 0 : value;
    setBookingData((prev) => ({ ...prev, [name]: finalValue }));
  };

  // FUNGSI 1: Menangani Sign Up (Client/Coach) - MEMANGGIL API SERVER
  const handleAddNewPerson = useCallback(
    async (type: "client" | "coach", newEntry: NewPersonEntry) => {
      if (!newEntry.password || !newEntry.email) {
        throw new Error("Email dan Password wajib diisi untuk registrasi.");
      }

      try {
        // Panggil Route Handler
        const response = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newEntry.email,
            password: newEntry.password,
            fullName: newEntry.name,
            phone: newEntry.phone,
            role: type,
            fixedFee: newEntry.fee,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          let errorMessage = result.message || "Gagal membuat pengguna melalui API.";
          if (errorMessage.includes("duplicate key value")) {
            errorMessage = "User sudah terdaftar dengan ID atau Email ini (Duplicate Key).";
          }
          throw new Error(errorMessage);
        }

        const newUserId = result.userId;
        if (!newUserId) {
          throw new Error("API berhasil, tetapi ID pengguna tidak dikembalikan.");
        }

        toast.success(`${type === "client" ? "Client" : "Coach"} baru berhasil ditambahkan: ${newEntry.name}`);

        // Muat ulang data & Autopilih
        await fetchData();
        handleAutofill(type === "client" ? "client_id" : "coach_id", newUserId);
      } catch (error: any) {
        console.error("Error adding new person via API:", error);
        toast.error(`Gagal menambahkan ${type}: ${error.message}`);
        throw error;
      }
    },
    [fetchData, handleAutofill]
  );

  // FUNGSI 2: Menangani Penambahan Court (Langsung ke Database)
  const handleAddNewCourt = useCallback(
    async (newEntry: NewPersonEntry) => {
      if (!newEntry.name || !newEntry.address || !newEntry.fixed_price) {
        throw new Error("Nama, Alamat, dan Harga wajib diisi untuk Court.");
      }

      const courtInsertData = {
        name: newEntry.name,
        address: newEntry.address,
        maps_url: newEntry.maps_url || "",
        fixed_price: newEntry.fixed_price,
      };

      try {
        const { data: courtData, error: courtError } = await supabase.from("field_courts").insert(courtInsertData).select("id").single();

        if (courtError) throw courtError;
        if (!courtData?.id) throw new Error("Gagal mendapatkan ID Court baru.");

        toast.success(`Court baru berhasil ditambahkan: ${newEntry.name}`);

        await fetchData();
        handleAutofill("court_id", courtData.id);
      } catch (error: any) {
        console.error("Error adding new court:", error);
        toast.error(`Gagal menambahkan Court: ${error.message}`);
        throw error;
      }
    },
    [supabase, fetchData, handleAutofill]
  );

  // Fungsi wrapper
  const handleAddNew = useCallback(
    async (type: "client" | "coach" | "court", entry: NewPersonEntry) => {
      if (type === "court") {
        await handleAddNewCourt(entry);
      } else {
        await handleAddNewPerson(type, entry);
      }
    },
    [handleAddNewCourt, handleAddNewPerson]
  );

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingData.client_id || !bookingData.court_id || !bookingData.start_time) {
      setError("Client, Court, dan Waktu Mulai wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    const { court_name, court_address, court_maps_url, ...dataToInsert } = bookingData;
    const finalInsert = {
      ...dataToInsert,
      court_id: dataToInsert.court_id === "" ? null : Number(dataToInsert.court_id),
      client_id: dataToInsert.client_id || null,
      coach_id: dataToInsert.coach_id || null,
      is_with_photography: Boolean(dataToInsert.is_with_photography),
      duration: Number(dataToInsert.duration),
    };

    const { error: insertError } = await supabase.from("bookings").insert(finalInsert);
    setSaving(false);

    if (insertError) {
      setError(`Gagal menyimpan booking: ${insertError.message}`);
      return;
    }

    toast.success("Booking berhasil ditambahkan!");
    router.push("/admin/dashboard");
  };

  if (loading) return <div className="p-6 text-center text-lg font-medium">Memuat data dropdown...</div>;
  if (error && !saving) return <div className="p-6 text-center text-red-500 text-lg font-medium">Error: {error}</div>;

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.phone})`,
    data: c,
  }));

  const coachOptions = coaches.map((h) => ({
    value: h.id,
    label: `${h.name} (Fee: Rp. ${formatRupiah(h.fixed_fee)})`,
    data: h,
  }));

  const courtOptions = courts.map((d) => ({
    value: d.id,
    label: `${d.court_name} (Rp. ${formatRupiah(d.fixed_price)})`,
    data: d,
  }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Tambah Booking Baru</h1>
      <Card className="shadow-xl">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* SECTION 1: COURT & WAKTU */}
            <div>
              <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-700">1. Court & Waktu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <SelectWithAddAndSearch
                    label="Pilih Court"
                    placeholder="-- Cari atau Tambah Court --"
                    options={courtOptions}
                    selectedValue={bookingData.court_id}
                    onValueChange={(value) => handleChange("court_id", Number(value))}
                    onAddNew={(newEntry) => handleAddNew("court", newEntry)}
                    type="court"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="start_time">Waktu Mulai</Label>
                  <Input id="start_time" type="datetime-local" value={bookingData.start_time} onChange={(e) => handleChange("start_time", e.target.value)} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="duration">Durasi (Jam)</Label>
                  <Input id="duration" type="number" min="0.5" step="0.5" value={bookingData.duration} onChange={(e) => handleChange("duration", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="court_name">Court Name (Autofill)</Label>
                  <Input id="court_name" type="text" value={bookingData.court_name} readOnly disabled className="bg-gray-100/80 font-semibold" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="court_address">Alamat Court (Autofill)</Label>
                  <Input id="court_address" type="text" value={bookingData.court_address} readOnly disabled className="bg-gray-100/80" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="court_maps_url">Link Google Maps (Autofill)</Label>
                  <Input id="court_maps_url" type="text" value={bookingData.court_maps_url} readOnly disabled className="bg-gray-100/80" />
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* SECTION 2: BIAYA */}
            <div>
              <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-700">2. Detail Biaya</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="final_court_price">Harga Court Akhir (Rp)</Label>
                  <Input id="final_court_price" type="number" value={bookingData.final_court_price} onChange={(e) => handleChange("final_court_price", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="final_coach_fee">Fee Coach Akhir (Rp)</Label>
                  <Input id="final_coach_fee" type="number" value={bookingData.final_coach_fee} onChange={(e) => handleChange("final_coach_fee", e.target.value)} required />
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* SECTION 3: PENGGUNA */}
            <div>
              <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-700">3. Detail Pengguna</h3>
              <div className="grid grid-cols-2 gap-4">
                <SelectWithAddAndSearch
                  label="Pilih Client"
                  placeholder="-- Cari atau Tambah Client --"
                  options={clientOptions}
                  selectedValue={bookingData.client_id}
                  onValueChange={(value) => handleChange("client_id", value)}
                  onAddNew={(newEntry) => handleAddNew("client", newEntry)}
                  type="client"
                />

                <SelectWithAddAndSearch
                  label="Pilih Coach (Opsional)"
                  placeholder="-- Cari atau Tambah Coach --"
                  options={[{ value: "none", label: "-- Tanpa Coach --", data: {} }, ...coachOptions]}
                  selectedValue={bookingData.coach_id || "none"}
                  onValueChange={(value) => handleChange("coach_id", value)}
                  onAddNew={(newEntry) => handleAddNew("coach", newEntry)}
                  type="coach"
                />

                <div className="space-y-1">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input id="client_name" type="text" value={bookingData.client_name} onChange={(e) => handleChange("client_name", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="client_phone">Client Phone (Autofill)</Label>
                  <Input id="client_phone" type="tel" value={bookingData.client_phone} readOnly disabled className="bg-gray-100/80" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="coach_name">Coach Name</Label>
                  <Input id="coach_name" type="text" value={bookingData.coach_name} onChange={(e) => handleChange("coach_name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="coach_phone">Coach Phone (Autofill)</Label>
                  <Input id="coach_phone" type="tel" value={bookingData.coach_phone} readOnly disabled className="bg-gray-100/80" />
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* SECTION 4: STATUS & LAINNYA */}
            <div>
              <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-700">4. Status & Lain-lain</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="status">Status Booking</Label>
                  <Select value={bookingData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">PENDING</SelectItem>
                      <SelectItem value="confirmed">CONFIRMED</SelectItem>
                      <SelectItem value="cancelled">CANCELLED</SelectItem>
                      <SelectItem value="completed">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox id="is_with_photography" checked={bookingData.is_with_photography} onCheckedChange={(checked) => handleChange("is_with_photography", checked)} />
                  <Label htmlFor="is_with_photography">Sertakan Fotografi?</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="adult_number">Jumlah Dewasa</Label>
                  <Input id="adult_number" type="number" min="0" value={bookingData.adult_number} onChange={(e) => handleChange("adult_number", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="children_number">Jumlah Anak-anak</Label>
                  <Input id="children_number" type="number" min="0" value={bookingData.children_number} onChange={(e) => handleChange("children_number", e.target.value)} required />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="notes">Notes/Keterangan Tambahan</Label>
                  <Textarea id="notes" value={bookingData.notes} onChange={(e) => handleChange("notes", e.target.value)} />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 font-medium mt-4 border border-red-200 p-2 rounded bg-red-50">{error}</p>}
            <div className="flex justify-between pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/dashboard")}>
                Kembali ke Dashboard
              </Button>
              <Button type="submit" disabled={saving || loading} className="bg-green-600 hover:bg-green-700">
                {saving ? "Menambahkan..." : "Tambah Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
