import { NextResponse } from "next/server";

type YouTubeVideo = {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  type: "video" | "shorts";
  publishedAt: string | null;
};

const CHANNEL_URL = "https://www.youtube.com/@HADES_offi";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

let cached: { data: YouTubeVideo[]; expiresAt: number } | null = null;

function extractVideoId(text: string): string | null {
  const match = text.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function extractShortsId(text: string): string | null {
  const match = text.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function decodeUnicode(str: string): string {
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ");
}

/**
 * (2) 개선된 제목 추출 - 여러 패턴을 시도하여 실제 영상 제목을 확실히 가져옴
 */
function extractTitle(html: string, videoId: string): string {
  // 1) videoId 위치를 찾고 주변 500자에서 title 추출
  const idx = html.indexOf(`"videoId":"${videoId}"`);
  if (idx !== -1) {
    const chunk = html.substring(idx, Math.min(idx + 800, html.length));

    // runs 형식: "title":{"runs":[{"text":"..."}]}
    const runsMatch = chunk.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
    if (runsMatch?.[1]) return decodeUnicode(runsMatch[1]);

    // simpleText 형식: "title":{"simpleText":"..."}
    const simpleMatch = chunk.match(/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
    if (simpleMatch?.[1]) return decodeUnicode(simpleMatch[1]);
  }

  // 2) videoId 앞쪽에서도 탐색 (제목이 videoId보다 먼저 올 수 있음)
  if (idx !== -1 && idx > 200) {
    const beforeChunk = html.substring(Math.max(0, idx - 400), idx + 100);
    const beforeRuns = beforeChunk.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
    if (beforeRuns?.[1]) return decodeUnicode(beforeRuns[1]);
  }

  // 3) accessibilityData에서 label 추출
  const accessPattern = new RegExp(`"videoId"\\s*:\\s*"${videoId}"[\\s\\S]*?"accessibilityData"\\s*:\\s*\\{\\s*"label"\\s*:\\s*"([^"]+)"`, "m");
  const accessMatch = html.match(accessPattern);
  if (accessMatch?.[1]) {
    // label은 보통 "제목 by 채널 N views N ago" 형태 → 맨 앞 부분 사용
    const label = decodeUnicode(accessMatch[1]);
    const byIndex = label.lastIndexOf(" by ");
    if (byIndex > 0) return label.substring(0, byIndex).trim();
    return label;
  }

  // 4) og:title 메타 태그
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) {
    const t = decodeUnicode(ogTitle[1]).trim();
    if (t && !t.includes("YouTube") && !t.includes("@")) return t;
  }

  // 5) <title> 태그
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag?.[1]) {
    const t = titleTag[1].replace(/\s*-\s*YouTube\s*$/i, "").trim();
    if (t && t.length > 2 && !t.includes("@")) return t;
  }

  return "";
}

async function fetchLatestVideo(): Promise<YouTubeVideo | null> {
  try {
    const res = await fetch(`${CHANNEL_URL}/videos`, {
      headers: COMMON_HEADERS,
      cache: "no-store",
    });
    const html = await res.text();
    const videoId = extractVideoId(html);
    if (!videoId) return null;

    const title = extractTitle(html, videoId);
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: videoId,
      title: title || "HADES 영상",
      thumbnail,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      type: "video",
      publishedAt: null,
    };
  } catch {
    return null;
  }
}

async function fetchLatestShort(): Promise<YouTubeVideo | null> {
  try {
    const res = await fetch(`${CHANNEL_URL}/shorts`, {
      headers: COMMON_HEADERS,
      cache: "no-store",
    });
    const html = await res.text();
    const shortsId = extractShortsId(html);
    if (!shortsId) return null;

    const title = extractTitle(html, shortsId);
    const thumbnail = `https://i.ytimg.com/vi/${shortsId}/hqdefault.jpg`;

    return {
      id: shortsId,
      title: title || "HADES Shorts",
      thumbnail,
      url: `https://www.youtube.com/shorts/${shortsId}`,
      type: "shorts",
      publishedAt: null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  try {
    const [video, short] = await Promise.all([
      fetchLatestVideo(),
      fetchLatestShort(),
    ]);

    const results = [video, short].filter(Boolean) as YouTubeVideo[];

    cached = {
      data: results,
      expiresAt: now + 30 * 60 * 1000,
    };

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
