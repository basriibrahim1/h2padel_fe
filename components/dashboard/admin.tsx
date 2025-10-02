"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { format, startOfDay, endOfDay, addHours, isBefore, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- INTERFACES ---
interface Booking {
  id: number;
  client_name: string;
  coach_name: string;
  coach_id: string;
  start_time: string;
  final_court_price: number;
  final_coach_fee: number;
  status: string;
  notes: string;
  is_with_photography: boolean;
  duration: number; // durasi per jam
  derived_status?: string;
}

interface ProfileProps {
  avatar_url: string;
  full_name: string;
}

interface Coach {
  id: string;
  full_name: string;
}

// --- HELPERS ---
const formatStartTime = (isoString: string) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const locale = "id-ID";
  const formattedDate = date.toLocaleDateString(locale, dateOptions).replace(/\./g, "");
  const formattedTime = date.toLocaleTimeString(locale, timeOptions);
  return `${formattedDate}, ${formattedTime}`;
};

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const getStatusVariant = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-600 hover:bg-green-700 text-white";
    case "pending":
      return "bg-yellow-500 hover:bg-yellow-600 text-white";
    case "cancelled":
      return "bg-red-500 hover:bg-red-600 text-white";
    case "completed":
      return "bg-blue-600 hover:bg-blue-700 text-white";
    case "Sudah selesai":
      return "bg-gray-600 hover:bg-gray-700 text-white";
    case "Mendatang":
      return "bg-purple-600 hover:bg-purple-700 text-white";
    case "Sedang berlangsung":
      return "bg-orange-600 hover:bg-orange-700 text-white";
    default:
      return "bg-gray-500 hover:bg-gray-600 text-white";
  }
};

// --- MAIN COMPONENT ---
export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [getProfile, setGetProfile] = useState<ProfileProps>();
  const [loadingDelete, setLoadingDelete] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDisplayDate = useMemo(() => {
    if (!selectedDate) return "Pilih Tanggal Booking";
    return format(selectedDate, "dd MMMM yyyy", { locale: id });
  }, [selectedDate]);

  // --- Fetch Data ---
  const fetchData = async (coachId?: string | null, date?: Date | undefined) => {
    setIsLoading(true);

    if (!getProfile) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userData.user.id).single();
        if (profile) setGetProfile(profile as ProfileProps);
      }
    }

    if (coaches.length === 0) {
      const { data: coachesData } = await supabase.from("coaches").select(`id, profiles(full_name)`);
      if (coachesData) {
        const mapped: Coach[] = coachesData.map((c: any) => ({
          id: c.id,
          full_name: c.profiles?.full_name || "Tanpa Nama",
        }));
        setCoaches(mapped);
      }
    }

    let query = supabase.from("bookings").select(`
      id, client_name, coach_name, coach_id, start_time,
      final_court_price, final_coach_fee, status, notes, is_with_photography, duration
    `);

    if (coachId) query = query.eq("coach_id", coachId);

    if (date) {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();
      query = query.gte("start_time", start).lte("start_time", end);
    }

    const { data: bookingsData, error } = await query.order("id", { ascending: false });

    if (error) console.error("Error fetching bookings:", error);

    if (bookingsData) {
      const now = new Date();
      const mapped: Booking[] = bookingsData.map((b: Booking) => {
        const start = new Date(b.start_time);
        const end = addHours(start, b.duration || 1);

        let derived_status = "Mendatang";
        if (isBefore(now, start)) {
          derived_status = "Mendatang";
        } else if (isAfter(now, end)) {
          derived_status = "Sudah selesai";
        } else {
          derived_status = "Sedang berlangsung";
        }

        return { ...b, derived_status };
      });
      setBookings(mapped);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (mounted) fetchData(selectedCoachId, selectedDate);
  }, [selectedCoachId, selectedDate, mounted]);

  const handleDeleteBooking = (bookingId: number) => {
    toast.warning("Apakah Anda yakin ingin menghapus booking ini?", {
      description: "Tindakan ini tidak bisa dibatalkan.",
      action: {
        label: "Hapus",
        onClick: async () => {
          setLoadingDelete(bookingId);
          const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
          setLoadingDelete(null);

          if (error) {
            console.error("Delete Error:", error.message);
            toast.error(`Gagal menghapus booking: ${error.message}`);
            return;
          }

          await fetchData(selectedCoachId, selectedDate);
          toast.success("✅ Booking berhasil dihapus!");
        },
      },
    });
  };

  const handleResetFilters = () => {
    setSelectedCoachId(null);
    setSelectedDate(undefined);
  };

  if (!mounted) return <div className="p-6 text-center">Memuat dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={getProfile?.avatar_url || ""} alt="Avatar" />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{getProfile?.full_name?.charAt(0) || "A"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Hi, {getProfile?.full_name || "Admin"} 👋</h1>
            <p className="text-sm text-gray-500">Kelola semua jadwal booking Anda.</p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/booking/add-booking")} className="bg-green-600 hover:bg-green-700 font-semibold shadow-md">
          + Tambah Booking Baru
        </Button>
      </div>

      <hr className="my-4" />

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-4 py-2">
        <span className="font-semibold text-gray-700">Filter:</span>

        <Select value={selectedCoachId || "all"} onValueChange={(value) => setSelectedCoachId(value === "all" ? null : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Coach" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Coach</SelectItem>
            {coaches.map((coach) => (
              <SelectItem key={coach.id} value={coach.id}>
                {coach.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? formatDisplayDate : <span>Pilih Tanggal Booking</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={id} />
          </PopoverContent>
        </Popover>

        {(selectedCoachId || selectedDate) && (
          <Button variant="outline" onClick={handleResetFilters} className="text-red-500 border-red-200 hover:bg-red-50/50">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        )}
      </div>

      <hr className="my-4" />

      {/* BOOKINGS TABLE */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Daftar Booking</CardTitle>
          <p className="text-sm text-gray-500">{isLoading ? "Memuat data..." : `Menampilkan ${bookings.length} booking.`}</p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100/50">
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[180px]">Client / Coach</TableHead>
                  <TableHead className="min-w-[200px]">Waktu & Tambahan</TableHead>
                  <TableHead className="text-right">Total Biaya</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[200px]">Notes</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {!isLoading &&
                  bookings.map((b) => {
                    const totalPrice = b.final_coach_fee + b.final_court_price;
                    return (
                      <TableRow key={b.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-semibold text-gray-700">{b.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{b.client_name}</span>
                            <span className="text-xs text-blue-600">{b.coach_name ? `Coach: ${b.coach_name}` : "Tanpa Coach"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{formatStartTime(b.start_time)}</span>
                            <span className="text-xs text-gray-500">Durasi: {b.duration} jam</span>
                            {b.is_with_photography && <span className="text-xs text-purple-600 font-medium">✨ Dengan Fotography</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-bold text-green-700">{formatRupiah(totalPrice)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusVariant(b.derived_status || b.status)}>{(b.derived_status || b.status).toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-sm text-gray-600 truncate" title={b.notes}>
                          {b.notes || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center space-x-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/booking/edit/${b.id}`)}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteBooking(b.id)} disabled={loadingDelete === b.id}>
                            {loadingDelete === b.id ? "Hapus..." : "Hapus"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {!isLoading && bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      {selectedCoachId || selectedDate ? "Tidak ada booking ditemukan dengan filter ini." : "Belum ada booking yang ditemukan."}
                    </TableCell>
                  </TableRow>
                )}

                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Memuat daftar booking...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
