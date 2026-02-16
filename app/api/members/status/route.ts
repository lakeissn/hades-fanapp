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

type PlayerLiveApiResponse = {
  RESULT?: number | string;
  CHANNEL_STATUS?: string | number;
  channel_status?: string | number;
  BNO?: number | string;
  bno?: number | string;
  broad_no?: number | string;
  broadNo?: number | string;
  nBroadNo?: number | string;
  CHANNEL?: {
    BNO?: number | string;
    bno?: number | string;
    broad_no?: number | string;
    broadNo?: number | string;
    nBroadNo?: number | string;
    TITLE?: string;
    CATE_NAME?: string;
    BROAD_CATE?: string;
    TAG?: string; // "봉준,무수,하데스,보라,종겜" 같이 올 수 있음
    HASH_TAGS?: string[]; // ["버추얼","노래","하데스"] 같이 올 수 있음
  };
};

const CHAPI_BASE_URL = "https://chapi.sooplive.co.kr/api";
const PLAYER_LIVE_API_ENDPOINT = "https://live.sooplive.co.kr/afreeca/player_live_api.php";
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

function buildLiveUrl(userId: string, broadNo: string | null): string {
  if (!broadNo) return `https://play.sooplive.co.kr/${userId}`;
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

function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/^#/, "").trim();
  if (!cleaned) return null;
  if (cleaned === "한국어") return null;
  if (/^\d+$/.test(cleaned)) return null;
  if (cleaned.length > 30) return null;
  return cleaned;
}

function mergeTags(primary: string[], secondary: string[]): string[] {
  const set = new Set<string>();
  for (const tag of [...primary, ...secondary]) {
    const n = normalizeTag(tag);
    if (n) set.add(n);
  }
  return Array.from(set).slice(0, 7);
}

function pushTag(set: Set<string>, raw: unknown) {
  if (typeof raw !== "string") return;

  raw
    .split(/[|,]/)
    .map((part) => normalizeTag(part))
    .filter((part): part is string => !!part)
    .forEach((part) => set.add(part));
}

function pushTagsFromFreeText(set: Set<string>, raw: unknown) {
  if (typeof raw !== "string") return;

  const normalized = raw.replace(/\u0023/g, "#").replace(/&quot;/g, '"');

  const hashtagMatches = normalized.match(/#[^#\s,|/]{1,30}/g) ?? [];
  for (const token of hashtagMatches) {
    const n = normalizeTag(token);
    if (n) set.add(n);
  }

  normalized
    .split(/[|,/\n\r\t]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const n = normalizeTag(part);
      if (n) set.add(n);
    });
}

function extractJsonStringArray(html: string, key: string): string[] {
  const pattern = new RegExp(`"${key}"\\s*:\\s*\\[(.*?)\\]`, "gs");
  const out: string[] = [];

  for (const match of html.matchAll(pattern)) {
    const body = match[1] ?? "";
    const itemPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;

    for (const item of body.matchAll(itemPattern)) {
      const raw = item[1];
      if (!raw) continue;
      const decoded = raw
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\\"/g, '"')
        .replace(/\\\//g, "/");
      out.push(decoded);
    }
  }

  return out;
}

async function fetchPlayPageTags(userId: string, broadNo: string | null): Promise<string[]> {
  const urls = [
    broadNo ? `https://play.sooplive.co.kr/${userId}/${broadNo}` : null,
    `https://play.sooplive.co.kr/${userId}`,
  ].filter((url): url is string => !!url);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const html = await res.text();
      const values = new Set<string>();

      const tagArrayKeys = ["hashTags", "hash_tags", "tags", "tag_list"];
      for (const key of tagArrayKeys) {
        for (const item of extractJsonStringArray(html, key)) {
          pushTagsFromFreeText(values, item);
        }
      }

      const metaKeywords = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["'][^>]*>/i);
      if (metaKeywords?.[1]) {
        pushTagsFromFreeText(values, metaKeywords[1]);
      }

      const tagLikeStrings = html.match(/"(?:hashTag|hash_tag|tag|tags)"\s*:\s*"([^"\n\r]{1,300})"/g) ?? [];
      for (const raw of tagLikeStrings) {
        const m = raw.match(/:\s*"([^"\n\r]{1,300})"/);
        if (m?.[1]) pushTagsFromFreeText(values, m[1]);
      }

      const out = Array.from(values).slice(0, 7);
      if (out.length > 0) return out;
    } catch {
      // ignore and fallback
    }
  }

  return [];
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

  if (primaryCategory) {
    const n = normalizeTag(primaryCategory);
    if (n) values.add(n);
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

  if (language) {
    const n = normalizeTag(language);
    if (n) values.add(n);
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
        const n = normalizeTag(item);
        if (n) values.add(n);
      }
    }
  }

  return Array.from(values).slice(0, 7);
}

function safeJsonParse<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (trimmed.startsWith(")]}'")) {
    candidates.push(trimmed.replace(/^\)\]\}'\s*/, ""));
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const c of candidates) {
    try {
      return JSON.parse(c) as T;
    } catch {
      // continue
    }
  }
  return null;
}

async function fetchPlayerLiveTags(bjid: string, broadNo: string | null): Promise<string[]> {
  // broadNo가 있어도/없어도 동작하는 payload 두 개를 시도
  const payloads: Record<string, string>[] = [
    {
      bid: bjid,
      bno: broadNo ?? "null",
      type: "live",
      pwd: "",
      player_type: "html5",
      stream_type: "common",
      quality: "HD",
      mode: "landing",
      from_api: "0",
      is_revive: "false",
    },
    {
      bid: bjid,
      bno: broadNo ?? "",
      type: "live",
      pwd: "",
      player_type: "html5",
      stream_type: "common",
      quality: "HD",
      mode: "watch",
      from_api: "1",
      is_revive: "false",
    },
  ];

  for (const payload of payloads) {
    try {
      const res = await fetch(PLAYER_LIVE_API_ENDPOINT, {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://play.sooplive.co.kr",
          referer: `https://play.sooplive.co.kr/${bjid}`,
        },
        body: new URLSearchParams(payload).toString(),
        cache: "no-store",
      });

      if (!res.ok) continue;

      const raw = await res.text();
      const json = safeJsonParse<PlayerLiveApiResponse>(raw);
      if (!json) continue;

      const tags: string[] = [];

      const cateName = json.CHANNEL?.CATE_NAME ?? json.CHANNEL?.BROAD_CATE;
      if (typeof cateName === "string") {
        const n = normalizeTag(cateName);
        if (n) tags.push(n);
      }

      const csv = json.CHANNEL?.TAG;
      if (typeof csv === "string" && csv.trim()) {
        csv.split(",").forEach((t) => {
          const n = normalizeTag(t);
          if (n) tags.push(n);
        });
      }

      const hash = json.CHANNEL?.HASH_TAGS;
      if (Array.isArray(hash)) {
        hash.forEach((t) => {
          const n = normalizeTag(String(t));
          if (n) tags.push(n);
        });
      }

      const out = Array.from(new Set(tags)).slice(0, 7);
      if (out.length > 0) return out;
    } catch {
      // ignore and try next payload
    }
  }

  return [];
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

  const liveUrl = isLive ? buildLiveUrl(userId, broadNo) : null;
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
    liveUrl,
    title: isLive ? title : null,
    thumbUrl: isLive ? thumbUrl : null,
    liveStartedAt: isLive ? liveStartedAt : null,
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
    return NextResponse.json(cached.data);
  }

  const nowIso = new Date().toISOString();

  try {
    const statuses = await Promise.all(
      members.map(async (member) => {
        const station = await fetchStationStatus(member.id);

        if (!station.isLive) {
          return { ...member, ...station, fetchedAt: nowIso };
        }

        // 1) liveimg 썸네일 우선
        const broadNoFromUrl = extractBroadNoFromLiveUrl(station.liveUrl);
        const liveImgThumb = buildLiveImageUrl(broadNoFromUrl);

        // 2) 태그: player_live_api + 플레이 페이지 HTML fallback 보강
        const playerTags = await fetchPlayerLiveTags(member.id, broadNoFromUrl);
        const playPageTags = playerTags.length > 0
          ? []
          : await fetchPlayPageTags(member.id, broadNoFromUrl);
        const tags = mergeTags(playerTags, mergeTags(playPageTags, station.tags));

        return {
          ...member,
          ...station,
          thumbUrl: liveImgThumb ?? station.thumbUrl ?? member.avatarUrl,
          liveStartedAt: station.liveStartedAt,
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
