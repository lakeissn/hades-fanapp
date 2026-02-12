import { NextResponse } from "next/server";

/**
 * 멜론 차트 스크래핑 API - 6개 차트 지원
 * REALTIME, HOT100_30(30일), HOT100_100(100일), DAILY, WEEKLY, MONTHLY
 */

const MELON_URLS: Record<string, string> = {
  REALTIME: "https://www.melon.com/chart/index.htm",
  HOT100_30: "https://www.melon.com/chart/hot100/index.htm?chartType=D30",
  HOT100_100: "https://www.melon.com/chart/hot100/index.htm",
  DAILY: "https://www.melon.com/chart/day/index.htm",
  WEEKLY: "https://www.melon.com/chart/week/index.htm",
  MONTHLY: "https://www.melon.com/chart/month/index.htm",
};

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

type ChartEntry = {
  rank: number;
  title: string;
  artist: string;
  albumArt: string;
  albumName: string;
  rankChange: "up" | "down" | "same" | "new";
  changeAmount: number;
};

const cacheMap = new Map<string, { data: ChartEntry[]; expiresAt: number }>();

function parseChartHtml(html: string): ChartEntry[] {
  const entries: ChartEntry[] = [];

  const titleMatches =
    html.match(/<div class="ellipsis rank01">[\s\S]*?<a[^>]*>(.*?)<\/a>/g) ?? [];
  const artistMatches =
    html.match(/<div class="ellipsis rank02">[\s\S]*?<\/div>/g) ?? [];
  const albumMatches =
    html.match(/<div class="ellipsis rank03">[\s\S]*?<a[^>]*>(.*?)<\/a>/g) ?? [];
  const imgMatches =
    html.match(
      /<img[^>]+src="(https:\/\/cdnimg\.melon\.co\.kr\/cm2\/album\/images\/[^"]+)"/g
    ) ?? [];

  const titles = titleMatches.map((m) => {
    const match = m.match(/<a[^>]*>(.*?)<\/a>/);
    return match?.[1]?.trim() ?? "";
  });

  const artists = artistMatches.map((block) => {
    const raw = [...block.matchAll(/<a[^>]*>(.*?)<\/a>/g)]
      .map((m) => (m[1] ?? "").trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(raw.map((s) => s.replace(/\s+/g, " "))));
    return uniq.join(", ");
  });

  const albums = albumMatches.map((m) => {
    const match = m.match(/<a[^>]*>(.*?)<\/a>/);
    return match?.[1]?.trim() ?? "";
  });

  const albumArts = imgMatches.map((m) => {
    const match = m.match(/src="([^"]+)"/);
    return match?.[1] ?? "";
  });

  // 순위 변동 파싱
  const rankChanges: { type: "up" | "down" | "same" | "new"; amount: number }[] = [];
  const rankBlocks = html.match(/<span class="rank_wrap">[\s\S]*?<\/span>\s*<\/span>/g) ?? [];
  for (const block of rankBlocks) {
    if (block.includes("icon_new")) {
      rankChanges.push({ type: "new", amount: 0 });
    } else if (block.includes("icon_up")) {
      const numMatch = block.match(/<span class="no">(\d+)<\/span>/);
      rankChanges.push({ type: "up", amount: numMatch ? parseInt(numMatch[1]) : 0 });
    } else if (block.includes("icon_down")) {
      const numMatch = block.match(/<span class="no">(\d+)<\/span>/);
      rankChanges.push({ type: "down", amount: numMatch ? parseInt(numMatch[1]) : 0 });
    } else {
      rankChanges.push({ type: "same", amount: 0 });
    }
  }

  const count = Math.min(titles.length, artists.length, 100);

  for (let i = 0; i < count; i++) {
    entries.push({
      rank: i + 1,
      title: titles[i] ?? "",
      artist: artists[i] ?? "",
      albumArt: albumArts[i] ?? "",
      albumName: albums[i] ?? "",
      rankChange: rankChanges[i]?.type ?? "same",
      changeAmount: rankChanges[i]?.amount ?? 0,
    });
  }

  return entries;
}

async function fetchMelonChart(chartType: string): Promise<ChartEntry[]> {
  const now = Date.now();
  const cached = cacheMap.get(chartType);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const url = MELON_URLS[chartType] ?? MELON_URLS.REALTIME;

  const response = await fetch(url, {
    headers: COMMON_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Melon chart fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const entries = parseChartHtml(html);

  cacheMap.set(chartType, {
    data: entries,
    expiresAt: now + 30 * 60 * 1000,
  });

  return entries;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chartType = searchParams.get("type") ?? "REALTIME";
  const artistFilter = searchParams.get("artist") ?? "";

  try {
    const allEntries = await fetchMelonChart(chartType);

    const filtered = artistFilter
      ? allEntries.filter(
          (entry) =>
            entry.artist.toLowerCase().includes(artistFilter.toLowerCase()) ||
            entry.title.toLowerCase().includes(artistFilter.toLowerCase())
        )
      : allEntries;

    return NextResponse.json({
      entries: filtered,
      totalEntries: allEntries.length,
      chartType,
      artist: artistFilter || null,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      entries: [],
      totalEntries: 0,
      chartType,
      artist: artistFilter || null,
      updatedAt: new Date().toISOString(),
      error: "멜론 차트 데이터를 가져올 수 없습니다.",
    });
  }
}
