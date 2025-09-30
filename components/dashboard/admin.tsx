"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Diperlukan untuk navigasi Edit/Add
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button"; // Asumsi Anda menggunakan komponen Button

// --- INTERFACES (tetap sama) ---
interface Booking {
  id: number;
  court_id: number;
  client_id: string;
  client_name: string;
  client_phone: string;
  coach_id: string;
  coach_name: string;
  coach_phone: string;
  start_time: string;
  final_court_price: number;
  final_coach_fee: number;
  total_price: number;
  is_with_photography: boolean;
  adult_number: number;
  children_number: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProfileProps {
  avatar_url: string;
  created_at: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  id: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [getProfile, setGetProfile] = useState<ProfileProps>();
  const [loadingDelete, setLoadingDelete] = useState<number | null>(null);

  const fetchData = async () => {
    // get current user (tetap sama)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
      setGetProfile(profile as ProfileProps);
    }

    // get bookings (Menggunakan .select("*") sesuai permintaan)
    const { data: bookingsData, error } = await supabase.from("bookings").select("*").order("id", { ascending: false }); // Urutkan berdasarkan ID terbaru

    if (error) {
      console.error("Error fetching bookings:", error);
    }

    if (bookingsData) setBookings(bookingsData as Booking[]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLER DELETE BOOKING ---
  const handleDeleteBooking = async (bookingId: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus booking ini secara permanen?")) {
      return;
    }

    setLoadingDelete(bookingId);

    // Panggilan DELETE ke tabel utama 'bookings'
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);

    setLoadingDelete(null);

    if (error) {
      console.error("Delete Error:", error.message);
      alert(`Gagal menghapus booking: ${error.message}`);
      return;
    }

    // Update state secara lokal
    setBookings(bookings.filter((b) => b.id !== bookingId));
    alert("Booking berhasil dihapus!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Tombol Add */}
      <div className="flex items-center justify-between gap-4">
        {/* Profile Info */}
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={getProfile?.avatar_url || ""} alt="Avatar" />
            <AvatarFallback>{getProfile?.full_name?.charAt(0) || "A"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">Hi, {getProfile?.full_name} 👋</h1>
            <p className="text-sm text-muted-foreground">Welcome to your dashboard</p>
          </div>
        </div>

        {/* Tombol ADD BOOKING */}
        <Button onClick={() => router.push("/admin/booking/add-booking")} className="bg-green-600 hover:bg-green-700">
          + Add New Booking
        </Button>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead> {/* Kolom Actions */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.id}</TableCell>
                  <TableCell>{b.client_name}</TableCell>
                  <TableCell>{b.coach_name}</TableCell>
                  <TableCell>{new Date(b.start_time).toLocaleString()}</TableCell>
                  <TableCell>Rp.{b.final_coach_fee + b.final_court_price}</TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {/* Tombol EDIT: Navigasi ke halaman edit dinamis */}
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/booking/${b.id}`)}>
                      Edit
                    </Button>

                    {/* Tombol DELETE */}
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteBooking(b.id)} disabled={loadingDelete === b.id}>
                      {loadingDelete === b.id ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
