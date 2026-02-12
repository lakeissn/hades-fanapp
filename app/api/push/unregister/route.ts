/**
 * app/api/push/unregister/route.ts
 * POST /api/push/unregister
 *
 * 토큰 비활성화 (enabled=false)
 * Payload: { token: string }
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: string | undefined = body.token;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "token is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_tokens")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (error) {
      console.error("[push/unregister] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/unregister] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
