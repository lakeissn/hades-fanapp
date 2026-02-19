import { headers } from "next/headers";
import HomePageClient from "@/components/HomePageClient";

type MemberStatus = {
  id: string;
  name: string;
  soopUrl: string;
  avatarUrl: string;
  isLive: boolean;
  liveUrl: string | null;
  title: string | null;
  thumbUrl: string | null;
  liveStartedAt: string | null;
  tags: string[];
  fetchedAt: string;
};

type VoteItem = {
  id: string;
  title: string;
  platform: string;
  platformLabel: string;
  platforms?: string[];
  platformLabels?: string[];
  url: string | null;
  opensAt?: string;
  closesAt?: string;
  note?: string;
};

function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://127.0.0.1:3000";
  return `${proto}://${host}`;
}

async function loadMembers(baseUrl: string): Promise<MemberStatus[]> {
  try {
    const res = await fetch(`${baseUrl}/api/members/status`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadVotes(baseUrl: string): Promise<VoteItem[]> {
  try {
    const res = await fetch(`${baseUrl}/api/votes`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const baseUrl = getBaseUrl();
  const [initialMembers, initialVotes] = await Promise.all([
    loadMembers(baseUrl),
    loadVotes(baseUrl),
  ]);

  return (
    <HomePageClient initialMembers={initialMembers} initialVotes={initialVotes} />
  );
}
