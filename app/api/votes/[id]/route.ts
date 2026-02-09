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

async function ensureVotesFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(votesPath);
  } catch {
    await fs.writeFile(votesPath, JSON.stringify([], null, 2), "utf8");
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const payload = (await request.json()) as Partial<Vote>;
  const votes = await readVotes();
  const index = votes.findIndex((vote) => vote.id === params.id);
  if (index === -1) {
    return NextResponse.json({ message: "Vote not found" }, { status: 404 });
  }
  const updated = {
    ...votes[index],
    ...payload,
    id: votes[index].id,
  };
  votes[index] = updated;
  await writeVotes(votes);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const votes = await readVotes();
  const nextVotes = votes.filter((vote) => vote.id !== params.id);
  if (nextVotes.length === votes.length) {
    return NextResponse.json({ message: "Vote not found" }, { status: 404 });
  }
  await writeVotes(nextVotes);
  return NextResponse.json({ ok: true });
}
