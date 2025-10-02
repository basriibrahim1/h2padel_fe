"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BookingDetail {
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
  start_time: string; // Akan disimpan sebagai ISO string
  duration: number;
  final_court_price: number;
  final_coach_fee: number;
  is_with_photography: boolean;
  adult_number: number;
  children_number: number;
  status: string;
  notes: string;
}

const initialBooking: BookingDetail = {
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
  duration: 0,
  final_court_price: 0,
  final_coach_fee: 0,
  is_with_photography: false,
  adult_number: 0,
  children_number: 0,
  status: "",
  notes: "",
};

// Helper function untuk memformat mata uang Rupiah (Perbaikan UX)
const formatRupiah = (number: number | null | undefined): string => {
  const value = number ?? 0;
  if (typeof value !== "number" || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper function untuk memformat timestamp menjadi tanggal dan waktu yang mudah dibaca (Perbaikan UX)
const formatDateTime = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Gunakan format 24 jam
    };
    return date.toLocaleTimeString("id-ID", options);
  } catch (e) {
    return isoString; // Fallback jika format tanggal salah
  }
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = async () => {
    try {
      // Kueri Supabase yang lebih eksplisit
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();

      if (error || !data) throw new Error(error?.message || "Booking tidak ditemukan");

      // Simpan start_time sebagai ISO string di state
      const formattedStartTimeForState = data.start_time ? new Date(data.start_time).toISOString() : "";

      setBooking({
        ...initialBooking,
        ...(data as BookingDetail),
        start_time: formattedStartTimeForState,
      });
    } catch (err: any) {
      console.error("Fetch Booking Error:", err);
      toast.error("Gagal memuat booking: " + (err?.message || ""));
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  if (loading) return <div className="p-8">Memuat detail booking...</div>;
  if (!booking) return <div className="p-8 text-red-500">Booking tidak ditemukan atau terjadi kesalahan saat memuat.</div>;

  // Hitung Total Biaya untuk ditampilkan
  const totalCost = (booking.final_court_price ?? 0) + (booking.final_coach_fee ?? 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Detail Booking ID: {bookingId}</h1>
      <Card className="bg-white shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 px-6 py-4 border-b">
          <CardTitle className="text-xl font-semibold text-gray-700">Detail Booking</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-6 space-y-6">
          {/* PENGGUNA */}
          <div>
            <h3 className="font-semibold text-gray-700 text-lg mb-3 border-b pb-2">Detail Pengguna</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="coach_name" className="mb-1">
                  Coach Name
                </Label>
                <Input id="coach_name" value={booking.coach_name || "N/A"} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="coach_phone" className="mb-1">
                  Coach Phone
                </Label>
                <Input id="coach_phone" value={booking.coach_phone || "N/A"} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="client_name" className="mb-1">
                  Client Name
                </Label>
                <Input id="client_name" value={booking.client_name || "N/A"} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="client_phone" className="mb-1">
                  Client Phone
                </Label>
                <Input id="client_phone" value={booking.client_phone || "N/A"} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
            </div>
          </div>
          ---
          {/* COURT & WAKTU */}
          <div>
            <h3 className="font-semibold text-gray-700 text-lg mb-3 border-b pb-2">Detail Court & Waktu</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="court_name" className="mb-1">
                  Court Name
                </Label>
                <Input id="court_name" value={booking.court_name || "N/A"} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="start_time" className="mb-1">
                  Waktu Mulai
                </Label>
                <Input
                  id="start_time"
                  value={formatDateTime(booking.start_time)} // Menggunakan format yang lebih user-friendly
                  readOnly
                  disabled
                  className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-medium"
                />
              </div>
              <div>
                <Label htmlFor="duration" className="mb-1">
                  Duration (jam)
                </Label>
                <Input id="duration" value={booking.duration.toString()} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="status" className="mb-1">
                  Status
                </Label>
                <Input id="status" value={booking.status} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-semibold" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="court_address" className="mb-1">
                  Court Address
                </Label>
                <Textarea id="court_address" value={booking.court_address || "N/A"} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="court_maps_url" className="mb-1">
                  Maps URL
                </Label>
                {/* Lebih baik tampilkan link jika ada */}
                {booking.court_maps_url ? (
                  <a href={booking.court_maps_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 truncate hover:underline">
                    {booking.court_maps_url}
                  </a>
                ) : (
                  <Input id="court_maps_url" value="N/A" readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
                )}
              </div>
            </div>
          </div>
          ---
          {/* BIAYA */}
          <div>
            <h3 className="font-semibold text-gray-700 text-lg mb-3 border-b pb-2">Detail Biaya</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label htmlFor="final_court_price" className="mb-1">
                  Court Price
                </Label>
                <Input
                  id="final_court_price"
                  value={formatRupiah(booking.final_court_price)} // Menggunakan formatRupiah
                  readOnly
                  disabled
                  className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-medium"
                />
              </div>
              <div>
                <Label htmlFor="final_coach_fee" className="mb-1">
                  Coach Fee
                </Label>
                <Input
                  id="final_coach_fee"
                  value={formatRupiah(booking.final_coach_fee)} // Menggunakan formatRupiah
                  readOnly
                  disabled
                  className="bg-gray-100 p-3 rounded-lg border border-gray-200 font-medium"
                />
              </div>

              {/* Tambahkan Total Biaya (Perbaikan UX) */}
              <div className="col-span-2 pt-2 border-t mt-4">
                <Label className="mb-1 text-lg font-bold text-gray-800">Total Biaya</Label>
                <Input value={formatRupiah(totalCost)} readOnly disabled className="bg-green-100 text-xl font-extrabold p-4 rounded-lg border border-green-300 text-green-700" />
              </div>
            </div>
          </div>
          ---
          {/* LAIN-LAIN */}
          <div>
            <h3 className="font-semibold text-gray-700 text-lg mb-3 border-b pb-2">Detail Lain-lain</h3>
            <div className="grid grid-cols-2 gap-5">
              <div className="flex items-center space-x-3">{booking.is_with_photography ? <div>✅ Dengan Fotografi</div> : <div>❌ Tidak Dengan Fotografi</div>}</div>
              <div />
              <div>
                <Label htmlFor="adult_number" className="mb-1">
                  Jumlah Dewasa
                </Label>
                <Input id="adult_number" value={booking.adult_number.toString()} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div>
                <Label htmlFor="children_number" className="mb-1">
                  Jumlah Anak-anak
                </Label>
                <Input id="children_number" value={booking.children_number.toString()} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes" className="mb-1">
                  Notes
                </Label>
                <Textarea id="notes" value={booking.notes || "Tidak ada catatan."} readOnly disabled className="bg-gray-100 p-3 rounded-lg border border-gray-200 min-h-[100px]" />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t mt-6">
            <button className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium" onClick={() => router.push("/admin/dashboard")}>
              &larr; Kembali ke Dashboard
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
