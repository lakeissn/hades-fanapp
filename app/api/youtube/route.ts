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
 * 유효한 제목인지 검증
 * - "닫기", 순수 타임스탬프, 빈 문자열 등은 제외
 */
function isValidTitle(title: string): boolean {
  if (!title || title.trim().length < 2) return false;
  const t = title.trim();

  // "닫기" (Shorts 페이지의 close 버튼 텍스트)
  if (t === "닫기" || t === "Close") return false;

  // 순수 타임스탬프 패턴 (예: "0:00", "1:23:45", "00:30")
  if (/^\d{1,2}(:\d{2}){1,2}$/.test(t)) return false;

  // 타임스탬프 + 슬래시 패턴 (예: "0:00 / 3:45")
  if (/^\d{1,2}(:\d{2}){1,2}\s*\/\s*\d{1,2}(:\d{2}){1,2}$/.test(t)) return false;

  // YouTube UI 관련 텍스트
  const uiTexts = [
    "YouTube", "구독", "좋아요", "싫어요", "공유", "저장",
    "Subscribe", "Like", "Dislike", "Share", "Save",
    "더보기", "간략히", "Show more", "Show less",
    "댓글", "Comments",
  ];
  if (uiTexts.includes(t)) return false;

  return true;
}

/**
 * 개선된 제목 추출 - 여러 패턴을 시도하여 실제 영상 제목을 확실히 가져옴
 * Shorts의 "닫기" 문제 및 Video의 타임스탬프 문제를 방지
 */
function extractTitle(html: string, videoId: string): string {
  const candidates: string[] = [];

  // 1) videoId 주변에서 title 추출 (가장 신뢰도 높음)
  const idx = html.indexOf(`"videoId":"${videoId}"`);
  if (idx !== -1) {
    // videoId 뒤쪽 탐색
    const chunk = html.substring(idx, Math.min(idx + 1200, html.length));

    // runs 형식: "title":{"runs":[{"text":"..."}]}
    const runsMatch = chunk.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
    if (runsMatch?.[1]) {
      const t = decodeUnicode(runsMatch[1]);
      if (isValidTitle(t)) candidates.push(t);
    }

    // simpleText 형식: "title":{"simpleText":"..."}
    const simpleMatch = chunk.match(/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
    if (simpleMatch?.[1]) {
      const t = decodeUnicode(simpleMatch[1]);
      if (isValidTitle(t)) candidates.push(t);
    }

    // 이미 유효한 제목을 찾았으면 반환
    if (candidates.length > 0) return candidates[0];

    // videoId 앞쪽에서도 탐색 (제목이 videoId보다 먼저 올 수 있음)
    if (idx > 300) {
      const beforeChunk = html.substring(Math.max(0, idx - 600), idx + 100);
      const beforeRuns = beforeChunk.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
      if (beforeRuns?.[1]) {
        const t = decodeUnicode(beforeRuns[1]);
        if (isValidTitle(t)) candidates.push(t);
      }
      const beforeSimple = beforeChunk.match(/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
      if (beforeSimple?.[1]) {
        const t = decodeUnicode(beforeSimple[1]);
        if (isValidTitle(t)) candidates.push(t);
      }
    }
  }

  if (candidates.length > 0) return candidates[0];

  // 2) gridVideoRenderer / reelItemRenderer 기반 탐색 (채널 페이지에서 렌더링되는 형태)
  // videoId를 포함하는 renderer 블록을 찾고, 그 안에서 title 추출
  const rendererPatterns = [
    new RegExp(`"gridVideoRenderer"\\s*:\\s*\\{[^}]*?"videoId"\\s*:\\s*"${videoId}"[\\s\\S]{0,800}?"title"\\s*:\\s*\\{\\s*(?:"runs"\\s*:\\s*\\[\\s*\\{\\s*"text"\\s*:\\s*"([^"]+)"|"simpleText"\\s*:\\s*"([^"]+)")`, "m"),
    new RegExp(`"reelItemRenderer"\\s*:\\s*\\{[^}]*?"videoId"\\s*:\\s*"${videoId}"[\\s\\S]{0,800}?"headline"\\s*:\\s*\\{\\s*"simpleText"\\s*:\\s*"([^"]+)"`, "m"),
    new RegExp(`"videoId"\\s*:\\s*"${videoId}"[\\s\\S]{0,1000}?"headline"\\s*:\\s*\\{\\s*"simpleText"\\s*:\\s*"([^"]+)"`, "m"),
  ];

  for (const pattern of rendererPatterns) {
    const match = html.match(pattern);
    if (match) {
      const t = decodeUnicode(match[1] || match[2] || match[3] || "");
      if (isValidTitle(t)) return t;
    }
  }

  // 3) accessibilityData에서 label 추출
  const accessPatterns = [
    new RegExp(`"videoId"\\s*:\\s*"${videoId}"[\\s\\S]{0,2000}?"accessibilityData"\\s*:\\s*\\{\\s*"label"\\s*:\\s*"([^"]+)"`, "m"),
    new RegExp(`"accessibilityData"\\s*:\\s*\\{\\s*"label"\\s*:\\s*"([^"]*${videoId}[^"]*)"`, "m"),
  ];
  for (const pattern of accessPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const label = decodeUnicode(match[1]);
      // label은 보통 "제목 by 채널 N views N ago" 형태 → 맨 앞 부분 사용
      // 또는 "제목 - 재생 시간: N분 N초" 형태
      let title = label;
      const byIndex = label.lastIndexOf(" by ");
      if (byIndex > 0) title = label.substring(0, byIndex).trim();

      // 재생 시간 부분 제거
      title = title.replace(/\s*-\s*재생 시간:.*$/, "").trim();
      title = title.replace(/\s*-\s*play length.*$/i, "").trim();

      if (isValidTitle(title)) return title;
    }
  }

  // 4) og:title 메타 태그 (개별 영상 페이지인 경우)
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitle?.[1]) {
    const t = decodeUnicode(ogTitle[1]).trim();
    if (t && !t.includes("YouTube") && !t.includes("@") && isValidTitle(t)) return t;
  }

  // 5) <title> 태그
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag?.[1]) {
    const t = titleTag[1].replace(/\s*-\s*YouTube\s*$/i, "").trim();
    if (isValidTitle(t) && !t.includes("@")) return t;
  }

  return "";
}

/**
 * Shorts 전용 제목 추출 - 채널 shorts 탭 HTML에서 reelItemRenderer 기반으로 추출
 * 일반 extractTitle과 달리 Shorts 특유의 JSON 구조(headline, overlayMetadata 등)를 우선 탐색
 */
function extractShortsTitle(html: string, shortsId: string): string {
  const candidates: string[] = [];

  // shortsId가 HTML에서 등장하는 모든 위치를 탐색
  // YouTube Shorts 채널 탭에서는 "videoId":"ID" 외에도 "/shorts/ID" 형태로 등장
  const searchPatterns = [
    `"${shortsId}"`,
    `\\/shorts\\/${shortsId}`,
  ];

  for (const searchStr of searchPatterns) {
    let searchIdx = 0;
    const plainStr = searchStr.replace(/\\\\/g, "/");

    while (true) {
      const idIdx = html.indexOf(
        plainStr.includes("/shorts/") ? `/shorts/${shortsId}` : `"${shortsId}"`,
        searchIdx
      );
      if (idIdx === -1) break;
      searchIdx = idIdx + 1;

      // ID 주변 앞뒤 2500자 범위에서 탐색
      const start = Math.max(0, idIdx - 1500);
      const end = Math.min(html.length, idIdx + 2500);
      const chunk = html.substring(start, end);

      // headline.simpleText 패턴 (reelItemRenderer에서 가장 흔함)
      const headlineSimple = chunk.match(/"headline"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
      if (headlineSimple?.[1]) {
        const t = decodeUnicode(headlineSimple[1]);
        if (isValidTitle(t)) candidates.push(t);
      }

      // headline.runs 패턴
      const headlineRuns = chunk.match(/"headline"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
      if (headlineRuns?.[1]) {
        const t = decodeUnicode(headlineRuns[1]);
        if (isValidTitle(t)) candidates.push(t);
      }

      // overlayMetadata.primaryText.content 패턴
      const overlayPrimary = chunk.match(/"primaryText"\s*:\s*\{\s*"content"\s*:\s*"([^"]+)"/);
      if (overlayPrimary?.[1]) {
        const t = decodeUnicode(overlayPrimary[1]);
        if (isValidTitle(t)) candidates.push(t);
      }

      // title.runs 패턴
      const titleRuns = chunk.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
      if (titleRuns?.[1]) {
        const t = decodeUnicode(titleRuns[1]);
        if (isValidTitle(t)) candidates.push(t);
      }

      // title.simpleText 패턴
      const titleSimple = chunk.match(/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
      if (titleSimple?.[1]) {
        const t = decodeUnicode(titleSimple[1]);
        if (isValidTitle(t)) candidates.push(t);
      }

      if (candidates.length > 0) return candidates[0];
    }
  }

  if (candidates.length > 0) return candidates[0];

  // accessibilityData.label에서 추출
  const accessPatterns = [
    new RegExp(`"${shortsId}"[\\s\\S]{0,3000}?"accessibilityData"\\s*:\\s*\\{\\s*"label"\\s*:\\s*"([^"]+)"`, "m"),
    new RegExp(`"accessibilityData"\\s*:\\s*\\{\\s*"label"\\s*:\\s*"([^"]*${shortsId}[^"]*)"`, "m"),
  ];
  for (const pattern of accessPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const label = decodeUnicode(match[1]);
      let title = label;
      // " - " 이후 제거 (조회수 등)
      const dashIdx = title.indexOf(" - ");
      if (dashIdx > 0) title = title.substring(0, dashIdx).trim();
      // 마지막 ", N views" 패턴 제거
      title = title.replace(/,\s*\d[\d,.]*\s*(views?|조회|회).*$/i, "").trim();
      if (isValidTitle(title)) return title;
    }
  }

  // 일반 extractTitle로 폴백
  return extractTitle(html, shortsId);
}

/**
 * 개별 Shorts 페이지에서 제목 직접 가져오기 (채널 페이지에서 실패 시 폴백)
 */
async function fetchShortsTitleDirect(shortsId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${shortsId}`, {
      headers: COMMON_HEADERS,
      cache: "no-store",
    });
    const html = await res.text();

    // 1) og:title (가장 신뢰도 높음)
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    if (ogTitle?.[1]) {
      const t = decodeUnicode(ogTitle[1]).trim();
      if (isValidTitle(t) && !t.includes("YouTube") && !t.includes("@")) return t;
    }

    // 2) <title> 태그
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleTag?.[1]) {
      const t = titleTag[1].replace(/\s*-\s*YouTube\s*$/i, "").trim();
      if (isValidTitle(t) && !t.includes("@")) return t;
    }

    // 3) JSON 내 title.runs
    const jsonTitle = html.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
    if (jsonTitle?.[1]) {
      const t = decodeUnicode(jsonTitle[1]);
      if (isValidTitle(t)) return t;
    }

    // 4) JSON 내 title.simpleText
    const jsonSimple = html.match(/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
    if (jsonSimple?.[1]) {
      const t = decodeUnicode(jsonSimple[1]);
      if (isValidTitle(t)) return t;
    }

    // 5) headline (Shorts 개별 페이지에서도 등장 가능)
    const headline = html.match(/"headline"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
    if (headline?.[1]) {
      const t = decodeUnicode(headline[1]);
      if (isValidTitle(t)) return t;
    }

    // 6) engagementPanels 내 제목 (Shorts 페이지 특유)
    const engagementTitle = html.match(/"headerTitle"\s*:\s*"([^"]+)"/);
    if (engagementTitle?.[1]) {
      const t = decodeUnicode(engagementTitle[1]);
      if (isValidTitle(t)) return t;
    }

    return "";
  } catch {
    return "";
  }
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

    // 1차: 채널 shorts 탭 HTML에서 Shorts 전용 추출
    let title = extractShortsTitle(html, shortsId);

    // 2차: 실패 시 개별 Shorts 페이지에서 직접 가져오기
    if (!title) {
      title = await fetchShortsTitleDirect(shortsId);
    }

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
