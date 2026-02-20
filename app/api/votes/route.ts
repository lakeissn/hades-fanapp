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

// 삭제(사라짐) 반영 지연(약 2~3분) - 전파 흔들림 구간에서 기존 목록 유지
const ADOPTION_DELAY_MS = 150_000;

// 현재 API가 노출하는 안정 스냅샷
let lastGoodVotes: VoteItem[] | null = null;
let lastGoodVotesSig = "";
let lastFetchedAt = 0;

// 삭제가 포함된 후보 스냅샷(아직 반영 전)
let pendingVotes: VoteItem[] | null = null;
let pendingVotesSig = "";
let pendingSince = 0;

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

function createStableId(row: VoteRow) {
  const raw = [
    normalizePlatform(row.platform ?? ""),
    row.title?.trim() ?? "",
    row.url?.trim() ?? "",
    row.opensAt?.trim() ?? "",
    row.closesAt?.trim() ?? "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `vote-${hash.toString(36)}`;
}

function createLegacyStableId(row: VoteRow) {
  const raw = `${normalizePlatform(row.platform ?? "")}|${row.title?.trim() ?? ""}|${row.closesAt?.trim() ?? ""}`;

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `vote-${hash.toString(36)}`;
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

function createVotesSignature(votes: VoteItem[]) {
  return votes
    .map((vote) => ({
      id: vote.id,
      title: vote.title,
      url: vote.url,
      opensAt: vote.opensAt ?? "",
      closesAt: vote.closesAt ?? "",
      note: vote.note ?? "",
      platforms: vote.platforms.join(","),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((vote) =>
      [
        vote.id,
        vote.title,
        vote.url,
        vote.opensAt,
        vote.closesAt,
        vote.note,
        vote.platforms,
      ].join("|")
    )
    .join("\n");
}

function hasRemovalComparedToStable(stableVotes: VoteItem[], fetchedVotes: VoteItem[]) {
  const fetchedIds = new Set(fetchedVotes.map((vote) => vote.id));
  return stableVotes.some((vote) => !fetchedIds.has(vote.id));
}

function mergeStableWithCandidate(stableVotes: VoteItem[], candidateVotes: VoteItem[]) {
  const candidateMap = new Map(candidateVotes.map((vote) => [vote.id, vote]));
  const merged: VoteItem[] = [];

  // 기존 항목은 유지하되, 동일 ID가 있으면 최신값으로 치환
  stableVotes.forEach((vote) => {
    merged.push(candidateMap.get(vote.id) ?? vote);
  });

  // 새로 등장한 항목은 즉시 노출(푸시 클릭 시 목록 부재 방지)
  candidateVotes.forEach((vote) => {
    if (!stableVotes.some((stableVote) => stableVote.id === vote.id)) {
      merged.push(vote);
    }
  });

  return merged;
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

// 30초 polling + inFlight 공유 + 실패 폴백 + 삭제 지연 반영
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
    const fetchedSig = createVotesSignature(fetchedVotes);

    if (!lastGoodVotes) {
      lastGoodVotes = fetchedVotes;
      lastGoodVotesSig = fetchedSig;
      lastFetchedAt = Date.now();
      pendingVotes = null;
      pendingVotesSig = "";
      pendingSince = 0;
      return fetchedVotes;
    }

    if (fetchedSig === lastGoodVotesSig) {
      lastFetchedAt = Date.now();
      pendingVotes = null;
      pendingVotesSig = "";
      pendingSince = 0;
      return lastGoodVotes;
    }

    const hasRemoval = hasRemovalComparedToStable(lastGoodVotes, fetchedVotes);

    // 사라진 항목이 없는 변경(신규 추가/기존 갱신)은 즉시 반영
    if (!hasRemoval) {
      lastGoodVotes = fetchedVotes;
      lastGoodVotesSig = fetchedSig;
      lastFetchedAt = Date.now();
      pendingVotes = null;
      pendingVotesSig = "";
      pendingSince = 0;
      return lastGoodVotes;
    }

    // 사라짐이 포함된 변경은 지연 반영: 우선 안정 스냅샷 + 신규 항목 병합 응답
    if (!pendingVotes || pendingVotesSig !== fetchedSig) {
      pendingVotes = fetchedVotes;
      pendingVotesSig = fetchedSig;
      pendingSince = Date.now();
      lastFetchedAt = Date.now();
      return mergeStableWithCandidate(lastGoodVotes, fetchedVotes);
    }

    if (Date.now() - pendingSince >= ADOPTION_DELAY_MS) {
      lastGoodVotes = pendingVotes;
      lastGoodVotesSig = pendingVotesSig;
      pendingVotes = null;
      pendingVotesSig = "";
      pendingSince = 0;
      lastFetchedAt = Date.now();
      return lastGoodVotes;
    }

    lastFetchedAt = Date.now();
    return mergeStableWithCandidate(lastGoodVotes, pendingVotes);
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
