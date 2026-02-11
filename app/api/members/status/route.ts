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
    name: "씽귤",
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
  tags: string[];
  fetchedAt: string;
};

type LiveApiResponse = {
  CHANNEL?: {
    BNO?: number | string;
    TITLE?: string;
    THUMBNAIL?: string;
    THUMB?: string;
    THUMB_URL?: string;
    TAG?: string; // API에서 제공하는 태그
  };
  title?: string;
  thumbnail?: string;
  thumbUrl?: string;
};

let cached:
  | {
      data: MemberStatus[];
      expiresAt: number;
    }
  | null = null;

function pickFirstString(...values: Array<string | undefined | null>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

function extractMetaContent(html: string, property: string) {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ?? null;
}

/**
 * ✅ 개선된 태그 파싱 로직
 * SOOP 페이지 내부의 변수(szBroadCategory, szTags 등)를 직접 찾아냅니다.
 */
function parseTagsFromHtml(html: string) {
  const values = new Set<string>();

  // 1. 페이지 내 주요 변수 추출 (카테고리, 언어, 태그 포함)
  const varPatterns = [
    /szBroadCategory\s*=\s*['"]([^'"]+)['"]/i, // 예: 토크/캠방
    /szBroadType\s*=\s*['"]([^'"]+)['"]/i,     // 예: 한국어
    /szTags\s*=\s*['"]([^'"]+)['"]/i,          // 예: 봉준,무수,하데스
  ];

  varPatterns.forEach(pattern => {
    const match = html.match(pattern);
    if (match?.[1]) {
      // 쉼표나 슬래시로 구분된 경우 나누기
      const parts = match[1].split(/[,/]+/).filter(Boolean);
      parts.forEach(p => values.add(p.trim()));
    }
  });

  // 2. JSON 형태 데이터 스캔 (기존 방식 유지)
  const jsonPatterns = [
    /"broad_tag"\s*:\s*\[(.*?)\]/i,
    /"tag_list"\s*:\s*\[(.*?)\]/i
  ];

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const inner = match[1];
      const tagMatches = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) ?? [];
      tagMatches
        .map((item) => item.slice(1, -1))
        .map((item) => item.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))))
        .map((item) => item.trim())
        .filter((item) => item && item !== "null" && item !== "undefined")
        .forEach((item) => values.add(item));
    }
  }

  return Array.from(values);
}

async function fetchLiveMeta(liveUrl: string) {
  try {
    const response = await fetch(liveUrl, { cache: "no-store", headers: { "User-Agent": "..." } });
    if (!response.ok) return { title: null, thumbUrl: null, tags: [], category: null };
    
    const html = await response.text();
    const title = extractMetaContent(html, "og:title") ?? extractTitleTag(html);
    const thumbUrl = extractMetaContent(html, "og:image");
    
    // 카테고리(szBroadCategory) 추출 추가
    const categoryMatch = html.match(/szBroadCategory\s*=\s*['"]([^'"]+)['"]/i);
    const category = categoryMatch?.[1] ?? null;

    const tags = parseTagsFromHtml(html);
    return { title, thumbUrl, tags, category };
  } catch (e) {
    return { title: null, thumbUrl: null, tags: [], category: null };
  }
}

try {
    // ... (player_live_api.php 호출부)
    const data = (await response.json()) as LiveApiResponse;
    const bnoValue = Number(data.CHANNEL?.BNO ?? 0);
    
    if (bnoValue > 0) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bnoValue}`;
      const apiTitle = pickFirstString(data.CHANNEL?.TITLE, data.title);
      const apiThumb = pickFirstString(data.CHANNEL?.THUMBNAIL, data.CHANNEL?.THUMB, data.CHANNEL?.THUMB_URL);

      // HTML에서 메타 데이터(태그/카테고리) 가져오기
      const meta = await fetchLiveMeta(liveUrl);
      
      // API 기본 태그 파싱
      const apiTags = data.CHANNEL?.TAG ? data.CHANNEL.TAG.split(',').filter(Boolean) : [];
      
      // ✅ 개선: 카테고리 정보가 있다면 태그 목록 맨 앞에 추가
      const finalTags = new Set<string>();
      
      // 1. 카테고리 (예: "토크/캠방")
      if (meta.category) finalTags.add(meta.category); 
      
      // 2. HTML에서 찾은 태그들
      meta.tags.forEach(t => finalTags.add(t));
      
      // 3. API 응답 태그들
      apiTags.forEach(t => finalTags.add(t));

      return {
        isLive: true,
        liveUrl,
        title: apiTitle ?? meta.title,
        thumbUrl: apiThumb ?? meta.thumbUrl,
        tags: Array.from(finalTags).map(t => t.trim()).filter(Boolean), // 공백 제거
      };
    }
   } catch {
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  }
}

export async function GET() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  const results: MemberStatus[] = await Promise.all(
    members.map(async (member) => {
      const status = await fetchStatus(member.id);
      return {
        ...member,
        ...status,
        fetchedAt: new Date().toISOString(),
      };
    })
  );

  cached = {
    data: results,
    expiresAt: now + 20_000,
  };

  return NextResponse.json(results);
}
