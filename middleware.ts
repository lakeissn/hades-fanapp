import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_PATHS = ["/admin-hades/dashboard"];
const ADMIN_API_PATHS = ["/api/admin/votes"];

function getJwtSecret() {
  const pw = process.env.hades_info_admin_password;
  if (!pw) throw new Error("hades_info_admin_password not set");
  return new TextEncoder().encode(`hades-admin-jwt-${pw}`);
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAdminApi = ADMIN_API_PATHS.some((p) => pathname.startsWith(p));

  if (isAdminPage || isAdminApi) {
    const authed = await isAuthenticated(req);
    if (!authed) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin-hades";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin-hades/dashboard/:path*", "/api/admin/:path*"],
};
