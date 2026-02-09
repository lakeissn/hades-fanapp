import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const livePath = path.join(dataDir, "live.json");

const defaultLive = {
  status: "off",
  platform: "",
  link: "",
};

async function ensureLiveFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(livePath);
  } catch {
    await fs.writeFile(livePath, JSON.stringify(defaultLive, null, 2), "utf8");
  }
}

async function readLive() {
  await ensureLiveFile();
  const raw = await fs.readFile(livePath, "utf8");
  return JSON.parse(raw) as typeof defaultLive;
}

async function writeLive(payload: typeof defaultLive) {
  await fs.writeFile(livePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function GET() {
  const live = await readLive();
  return NextResponse.json(live);
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as typeof defaultLive;
  const updated = {
    status: payload.status ?? "off",
    platform: payload.platform ?? "",
    link: payload.link ?? "",
  };
  await ensureLiveFile();
  await writeLive(updated);
  return NextResponse.json(updated);
}
