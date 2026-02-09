import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const guidesPath = path.join(dataDir, "guides.json");

type Guide = {
  id: string;
  category: "streaming" | "gift" | "download";
  title: string;
  steps: string[];
};

async function ensureGuidesFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(guidesPath);
  } catch {
    await fs.writeFile(guidesPath, JSON.stringify([], null, 2), "utf8");
  }
}

async function readGuides() {
  await ensureGuidesFile();
  const raw = await fs.readFile(guidesPath, "utf8");
  return JSON.parse(raw) as Guide[];
}

async function writeGuides(guides: Guide[]) {
  await fs.writeFile(guidesPath, JSON.stringify(guides, null, 2), "utf8");
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const payload = (await request.json()) as Partial<Guide>;
  const guides = await readGuides();
  const index = guides.findIndex((guide) => guide.id === params.id);
  if (index === -1) {
    return NextResponse.json({ message: "Guide not found" }, { status: 404 });
  }
  const updated = {
    ...guides[index],
    ...payload,
    id: guides[index].id,
  };
  guides[index] = updated;
  await writeGuides(guides);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guides = await readGuides();
  const nextGuides = guides.filter((guide) => guide.id !== params.id);
  if (nextGuides.length === guides.length) {
    return NextResponse.json({ message: "Guide not found" }, { status: 404 });
  }
  await writeGuides(nextGuides);
  return NextResponse.json({ ok: true });
}
