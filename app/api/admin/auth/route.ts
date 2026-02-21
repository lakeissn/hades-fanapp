import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export async function POST(req: Request) {
  try {
    const { email, password, remember = true } = await req.json();

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const { access_token, refresh_token, expires_in } = data.session;

    const res = NextResponse.json({ ok: true });

    res.cookies.set("sb_access_token", access_token, {
      ...COOKIE_OPTS,
      maxAge: expires_in,
    });

    res.cookies.set("sb_refresh_token", refresh_token, {
      ...COOKIE_OPTS,
      // remember=true: 7일 유지 / false: 브라우저 종료 시 만료(세션 쿠키)
      ...(remember ? { maxAge: 60 * 60 * 24 * 7 } : {}),
    });

    // 구버전 쿠키 제거
    res.cookies.set("admin_session", "", { ...COOKIE_OPTS, maxAge: 0 });

    return res;
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb_access_token", "", { ...COOKIE_OPTS, maxAge: 0 });
  res.cookies.set("sb_refresh_token", "", { ...COOKIE_OPTS, maxAge: 0 });
  res.cookies.set("admin_session", "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
