import { NextResponse } from "next/server";

/**
 * YouTube 최신 영상 스크래핑 API
 * - /videos 페이지에서 최신 일반 영상 1개
 * - /shorts 페이지에서 최신 쇼츠 1개
 * 30분 캐시
 */

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

function extractTitle(html: string, videoId: string): string {
  // ytInitialData에서 제목 추출 시도
  const titlePattern = new RegExp(`"videoId":"${videoId}"[^}]*?"title":\\{"runs":\\[\\{"text":"([^"]+)"`, "s");
  const match = html.match(titlePattern);
  if (match?.[1]) return decodeUnicode(match[1]);

  // 대안: accessibilityData에서 추출
  const altPattern = new RegExp(`${videoId}[^}]*?"title":\\{"simpleText":"([^"]+)"`, "s");
  const altMatch = html.match(altPattern);
  if (altMatch?.[1]) return decodeUnicode(altMatch[1]);

  return "새 영상";
}

function decodeUnicode(str: string): string {
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ");
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
      title,
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
      title,
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
      expiresAt: now + 30 * 60 * 1000, // 30분
    };

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
