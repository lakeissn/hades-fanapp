import { NextResponse } from "next/server";

// 1. 기존 멤버 데이터 (보존)
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

// 2. 타입 정의 (보존 및 tags 추가)
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
    TAG?: string;
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

// 3. 기존 유틸리티 함수 (보존)
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

// 4. 태그 파싱 로직 (개선 및 보존)
function parseTagsFromHtml(html: string) {
  const values = new Set<string>();

  const varPatterns = [
    /szBroadCategory\s*=\s*['"]([^'"]+)['"]/i,
    /szBroadType\s*=\s*['"]([^'"]+)['"]/i,
    /szTags\s*=\s*['"]([^'"]+)['"]/i,
  ];

  varPatterns.forEach(pattern => {
    const match = html.match(pattern);
    if (match?.[1]) {
      const parts = match[1].split(/[,/]+/).filter(Boolean);
      parts.forEach(p => values.add(p.trim()));
    }
  });

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

// 5. 메타 데이터 가져오기 (보존)
async function fetchLiveMeta(liveUrl: string) {
  try {
    const response = await fetch(liveUrl, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) return { title: null, thumbUrl: null, tags: [], category: null };
    
    const html = await response.text();
    const title = extractMetaContent(html, "og:title") ?? extractTitleTag(html);
    const thumbUrl = extractMetaContent(html, "og:image");
    
    const categoryMatch = html.match(/szBroadCategory\s*=\s*['"]([^'"]+)['"]/i);
    const category = categoryMatch?.[1] ?? null;

    const tags = parseTagsFromHtml(html);
    return { title, thumbUrl, tags, category };
  } catch (e) {
    return { title: null, thumbUrl: null, tags: [], category: null };
  }
}

// 6. 개별 상태 확인 (오류가 났던 구간을 fetchStatus 함수로 정확히 감싸서 복구함)
async function fetchStatus(bjid: string) {
  try {
    const apiUrl = `https://live.sooplive.co.kr/afreeca/player_live_api.php?bj_id=${bjid}`;
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };

    const data = (await response.json()) as LiveApiResponse;
    const bnoValue = Number(data.CHANNEL?.BNO ?? 0);
    
    if (bnoValue > 0) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bnoValue}`;
      const apiTitle = pickFirstString(data.CHANNEL?.TITLE, data.title);
      const apiThumb = pickFirstString(data.CHANNEL?.THUMBNAIL, data.CHANNEL?.THUMB, data.CHANNEL?.THUMB_URL);

      const meta = await fetchLiveMeta(liveUrl);
      const apiTags = data.CHANNEL?.TAG ? data.CHANNEL.TAG.split(',').filter(Boolean) : [];
      
      const finalTags = new Set<string>();
      if (meta.category) finalTags.add(meta.category); // 카테고리 우선
      meta.tags.forEach(t => finalTags.add(t));
      apiTags.forEach(t => finalTags.add(t));

      return {
        isLive: true,
        liveUrl,
        title: apiTitle ?? meta.title,
        thumbUrl: apiThumb ?? meta.thumbUrl,
        tags: Array.from(finalTags).map(t => t.trim()).filter(Boolean),
      };
    }
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  } catch {
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  }
}

// 7. GET 핸들러 (보존)
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
