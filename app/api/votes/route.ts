import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const votesPath = path.join(dataDir, "votes.json");

type Vote = {
  id: string;
  title: string;
  options: string[];
  link?: string;
  opensAt?: string;
  closesAt?: string;
  status?: "open" | "closed";
};

const defaultVotes: Vote[] = [];

async function ensureVotesFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(votesPath);
  } catch {
    await fs.writeFile(votesPath, JSON.stringify(defaultVotes, null, 2), "utf8");
  }
}

async function readVotes() {
  await ensureVotesFile();
  const raw = await fs.readFile(votesPath, "utf8");
  return JSON.parse(raw) as Vote[];
}

async function writeVotes(votes: Vote[]) {
  await fs.writeFile(votesPath, JSON.stringify(votes, null, 2), "utf8");
}

export async function GET() {
  const votes = await readVotes();
  return NextResponse.json(votes);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<Vote, "id">;
  const votes = await readVotes();
  const created: Vote = {
    id: crypto.randomUUID(),
    title: payload.title ?? "",
    options: payload.options ?? [],
    link: payload.link,
    opensAt: payload.opensAt,
    closesAt: payload.closesAt,
    status: payload.status ?? "open",
  };
  votes.push(created);
  await writeVotes(votes);
  return NextResponse.json(created, { status: 201 });
}
