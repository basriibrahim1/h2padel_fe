"use client";

import { useState, FormEvent, ChangeEvent } from "react"; // Import FormEvent dan ChangeEvent
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// Menggunakan non-null assertion (!) yang sudah benar
const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function SignUpPage() {
  const router = useRouter();

  // State untuk semua input
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("client");

  const [loading, setLoading] = useState(false);
  // Tipe ini sudah benar
  const [error, setError] = useState<string | null>(null);

  // Perbaikan: Gunakan tipe FormEvent untuk event submit
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });

      const result = await response.json();
      setLoading(false);

      if (!response.ok || !result.success) {
        setError(result.message || "Gagal membuat pengguna melalui Admin API.");
        return;
      }

      // Sukses! Admin session tetap utuh.
      console.log("Admin berhasil membuat user. Sesi Admin tetap.");
    } catch (err) {
      setLoading(false);
      setError("Terjadi kesalahan jaringan.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Daftar Akun Baru</h2>

      <form onSubmit={handleSignUp} style={{ display: "grid", gap: "10px" }}>
        {/* Perbaikan: Mengganti (e) => setX(e.target.value) dengan tipe ChangeEvent */}
        <input type="text" placeholder="Nama Lengkap (Full Name)" value={fullName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required />
        <input type="tel" placeholder="Nomor Telepon (Phone)" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} required />

        <select value={role} onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)} required>
          <option value="client">Client</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit" disabled={loading} style={{ padding: "10px", backgroundColor: loading ? "#aaa" : "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {loading ? "Memproses..." : "Daftar dan Masuk"}
        </button>
      </form>

      {error && <p style={{ color: "red", fontWeight: "bold" }}>Error: {error}</p>}
    </div>
  );
}
