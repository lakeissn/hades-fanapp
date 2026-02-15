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

type StationLiveFields = Omit<
  MemberStatus,
  "id" | "name" | "soopUrl" | "avatarUrl" | "fetchedAt"
>;

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
  if (value.startsWith("/")) return `https://chapi.sooplive.co.kr${value}`;
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

function extractBroadNoFromLiveUrl(liveUrl: string | null): string | null {
  if (!liveUrl) return null;
  const match = liveUrl.match(/\/([0-9]{6,})(?:\?.*)?$/);
  return match?.[1] ?? null;
}

function buildLiveUrl(userId: string, broadNo: string | null): string | null {
  if (!broadNo) return null;
  return `https://play.sooplive.co.kr/${userId}/${broadNo}`;
}

function buildLiveImageUrl(broadNo: string | null): string | null {
  if (!broadNo) return null;
  return `https://liveimg.sooplive.co.kr/m/${broadNo}`;
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

function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/^#/, "").trim();
  if (!cleaned) return null;
  if (cleaned === "한국어") return null;
  if (/^\d+$/.test(cleaned)) return null;
  return cleaned;
}

function pushTag(set: Set<string>, raw: unknown) {
  if (typeof raw !== "string") return;

  raw
    .split(",")
    .map((part) => normalizeTag(part))
    .filter((part): part is string => !!part)
    .forEach((part) => set.add(part));
}

function collectTagsFromStation(source: JsonObject): string[] {
  const values = new Set<string>();

  const primaryCategory = toNonEmptyString(
    pickByPaths(source, [
      ["station", "broad_cate_name"],
      ["channel", "broad_cate_name"],
      ["broad", "broad_cate_name"],
      ["station", "cate_name"],
      ["channel", "cate_name"],
      ["broad", "cate_name"],
      ["broad_cate_name"],
      ["cate_name"],
    ])
  );

  if (primaryCategory && primaryCategory !== "한국어") {
    values.add(primaryCategory);
  }

  const language = toNonEmptyString(
    pickByPaths(source, [
      ["station", "lang"],
      ["station", "lang_name"],
      ["channel", "lang"],
      ["channel", "lang_name"],
      ["broad", "lang"],
      ["broad", "lang_name"],
      ["lang"],
      ["lang_name"],
    ])
  );

  if (language && language !== "한국어") {
    values.add(language);
  }

  const stringTagPaths: string[][] = [
    ["station", "broad_tag"],
    ["station", "tags"],
    ["station", "hash_tag"],
    ["channel", "broad_tag"],
    ["channel", "tags"],
    ["channel", "hash_tag"],
    ["broad", "broad_tag"],
    ["broad", "tags"],
    ["broad", "hash_tag"],
    ["broad_tag"],
    ["tags"],
    ["hash_tag"],
  ];

  for (const path of stringTagPaths) {
    pushTag(values, pickByPaths(source, [path]));
  }

  const arrayTagPaths: string[][] = [
    ["station", "hash_tags"],
    ["station", "tag_list"],
    ["channel", "hash_tags"],
    ["channel", "tag_list"],
    ["broad", "hash_tags"],
    ["broad", "tag_list"],
    ["hash_tags"],
    ["tag_list"],
  ];

  for (const path of arrayTagPaths) {
    const candidate = pickByPaths(source, [path]);
    if (!Array.isArray(candidate)) continue;

    for (const item of candidate) {
      if (typeof item === "string") {
        const normalized = normalizeTag(item);
        if (normalized) values.add(normalized);
      }
    }
  }

  return Array.from(values).slice(0, 7);
}

function decodeUnicodeEscapes(raw: string): string {
  return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeUnicodeEscapes(match[1]);
    }
  }

  return null;
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function extractTagsFromHashtagHtml(html: string): string[] {
  const values = new Set<string>();
  const wrapMatch = html.match(/<div[^>]*id=["']hashtag["'][^>]*>[\s\S]*?<\/div>/i);
  if (!wrapMatch?.[0]) return [];

  const wrap = wrapMatch[0];
  const anchorRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(wrap)) !== null) {
    const inner = match[1] ?? "";
    const text = decodeHtmlEntities(decodeUnicodeEscapes(inner.replace(/<[^>]+>/g, "").trim()));
    const normalized = normalizeTag(text);
    if (normalized) values.add(normalized);
  }

  return Array.from(values).slice(0, 7);
}

function collectTagsFromLiveHtml(html: string): string[] {
  const values = new Set<string>();

  const addTag = (raw: string) => {
    const normalized = normalizeTag(decodeUnicodeEscapes(raw));
    if (normalized) values.add(normalized);
  };

  const arrayPatterns = [
    /"broad_tag"\s*:\s*\[([\s\S]*?)\]/gi,
    /"hash_tags"\s*:\s*\[([\s\S]*?)\]/gi,
    /"hashTags"\s*:\s*\[([\s\S]*?)\]/gi,
    /"tags"\s*:\s*\[([\s\S]*?)\]/gi,
    /"BROAD_TAG"\s*:\s*\[([\s\S]*?)\]/gi,
  ];

  for (const pattern of arrayPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const inner = match[1] ?? "";
      const tokenMatches = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) ?? [];

      for (const token of tokenMatches) {
        addTag(token.slice(1, -1));
      }
    }
  }

  const csvPatterns = [
    /"broad_tag"\s*:\s*"([^"]+)"/gi,
    /"hash_tag"\s*:\s*"([^"]+)"/gi,
    /"tags"\s*:\s*"([^"]+)"/gi,
    /"BROAD_TAG"\s*:\s*"([^"]+)"/gi,
  ];

  for (const pattern of csvPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const raw = decodeUnicodeEscapes(match[1] ?? "");
      raw
        .split(/[|,]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach(addTag);
    }
  }

  const categoryPatterns = [
    /"broad_cate_name"\s*:\s*"([^"]+)"/i,
    /"cate_name"\s*:\s*"([^"]+)"/i,
    /"BROAD_CATE_NAME"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of categoryPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      addTag(match[1]);
      break;
    }
  }

  const ogDesc = extractMetaContent(html, "og:description") ?? extractMetaContent(html, "description");
  if (ogDesc) {
    const hashTags = ogDesc.match(/#([^\s#,]+)/g) ?? [];
    for (const tag of hashTags) {
      addTag(tag.replace(/^#/, ""));
    }
  }

  const hashtagTags = extractTagsFromHashtagHtml(html);
  for (const tag of hashtagTags) {
    addTag(tag);
  }

  return Array.from(values).slice(0, 7);
}

function parseStationStatus(userId: string, payload: unknown): StationLiveFields {
  const root = asObject(payload);
  if (!root) {
    return {
      isLive: false,
      liveUrl: null,
      title: null,
      thumbUrl: null,
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

  return {
    isLive,
    liveUrl: isLive ? buildLiveUrl(userId, broadNo) ?? `https://play.sooplive.co.kr/${userId}` : null,
    title: isLive ? title : null,
    thumbUrl: isLive ? thumbUrl : null,
    tags: isLive ? collectTagsFromStation(root) : [],
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
      return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
    }

    const payload = (await response.json()) as unknown;
    return parseStationStatus(userId, payload);
  } catch (error) {
    console.warn(`[members/status] station api error for ${userId}:`, error);
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  }
}

async function fetchLivePageTags(liveUrl: string | null): Promise<string[]> {
  if (!liveUrl) return [];

  try {
    const response = await fetch(liveUrl, {
      headers: COMMON_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) return [];

    const html = await response.text();
    return collectTagsFromLiveHtml(html);
  } catch {
    return [];
  }
}

function mergeTags(primary: string[], secondary: string[]): string[] {
  const set = new Set<string>();

  for (const tag of [...primary, ...secondary]) {
    const normalized = normalizeTag(tag);
    if (normalized) set.add(normalized);
  }

  return Array.from(set).slice(0, 7);
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

        if (!station.isLive) {
          return {
            ...member,
            ...station,
            fetchedAt: nowIso,
          };
        }

        const broadNoFromUrl = extractBroadNoFromLiveUrl(station.liveUrl);
        const liveImgThumb = buildLiveImageUrl(broadNoFromUrl);
        const livePageTags = await fetchLivePageTags(station.liveUrl);
        const tags = mergeTags(livePageTags, station.tags);

        return {
          ...member,
          ...station,
          thumbUrl: liveImgThumb ?? station.thumbUrl ?? member.avatarUrl,
          tags,
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
