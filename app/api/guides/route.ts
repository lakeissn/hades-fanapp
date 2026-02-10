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

const defaultGuides: Guide[] = [];

async function ensureGuidesFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(guidesPath);
  } catch {
    await fs.writeFile(guidesPath, JSON.stringify(defaultGuides, null, 2), "utf8");
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

export async function GET() {
  const guides = await readGuides();
  return NextResponse.json(guides);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<Guide, "id">;
  const guides = await readGuides();
  const created: Guide = {
    id: crypto.randomUUID(),
    category: payload.category ?? "streaming",
    title: payload.title ?? "",
    steps: payload.steps ?? [],
  };
  guides.push(created);
  await writeGuides(guides);
  return NextResponse.json(created, { status: 201 });
}
