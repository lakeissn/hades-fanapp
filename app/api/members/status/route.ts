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
  liveStartedAt: string | null;
  tags: string[];
  fetchedAt: string;
};

type JsonObject = Record<string, unknown>;

type StationLiveFields = Omit<
  MemberStatus,
  "id" | "name" | "soopUrl" | "avatarUrl" | "fetchedAt"
>;

const CHAPI_BASE_URL = "https://chapi.sooplive.co.kr/api";
const PLAYER_LIVE_API_ENDPOINT = "https://live.sooplive.co.kr/afreeca/player_live_api.php";
const CACHE_TTL_MS = 20_000;

const BLOCKED_TAGS = new Set([
  "soop",
  "숲",
  "숲live",
  "sooplive",
  "afreecatv",
  "afreeca",
  "아프리카tv",
  "아프리카",
  "한국어",
]);

const GENERIC_TAGS = new Set(["보라", "종겜", "종합게임", "방송", "live", "onair"]);

const TAG_ALIASES: Record<string, string> = {
  봉: "봉준",
};

type PlayerLiveApiResponse = {
  RESULT?: number | string;
  CHANNEL?: {
    RESULT?: number | string;
    TAG?: string;
    HASH_TAGS?: unknown;
    CATEGORY_TAGS?: unknown;
    AUTO_HASHTAGS?: unknown;
    AF_TAGS?: unknown;
  };
};

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "application/json,text/plain,*/*",
};

let cached: { data: MemberStatus[]; expiresAt: number } | null = null;

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

function normalizeTag(raw: string): string | null {
  const cleaned = raw
    .replace(/^#/, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

  if (!cleaned) return null;

  const key = cleaned.toLowerCase().replace(/\s+/g, "");
  if (BLOCKED_TAGS.has(key)) return null;
  if (/^\d+$/.test(cleaned)) return null;
  if (cleaned.length > 40) return null;

  return TAG_ALIASES[cleaned] ?? cleaned;
}

function normalizeSupplementalTag(raw: string): string | null {
  const normalized = normalizeTag(raw);
  if (!normalized) return null;

  const key = normalized.toLowerCase().replace(/\s+/g, "");
  if (GENERIC_TAGS.has(key)) return null;

  // 카테고리 태그는 별도로 넣기 때문에 보조 태그는 짧은 키워드만 허용
  if (/\s/.test(normalized)) return null;
  if (normalized.length > 12) return null;

  return normalized;
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

function extractBroadNoFromLiveUrl(liveUrl: string | null): string | null {
  if (!liveUrl) return null;
  const match = liveUrl.match(/\/(\d{6,})(?:\?.*)?$/);
  return match?.[1] ?? null;
}

function buildLiveUrl(userId: string, broadNo: string | null): string {
  if (!broadNo) return `https://play.sooplive.co.kr/${userId}`;
  return `https://play.sooplive.co.kr/${userId}/${broadNo}`;
}

function normalizeThumbUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://chapi.sooplive.co.kr${value}`;
  return `https://${value}`;
}

function normalizeDateTime(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const unitNormalized = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(unitNormalized);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const raw = toNonEmptyString(value);
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-").replace(/\s+/g, " ").trim();
  const withSeconds = /\d{2}:\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : /\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : `${normalized} 00:00:00`;

  const parsed = new Date(`${withSeconds.replace(" ", "T")}+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

function pickPrimaryCategoryTag(source: JsonObject): string[] {
  const category = toNonEmptyString(
    pickByPaths(source, [
      ["station", "broad_cate_name"],
      ["channel", "broad_cate_name"],
      ["broad", "broad_cate_name"],
      ["station", "cate_name"],
      ["channel", "cate_name"],
      ["broad", "cate_name"],
      ["broad_cate_name"],
      ["cate_name"],
      ["channel", "CATE_NAME"],
      ["channel", "BROAD_CATE"],
    ])
  );

  const normalized = category ? normalizeTag(category) : null;
  return normalized ? [normalized] : [];
}

function collectTagCandidates(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw
      .split(/[|,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => collectTagCandidates(item));
  }

  const obj = asObject(raw);
  if (!obj) return [];

  const out: string[] = [];
  for (const key of ["af_tag", "afTag", "tag", "name", "label", "value", "text", "keyword"]) {
    if (key in obj) out.push(...collectTagCandidates(obj[key]));
  }

  return out;
}

function safeJsonParse<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (trimmed.startsWith(")]}'")) {
    candidates.push(trimmed.replace(/^\)\]\}'\s*/, ""));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // ignore
    }
  }

  return null;
}

async function fetchPlayerLiveTags(userId: string, broadNo: string | null): Promise<string[]> {
  const payload = {
    bid: userId,
    bno: broadNo ?? "",
    type: "live",
    pwd: "",
    player_type: "html5",
    stream_type: "common",
    quality: "HD",
    mode: "landing",
    from_api: "0",
    is_revive: "false",
  };

  try {
    const res = await fetch(PLAYER_LIVE_API_ENDPOINT, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://play.sooplive.co.kr",
        referer: `https://play.sooplive.co.kr/${userId}`,
      },
      body: new URLSearchParams(payload).toString(),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const raw = await res.text();
    const json = safeJsonParse<PlayerLiveApiResponse>(raw);
    if (!json) return [];

    const result = json.CHANNEL?.RESULT ?? json.RESULT;
    if (result === 0 || result === "0") return [];

    const candidates = [
      ...collectTagCandidates(json.CHANNEL?.TAG),
      ...collectTagCandidates(json.CHANNEL?.HASH_TAGS),
      ...collectTagCandidates(json.CHANNEL?.CATEGORY_TAGS),
      ...collectTagCandidates(json.CHANNEL?.AUTO_HASHTAGS),
      ...collectTagCandidates(json.CHANNEL?.AF_TAGS),
    ];

    return Array.from(new Set(candidates.map(normalizeSupplementalTag).filter((tag): tag is string => !!tag))).slice(0, 6);
  } catch {
    return [];
  }
}

function mergeLiveTags(categoryTags: string[], supplementalTags: string[]): string[] {
  const [category] = categoryTags;
  const deduped = new Set<string>();

  if (category) deduped.add(category);
  for (const tag of supplementalTags) {
    if (!deduped.has(tag)) deduped.add(tag);
  }

  return Array.from(deduped).slice(0, 7);
}

function parseStationStatus(userId: string, payload: unknown): StationLiveFields {
  const root = asObject(payload);
  if (!root) {
    return {
      isLive: false,
      liveUrl: null,
      title: null,
      thumbUrl: null,
      liveStartedAt: null,
      tags: [],
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
      ["station", "broad_thumb_url"],
      ["channel", "broad_thumb_url"],
      ["broad", "broad_thumb_url"],
      ["station", "thumb_url"],
      ["channel", "thumb_url"],
      ["broad", "thumb_url"],
      ["station", "thumb"],
      ["channel", "thumb"],
      ["broad", "thumb"],
      ["broad_thumb"],
      ["broad_thumb_url"],
      ["thumb"],
      ["thumb_url"],
    ])
  );

  const liveStartedAt = normalizeDateTime(
    pickByPaths(root, [
      ["station", "broad_start"],
      ["station", "broad_start_time"],
      ["station", "broad_start_datetime"],
      ["station", "start_time"],
      ["station", "start_at"],
      ["channel", "broad_start"],
      ["channel", "broad_start_time"],
      ["channel", "broad_start_datetime"],
      ["channel", "start_time"],
      ["channel", "start_at"],
      ["broad", "broad_start"],
      ["broad", "broad_start_time"],
      ["broad", "broad_start_datetime"],
      ["broad", "start_time"],
      ["broad", "start_at"],
      ["broad_start"],
      ["broad_start_time"],
      ["broad_start_datetime"],
      ["start_time"],
      ["start_at"],
      ["reg_date"],
    ])
  );

  return {
    isLive,
    liveUrl: isLive ? buildLiveUrl(userId, broadNo) : null,
    title: isLive ? title : null,
    thumbUrl: isLive ? thumbUrl : null,
    liveStartedAt: isLive ? liveStartedAt : null,
    // 요구사항: 첫 카테고리 태그만 유지, 나머지는 제거
    tags: isLive ? pickPrimaryCategoryTag(root) : [],
  };
}

async function fetchStationStatus(userId: string): Promise<StationLiveFields> {
  const endpoint = `${CHAPI_BASE_URL}/${encodeURIComponent(userId)}/station`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: COMMON_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[members/status] station api failed for ${userId}: ${response.status}`);
      return { isLive: false, liveUrl: null, title: null, thumbUrl: null, liveStartedAt: null, tags: [] };
    }

    const payload = (await response.json()) as unknown;
    return parseStationStatus(userId, payload);
  } catch (error) {
    console.warn(`[members/status] station api error for ${userId}:`, error);
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, liveStartedAt: null, tags: [] };
  }
}

function buildOfflineStatuses(nowIso: string): MemberStatus[] {
  return members.map((member) => ({
    ...member,
    isLive: false,
    liveUrl: null,
    title: null,
    thumbUrl: null,
    liveStartedAt: null,
    tags: [],
    fetchedAt: nowIso,
  }));
}

export async function GET() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    });
  }

  const nowIso = new Date().toISOString();

  try {
    const statuses = await Promise.all(
      members.map(async (member) => {
        const station = await fetchStationStatus(member.id);
        if (!station.isLive) {
          return { ...member, ...station, fetchedAt: nowIso };
        }

        const broadNo = extractBroadNoFromLiveUrl(station.liveUrl);
        const playerTags = await fetchPlayerLiveTags(member.id, broadNo);
        const tags = mergeLiveTags(station.tags, playerTags);

        return { ...member, ...station, tags, fetchedAt: nowIso };
      })
    );

    cached = {
      data: statuses,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(statuses, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[members/status] unexpected error:", error);

    const fallback = cached?.data ?? buildOfflineStatuses(nowIso);
    cached = {
      data: fallback,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    });
  }
}
