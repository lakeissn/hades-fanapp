import { NextResponse } from "next/server";

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
  | "higher";

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
  "10asia": "10아시아",
  muniverse: "뮤니버스",
  my1pick: "마이원픽",
  mnetplus: "엠넷플러스",
  fannstar: "팬앤스타",
  higher: "하이어",
};

const CACHE_TTL_MS = 60_000;
const KST_SUFFIX = "+09:00";

let memoryCache:
  | {
      expiresAt: number;
      data: VoteItem[];
    }
  | null = null;

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

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const normalized = value
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const withSeconds = /\d{2}:\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : /\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : `${normalized} 00:00:00`;

  const isoLike = withSeconds.replace(" ", "T");
  const kstDate = new Date(`${isoLike}${KST_SUFFIX}`);
  if (!Number.isNaN(kstDate.getTime())) {
    return kstDate;
  }

  return null;
}

function isExpired(closesAt: string) {
  const date = parseDateKst(closesAt);
  if (!date) return false;
  return date.getTime() <= Date.now();
}

function createStableId(row: VoteRow) {
  const raw = `${normalizePlatform(row.platform)}|${row.title.trim()}|${row.closesAt.trim()}`;
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

async function loadVotesFromSheet() {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.data;
  }

  const csvUrl = process.env.VOTES_SHEET_CSV_URL ?? FALLBACK_CSV_URL;
  const response = await fetch(csvUrl, {
    next: { revalidate: 60 },
    headers: {
      Accept: "text/csv,*/*;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch votes csv: ${response.status}`);
  }

  const csv = await response.text();
  const parsedRows = parseCsv(csv);

  const filteredVotes = parsedRows
    .filter((row) => normalizeBoolean(row.enabled ?? ""))
    .filter((row) => !isExpired(row.closesAt ?? ""))
    .map((row) => {
      const platforms = parsePlatforms(row.platform ?? "");
      const rawOpensAt = row.opensAt?.trim() ?? "";
      const openDate = parseDateKst(rawOpensAt);
      const closeDate = parseDateKst(row.closesAt ?? "");

      return {
        id: createStableId(row),
        title: row.title?.trim() ?? "",
        platform: platforms[0],
        platformLabel: labelForPlatform(platforms[0]),
        platforms,
        platformLabels: platforms.map(labelForPlatform),
        url: row.url?.trim() ?? "",
        opensAt: isInProgressKeyword(rawOpensAt) ? "진행중" : openDate ? openDate.toISOString() : undefined,
        closesAt: closeDate ? closeDate.toISOString() : undefined,
        note: row.note?.trim() || undefined,
      } as VoteItem;
    })
    .filter((vote) => vote.title && vote.url);

  memoryCache = {
    expiresAt: now + CACHE_TTL_MS,
    data: filteredVotes,
  };

  return filteredVotes;
}

export async function GET() {
  try {
    const votes = await loadVotesFromSheet();
    return NextResponse.json(votes);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
