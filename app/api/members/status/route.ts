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

// [FIX] CATEGORY_TAGS, AUTO_HASHTAGS 추가
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
    RESULT?: number | string;
    TITLE?: string;
    CATE_NAME?: string;
    BROAD_CATE?: string;
    TAG?: string; // "봉,무수,하데스,보라,종겜" 같이 올 수 있음
    HASH_TAGS?: unknown; // ["버추얼","노래","하데스"] 같이 올 수 있음
    CATEGORY_TAGS?: unknown; // ["VRChat"] 같이 카테고리 태그
    AUTO_HASHTAGS?: unknown; // 자동 생성 해시태그
    AF_TAGS?: unknown; // [{ af_tag, af_score }] 형태 포함 가능
  };
};

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
]);

const GENERIC_LIVE_TAGS = new Set([
  "보이는라디오",
  "보라",
  "종합게임",
  "종겜",
  "게임",
  "live",
  "onair",
  "방송",
]);

const BLOCKED_TAG_PATTERNS = [
  /현재\s*스트리밍\s*중.*모두의\s*live\s*생태계/i,
  /모두의\s*live\s*생태계/i,
];

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
  const cleaned = raw
    .replace(/^#/, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const key = lower.replace(/\s+/g, "");
  const normalizedSentence = lower.replace(/[!！.,·\-_/|]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned === "한국어") return null;
  if (BLOCKED_TAGS.has(key)) return null;
  if (BLOCKED_TAG_PATTERNS.some((pattern) => pattern.test(normalizedSentence))) return null;
  if (/^\d+$/.test(cleaned)) return null;
  if (cleaned.length > 30) return null;

  // 방송 제목 문장성 텍스트가 태그로 들어오는 케이스 차단
  const hasHangul = /[가-힣]/.test(cleaned);
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  if (hasHangul && wordCount >= 3 && cleaned.length >= 12) return null;

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
  const knownTagKeys = ["af_tag", "afTag", "tag", "name", "label", "value", "text", "keyword"];
  for (const key of knownTagKeys) {
    if (!(key in obj)) continue;
    out.push(...collectTagCandidates(obj[key]));
  }

  // 응답 형태가 바뀌더라도 tag가 포함된 key면 최대한 수집
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (!lower.includes("tag")) continue;
    if (knownTagKeys.includes(key)) continue;
    out.push(...collectTagCandidates(value));
  }

  return out;
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

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTagsFromHashtagWrap(html: string): string[] {
  const blockMatch = html.match(/<div[^>]+id=["']hashtag["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!blockMatch?.[1]) return [];

  const block = blockMatch[1];
  const tags: string[] = [];
  const anchorPattern = /<a[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of block.matchAll(anchorPattern)) {
    const text = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "")).trim();
    const normalized = normalizeTag(text);
    if (normalized) tags.push(normalized);
  }

  return Array.from(new Set(tags)).slice(0, 7);
}

function extractHashTagsFromRawHtml(html: string): string[] {
  const tags: string[] = [];

  const inlineHashMatches = html.match(/#[^#\s,|/"'<>]{1,30}/g) ?? [];
  for (const token of inlineHashMatches) {
    const n = normalizeTag(token);
    if (n) tags.push(n);
  }

  const encodedHashMatches = html.match(/(?:hashtag|hashTag|hash_tag)[=:"]+([^"&\s<>{}]{1,80})/gi) ?? [];
  for (const raw of encodedHashMatches) {
    const m = raw.match(/(?:hashtag|hashTag|hash_tag)[=:"]+([^"&\s<>{}]{1,80})/i);
    const value = m?.[1];
    if (!value) continue;
    try {
      const decoded = decodeURIComponent(value.replace(/\+/g, "%20"));
      const parsed = new Set<string>();
      pushTagsFromFreeText(parsed, decoded);
      for (const item of parsed) tags.push(item);
      const n = normalizeTag(decoded);
      if (n) tags.push(n);
    } catch {
      const n = normalizeTag(value);
      if (n) tags.push(n);
    }
  }

  return Array.from(new Set(tags)).slice(0, 7);
}

function extractMetaContent(html: string, key: string): string[] {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "gi"
  );
  return Array.from(html.matchAll(pattern)).map((m) => decodeHtmlEntities((m[1] ?? "").trim())).filter(Boolean);
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

      const htmlTags = extractTagsFromHashtagWrap(html);
      if (htmlTags.length > 0) {
        return htmlTags;
      }

      const rawHashTags = extractHashTagsFromRawHtml(html);
      if (rawHashTags.length > 0) {
        return rawHashTags;
      }

      for (const content of [
        ...extractMetaContent(html, "keywords"),
      ]) {
        pushTagsFromFreeText(values, content);
      }

      const tagArrayKeys = ["hashTags", "hash_tags", "tags", "tag_list", "HASH_TAGS", "CATEGORY_TAGS", "AUTO_HASHTAGS", "category_tags", "auto_hashtags"];
      for (const key of tagArrayKeys) {
        for (const item of extractJsonStringArray(html, key)) {
          pushTagsFromFreeText(values, item);
        }
      }

      const out = Array.from(values).slice(0, 7);
      if (out.length > 0) return out;
    } catch {
      // ignore and fallback
    }
  }

  return [];
}

function prioritizeTags(rawTags: string[]): string[] {
  const explicit: string[] = [];
  const generic: string[] = [];

  for (const tag of rawTags) {
    const n = normalizeTag(tag);
    if (!n) continue;

    const key = n.toLowerCase().replace(/\s+/g, "");
    if (GENERIC_LIVE_TAGS.has(key)) {
      generic.push(n);
    } else {
      explicit.push(n);
    }
  }

  return Array.from(new Set([...explicit, ...generic])).slice(0, 7);
}

function collectTagsFromStation(source: JsonObject): string[] {
  const values = new Set<string>();

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

  // [FIX] CATEGORY_TAGS, AUTO_HASHTAGS 경로 추가
  const arrayTagPaths: string[][] = [
    ["station", "hash_tags"],
    ["station", "tag_list"],
    ["station", "category_tags"],
    ["station", "auto_hashtags"],
    ["station", "af_tags"],
    ["station", "AF_TAGS"],
    ["channel", "hash_tags"],
    ["channel", "tag_list"],
    ["channel", "category_tags"],
    ["channel", "auto_hashtags"],
    ["channel", "CATEGORY_TAGS"],
    ["channel", "AUTO_HASHTAGS"],
    ["channel", "af_tags"],
    ["channel", "AF_TAGS"],
    ["broad", "hash_tags"],
    ["broad", "tag_list"],
    ["broad", "category_tags"],
    ["broad", "auto_hashtags"],
    ["hash_tags"],
    ["tag_list"],
    ["category_tags"],
    ["auto_hashtags"],
    ["af_tags"],
    ["AF_TAGS"],
    ["CATEGORY_TAGS"],
    ["AUTO_HASHTAGS"],
  ];

  for (const path of arrayTagPaths) {
    const candidate = pickByPaths(source, [path]);
    for (const token of collectTagCandidates(candidate)) {
      const n = normalizeTag(token);
      if (n) values.add(n);
    }
  }

  const fallback: string[] = [];

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
  if (primaryCategory) fallback.push(primaryCategory);

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
  if (language) fallback.push(language);

  return prioritizeTags([...values, ...fallback]);
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

// [FIX] stream_type 변형 추가 + CATEGORY_TAGS/AUTO_HASHTAGS 파싱 + RESULT:0 스킵
async function fetchPlayerLiveTags(bjid: string, broadNo: string | null): Promise<string[]> {
  // stream_type을 "common" 외에 "cineti"도 시도 (시네티 컨텐츠 대응)
  const streamTypes = ["common", "cineti"];
  const payloads: Record<string, string>[] = [];

  for (const st of streamTypes) {
    payloads.push({
      bid: bjid,
      bno: broadNo ?? "null",
      type: "live",
      pwd: "",
      player_type: "html5",
      stream_type: st,
      quality: "HD",
      mode: "landing",
      from_api: "0",
      is_revive: "false",
    });
    payloads.push({
      bid: bjid,
      bno: broadNo ?? "",
      type: "live",
      pwd: "",
      player_type: "html5",
      stream_type: st,
      quality: "HD",
      mode: "watch",
      from_api: "1",
      is_revive: "false",
    });
  }

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

      // RESULT: 0 이면 방송 데이터 없음 → 다음 payload 시도
      const result = json.CHANNEL?.RESULT ?? json.RESULT;
      if (result === 0 || result === "0") continue;

      const tags: string[] = [];

      // [FIX] CATEGORY_TAGS 파싱 추가
      const categoryTags = json.CHANNEL?.CATEGORY_TAGS;
      for (const token of collectTagCandidates(categoryTags)) {
        const n = normalizeTag(token);
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
      for (const token of collectTagCandidates(hash)) {
        const n = normalizeTag(token);
        if (n) tags.push(n);
      }

      // [FIX] AUTO_HASHTAGS 파싱 추가
      const autoHash = json.CHANNEL?.AUTO_HASHTAGS;
      for (const token of collectTagCandidates(autoHash)) {
        const n = normalizeTag(token);
        if (n) tags.push(n);
      }

      const afTags = json.CHANNEL?.AF_TAGS;
      for (const token of collectTagCandidates(afTags)) {
        const n = normalizeTag(token);
        if (n) tags.push(n);
      }

      const cateName = json.CHANNEL?.CATE_NAME ?? json.CHANNEL?.BROAD_CATE;
      if (typeof cateName === "string") {
        tags.push(cateName);
      }

      const out = prioritizeTags(tags);
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

function removeTitleLikeTags(tags: string[], title: string | null): string[] {
  if (!title) return tags;

  const normalizedTitle = title.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalizedTitle) return tags;

  return tags.filter((tag) => {
    const normalizedTag = tag.replace(/\s+/g, " ").trim().toLowerCase();
    if (!normalizedTag) return false;
    return normalizedTag !== normalizedTitle;
  });
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

        // 1) liveimg 썸네일 우선
        const broadNoFromUrl = extractBroadNoFromLiveUrl(station.liveUrl);
        const liveImgThumb = buildLiveImageUrl(broadNoFromUrl);

        // 2) 태그: player_live_api + 플레이 페이지 HTML + station 순으로 병합
        const playerTags = await fetchPlayerLiveTags(member.id, broadNoFromUrl);
        const playPageTags = await fetchPlayPageTags(member.id, broadNoFromUrl);
        const mergedTags = prioritizeTags(
          mergeTags(playerTags, mergeTags(playPageTags, station.tags))
        );
        const tags = removeTitleLikeTags(mergedTags, station.title);

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
