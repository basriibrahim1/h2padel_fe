import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const roleRedirect: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  coach: "/coach/dashboard",
  client: "/client/dashboard",
};

export async function middleware(req: NextRequest) {
  // ⬇️ bikin response yang bisa diubah cookie-nya
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // 🔑 Ambil session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔎 Ambil role dari profile
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = profile.role as keyof typeof roleRedirect;

  // Redirect "/" ke dashboard role
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL(roleRedirect[role], req.url));
  }

  // Proteksi masing2 route
  if (req.nextUrl.pathname.startsWith("/superadmin") && role !== "superadmin") {
    return NextResponse.redirect(new URL(roleRedirect[role], req.url));
  }
  if (req.nextUrl.pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(roleRedirect[role], req.url));
  }
  if (req.nextUrl.pathname.startsWith("/coach") && role !== "coach") {
    return NextResponse.redirect(new URL(roleRedirect[role], req.url));
  }
  if (req.nextUrl.pathname.startsWith("/client") && role !== "client") {
    return NextResponse.redirect(new URL(roleRedirect[role], req.url));
  }

  // ⬅️ penting! return res yg sudah diset cookie
  return res;
}

export const config = {
  matcher: ["/", "/superadmin/:path*", "/admin/:path*", "/coach/:path*", "/client/:path*"],
};
