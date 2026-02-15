import { NextResponse } from "next/server";

const members = [
  {
    id: "whatcherry4",
    name: "연초록",
    soopUrl: "https://play.sooplive.co.kr/whatcherry4",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/wh/whatcherry4/whatcherry4.jpg",
  },
  {
    id: "singgyul",
    name: "띵귤",
    soopUrl: "https://play.sooplive.co.kr/singgyul",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/si/singgyul/singgyul.jpg",
  },
  {
    id: "ldrboo",
    name: "솜주먹",
    soopUrl: "https://play.sooplive.co.kr/ldrboo",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/ld/ldrboo/ldrboo.jpg",
  },
  {
    id: "chaenna02",
    name: "챈나",
    soopUrl: "https://play.sooplive.co.kr/chaenna02",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/ch/chaenna02/chaenna02.jpg",
  },
  {
    id: "kymakyma",
    name: "키마",
    soopUrl: "https://play.sooplive.co.kr/kymakyma",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/ky/kymakyma/kymakyma.jpg",
  },
  {
    id: "khm11903",
    name: "봉준",
    soopUrl: "https://play.sooplive.co.kr/khm11903",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/kh/khm11903/khm11903.jpg",
  },
];

type MemberStatus = {
  id: string;
  name: string;
  soopUrl: string;
  avatarUrl: string;
  isLive: boolean;
  liveUrl: string | null;
  title: string | null;
  thumbUrl: string | null;
  tags: string[];
  fetchedAt: string;
};

type JsonObject = Record<string, unknown>;

const CHAPI_BASE_URL = "https://chapi.sooplive.co.kr/api";
const CACHE_TTL_MS = 20_000;

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "application/json,text/plain,*/*",
};

let cached: { data: MemberStatus[]; expiresAt: number } | null = null;

function normalizeThumbUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://ch.sooplive.co.kr${value}`;
  return `https://${value}`;
}

function parseBroadNo(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return String(Math.trunc(raw));
  }

  if (typeof raw === "string") {
    const normalized = raw.trim();
    if (!normalized) return null;

    const directDigits = normalized.match(/^\d+$/)?.[0];
    if (directDigits) return directDigits;

    const embeddedDigits = normalized.match(/(\d{6,})/);
    if (embeddedDigits?.[1]) return embeddedDigits[1];
  }

  return null;
}

function buildLiveUrl(userId: string, broadNo: string | null): string | null {
  if (!broadNo) return null;
  return `https://play.sooplive.co.kr/${userId}/${broadNo}`;
}

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

function pickByPaths(source: JsonObject, paths: string[][]): unknown {
  for (const path of paths) {
    let cursor: unknown = source;

    for (const key of path) {
      const obj = asObject(cursor);
      if (!obj || !(key in obj)) {
        cursor = null;
        break;
      }
      cursor = obj[key];
    }

    if (cursor !== null && cursor !== undefined) return cursor;
  }

  return undefined;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function liveFlagFromUnknown(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (["y", "yes", "true", "1", "live", "on", "open", "playing"].includes(normalized)) {
    return true;
  }

  if (["n", "no", "false", "0", "offline", "off", "close", "closed"].includes(normalized)) {
    return false;
  }

  return null;
}

function collectTags(source: JsonObject): string[] {
  const values = new Set<string>();

  const candidatePaths: string[][] = [
    ["station", "broad_cate_name"],
    ["station", "cate_name"],
    ["channel", "broad_cate_name"],
    ["channel", "cate_name"],
    ["broad", "broad_cate_name"],
    ["broad", "cate_name"],
    ["station", "broad_cate_no"],
    ["channel", "broad_cate_no"],
    ["broad", "broad_cate_no"],
  ];

  for (const path of candidatePaths) {
    const found = pickByPaths(source, [path]);
    const text = toNonEmptyString(found) ?? (typeof found === "number" ? String(found) : null);
    if (text) values.add(text);
  }

  const tagArrayCandidates = [
    pickByPaths(source, [["station", "hash_tags"]]),
    pickByPaths(source, [["station", "tags"]]),
    pickByPaths(source, [["channel", "hash_tags"]]),
    pickByPaths(source, [["channel", "tags"]]),
    pickByPaths(source, [["broad", "hash_tags"]]),
    pickByPaths(source, [["broad", "tags"]]),
  ];

  for (const candidate of tagArrayCandidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      const text = toNonEmptyString(item);
      if (text) values.add(text);
    }
  }

  return Array.from(values).slice(0, 7);
}

function parseStationStatus(userId: string, payload: unknown) {
  const root = asObject(payload);
  if (!root) {
    return {
      isLive: false,
      liveUrl: null,
      title: null,
      thumbUrl: null,
      tags: [] as string[],
    };
  }

  const broadNoRaw = pickByPaths(root, [
    ["station", "broad_no"],
    ["station", "bno"],
    ["channel", "broad_no"],
    ["channel", "BNO"],
    ["broad", "broad_no"],
    ["broad_no"],
    ["bno"],
    ["BNO"],
  ]);
  const broadNo = parseBroadNo(broadNoRaw);

  const explicitLiveValue = pickByPaths(root, [
    ["station", "is_live"],
    ["station", "live_yn"],
    ["station", "is_broad"],
    ["station", "broad_yn"],
    ["station", "is_onair"],
    ["station", "onair"],
    ["station", "broad_status"],
    ["channel", "is_live"],
    ["channel", "live_yn"],
    ["channel", "is_broad"],
    ["channel", "broad_yn"],
    ["channel", "is_onair"],
    ["channel", "onair"],
    ["channel", "channel_status"],
    ["channel", "CHANNEL_STATUS"],
    ["broad", "is_live"],
    ["broad", "live_yn"],
    ["broad", "broad_status"],
    ["is_live"],
    ["live_yn"],
    ["is_broad"],
    ["broad_yn"],
    ["onair"],
    ["channel_status"],
    ["CHANNEL_STATUS"],
  ]);

  const explicitLive = liveFlagFromUnknown(explicitLiveValue);
  const isLive = explicitLive ?? !!broadNo;

  const title = toNonEmptyString(
    pickByPaths(root, [
      ["station", "broad_title"],
      ["channel", "broad_title"],
      ["broad", "broad_title"],
      ["station", "title"],
      ["channel", "title"],
      ["broad", "title"],
      ["broad_title"],
      ["title"],
    ])
  );

  const thumbUrl = normalizeThumbUrl(
    pickByPaths(root, [
      ["station", "broad_thumb"],
      ["channel", "broad_thumb"],
      ["broad", "broad_thumb"],
      ["station", "thumb"],
      ["channel", "thumb"],
      ["broad", "thumb"],
      ["station", "thumb_url"],
      ["channel", "thumb_url"],
      ["broad", "thumb_url"],
      ["broad_thumb"],
      ["thumb"],
      ["thumb_url"],
    ])
  );

  return {
    isLive,
    liveUrl: isLive ? buildLiveUrl(userId, broadNo) ?? `https://play.sooplive.co.kr/${userId}` : null,
    title: isLive ? title : null,
    thumbUrl: isLive ? thumbUrl : null,
    tags: isLive ? collectTags(root) : [],
  };
}

async function fetchStationStatus(userId: string): Promise<Omit<MemberStatus, "id" | "name" | "soopUrl" | "avatarUrl" | "fetchedAt">> {
  const endpoint = `${CHAPI_BASE_URL}/${encodeURIComponent(userId)}/station`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: COMMON_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[members/status] station api failed for ${userId}: ${response.status}`);
      return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
    }

    const payload = (await response.json()) as unknown;
    return parseStationStatus(userId, payload);
  } catch (error) {
    console.warn(`[members/status] station api error for ${userId}:`, error);
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  }
}

function buildOfflineStatuses(nowIso: string): MemberStatus[] {
  return members.map((member) => ({
    ...member,
    isLive: false,
    liveUrl: null,
    title: null,
    thumbUrl: null,
    tags: [],
    fetchedAt: nowIso,
  }));
}

export async function GET() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  const nowIso = new Date().toISOString();

  try {
    const statuses = await Promise.all(
      members.map(async (member) => {
        const station = await fetchStationStatus(member.id);
        return {
          ...member,
          ...station,
          fetchedAt: nowIso,
        };
      })
    );

    cached = {
      data: statuses,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(statuses);
  } catch (error) {
    console.error("[members/status] unexpected error:", error);

    const fallback = cached?.data ?? buildOfflineStatuses(nowIso);
    cached = {
      data: fallback,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(fallback);
  }
}
