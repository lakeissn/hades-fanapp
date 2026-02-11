import { NextResponse } from "next/server";

/**
 * 멜론 차트 스크래핑 API
 * 
 * 멜론 차트 데이터를 가져오는 방법:
 * 1. 멜론은 공식 API를 제공하지 않음 → HTML 스크래핑 필요
 * 2. https://www.melon.com/chart/index.htm (실시간 TOP 100)
 * 3. User-Agent 헤더 필수 (없으면 403 차단)
 * 4. HTML에서 rank01 (곡명), rank02 (아티스트), rank03 (앨범) 클래스로 파싱
 * 5. 앨범아트: <img> src 속성에서 추출
 * 
 * plavestream 등 팬사이트들도 동일한 방식으로 스크래핑:
 * - 서버사이드에서 멜론 페이지 fetch → HTML 파싱 → JSON 반환
 * - 주기적 크롤링 + 캐싱 (보통 1시간 간격)
 */

const MELON_URLS: Record<string, string> = {
  TOP100: "https://www.melon.com/chart/index.htm",
  HOT100: "https://www.melon.com/chart/hot100/index.htm",
  REALTIME: "https://www.melon.com/chart/index.htm",
};

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

let cached: { data: ChartEntry[]; type: string; expiresAt: number } | null = null;

function parseChartHtml(html: string): ChartEntry[] {
  const entries: ChartEntry[] = [];

  // 곡 제목
  const titleMatches = html.match(/<div class="ellipsis rank01">[\s\S]*?<a[^>]*>(.*?)<\/a>/g) ?? [];
  // 아티스트
  const artistMatches = html.match(/<div class="ellipsis rank02">[\s\S]*?<\/div>/g) ?? [];
  // 앨범
  const albumMatches = html.match(/<div class="ellipsis rank03">[\s\S]*?<a[^>]*>(.*?)<\/a>/g) ?? [];
  // 앨범아트 이미지
  const imgMatches = html.match(/<img[^>]+src="(https:\/\/cdnimg\.melon\.co\.kr\/cm2\/album\/images\/[^"]+)"/g) ?? [];
  // 순위 변동
  const rankChangeMatches = html.match(/<span class="(up|down|none)"[^>]*>.*?<\/span>/g) ?? [];

  const titles = titleMatches.map(m => {
    const match = m.match(/<a[^>]*>(.*?)<\/a>/);
    return match?.[1]?.trim() ?? "";
  });

  const artists = artistMatches.map((block) => {
  // rank02 안의 a 텍스트들을 합치기 (복수 아티스트 대응)
  const as = [...block.matchAll(/<a[^>]*>(.*?)<\/a>/g)].map(m => m[1].trim());
  return as.join(", ");
  });

  const albums = albumMatches.map(m => {
    const match = m.match(/<a[^>]*>(.*?)<\/a>/);
    return match?.[1]?.trim() ?? "";
  });

  const albumArts = imgMatches.map(m => {
    const match = m.match(/src="([^"]+)"/);
    return match?.[1] ?? "";
  });

  const count = Math.min(titles.length, artists.length, albums.length, 100);

  for (let i = 0; i < count; i++) {
    entries.push({
      rank: i + 1,
      title: titles[i] ?? "",
      artist: artists[i] ?? "",
      albumArt: albumArts[i] ?? "",
      albumName: albums[i] ?? "",
      rankChange: "same",
      changeAmount: 0,
    });
  }

  return entries;
}

async function fetchMelonChart(chartType: string): Promise<ChartEntry[]> {
  const now = Date.now();
  if (cached && cached.type === chartType && cached.expiresAt > now) {
    return cached.data;
  }

  const url = MELON_URLS[chartType] ?? MELON_URLS.TOP100;

  const response = await fetch(url, {
    headers: COMMON_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Melon chart fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const entries = parseChartHtml(html);

  cached = {
    data: entries,
    type: chartType,
    expiresAt: now + 30 * 60 * 1000, // 30분 캐시
  };

  return entries;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chartType = searchParams.get("type") ?? "TOP100";
  const artistFilter = searchParams.get("artist") ?? "";

  try {
    const allEntries = await fetchMelonChart(chartType);

    // 아티스트 필터링 (하데스 곡만 추출)
    const filtered = artistFilter
      ? allEntries.filter((entry) =>
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
  } catch (error) {
    // 네트워크 실패 시 빈 결과 반환
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
