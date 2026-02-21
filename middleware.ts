import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_PATHS = ["/admin-hades/dashboard"];
const ADMIN_API_PATHS = ["/api/admin/votes"];

function makeSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getValidSession(req: NextRequest): Promise<boolean> {
  const accessToken = req.cookies.get("sb_access_token")?.value;
  const refreshToken = req.cookies.get("sb_refresh_token")?.value;

  if (!accessToken && !refreshToken) return false;

  const supabase = makeSupabaseAdmin();

  // access_token 검증
  if (accessToken) {
    const { error } = await supabase.auth.getUser(accessToken);
    if (!error) return true;
  }

  // access_token 만료 시 refresh_token으로 재발급
  if (refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session) {
      return true; // 미들웨어에서 쿠키 갱신은 아래 래퍼에서 처리
    }
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAdminApi = ADMIN_API_PATHS.some((p) => pathname.startsWith(p));

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  const authed = await getValidSession(req);

  if (!authed) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin-hades";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin-hades/dashboard/:path*", "/api/admin/:path*"],
};
