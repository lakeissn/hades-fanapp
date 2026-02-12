/**
 * app/api/push/register/route.ts
 * POST /api/push/register
 *
 * FCM 토큰 등록 (upsert)
 * Payload: { token: string, platform: string, prefs: Prefs }
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Prefs = {
  pushEnabled: boolean;
  liveEnabled: boolean;
  voteEnabled: boolean;
  youtubeEnabled: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: string | undefined = body.token;
    const platform: string = body.platform || "web";
    const prefs: Prefs = body.prefs || {
      pushEnabled: true,
      liveEnabled: true,
      voteEnabled: true,
      youtubeEnabled: true,
    };

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "token is required" },
        { status: 400 }
      );
    }

    // pushEnabled=false → enabled=false (서버 발송 대상에서 제외)
    const enabled = prefs.pushEnabled !== false;

    const { error } = await supabaseAdmin
      .from("push_tokens")
      .upsert(
        {
          token,
          platform,
          enabled,
          prefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      );

    if (error) {
      console.error("[push/register] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/register] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
