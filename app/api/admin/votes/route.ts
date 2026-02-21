import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("votes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "삭제할 항목을 선택해주세요." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("votes")
      .delete()
      .in("id", ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, platform, url, opens_at, closes_at, note } = body;

    if (!title?.trim() || !platform?.trim()) {
      return NextResponse.json({ error: "제목과 플랫폼은 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("votes")
      .insert({
        title: title.trim(),
        platform: platform.trim(),
        url: (url ?? "").trim(),
        opens_at: opens_at?.trim() || null,
        closes_at: closes_at?.trim() || null,
        note: note?.trim() || null,
        enabled: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
}
