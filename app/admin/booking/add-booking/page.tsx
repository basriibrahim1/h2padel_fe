"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectWithAddAndSearch } from "@/components/shared/SelectWithAddAndSearch ";

// --- INTERFACES ---

interface CourtData {
  id: number;
  court_name: string;
  court_address: string;
  court_maps_url: string;
  fixed_price: number;
}

// PersonData kini menyimpan PK Lokal (id) dan UUID Auth (user_id)
interface PersonData {
  id: string; // PK Lokal (clients.id atau coaches.id) - Digunakan untuk FK Booking dan Select Value
  user_id: string; // UUID Auth (profiles.id) - Digunakan untuk Operasi Auth/Profile Update
  name: string;
  phone: string;
  email?: string;
  fixed_fee?: number;
}

// NewPersonEntry untuk data yang akan dimasukkan/diedit
interface NewPersonEntry {
  name: string;
  phone?: string;
  address?: string;
  maps_url?: string;
  fixed_price?: number;
  fee?: number;
  email?: string;
  password?: string;
  event?: FormEvent;
  id?: string | number; // PK Lokal (untuk Court atau Person)
  user_id?: string; // UUID Auth (khusus untuk Person, dikirim saat edit)
  type?: "client" | "coach" | "court";
}

interface BookingInsert {
  court_id: number | "";
  court_name: string;
  court_address: string;
  court_maps_url: string;
  client_id: string; // FK ke clients.id (PK Lokal)
  client_name: string;
  client_phone: string;
  coach_id: string; // FK ke coaches.id (PK Lokal)
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

  console.log(clients);

  // Helper untuk Autofill Court
  const autofillCourtDataHelper = useCallback((courtId: number | "", allCourts: CourtData[]) => {
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

  // -----------------------------------------------------------------------
  // FUNGSI LOAD DATA: Mengambil PK Lokal (id) dan UUID Auth (user_id)
  // -----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [clientRes, coachRes, courtRes] = await Promise.all([
        // Ambil id (PK Lokal), user_id (UUID Auth), dan profiles
        supabase.from("clients").select(`id, user_id, profiles!inner (full_name, phone, role, email)`).eq("profiles.role", "client"),
        supabase.from("coaches").select(`id, user_id, fixed_fee, profiles!inner (full_name, phone, role, email)`).eq("profiles.role", "coach"),
        supabase.from("field_courts").select(`id, name, address, maps_url, fixed_price`),
      ]);

      if (clientRes.error) throw new Error(clientRes.error.message);
      if (coachRes.error) throw new Error(coachRes.error.message);
      if (courtRes.error) throw new Error(courtRes.error.message);

      // Mapping Clients
      const newClients: PersonData[] = clientRes.data.map((c: any) => ({
        id: String(c.id), // PK Lokal
        user_id: c.user_id, // UUID Auth
        name: c.profiles?.full_name || "N/A",
        phone: c.profiles?.phone || "",
        email: c.profiles?.email || "",
      }));
      setClients(newClients);

      // Mapping Coaches
      const newCoaches: PersonData[] = coachRes.data.map((h: any) => ({
        id: String(h.id), // PK Lokal
        user_id: h.user_id, // UUID Auth
        name: h.profiles?.full_name || "N/A",
        phone: h.profiles?.phone || "",
        email: h.profiles?.email || "",
        fixed_fee: Number(h.fixed_fee) || 0,
      }));
      setCoaches(newCoaches);

      // Mapping Courts (SAMA)
      const newCourts: CourtData[] = courtRes.data.map((d: any) => ({
        id: d.id,
        court_name: d.name,
        court_address: d.address,
        court_maps_url: d.maps_url,
        fixed_price: Number(d.fixed_price) || 0,
      }));
      setCourts(newCourts);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Gagal memuat data dropdown.");
    }
  }, [supabase]);

  // PENTING: Gunakan useEffect HANYA untuk initial load
  useEffect(() => {
    setLoading(true);
    loadData().finally(() => {
      setLoading(false);
    });
  }, [loadData]);

  // Handler untuk perubahan Select/Input biasa
  const handleAutofill = useCallback(
    (name: "client_id" | "coach_id" | "court_id", value: string | number) => {
      setBookingData((prev) => {
        let updates: Partial<BookingInsert> = { [name]: value as string };

        if (name === "court_id") {
          const courtIdNum = Number(value) || "";
          const courtUpdates = autofillCourtDataHelper(courtIdNum, courts);
          updates = { ...updates, ...courtUpdates, court_id: courtIdNum };
        } else if (name === "client_id") {
          // Cari berdasarkan PK Lokal
          const client = clients.find((c) => c.id === value);
          updates.client_name = client?.name || "";
          updates.client_phone = client?.phone || "";
        } else if (name === "coach_id") {
          // Cari berdasarkan PK Lokal
          const coach = coaches.find((c) => c.id === value);
          updates.coach_name = coach?.name || "";
          updates.coach_phone = coach?.phone || "";
          updates.final_coach_fee = coach?.fixed_fee || 0;

          if (!value) {
            updates = { coach_id: "", coach_name: "", coach_phone: "", final_coach_fee: 0 };
          }
        }
        // Pastikan ID di-set sebagai string untuk client/coach (PK Lokal)
        if (name === "coach_id" || name === "client_id") {
          updates[name] = (value as string) || "";
        }
        return { ...prev, ...updates };
      });
    },
    [courts, clients, coaches, autofillCourtDataHelper]
  );

  const handleChange = (name: keyof BookingInsert, value: any) => {
    if (name === "client_id" || name === "coach_id" || name === "court_id") {
      handleAutofill(name, value);
      return;
    }
    const numberFields: (keyof BookingInsert)[] = ["final_court_price", "final_coach_fee", "adult_number", "children_number", "duration"];
    let finalValue = numberFields.includes(name) ? parseFloat(value) || 0 : value;
    setBookingData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleEdit = useCallback(
    async (updatedEntry: NewPersonEntry) => {
      console.log("🟢 handleEdit start →", updatedEntry);

      // Tentukan targetId sesuai tipe
      let targetId: string | number | null | undefined = null;

      if (updatedEntry.type === "court") {
        targetId = updatedEntry.id; // PK number
      } else {
        targetId = updatedEntry.user_id || null; // UUID string (user_id)
      }

      const type = updatedEntry.type;

      console.log("🟡 handleEdit resolved targetId:", targetId, "type:", type);

      if (!targetId || !type) {
        console.error("❌ handleEdit gagal: missing targetId/type", {
          entry: updatedEntry,
          targetId,
          type,
        });
        throw new Error("ID atau Tipe data tidak ditemukan untuk diupdate.");
      }

      try {
        if (type === "court") {
          const courtId = Number(targetId);
          console.log("✏️ Update COURT dengan id:", courtId);

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

          // ** Update State Courts (Agar Combobox Ter-update) **
          const updatedCourtData: CourtData = {
            id: courtId,
            court_name: updatedEntry.name,
            court_address: updatedEntry.address || "",
            court_maps_url: updatedEntry.maps_url || "",
            fixed_price: updatedEntry.fixed_price || 0,
          };

          setCourts((prevCourts) => prevCourts.map((c) => (c.id === courtId ? updatedCourtData : c)));

          // ** Autofill Court **
          if (bookingData.court_id === courtId) {
            setBookingData((prev) => ({
              ...prev,
              court_name: updatedEntry.name,
              final_court_price: updatedEntry.fixed_price || 0,
              court_address: updatedEntry.address || "",
              court_maps_url: updatedEntry.maps_url || "",
            }));
          }
        } else {
          const userId = String(targetId);
          const pkLokal = String(updatedEntry.id); // PK Lokal dari clients/coaches

          console.log("✏️ Update USER dengan userId:", userId);

          // Panggil API untuk update Auth dan Profile/Role data
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
          console.log("🔵 update-user API result:", result);

          if (!response.ok || !result.success) {
            throw new Error(result.message || "Gagal mengupdate pengguna melalui API.");
          }

          // ** Update State Lokal agar UI Reaktif **
          const updatedPersonData: PersonData = {
            id: pkLokal,
            user_id: userId,
            name: updatedEntry.name,
            phone: updatedEntry.phone || "",
            email: updatedEntry.email || result.oldEmail || "", // Gunakan email baru, atau email lama dari response jika ada
            fixed_fee: type === "coach" ? updatedEntry.fee || 0 : undefined,
          };

          if (type === "client") {
            setClients((prev) => prev.map((c) => (c.id === pkLokal ? updatedPersonData : c)));

            // ** Autofill Client **
            if (bookingData.client_id === pkLokal) {
              setBookingData((prev) => ({
                ...prev,
                client_name: updatedEntry.name,
                client_phone: updatedEntry.phone || "",
              }));
            }
          } else if (type === "coach") {
            setCoaches((prev) => prev.map((h) => (h.id === pkLokal ? updatedPersonData : h)));

            // ** Autofill Coach **
            if (bookingData.coach_id === pkLokal) {
              setBookingData((prev) => ({
                ...prev,
                coach_name: updatedEntry.name,
                coach_phone: updatedEntry.phone || "",
                final_coach_fee: updatedEntry.fee || 0,
              }));
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

  // --- AKHIR FUNGSI EDIT ---

  // -----------------------------------------------------------------------
  // FUNGSI ADD NEW PERSON: Menangkap PK Lokal Baru (rolePKId)
  // -----------------------------------------------------------------------
  const handleAddNewPerson = useCallback(async (type: "client" | "coach", newEntry: NewPersonEntry) => {
    if (!newEntry.password || !newEntry.email) {
      throw new Error("Email dan Password wajib diisi untuk registrasi.");
    }

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const newUserId = result.userId; // UUID Auth
      const newRolePKId = result.rolePKId; // PK Lokal Baru

      if (!newUserId || !newRolePKId) {
        throw new Error("API berhasil, tetapi ID pengguna (UUID Auth atau PK Lokal) tidak dikembalikan.");
      }

      toast.success(`${type === "client" ? "Client" : "Coach"} baru berhasil ditambahkan: ${newEntry.name}`);

      // Update State Clients/Coaches secara manual
      const newPersonData: PersonData = {
        id: newRolePKId, // PK Lokal sebagai ID utama di frontend
        user_id: newUserId, // UUID Auth
        name: newEntry.name,
        phone: newEntry.phone || "",
        email: newEntry.email,
        fixed_fee: newEntry.fee,
      };

      setBookingData((prev) => {
        if (type === "client") {
          setClients((prevClients) => [...prevClients, newPersonData]);
          // Autopilih dengan PK Lokal
          return { ...prev, client_id: newRolePKId, client_name: newPersonData.name, client_phone: newPersonData.phone };
        } else {
          // type === "coach"
          setCoaches((prevCoaches) => [...prevCoaches, newPersonData]);
          // Autopilih dengan PK Lokal
          return {
            ...prev,
            coach_id: newRolePKId,
            coach_name: newPersonData.name,
            coach_phone: newPersonData.phone,
            final_coach_fee: newPersonData.fixed_fee || 0,
          };
        }
      });
    } catch (error: any) {
      console.error("Error adding new person via API:", error);
      toast.error(`Gagal menambahkan ${type}: ${error.message}`);
      throw error;
    }
  }, []);

  // FUNGSI 2: Menangani Penambahan Court (Logika SAMA)
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
        const { data: courtData, error: courtError } = await supabase.from("field_courts").insert(courtInsertData).select("id, name, address, maps_url, fixed_price").single();

        if (courtError) throw courtError;
        if (!courtData?.id) throw new Error("Gagal mendapatkan ID Court baru.");

        const newCourtId = courtData.id;

        toast.success(`Court baru berhasil ditambahkan: ${newEntry.name}`);

        // Update State Courts secara manual
        const newCourtData: CourtData = {
          id: newCourtId,
          court_name: courtData.name,
          court_address: courtData.address,
          court_maps_url: courtData.maps_url,
          fixed_price: Number(courtData.fixed_price) || 0,
        };

        setCourts((prevCourts) => [...prevCourts, newCourtData]);

        // Autopilih Court baru secara manual
        setBookingData((prev) => ({
          ...prev,
          court_id: newCourtId,
          court_name: newCourtData.court_name,
          court_address: newCourtData.court_address,
          court_maps_url: newCourtData.court_maps_url,
          final_court_price: newCourtData.fixed_price,
        }));
      } catch (error: any) {
        console.error("Error adding new court:", error);
        toast.error(`Gagal menambahkan Court: ${error.message}`);
        throw error;
      }
    },
    [supabase]
  );

  // Fungsi wrapper untuk Add (SAMA)
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

  // FUNGSI SAVE BOOKING (SAMA)
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    // VALIDASI WAJIB: Client, Court, Waktu, dan COACH harus diisi.
    if (!bookingData.client_id || !bookingData.court_id || !bookingData.start_time || !bookingData.coach_id) {
      setError("Client, Court, Waktu Mulai, dan Coach wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    const { court_name, court_address, court_maps_url, ...dataToInsert } = bookingData;

    // client_id dan coach_id adalah PK Lokal (string)
    const finalInsert = {
      ...dataToInsert,
      court_id: dataToInsert.court_id === "" ? null : Number(dataToInsert.court_id),
      client_id: dataToInsert.client_id || null,
      coach_id: dataToInsert.coach_id,
      is_with_photography: Boolean(dataToInsert.is_with_photography),
      duration: Number(dataToInsert.duration),
    };

    const { error: insertError } = await supabase.from("bookings").insert(finalInsert);
    setSaving(false);

    if (insertError) {
      setError(`Gagal menyimpan booking: ${insertError.message}. Pastikan ID Client/Coach (PK Lokal) yang dipilih benar-benar ada di tabel relasi.`);
      return;
    }

    toast.success("Booking berhasil ditambahkan!");
    router.push("/admin/dashboard");
  };

  if (loading) return <div className="p-6 text-center text-lg font-medium">Memuat data dropdown...</div>;
  if (error && !saving) return <div className="p-6 text-center text-red-500 text-lg font-medium">Error: {error}</div>;

  // Mapping Options (Menggunakan PK Lokal sebagai Value)
  const clientOptions = clients.map((c) => ({
    value: c.id, // PK Lokal (clients.id)
    label: `${c.name} (${c.phone})`,
    data: c, // Menyertakan user_id (UUID Auth) untuk edit
  }));

  const coachOptions = coaches.map((h) => ({
    value: h.id, // PK Lokal (coaches.id)
    label: `${h.name} (Fee: Rp. ${formatRupiah(h.fixed_fee)})`,
    data: h, // Menyertakan user_id (UUID Auth) untuk edit
  }));

  const courtOptions = courts.map((d) => ({
    value: String(d.id),
    label: `${d.court_name} (Rp. ${formatRupiah(d.fixed_price)})`,
    data: {
      id: d.id,
      name: d.court_name,
      address: d.court_address,
      maps_url: d.court_maps_url,
      fixed_price: d.fixed_price,
    },
  }));

  return (
    // ... (Sisa JSX Form SAMA)
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
                    selectedValue={String(bookingData.court_id)}
                    onValueChange={(value) => handleChange("court_id", value)}
                    onAddNew={(newEntry) => handleAddNew("court", newEntry)}
                    onEdit={(updatedEntry) => handleEdit({ ...updatedEntry, type: "court" })}
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
                  onEdit={(updatedEntry) => handleEdit({ ...updatedEntry, type: "client" })}
                  type="client"
                />

                {/* Coach Select - Tanpa Opsi "None" */}
                <SelectWithAddAndSearch
                  label="Pilih Coach (Wajib)"
                  placeholder="-- Cari atau Tambah Coach --"
                  options={coachOptions}
                  selectedValue={bookingData.coach_id}
                  onValueChange={(value) => handleChange("coach_id", value)}
                  onAddNew={(newEntry) => handleAddNew("coach", newEntry)}
                  onEdit={(updatedEntry) => handleEdit({ ...updatedEntry, type: "coach" })}
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
