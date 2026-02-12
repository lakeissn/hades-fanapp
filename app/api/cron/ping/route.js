import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";

  // Bearer <CRON_SECRET> 형식 체크
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, message: "pong" });
}
