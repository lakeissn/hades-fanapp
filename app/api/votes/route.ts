import { NextResponse } from "next/server";
import { parseKstDate } from "@/lib/parseKstDate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VotePlatform =
  | "idolchamp"
  | "mubeat"
  | "upick"
  | "fancast"
  | "fanplus"
  | "podoal"
  | "whosfan"
  | "duckad"
  | "10asia"
  | "muniverse"
  | "my1pick"
  | "mnetplus"
  | "fannstar"
  | "higher"
  | "ktopstar";

type VoteRow = {
  enabled: string;
  title: string;
  platform: string;
  url: string;
  opensAt: string;
  closesAt: string;
  note: string;
};

type VoteItem = {
  id: string;
  legacyId?: string;
  title: string;
  platform: string;
  platformLabel: string;
  platforms: string[];
  platformLabels: string[];
  url: string;
  opensAt?: string;
  closesAt?: string;
  note?: string;
};

const FALLBACK_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRPX-EvmCuv7Dk_ozK2PhR0VmxW94s3-bZkY5Kou8FMXBR7f4indzBJ5GayAwv_VurZa0Dsp7SsrnBL/pub?gid=0&single=true&output=csv";

const PLATFORM_LABELS: Record<VotePlatform, string> = {
  idolchamp: "아이돌챔프",
  mubeat: "뮤빗",
  upick: "유픽",
  fancast: "팬캐스트",
  fanplus: "팬플러스",
  podoal: "포도알",
  whosfan: "후즈팬",
  duckad: "덕애드",
  "10asia": "텐아시아",
  muniverse: "뮤니버스",
  my1pick: "마이원픽",
  mnetplus: "엠넷플러스",
  fannstar: "팬앤스타",
  higher: "하이어",
  ktopstar: "K탑스타",
};

const REQUEST_TIMEOUT_MS = 4_500;

// 동시 요청 1회로 합치기
let inFlightRequest: Promise<VoteItem[]> | null = null;

// CSV polling 간격(기존 30초 유지)
const MIN_REFRESH_MS = 30_000;

// 현재 API가 노출하는 안정 스냅샷
let lastGoodVotes: VoteItem[] | null = null;
let lastFetchedAt = 0;

function withCacheBusting(url: string) {
  const bucket = Math.floor(Date.now() / MIN_REFRESH_MS);

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("_cb", String(bucket));
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_cb=${bucket}`;
  }
}

function normalizeBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizePlatform(platform: string) {
  return platform.trim().toLowerCase();
}

function normalizeVoteUrl(url: string) {
  return url.trim();
}

function voteIdentityKey(platform: string, url: string) {
  return `${normalizePlatform(platform)}|${normalizeVoteUrl(url)}`.toLowerCase();
}

function parsePlatforms(platformsRaw: string) {
  const normalized = platformsRaw
    .replace(/[|,/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const unique = new Set<string>();
  normalized
    .split(" ")
    .map((value) => normalizePlatform(value))
    .filter(Boolean)
    .forEach((platform) => unique.add(platform));

  if (unique.size === 0) {
    return ["etc"];
  }

  return Array.from(unique);
}

function labelForPlatform(platform: string) {
  const key = normalizePlatform(platform) as VotePlatform;
  return PLATFORM_LABELS[key] ?? "기타";
}

function isInProgressKeyword(value: string) {
  const normalized = value.replace(/\s+/g, "").toLowerCase();
  return normalized === "진행중";
}

function parseDateKst(rawValue: string | undefined) {
  if (!rawValue) return null;
  const value = rawValue.trim();
  if (!value || isInProgressKeyword(value)) return null;
  return parseKstDate(value);
}

function isExpired(closesAt: string) {
  const date = parseDateKst(closesAt);
  if (!date) return false;
  return date.getTime() <= Date.now();
}

function hashToVoteId(raw: string) {
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `vote-${hash.toString(36)}`;
}

function createStableId(row: VoteRow) {
  const stableRaw = [
    normalizePlatform(row.platform ?? ""),
    normalizeVoteUrl(row.url ?? ""),
    row.title?.trim() ?? "",
  ].join("|");

  return hashToVoteId(stableRaw.toLowerCase());
}

function createLegacyStableId(row: VoteRow) {
  // 이전 배포본(id=platform+url)과 호환 유지
  return hashToVoteId(voteIdentityKey(row.platform ?? "", row.url ?? ""));
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const [headerLine, ...rows] = lines;
  const headers = parseCsvLine(headerLine);

  return rows.map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record as VoteRow;
  });
}

function uniqueVotes(votes: VoteItem[]) {
  const seen = new Set<string>();
  return votes.filter((vote) => {
    const key = `${vote.platform}|${vote.title}|${vote.url}|${vote.closesAt ?? ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchVotesCsv(csvUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const cacheBustedUrl = withCacheBusting(csvUrl);

  try {
    const response = await fetch(cacheBustedUrl, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: {
        Accept: "text/csv,*/*;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch votes csv: ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatestVotes() {
  const csvUrl = process.env.VOTES_SHEET_CSV_URL ?? FALLBACK_CSV_URL;
  const csv = await fetchVotesCsv(csvUrl);
  const parsedRows = parseCsv(csv);

  const fetchedVotes = parsedRows
    .filter((row) => normalizeBoolean(row.enabled ?? ""))
    .filter((row) => !isExpired(row.closesAt ?? ""))
    .map((row) => {
      const platforms = parsePlatforms(row.platform ?? "");
      const rawOpensAt = row.opensAt?.trim() ?? "";
      const openDate = parseDateKst(rawOpensAt);
      const closeDate = parseDateKst(row.closesAt ?? "");

      return {
        id: createStableId(row),
        legacyId: createLegacyStableId(row),
        title: row.title?.trim() ?? "",
        platform: platforms[0],
        platformLabel: labelForPlatform(platforms[0]),
        platforms,
        platformLabels: platforms.map(labelForPlatform),
        url: row.url?.trim() ?? "",
        opensAt: isInProgressKeyword(rawOpensAt)
          ? "진행중"
          : openDate
          ? openDate.toISOString()
          : undefined,
        closesAt: closeDate ? closeDate.toISOString() : undefined,
        note: row.note?.trim() || undefined,
      } as VoteItem;
    })
    .filter((vote) => vote.title && vote.url);

  return uniqueVotes(fetchedVotes);
}

// 30초 polling + inFlight 공유 + 실패 폴백 + 전체 즉시 반영(삭제 포함)
async function loadVotesFromSheet() {
  const now = Date.now();

  if (lastGoodVotes && now - lastFetchedAt < MIN_REFRESH_MS) {
    return lastGoodVotes;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    const fetchedVotes = await fetchLatestVotes();
    lastGoodVotes = fetchedVotes;
    lastFetchedAt = Date.now();
    return fetchedVotes;
  })();

  try {
    return await inFlightRequest;
  } catch {
    if (lastGoodVotes) return lastGoodVotes;
    return [];
  } finally {
    inFlightRequest = null;
  }
}

export async function GET() {
  try {
    const votes = await loadVotesFromSheet();
    return NextResponse.json(votes, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return NextResponse.json([], {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}
