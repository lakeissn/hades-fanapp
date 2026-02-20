import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { title, platform, url, opens_at, closes_at, note, enabled } = body;

    if (!title?.trim() || !platform?.trim()) {
      return NextResponse.json({ error: "제목과 플랫폼은 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("votes")
      .update({
        title: title.trim(),
        platform: platform.trim(),
        url: (url ?? "").trim(),
        opens_at: opens_at?.trim() || null,
        closes_at: closes_at?.trim() || null,
        note: note?.trim() || null,
        enabled: enabled ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from("votes")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
