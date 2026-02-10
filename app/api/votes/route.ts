import { NextResponse } from "next/server";

type VotePlatform =
  | "idolchamp"
  | "mubeat"
  | "upick"
  | "fancast"
  | "fanplus"
  | "podoal"
  | "whosfan"
  | "duakad"
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
  url: string;
  opensAt?: string;
  closesAt?: string;
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
  duakad: "덕애드",
  "10asia": "텐아시아",
  muniverse: "뮤니버스",
  my1pick: "마이원픽",
  mnetplus: "엠넷플러스",
  fannstar: "팬앤스타",
  higher: "하이어",
};

const CACHE_TTL_MS = 60_000;

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

function labelForPlatform(platform: string) {
  const key = normalizePlatform(platform) as VotePlatform;
  return PLATFORM_LABELS[key] ?? "기타";
}

function parseDate(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isExpired(closesAt: string) {
  const date = parseDate(closesAt);
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
    .map((row) => ({
      id: createStableId(row),
      title: row.title?.trim() ?? "",
      platform: normalizePlatform(row.platform ?? ""),
      platformLabel: labelForPlatform(row.platform ?? ""),
      url: row.url?.trim() ?? "",
      opensAt: row.opensAt?.trim() || undefined,
      closesAt: row.closesAt?.trim() || undefined,
    }))
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
