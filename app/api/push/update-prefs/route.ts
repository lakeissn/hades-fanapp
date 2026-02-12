/**
 * app/api/push/update-prefs/route.ts
 * POST /api/push/update-prefs
 *
 * 해당 토큰의 prefs(jsonb) 전체 업데이트
 * Payload: { token: string, prefs: Prefs }
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
    const prefs: Prefs | undefined = body.prefs;

    if (!token || !prefs) {
      return NextResponse.json(
        { ok: false, error: "token and prefs are required" },
        { status: 400 }
      );
    }

    // pushEnabled=false면 enabled도 false로 (발송 대상 제외)
    const enabled = prefs.pushEnabled !== false;

    const { error } = await supabaseAdmin
      .from("push_tokens")
      .update({
        prefs,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (error) {
      console.error("[push/update-prefs] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/update-prefs] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
